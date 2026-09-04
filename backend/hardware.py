"""
硬件信息获取模块
包括CPU、内存、GPU、网卡、硬盘等信息
"""
import platform
import os
import psutil
import re
import time
import locale
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
    获取 GPU 信息（NVIDIA/Intel/AMD 跨平台识别）
    返回: {"model": "显卡名称", "available": bool, "brand": "nvidia|intel|amd|unknown"}
    """
    # ===== 1. NVIDIA 独显（NVML 优先）=====
    global NVML_AVAILABLE, NVML_HANDLE
    if NVML_AVAILABLE and NVML_HANDLE is not None:
        try:
            import py3nvml.py3nvml as nvml
            name = nvml.nvmlDeviceGetName(NVML_HANDLE).decode("utf-8")
            return {"model": name, "available": True, "brand": "nvidia"}
        except Exception:
            pass

    # ===== 2. Windows：WMI 取显示适配器（含 Intel 核显 / AMD）=====
    if platform.system() == "Windows":
        try:
            result = subprocess.run(
                ['powershell', '-Command',
                 'Get-CimInstance Win32_VideoController | Select-Object Name,AdapterCompatibility | '
                 'ForEach-Object { "$($_.AdapterCompatibility)|$($_.Name)" }'],
                capture_output=True, text=True, timeout=5, encoding='utf-8', errors='ignore'
            )
            if result.returncode == 0:
                lines = [l for l in result.stdout.strip().split('\n') if l.strip()]
                if lines:
                    chosen = next((l for l in lines if 'intel' in l.lower() or 'amd' in l.lower()
                                   or 'radeon' in l.lower()), lines[0])
                    comp, name = chosen.split('|', 1) if '|' in chosen else ('', chosen)
                    brand = 'intel' if 'intel' in comp.lower() else ('amd' if ('amd' in comp.lower() or 'radeon' in comp.lower()) else 'unknown')
                    return {"model": name.strip(), "available": True, "brand": brand}
        except Exception:
            pass
        return {"model": "Unknown", "available": False, "brand": "unknown"}

    # ===== 3. Linux：lspci 取显示控制器（Intel 核显 / AMD）=====
    try:
        result = subprocess.run(
            ['lspci', '-nn'],
            capture_output=True, text=True, timeout=5, encoding='utf-8', errors='ignore'
        )
        if result.returncode == 0:
            gpus = [l for l in result.stdout.strip().split('\n')
                    if 'VGA' in l or '3D' in l or 'Display' in l]
            if gpus:
                chosen = next((l for l in gpus if 'intel' in l.lower() or 'amd' in l.lower()
                               or 'radeon' in l.lower() or 'advanced micro' in l.lower()), gpus[0])
                # 格式：00:02.0 VGA compatible controller [0300]: Intel Corporation ... [8086:46a3] (rev 0c)
                # 真实型号在第一个 "]: " 之后；再去掉结尾的 [vendor:device] 与 (rev)
                name = chosen.split(']:', 1)[1].strip() if ']:' in chosen else chosen.strip()
                name = re.sub(r'\s*\[[0-9a-fA-F]{4}:[0-9a-fA-F]{4}\]\s*$', '', name)
                name = re.sub(r'\s*\(rev[^)]*\)\s*$', '', name).strip()
                brand = 'intel' if 'intel' in name.lower() else ('amd' if ('amd' in name.lower() or 'radeon' in name.lower()) else 'unknown')
                return {"model": name, "available": True, "brand": brand}
    except Exception:
        pass

    return {"model": "Unknown", "available": False, "brand": "unknown"}


def get_intel_gpu_usage() -> object:
    """
    通过 intel_gpu_top -J -s 1000 获取 Intel 显卡更多信息。
    Linux：需 root 权限且安装 intel-gpu-tools；解析渲染引擎占用(利用率)、频率、功耗。
    Windows：从 GPU Engine 性能计数器按 Intel 实例过滤总利用率。
    返回 dict {"utilization","frequency","power_draw"} 或 None（无权限/未安装时绝不伪造 0）。
    内部带 2 秒节流缓存：intel_gpu_top 启动较慢，避免每秒 fork 拖垮采集循环。
    """
    global _INTEL_GPU_CACHE
    now = time.time()
    if now - _INTEL_GPU_CACHE.get("ts", 0) < 2:
        return _INTEL_GPU_CACHE.get("data")
    data = None
    try:
        if platform.system() == "Linux":
            result = subprocess.run(
                ['intel_gpu_top', '-J', '-s', '1000'],
                capture_output=True, text=True, timeout=8, encoding='utf-8', errors='ignore'
            )
            if result.returncode == 0 and result.stdout.strip():
                import json as _json
                d = _json.loads(result.stdout)
                engines = d.get("engines", {}) or {}
                # 渲染引擎占用即近似 GPU 利用率
                util = None
                for key in ("render", "rcs", "rcs0", "Render/3D"):
                    if isinstance(engines.get(key), dict) and isinstance(engines[key].get("busy"), (int, float)):
                        util = round(float(engines[key]["busy"]), 1)
                        break
                if util is None:
                    vals = [e.get("busy") for e in engines.values()
                            if isinstance(e, dict) and isinstance(e.get("busy"), (int, float))]
                    util = round(max(vals), 1) if vals else None
                # 频率
                freq = None
                f = d.get("frequency") or {}
                if isinstance(f, dict):
                    freq = f.get("actual") or f.get("requested") or f.get("cur") or f.get("current")
                # 功耗
                power = None
                p = d.get("power") or {}
                if isinstance(p, dict):
                    power = p.get("value")
                data = {
                    "utilization": util,
                    "frequency": int(freq) if freq is not None else None,
                    "power_draw": round(float(power), 1) if power is not None else None,
                }
        elif platform.system() == "Windows":
            result = subprocess.run(
                ['powershell', '-Command',
                 '(Get-Counter "\\GPU Engine(*)% 3D Utilization").CounterSamples | '
                 'Where-Object { $_.InstanceName -like "*intel*" } | Select-Object -ExpandProperty CookedValue'],
                capture_output=True, text=True, timeout=3, encoding='utf-8', errors='ignore'
            )
            if result.returncode == 0:
                vals = [float(x.strip()) for x in result.stdout.strip().split('\n')
                        if x.strip().replace('.', '', 1).isdigit()]
                if vals:
                    data = {"utilization": round(max(vals), 1), "frequency": None, "power_draw": None}
    except Exception:
        data = None
    _INTEL_GPU_CACHE = {"ts": now, "data": data}
    return data


_INTEL_GPU_CACHE = {"ts": 0, "data": None}


def get_gpu_details() -> Dict:
    """
    获取 GPU 详细信息（NVIDIA 用 NVML；Intel/AMD 由 intel_gpu_top 补充利用率/频率/功耗）
    返回: {"available": bool, "model", "memory_total", "memory_used",
           "temperature", "power_draw", "power_limit", "utilization", "brand", "frequency"}
    """
    info = get_gpu_info()
    details = {
        "available": info.get("available", False),
        "model": info.get("model", "Unknown"),
        "brand": info.get("brand", "unknown"),
        "memory_total": None,
        "memory_used": None,
        "temperature": None,
        "power_draw": None,
        "power_limit": None,
        "utilization": None,
        "frequency": None
    }
    global NVML_AVAILABLE, NVML_HANDLE
    if not (NVML_AVAILABLE and NVML_HANDLE is not None):
        # 非 NVIDIA（Intel/AMD）：尝试 intel_gpu_top 补充利用率/频率/功耗
        ig = get_intel_gpu_usage()
        if isinstance(ig, dict):
            details["utilization"] = ig.get("utilization")
            details["frequency"] = ig.get("frequency")
            details["power_draw"] = ig.get("power_draw")
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


def _df_partitions() -> List[Dict]:
    """
    LXC / 容器等 psutil.disk_partitions 读不到挂载点时，回退用 findmnt 解析挂载表。
    用 findmnt 而非 df：findmnt 只读挂载表、不 stat 远程文件系统，不会卡在故障挂载点。
    返回与 disk_partitions 同构的 dict 列表：{device, fstype, mountpoint, opts}
    """
    out = []
    try:
        env = dict(os.environ)
        env["LC_ALL"] = "C"
        result = subprocess.run(
            ['findmnt', '--list', '-b', '-o', 'SOURCE,FSTYPE,TARGET'],
            capture_output=True, text=True, timeout=5, encoding='utf-8', errors='ignore', env=env
        )
        for line in result.stdout.strip().split('\n'):
            cols = line.split()
            if len(cols) < 3:
                continue
            device, fstype, mountpoint = cols[0], cols[1], ' '.join(cols[2:])
            if not mountpoint or not fstype or mountpoint == "TARGET" or fstype == "FSTYPE":
                continue
            out.append({"device": device, "fstype": fstype, "mountpoint": mountpoint, "opts": ""})
    except Exception:
        pass
    return out


def get_system_info() -> Dict:
    """获取操作系统/系统信息：版本、架构、语言/区域、上次启动时间"""
    # 系统版本
    system = platform.system()  # Windows / Linux / Darwin
    if system == "Linux":
        # 优先读取 /etc/os-release 的 PRETTY_NAME，比 platform 的散装字段更友好
        pretty = ""
        try:
            with open("/etc/os-release", "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("PRETTY_NAME="):
                        pretty = line.split("=", 1)[1].strip().strip('"')
                        break
        except Exception:
            pretty = ""
        os_version = pretty or f"{system} {platform.release()}"
    elif system == "Windows":
        # platform.release() 在 Windows 上给出 10 / 11 / Server 2022 等
        os_version = f"Windows {platform.release()}"
    else:
        os_version = f"{system} {platform.release()}"

    # 架构
    arch = platform.machine() or platform.architecture()[0]

    # 语言/区域
    lang = os.environ.get("LANG") or os.environ.get("LC_ALL")
    if not lang:
        try:
            loc = locale.getlocale()
            if loc and loc[0]:
                lang = ".".join([p for p in loc if p])
        except Exception:
            lang = ""
    if not lang:
        lang = "unknown"

    # 上次启动时间（Unix 时间戳）
    try:
        boot_time = psutil.boot_time()
    except Exception:
        boot_time = 0

    return {
        "os": os_version,
        "arch": arch,
        "lang": lang,
        "boot_time": boot_time
    }


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

    # 优先 psutil；在 LXC 等容器里 disk_partitions 常返回空或不完整，回退到 df
    raw_parts = [{"device": p.device, "fstype": p.fstype, "mountpoint": p.mountpoint, "opts": p.opts}
                 for p in psutil.disk_partitions(all=False)]
    if not raw_parts and platform.system() == "Linux":
        raw_parts = _df_partitions()

    for part in raw_parts:
        if "cdrom" in part["opts"] or part["fstype"] == "":
            continue
        # findmnt 回退会带出 tmpfs/devtmpfs 等虚拟文件系统，过滤掉明显无监控意义的类型
        # 注意：保留 overlay（LXC 容器根文件系统常是 overlay），不过滤
        if part["fstype"] in ("tmpfs", "devtmpfs", "efivarfs", "devpts", "sysfs", "proc",
                              "securityfs", "cgroup", "cgroup2", "debugfs", "tracefs",
                              "mqueue", "autofs", "binfmt_misc", "configfs", "fusectl", "pstore", "bpf"):
            continue
        # 命中任一过滤规则则跳过：设备名 / 挂载点 / 文件系统类型
        if part["device"] in filter_devices:
            continue
        if part["fstype"] in filter_fstypes:
            continue
        if any(
            part["mountpoint"] == mp or part["mountpoint"].startswith(mp.rstrip("/") + "/")
            for mp in filter_mountpoints
        ):
            continue
        # Linux 下过滤 /dev/loop* 循环设备（snap、docker 等挂载），避免冗余条目
        if platform.system() == "Linux" and part["device"].startswith("/dev/loop"):
            continue
        try:
            # 容器环境下 psutil.disk_usage 可能因权限抛错，改用更底层的 os.statvfs
            st = os.statvfs(part["mountpoint"])
            total = st.f_blocks * st.f_frsize
            free = st.f_bavail * st.f_frsize
            used = total - free
            if total <= 0:
                continue
            disks.append({
                "device": part["device"],
                "physical_disk": map_physical_disk(part["device"]),
                "mountpoint": part["mountpoint"],
                "fstype": part["fstype"],
                "total": round(total / (1024**3), 2),
                "used": round(used / (1024**3), 2),
                "usage_percent": round(used / total * 100, 1)
            })
        except Exception:
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
        "network": net_ifaces,
        "system": get_system_info()
    }
