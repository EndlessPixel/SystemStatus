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
    跨平台：Linux 读取 dmidecode / EDAC sysfs / dmi sysfs，Windows 读取 wmic
    注意：dmidecode 与 sysfs(DMI/EDAC) 在多数 Linux 发行版下需要 root 权限；
          若以普通用户运行读不到，请用 sudo 运行本程序（推荐部署方式）。
    """
    # 合理内存频率范围（DDR3 800 ~ DDR5 8800 MHz 左右），用于过滤噪声
    MIN_MHZ, MAX_MHZ = 400, 12000

    def _extract_mhz(text: str) -> object:
        for line in text.splitlines():
            low = line.lower()
            # 仅匹配内存相关行，避免 PCI 设备的 clock 等噪声
            if "speed" in low and ("configured" in low or "current" in low or low.strip().startswith("speed")):
                num = ''.join(c for c in line if c.isdigit())
                if num:
                    v = int(num)
                    if MIN_MHZ <= v <= MAX_MHZ:
                        return v
            elif "speed" in low:  # 退一步：任何 Speed 行，仍做范围校验
                num = ''.join(c for c in line if c.isdigit())
                if num:
                    v = int(num)
                    if MIN_MHZ <= v <= MAX_MHZ:
                        return v
        return None

    try:
        if platform.system() == "Linux":
            # 1) dmidecode（需 root；普通用户无输出会静默失败）
            for cmd in ("dmidecode -t memory", "sudo -n dmidecode -t memory"):
                try:
                    out = subprocess.check_output(
                        f"timeout 5 {cmd} 2>/dev/null | grep -iE 'Speed' | grep -iv 'Unknown'",
                        shell=True, text=True, stderr=subprocess.DEVNULL
                    )
                    val = _extract_mhz(out)
                    if val:
                        return val
                except Exception:
                    pass

            # 2) sysfs：EDAC 多索引扫描（服务器常见，通常需 root）
            try:
                import glob
                for path in glob.glob("/sys/devices/system/edac/mc/mc*/dimm*/speed"):
                    with open(path, "r") as f:
                        num = ''.join(c for c in f.read().strip() if c.isdigit())
                        if num:
                            v = int(num)
                            if MIN_MHZ <= v <= MAX_MHZ:
                                return v
            except Exception:
                pass

            # 3) sysfs：dmi 内存速度（通常需 root）
            path = "/sys/class/dmi/id/memory/speed"
            try:
                if os.path.exists(path):
                    with open(path, "r") as f:
                        num = ''.join(c for c in f.read().strip() if c.isdigit())
                        if num:
                            v = int(num)
                            if MIN_MHZ <= v <= MAX_MHZ:
                                return v
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

def get_swap_info() -> Dict:
    """
    获取交换分区 / 页面文件信息（跨平台）
    - Linux/Unix: psutil.swap_memory()（swap 分区/文件）
    - Windows: psutil.swap_memory() 返回页面文件(pagefile)统计；
               额外用 PowerShell 探测页面文件配置（是否启用、是否系统托管、初始/最大大小）
    无法获取时返回 total=0 的结构，前端据此显示「无」
    """
    swap = psutil.swap_memory()
    info = {
        "total": round(swap.total / (1024**3), 2),
        "used": round(swap.used / (1024**3), 2),
        "free": round(swap.free / (1024**3), 2),
        "percent": round(swap.percent, 1),
        "sin": round(swap.sin / (1024**3), 2) if swap.sin else 0,
        "sout": round(swap.sout / (1024**3), 2) if swap.sout else 0,
        "pagefiles": []
    }

    # Windows 下补充页面文件配置详情
    if platform.system() == "Windows":
        try:
            result = subprocess.run(
                ['powershell', '-NoProfile', '-Command',
                 '(Get-CimInstance Win32_PageFileSetting | ForEach-Object {'
                 ' "$($_.Name)|$($_.InitialSize)|$($_.MaximumSize)|$($_.SystemManaged" }) -join "`n"'],
                capture_output=True, text=True, timeout=5, encoding='utf-8', errors='ignore'
            )
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    parts = line.split('|')
                    if len(parts) >= 4:
                        name = parts[0].strip()
                        try:
                            init = int(parts[1])
                        except ValueError:
                            init = 0
                        try:
                            maximum = int(parts[2])
                        except ValueError:
                            maximum = 0
                        system_managed = parts[3].strip().lower() in ("true", "1")
                        info["pagefiles"].append({
                            "name": name,
                            "initial_size_mb": init,
                            "maximum_size_mb": maximum,
                            "system_managed": system_managed
                        })
        except Exception:
            pass

    return info


def map_physical_disk(device: str) -> str:
    """
    将分区设备名映射到底层物理磁盘（用于把多个分区归为一个磁盘类）
    - Linux:  /dev/sda1  -> sda ; /dev/nvme0n1p3 -> nvme0n1 ; /dev/vdb2 -> vdb
    - Windows: 盘符如 C: 各自视为独立物理磁盘 -> "PHYSICALDRIVE0" 之类不易得，
               直接以盘符首字母作为分组键（如 "C"）。对无盘符设备回退原名。
    - macOS/其他：无法可靠解析时回退为设备名去分区后缀
    """
    if platform.system() == "Linux":
        d = device.split('/')[-1]
        # nvme* 形如 nvme0n1p3 -> nvme0n1；其他如 sda1 -> sda
        import re
        m = re.match(r'^(nvme\d+n\d+)(p\d+)?$', d)
        if m:
            return m.group(1)
        return re.sub(r'\d+$', '', d) or d
    if platform.system() == "Windows":
        # device 形如 "C:\\"；以盘符首字母分组
        letter = device.strip()[:1].upper()
        if letter.isalpha():
            return letter
        return device
    # 其它平台：去掉尾部数字分区号
    import re
    d = device.split('/')[-1]
    return re.sub(r'\d+$', '', d) or device


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
                "physical_disk": map_physical_disk(part.device),
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

    # 交换分区 / 页面文件
    swap_info = get_swap_info()

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

    physical_disks = []
    seen = set()
    for d in disks:
        pd = d.get("physical_disk")
        if pd and pd not in seen:
            seen.add(pd)
            physical_disks.append(pd)

    return {
        "cpu": cpu_info,
        "memory": mem_info,
        "mem_frequency": mem_freq,
        "swap": swap_info,
        "disks": disks,
        "physical_disks": physical_disks,
        "disk_smart": disk_smart,
        "gpu": gpu_info,
        "gpu_details": gpu_details,
        "network": net_ifaces
    }
