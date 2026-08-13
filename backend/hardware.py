"""
硬件信息获取模块
包括CPU、内存、GPU、网卡、硬盘等信息
"""
import platform
import psutil
from typing import Dict, List
import subprocess
from backend.app_config import get_disk_filter

# NVML全局变量
NVML_AVAILABLE = False
NVML_HANDLE = None
NVML_PERMANENTLY_DISABLED = False

def init_nvml():
    """初始化NVML并获取设备句柄"""
    global NVML_AVAILABLE, NVML_HANDLE, NVML_PERMANENTLY_DISABLED

    if NVML_PERMANENTLY_DISABLED:
        return False

    if not NVML_AVAILABLE:
        return False

    try:
        import py3nvml.py3nvml as nvml
        nvml.nvmlInit()
        device_count = nvml.nvmlDeviceGetCount()
        if device_count > 0:
            NVML_HANDLE = nvml.nvmlDeviceGetHandleByIndex(0)
            print(f"NVML初始化成功，检测到 {device_count} 个NVIDIA设备")
            return True
        else:
            print("NVML初始化成功，但未检测到NVIDIA设备")
            NVML_AVAILABLE = False
            NVML_PERMANENTLY_DISABLED = True
            return False
    except Exception as e:
        print(f"NVML初始化失败: {repr(e)}")
        NVML_AVAILABLE = False
        NVML_PERMANENTLY_DISABLED = True
        return False

def shutdown_nvml():
    """关闭NVML"""
    global NVML_AVAILABLE, NVML_HANDLE
    if NVML_AVAILABLE and NVML_HANDLE is not None:
        try:
            import py3nvml.py3nvml as nvml
            nvml.nvmlShutdown()
            NVML_HANDLE = None
            print("NVML已关闭")
        except Exception:
            pass

def get_cpu_model() -> str:
    """获取CPU型号"""
    try:
        if platform.system() == "Windows":
            output = subprocess.check_output(
                'wmic cpu get name', shell=True, text=True, stderr=subprocess.DEVNULL
            )
            lines = [line.strip() for line in output.split('\n') if line.strip()]
            return lines[1] if len(lines) > 1 else "Unknown CPU"
        elif platform.system() == "Linux":
            with open('/proc/cpuinfo', 'r') as f:
                for line in f:
                    if line.startswith('model name'):
                        return line.split(':')[1].strip()
        return f"CPU ({psutil.cpu_count(logical=False)}核{psutil.cpu_count(logical=True)}线程)"
    except:
        return "Unknown CPU Model"

def get_memory_model() -> str:
    """获取内存型号"""
    try:
        if platform.system() == "Windows":
            output = subprocess.check_output(
                'wmic memorychip get devicelocator,manufacturer,partnumber',
                shell=True, text=True, stderr=subprocess.DEVNULL
            )
            lines = [line.strip() for line in output.split('\n') if line.strip()]
            return lines[1] if len(lines) > 1 else "DDR Series"
        elif platform.system() == "Linux":
            output = subprocess.check_output(
                'dmidecode -t memory | grep -E "Manufacturer|Part Number"',
                shell=True, text=True, stderr=subprocess.DEVNULL
            )
            lines = [line.strip() for line in output.split('\n') if line.strip()]
            parts = []
            for line in lines[:2]:
                if ':' in line:
                    parts.append(line.split(':', 1)[1].strip())
            return " ".join(p for p in parts if p) or "DDR Series"
        return "DDR Series"
    except:
        return "DDR Series"

def get_gpu_info() -> Dict:
    """
    获取 GPU 信息（Windows：Intel 核显 / NVIDIA 独显）
    返回: {"model": "显卡名称", "available": bool}
    """
    gpu_info = {"model": "Unknown", "available": False}

    # ===== 1. Windows 平台用 wmic 取 Intel 核显 =====
    if platform.system() == "Windows":
        try:
            result = subprocess.run(
                ['wmic', 'path', 'win32_VideoController', 'get', 'Name'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')[1:]
                for line in lines:
                    line = line.strip()
                    if line and "Intel" in line:
                        gpu_info = {"model": line, "available": True}
                        break
        except Exception:
            pass

    if gpu_info["available"]:
        return gpu_info

    # ===== 2. 尝试 NVIDIA 独显 =====
    global NVML_AVAILABLE, NVML_HANDLE
    if NVML_AVAILABLE and NVML_HANDLE is not None:
        try:
            import py3nvml.py3nvml as nvml
            name = nvml.nvmlDeviceGetName(NVML_HANDLE).decode("utf-8")
            gpu_info = {"model": name, "available": True}
        except Exception:
            pass

    return gpu_info


def get_gpu_details() -> Dict:
    """
    获取 GPU 详细信息（基于 NVML，仅 NVIDIA 独显可用）
    返回: {"available": bool, "model", "memory_total", "memory_used",
           "temperature", "power_draw", "power_limit", "utilization"}
    """
    details = {
        "available": False,
        "model": "Unknown",
        "memory_total": None,
        "memory_used": None,
        "temperature": None,
        "power_draw": None,
        "power_limit": None,
        "utilization": None
    }
    global NVML_AVAILABLE, NVML_HANDLE
    if not (NVML_AVAILABLE and NVML_HANDLE is not None):
        return details
    try:
        import py3nvml.py3nvml as nvml
        handle = NVML_HANDLE
        details["available"] = True
        try:
            details["model"] = nvml.nvmlDeviceGetName(handle).decode("utf-8")
        except Exception:
            pass
        try:
            mem = nvml.nvmlDeviceGetMemoryInfo(handle)
            details["memory_total"] = round(mem.total / (1024 ** 2), 0)  # MB
            details["memory_used"] = round(mem.used / (1024 ** 2), 0)     # MB
        except Exception:
            pass
        try:
            details["temperature"] = nvml.nvmlDeviceGetTemperature(
                handle, nvml.NVML_TEMPERATURE_GPU)
        except Exception:
            pass
        try:
            details["utilization"] = nvml.nvmlDeviceGetUtilizationRates(handle).gpu
        except Exception:
            pass
        try:
            details["power_draw"] = round(
                nvml.nvmlDeviceGetPowerUsage(handle) / 1000.0, 1)  # W
        except Exception:
            pass
        try:
            details["power_limit"] = round(
                nvml.nvmlDeviceGetEnforcedPowerLimit(handle) / 1000.0, 1)  # W
        except Exception:
            pass
    except Exception:
        pass
    return details


def get_memory_frequency() -> object:
    """
    获取内存频率（MHz），无法获取时返回 None
    跨平台：Linux 读取 dmidecode / sysfs，Windows 读取 wmic
    """
    try:
        if platform.system() == "Linux":
            # 优先尝试 dmidecode（需 root）
            try:
                out = subprocess.check_output(
                    "dmidecode -t memory 2>/dev/null | grep -i 'Speed' | "
                    "grep -iv 'Unknown' | head -1",
                    shell=True, text=True, stderr=subprocess.DEVNULL
                ).strip()
                if out:
                    # 形如 "Speed: 3200 MT/s" 或 "Speed: 3200 MHz"
                    parts = out.split(":")
                    if len(parts) > 1:
                        num = ''.join(c for c in parts[1] if c.isdigit())
                        if num:
                            return int(num)
            except Exception:
                pass
            # 回退：sysfs 中读取（部分机型可用）
            try:
                for path in (
                    "/sys/devices/system/edac/mc/mc0/dimm0/speed",
                    "/sys/class/dmi/id/memory/speed",
                ):
                    if os.path.exists(path):
                        with open(path, "r") as f:
                            v = f.read().strip()
                            num = ''.join(c for c in v if c.isdigit())
                            if num:
                                return int(num)
            except Exception:
                pass
        elif platform.system() == "Windows":
            out = subprocess.check_output(
                'wmic memorychip get speed',
                shell=True, text=True, stderr=subprocess.DEVNULL
            )
            lines = [l.strip() for l in out.split('\n') if l.strip().isdigit()]
            if lines:
                return int(lines[0])
    except Exception:
        pass
    return None


def get_disk_smart() -> List[Dict]:
    """
    获取硬盘 SMART 属性（需 smartmontools，Linux 下通常需要 root）
    返回: [{"device": ..., "model": ..., "attributes": [{id,name,value,thresh,raw,worst}], "available": bool}, ...]
    """
    results = []
    try:
        partitions = [p.device for p in psutil.disk_partitions(all=False)]
        # 去重磁盘设备（去掉分区号）
        disk_devs = set()
        for dev in partitions:
            if platform.system() == "Linux":
                # /dev/sda1 -> /dev/sda
                import re
                m = re.match(r"^(/dev/[a-z]+)", dev)
                if m:
                    disk_devs.add(m.group(1))
            else:
                disk_devs.add(dev)
        disk_devs = list(disk_devs)[:8]  # 最多 8 块盘，避免超时
        for dev in disk_devs:
            entry = {"device": dev, "model": "", "available": False,
                     "attributes": []}
            try:
                out = subprocess.check_output(
                    ["smartctl", "-A", dev],
                    text=True, stderr=subprocess.DEVNULL, timeout=8
                )
                entry["available"] = True
                # 解析型号
                for line in out.splitlines():
                    if line.startswith("Device Model"):
                        entry["model"] = line.split(":", 1)[1].strip()
                        break
                    if line.startswith("Model Family"):
                        entry["model"] = line.split(":", 1)[1].strip()
                        break
                # 解析属性表（ID# ATTRIBUTE_NAME FLAG VALUE WORST THRESH TYPE UPDATED WHEN_RAW ...）
                for line in out.splitlines():
                    cols = line.split()
                    if len(cols) >= 10 and cols[0].isdigit():
                        try:
                            entry["attributes"].append({
                                "id": int(cols[0]),
                                "name": cols[1],
                                "value": int(cols[3]),
                                "worst": int(cols[4]),
                                "thresh": int(cols[5]),
                                "raw": cols[9] if len(cols) > 9 else ""
                            })
                        except (ValueError, IndexError):
                            continue
            except Exception:
                pass
            results.append(entry)
    except Exception:
        pass
    return results

def get_hardware_info() -> Dict:
    """获取完整硬件信息"""
    # CPU
    cpu_info = {
        "model": get_cpu_model(),
        "cores": psutil.cpu_count(logical=True),
        "physical_cores": psutil.cpu_count(logical=False)
    }

    # 内存
    mem = psutil.virtual_memory()
    mem_info = {
        "total": round(mem.total / (1024**3), 2),
        "model": get_memory_model()
    }

    # 硬盘
    disks = []
    disk_filter = get_disk_filter()
    filter_devices = set(disk_filter.get("devices", []))
    filter_mountpoints = disk_filter.get("mountpoints", [])
    filter_fstypes = set(disk_filter.get("fstypes", []))

    for part in psutil.disk_partitions(all=False):
        if "cdrom" in part.opts or part.fstype == "":
            continue
        # 命中任一过滤规则则跳过：设备名 / 挂载点 / 文件系统类型
        if part.device in filter_devices:
            continue
        if part.fstype in filter_fstypes:
            continue
        if any(
            part.mountpoint == mp or part.mountpoint.startswith(mp.rstrip("/") + "/")
            for mp in filter_mountpoints
        ):
            continue
        # Linux 下过滤 /dev/loop* 循环设备（snap、docker 等挂载），避免冗余条目
        if platform.system() == "Linux" and part.device.startswith("/dev/loop"):
            continue
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disks.append({
                "device": part.device,
                "mountpoint": part.mountpoint,
                "fstype": part.fstype,
                "total": round(usage.total / (1024**3), 2),
                "used": round(usage.used / (1024**3), 2),
                "usage_percent": round(usage.percent, 1)
            })
        except:
            continue

    # 显卡
    gpu_info = get_gpu_info()
    gpu_details = get_gpu_details()

    # 内存频率
    mem_freq = get_memory_frequency()

    # 硬盘 SMART
    disk_smart = get_disk_smart()

    # 网卡（显示所有网卡）
    net_ifaces = []
    for iface, addrs in psutil.net_if_addrs().items():
        if iface == "lo":
            continue
        net_ifaces.append({
            "name": iface,
            "addresses": [addr.address for addr in addrs if addr.family == 2]
        })

    return {
        "cpu": cpu_info,
        "memory": mem_info,
        "mem_frequency": mem_freq,
        "disks": disks,
        "disk_smart": disk_smart,
        "gpu": gpu_info,
        "gpu_details": gpu_details,
        "network": net_ifaces
    }
