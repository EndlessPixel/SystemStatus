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
from .hardware import get_hardware_info, NVML_AVAILABLE, NVML_HANDLE, shutdown_nvml

# 数据缓存
DATA_CACHE = {
    "cpu_usage": [],
    "mem_usage": [],
    "gpu_usage": [],
    "cpu_core_usage": [],
    "net_upload_speed": [],
    "net_download_speed": [],
    "system_load": [],
    "process_count": [],
    "boot_time": 0,
    "battery_info": {},
    "cpu_temperature": [],
}

CACHE_DURATION = 120  # 2分钟缓存
CACHE_FILE = "tmp.json"

# 网卡流量初始值
net_io_counters = psutil.net_io_counters()
last_net_bytes_sent = net_io_counters.bytes_sent
last_net_bytes_recv = net_io_counters.bytes_recv
last_net_time = time.time()

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
                    "net_download_speed", "system_load", "process_count", "cpu_temperature"]:
            DATA_CACHE[key] = [item for item in DATA_CACHE[key] if timestamp - item[0] <= CACHE_DURATION]

        # 采集基础数据
        DATA_CACHE["cpu_usage"].append((timestamp, psutil.cpu_percent(interval=None)))
        DATA_CACHE["mem_usage"].append((timestamp, psutil.virtual_memory().percent))
        DATA_CACHE["cpu_core_usage"] = psutil.cpu_percent(interval=None, percpu=True)

        # GPU占用率
        gpu_usage = 0
        if NVML_AVAILABLE and NVML_HANDLE is not None:
            try:
                import py3nvml.py3nvml as nvml
                gpu_usage = nvml.nvmlDeviceGetUtilizationRates(NVML_HANDLE).gpu
            except Exception:
                shutdown_nvml()

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

        # 系统负载
        if hasattr(psutil, 'getloadavg'):
            load_avg = psutil.getloadavg()[0]
            DATA_CACHE["system_load"].append((timestamp, round(load_avg, 2)))

        # 进程数量
        process_count = len(psutil.pids())
        DATA_CACHE["process_count"].append((timestamp, process_count))

        # 电池状态
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

        cache_data = {
            "hardware_info": hardware_info,
            "real_time_data": {
                "cpu_usage": DATA_CACHE["cpu_usage"],
                "mem_usage": DATA_CACHE["mem_usage"],
                "gpu_usage": DATA_CACHE["gpu_usage"],
                "net_upload_speed": DATA_CACHE["net_upload_speed"],
                "net_download_speed": DATA_CACHE["net_download_speed"],
                "cpu_core_usage": DATA_CACHE["cpu_core_usage"] or [],
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

    return {
        "cpu_usage": format_data(DATA_CACHE["cpu_usage"]),
        "mem_usage": format_data(DATA_CACHE["mem_usage"]),
        "gpu_usage": format_data(DATA_CACHE["gpu_usage"]),
        "net_upload_speed": format_data(DATA_CACHE["net_upload_speed"]),
        "net_download_speed": format_data(DATA_CACHE["net_download_speed"]),
        "system_load": format_data(DATA_CACHE["system_load"]),
        "process_count": format_data(DATA_CACHE["process_count"]),
        "cpu_temperature": format_data(DATA_CACHE["cpu_temperature"]),
        "cpu_core_usage": DATA_CACHE["cpu_core_usage"],
        "boot_time": DATA_CACHE["boot_time"],
        "battery_info": DATA_CACHE["battery_info"],
        "timestamp": time.time()
    }
