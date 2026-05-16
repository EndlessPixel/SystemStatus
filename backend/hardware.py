"""
硬件信息获取模块
包括CPU、内存、GPU、网卡、硬盘等信息
"""
import platform
import psutil
from typing import Dict, List
import subprocess

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
            return output.strip()[:100]
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
    for part in psutil.disk_partitions(all=False):
        if "cdrom" in part.opts or part.fstype == "":
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
        "disks": disks,
        "gpu": gpu_info,
        "network": net_ifaces
    }
