"""
监控数据采集模块
定时采集CPU、内存、GPU、网络等实时数据
"""
import time
import psutil
import platform
import json
import os
from typing import Dict, List
from .hardware import get_hardware_info, NVML_AVAILABLE, NVML_HANDLE, shutdown_nvml, map_physical_disk, get_intel_gpu_usage, get_gpu_info
from .app_config import get_display_config

# 数据缓存
DATA_CACHE = {
    "cpu_usage": [],
    "mem_usage": [],
    "gpu_usage": [],
    "cpu_core_usage": [],
    "cpu_core_freq": [],
    "cpu_freq": [],
    "net_upload_speed": [],
    "net_download_speed": [],
    "system_load": [],
    "process_count": [],
    "boot_time": 0,
    "battery_info": {},
    "cpu_temperature": [],
    "processes": [],  # 前 20 进程（按 CPU 降序）：[{pid,name,cpu,mem,disk_read,disk_write,gpu}]
}

# 进程磁盘 IO 速率计算缓存：{pid: (read_bytes, write_bytes, ts)}
_PROC_IO_LAST = {}
# 进程网络速率计算缓存：{pid: (rx_bytes, tx_bytes, ts)}（仅 Linux 可用）
_PROC_NET_LAST = {}


def get_gpu_process_memory() -> Dict[int, float]:
    """
    获取正在使用 GPU 的进程及其显存占用（MB）。
    per-process 的 GPU 利用率无法跨平台直接获取（psutil/nvml 均只给显存），
    故此处返回 {pid: 已用显存MB} 作为「GPU 占用」近似。无 GPU / 无进程时返回空。
    """
    if not (NVML_AVAILABLE and NVML_HANDLE):
        return {}
    try:
        import py3nvml.py3nvml as nvml
        procs = []
        try:
            procs += nvml.nvmlDeviceGetComputeRunningProcesses(NVML_HANDLE)
        except Exception:
            pass
        try:
            procs += nvml.nvmlDeviceGetGraphicsRunningProcesses(NVML_HANDLE)
        except Exception:
            pass
        result = {}
        for p in procs:
            pid = int(p.pid)
            mem_mb = round(p.usedGpuMemory / 1024, 1) if getattr(p, "usedGpuMemory", 0) else 0
            result[pid] = max(result.get(pid, 0), mem_mb)
        return result
    except Exception:
        return {}

# 磁盘 IO 历史（按物理磁盘聚合）：{physical_disk: {"read":[], "write":[], "busy":[]}}
DISK_IO_HISTORY = {}
_DISK_IO_LAST = {}  # {physical_disk: (read_bytes, write_bytes, busy_time_ms, ts)}

CACHE_DURATION = 120  # 2分钟缓存
CACHE_FILE = "tmp.json"

# 网卡流量初始值
net_io_counters = psutil.net_io_counters()
last_net_bytes_sent = net_io_counters.bytes_sent
last_net_bytes_recv = net_io_counters.bytes_recv
last_net_time = time.time()

# 每张网卡的实时上传/下载速率历史：{iface: {"up":[], "down":[]}}
NET_IO_NIC_HISTORY = {}
_NET_IO_NIC_LAST = {}  # {iface: (bytes_sent, bytes_recv, ts)}

def calculate_net_speed():
    """计算网卡上传/下载速度（KB/s）"""
    global last_net_bytes_sent, last_net_bytes_recv, last_net_time

    current_time = time.time()
    time_diff = current_time - last_net_time

    if time_diff < 0.1:
        return 0, 0

    current_net = psutil.net_io_counters()
    sent_diff = current_net.bytes_sent - last_net_bytes_sent
    recv_diff = current_net.bytes_recv - last_net_bytes_recv

    upload_speed = round(sent_diff / 1024 / time_diff, 2)
    download_speed = round(recv_diff / 1024 / time_diff, 2)

    last_net_bytes_sent = current_net.bytes_sent
    last_net_bytes_recv = current_net.bytes_recv
    last_net_time = current_time

    return upload_speed, download_speed

def collect_real_time_data():
    """定时采集所有实时数据（含网卡流量）"""
    cache_update_counter = 0
    DATA_CACHE["boot_time"] = psutil.boot_time()

    while True:
        timestamp = time.time()

        # 清理过期缓存
        for key in ["cpu_usage", "mem_usage", "gpu_usage", "net_upload_speed",
                    "net_download_speed", "system_load", "process_count", "cpu_temperature",
                    "cpu_freq"]:
            DATA_CACHE[key] = [item for item in DATA_CACHE[key] if timestamp - item[0] <= CACHE_DURATION]

        # 采集基础数据
        DATA_CACHE["cpu_usage"].append((timestamp, psutil.cpu_percent(interval=None)))
        DATA_CACHE["mem_usage"].append((timestamp, psutil.virtual_memory().percent))
        DATA_CACHE["cpu_core_usage"] = psutil.cpu_percent(interval=None, percpu=True)

        # CPU 频率（总体 + 每核）
        try:
            freq = psutil.cpu_freq(percpu=True)
            if freq:
                DATA_CACHE["cpu_core_freq"] = [round(f.current, 0) for f in freq]
                overall = psutil.cpu_freq(percpu=False)
                if overall:
                    DATA_CACHE["cpu_freq"].append((timestamp, round(overall.current, 0)))
        except Exception:
            pass

        # GPU占用率
        gpu_usage = 0
        gpu_vendor = (DATA_CACHE.get("gpu_vendor") or "nvidia")
        if gpu_vendor == "nvidia" and NVML_AVAILABLE and NVML_HANDLE is not None:
            try:
                import py3nvml.py3nvml as nvml
                gpu_usage = nvml.nvmlDeviceGetUtilizationRates(NVML_HANDLE).gpu
            except Exception:
                shutdown_nvml()

        if gpu_usage == 0:
            try:
                ig = get_intel_gpu_usage()
                if isinstance(ig, dict):
                    if ig.get("utilization") is not None:
                        gpu_usage = ig["utilization"]
                    DATA_CACHE["gpu_intel_details"] = ig
            except Exception:
                pass

        if gpu_usage == 0 and platform.system() == "Windows":
            try:
                result = subprocess.run(
                    ['powershell', '-Command',
                     '(Get-Counter "\\GPU Engine(*)% 3D Utilization").CounterSamples.CookedValue'],
                    capture_output=True,
                    text=True,
                    timeout=3,
                    encoding='utf-8',
                    errors='ignore'
                )
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    values = [float(line.strip()) for line in lines if
                             line.strip().replace('.', '', 1).isdigit()]
                    if values:
                        gpu_usage = round(max(values), 1)
            except Exception:
                pass

        DATA_CACHE["gpu_usage"].append((timestamp, gpu_usage))

        # 网卡流量速度
        upload_speed, download_speed = calculate_net_speed()
        DATA_CACHE["net_upload_speed"].append((timestamp, upload_speed))
        DATA_CACHE["net_download_speed"].append((timestamp, download_speed))

        # 每张网卡的实时上传/下载速率
        try:
            nic_counters = psutil.net_io_counters(pernic=True) or {}
            for nic, c in nic_counters.items():
                if nic not in NET_IO_NIC_HISTORY:
                    NET_IO_NIC_HISTORY[nic] = {"up": [], "down": []}
                last = _NET_IO_NIC_LAST.get(nic)
                if last:
                    dt = timestamp - last[2]
                    if dt > 0.1:
                        up_kbs = max(0.0, (c.bytes_sent - last[0]) / 1024 / dt)
                        down_kbs = max(0.0, (c.bytes_recv - last[1]) / 1024 / dt)
                        hist = NET_IO_NIC_HISTORY[nic]
                        hist["up"].append((timestamp, round(up_kbs, 1)))
                        hist["down"].append((timestamp, round(down_kbs, 1)))
                        for kk in hist:
                            hist[kk] = [x for x in hist[kk] if timestamp - x[0] <= CACHE_DURATION]
                _NET_IO_NIC_LAST[nic] = (c.bytes_sent, c.bytes_recv, timestamp)
        except Exception:
            pass

        # 磁盘 IO（按物理磁盘聚合：读写速率 KB/s + 忙碌/等待占比 %）
        try:
            io_counters = psutil.disk_io_counters(perdisk=True) or {}
            cur = {}
            is_linux = platform.system() == "Linux"
            for k, c in io_counters.items():
                if is_linux and k.startswith("loop"):
                    continue  # 跳过循环设备，避免与分区过滤口径不一致
                pd = map_physical_disk(k)
                rb, wb = c.read_bytes, c.write_bytes
                bt = getattr(c, "busy_time", 0) or 0  # 仅 Linux 可用
                if pd in cur:
                    cur[pd][0] += rb; cur[pd][1] += wb; cur[pd][2] += bt
                else:
                    cur[pd] = [rb, wb, bt]
            for pd, (rb, wb, bt) in cur.items():
                last = _DISK_IO_LAST.get(pd)
                if last:
                    dt = timestamp - last[3]
                    if dt > 0.1:
                        read_kbs = (rb - last[0]) / 1024 / dt
                        write_kbs = (wb - last[1]) / 1024 / dt
                        busy_pct = ((bt - last[2]) / 1000 / dt * 100) if (bt - last[2]) > 0 else 0
                        hist = DISK_IO_HISTORY.setdefault(pd, {"read": [], "write": [], "busy": []})
                        hist["read"].append((timestamp, round(read_kbs, 1)))
                        hist["write"].append((timestamp, round(write_kbs, 1)))
                        hist["busy"].append((timestamp, round(min(busy_pct, 100), 1)))
                        for kk in hist:
                            hist[kk] = [x for x in hist[kk] if timestamp - x[0] <= CACHE_DURATION]
                _DISK_IO_LAST[pd] = (rb, wb, bt, timestamp)
        except Exception:
            pass

        # 系统负载
        if hasattr(psutil, 'getloadavg'):
            load_avg = psutil.getloadavg()[0]
            DATA_CACHE["system_load"].append((timestamp, round(load_avg, 2)))

        # 进程数量
        process_count = len(psutil.pids())
        DATA_CACHE["process_count"].append((timestamp, process_count))

        # 进程监测（只读，前 20 按 CPU 降序）
        try:
            gpu_mem = get_gpu_process_memory()
            proc_list = []
            io_snapshot = {}
            for p in psutil.process_iter(['pid', 'name']):
                try:
                    pid = p.info['pid']
                    name = p.info['name'] or "—"
                    cpu = p.cpu_percent(interval=None)  # 需上轮基线，首轮为 0
                    mem = p.memory_percent()
                    try:
                        io = p.io_counters()
                        rb, wb = io.read_bytes, io.write_bytes
                    except Exception:
                        rb, wb = 0, 0
                except (psutil.NoSuchProcess, psutil.AccessDenied, ValueError):
                    continue
                # 磁盘速率（KB/s）
                disk_read = disk_write = 0.0
                last = _PROC_IO_LAST.get(pid)
                if last:
                    dt = timestamp - last[2]
                    if dt > 0.1:
                        disk_read = max(0.0, (rb - last[0]) / 1024 / dt)
                        disk_write = max(0.0, (wb - last[1]) / 1024 / dt)
                io_snapshot[pid] = (rb, wb, timestamp)
                proc_list.append({
                    "pid": pid,
                    "name": name[:60],
                    "cpu": round(cpu, 1),
                    "mem": round(mem, 1),
                    "disk_read": round(disk_read, 1),
                    "disk_write": round(disk_write, 1),
                    "net_up": 0.0,
                    "net_down": 0.0,
                    "gpu": gpu_mem.get(pid, 0),  # MB；0 表示未用 GPU
                })
            for pid in list(_PROC_IO_LAST.keys()):
                if pid not in io_snapshot:
                    del _PROC_IO_LAST[pid]
            _PROC_IO_LAST.update(io_snapshot)
            # 进程网络速率（Linux：/proc/<pid>/net/dev 累计收发；Windows 无简易 API，留 0）
            net_snapshot = {}
            if platform.system() == "Linux":
                for p in proc_list:
                    pid = p["pid"]
                    try:
                        rx = tx = 0
                        with open(f"/proc/{pid}/net/dev", "r", errors="ignore") as f:
                            for line in f.readlines()[2:]:
                                parts = line.split(":")
                                if len(parts) != 2:
                                    continue
                                cols = parts[1].split()
                                rx += int(cols[0]); tx += int(cols[8])
                        last = _PROC_NET_LAST.get(pid)
                        if last:
                            dt = timestamp - last[2]
                            if dt > 0.1:
                                p["net_down"] = round(max(0.0, (rx - last[0]) / 1024 / dt), 1)
                                p["net_up"] = round(max(0.0, (tx - last[1]) / 1024 / dt), 1)
                        net_snapshot[pid] = (rx, tx, timestamp)
                    except (OSError, ValueError, IndexError):
                        net_snapshot[pid] = _PROC_NET_LAST.get(pid, (0, 0, timestamp))
                for pid in list(_PROC_NET_LAST.keys()):
                    if pid not in net_snapshot:
                        del _PROC_NET_LAST[pid]
                _PROC_NET_LAST.update(net_snapshot)
            proc_list.sort(key=lambda x: x["cpu"], reverse=True)
            DATA_CACHE["processes"] = proc_list[:20]
        except Exception:
            pass

        # 电池状态（show_battery 为 false 时跳过采集）
        if get_display_config().get("show_battery", True):
            if hasattr(psutil, 'sensors_battery'):
                battery = psutil.sensors_battery()
                if battery:
                    DATA_CACHE["battery_info"] = {
                        "percent": battery.percent,
                        "plugged": battery.power_plugged,
                        "secsleft": battery.secsleft
                    }

        # CPU温度
        if hasattr(psutil, 'sensors_temperatures'):
            temps = psutil.sensors_temperatures()
            if 'coretemp' in temps:
                cpu_temp = temps['coretemp'][0].current
                DATA_CACHE["cpu_temperature"].append((timestamp, round(cpu_temp, 1)))
            elif 'acpitz' in temps:
                cpu_temp = temps['acpitz'][0].current
                DATA_CACHE["cpu_temperature"].append((timestamp, round(cpu_temp, 1)))
            elif 'k10temp' in temps:
                cpu_temp = temps['k10temp'][0].current
                DATA_CACHE["cpu_temperature"].append((timestamp, round(cpu_temp, 1)))

        # 每10秒更新缓存文件
        cache_update_counter += 1
        if cache_update_counter >= 10:
            update_cache_file()
            cache_update_counter = 0

        time.sleep(1)

def update_cache_file():
    """更新缓存文件"""
    try:
        hardware_info = get_hardware_info()
        DATA_CACHE["gpu_vendor"] = (hardware_info.get("gpu") or {}).get("brand", "nvidia")

        cache_data = {
            "hardware_info": hardware_info,
            "real_time_data": {
                "cpu_usage": DATA_CACHE["cpu_usage"],
                "mem_usage": DATA_CACHE["mem_usage"],
                "gpu_usage": DATA_CACHE["gpu_usage"],
                "gpu_intel_details": DATA_CACHE.get("gpu_intel_details"),
                "net_upload_speed": DATA_CACHE["net_upload_speed"],
                "net_download_speed": DATA_CACHE["net_download_speed"],
                "cpu_core_usage": DATA_CACHE["cpu_core_usage"] or [],
                "cpu_core_freq": DATA_CACHE["cpu_core_freq"] or [],
                "cpu_freq": DATA_CACHE["cpu_freq"],
                "system_load": DATA_CACHE["system_load"],
                "process_count": DATA_CACHE["process_count"],
                "cpu_temperature": DATA_CACHE["cpu_temperature"],
                "boot_time": DATA_CACHE["boot_time"],
                "battery_info": DATA_CACHE["battery_info"],
                "timestamp": time.time()
            },
            "disk_usage": hardware_info["disks"]
        }

        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"缓存更新失败: {e}")

def restore_from_cache():
    """从缓存文件恢复数据"""
    try:
        if not os.path.exists(CACHE_FILE):
            return

        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)

        if "real_time_data" in cache_data:
            rt_data = cache_data["real_time_data"]
            for key in ["cpu_usage", "mem_usage", "gpu_usage", "net_upload_speed",
                       "net_download_speed", "system_load", "process_count", "cpu_temperature"]:
                if key in rt_data and isinstance(rt_data[key], list):
                    DATA_CACHE[key] = rt_data[key]

            if "cpu_core_usage" in rt_data:
                DATA_CACHE["cpu_core_usage"] = rt_data["cpu_core_usage"]
            if "cpu_core_freq" in rt_data:
                DATA_CACHE["cpu_core_freq"] = rt_data["cpu_core_freq"]
            if "cpu_freq" in rt_data:
                DATA_CACHE["cpu_freq"] = rt_data["cpu_freq"]
            if "boot_time" in rt_data:
                DATA_CACHE["boot_time"] = rt_data["boot_time"]
            if "battery_info" in rt_data:
                DATA_CACHE["battery_info"] = rt_data["battery_info"]

        print("从缓存恢复数据成功")
    except Exception as e:
        print(f"从缓存恢复数据失败: {e}")

def get_real_time_data() -> Dict:
    """获取实时数据"""
    def format_data(data: List) -> List:
        # 转换为毫秒级时间戳（ECharts需要）
        return [[int(round(t * 1000)), val] for t, val in data]

    def format_disk_io(hist: Dict) -> Dict:
        out = {}
        for pd, series in hist.items():
            out[pd] = {
                "read": format_data(series.get("read", [])),
                "write": format_data(series.get("write", [])),
                "busy": format_data(series.get("busy", [])),
            }
        return out

    def format_net_io_per_nic() -> Dict:
        out = {}
        for nic, series in NET_IO_NIC_HISTORY.items():
            out[nic] = {
                "up": format_data(series.get("up", [])),
                "down": format_data(series.get("down", [])),
            }
        return out

    return {
        "cpu_usage": format_data(DATA_CACHE["cpu_usage"]),
        "mem_usage": format_data(DATA_CACHE["mem_usage"]),
        "gpu_usage": format_data(DATA_CACHE["gpu_usage"]),
        "net_upload_speed": format_data(DATA_CACHE["net_upload_speed"]),
        "net_download_speed": format_data(DATA_CACHE["net_download_speed"]),
        "net_io_per_nic": format_net_io_per_nic(),
        "system_load": format_data(DATA_CACHE["system_load"]),
        "process_count": format_data(DATA_CACHE["process_count"]),
        "cpu_temperature": format_data(DATA_CACHE["cpu_temperature"]),
        "cpu_core_usage": DATA_CACHE["cpu_core_usage"],
        "cpu_core_freq": DATA_CACHE["cpu_core_freq"],
        "cpu_freq": format_data(DATA_CACHE["cpu_freq"]),
        "boot_time": DATA_CACHE["boot_time"],
        "battery_info": DATA_CACHE["battery_info"],
        "disk_io": format_disk_io(DISK_IO_HISTORY),
        "processes": DATA_CACHE["processes"],
        "timestamp": time.time()
    }

def get_full_snapshot() -> Dict:
    """获取完整监控快照：硬件信息 + 实时数据 + 磁盘"""
    hardware_info = get_hardware_info()
    return {
        "hardware_info": hardware_info,
        "real_time_data": get_real_time_data(),
        "disk_usage": hardware_info["disks"],
        "timestamp": time.time(),
    }
