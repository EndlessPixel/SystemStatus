# 在程序最顶部（任何 import wmi / pythoncom 之前）加两行
import os
os.environ["PYTHONFAULTHANDLER"] = "0"          # 可选
import sys
if sys.platform == "win32":
    import win32api
    win32api.SetConsoleCtrlHandler(None, 0)     # 屏蔽部分无用调试
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psutil
import time
import threading
from typing import Dict, List, Optional
import json
import platform
import os
import wmi  # Intel核显检测
try:
    import py3nvml.py3nvml as nvml
    NVML_AVAILABLE = True
except ImportError:
    NVML_AVAILABLE = False

# 初始化FastAPI
app = FastAPI(title="System Monitor API")

# 配置跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据缓存（新增网卡流量）
DATA_CACHE = {
    "cpu_usage": [],          # [(timestamp, usage), ...]
    "mem_usage": [],          # [(timestamp, usage), ...]
    "gpu_usage": [],          # [(timestamp, usage), ...]
    "cpu_core_usage": [],     # 每个核心的占用率
    "net_upload_speed": [],   # 上传速度 (KB/s)
    "net_download_speed": [], # 下载速度 (KB/s)
}
CACHE_DURATION = 120  # 2分钟缓存
CACHE_FILE = "tmp.json"

# 网卡流量初始值（用于计算速度）
net_io_counters = psutil.net_io_counters()
last_net_bytes_sent = net_io_counters.bytes_sent
last_net_bytes_recv = net_io_counters.bytes_recv
last_net_time = time.time()

# ========== 硬件信息获取 ==========
def get_cpu_model() -> str:
    """获取CPU型号"""
    try:
        if platform.system() == "Windows":
            import subprocess
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
            import subprocess
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

    # ===== 1. Windows 平台优先用 wmi 取 Intel 核显 =====
    if platform.system() == "Windows":
        try:
            import pythoncom              # COM 初始化
            pythoncom.CoInitialize()      # 必须在 wmi 之前调用
            import wmi
            c = wmi.WMI()
            for adapter in c.Win32_VideoController():
                if "Intel" in adapter.Name:
                    gpu_info = {"model": adapter.Name.strip(), "available": True}
                    break
        except Exception as e:
            # 仅打印一次，避免刷屏
            print("wmi 检测失败:", repr(e))
        finally:
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass

    # 如果已找到 Intel 核显，直接返回
    if gpu_info["available"]:
        return gpu_info

    # ===== 2. 尝试 NVIDIA 独显 =====
    global NVML_AVAILABLE               # 允许修改全局开关
    if NVML_AVAILABLE:
        try:
            nvml.nvmlInit()
            device_count = nvml.nvmlDeviceGetCount()
            if device_count > 0:
                handle = nvml.nvmlDeviceGetHandleByIndex(0)
                name = nvml.nvmlDeviceGetName(handle).decode("utf-8")
                gpu_info = {"model": name, "available": True}
        except Exception as e:
            print("NVML 检测失败:", repr(e))
            NVML_AVAILABLE = False      # 以后不再尝试 NVML
        finally:
            try:
                nvml.nvmlShutdown()
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
    # 网卡（基础信息）
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

# ========== 数据采集 + 缓存 ==========
def calculate_net_speed():
    """计算网卡上传/下载速度（KB/s）"""
    global last_net_bytes_sent, last_net_bytes_recv, last_net_time
    current_time = time.time()
    time_diff = current_time - last_net_time
    
    if time_diff < 0.1:  # 避免除以0
        return 0, 0
    
    # 获取当前流量
    current_net = psutil.net_io_counters()
    sent_diff = current_net.bytes_sent - last_net_bytes_sent
    recv_diff = current_net.bytes_recv - last_net_bytes_recv
    
    # 转换为KB/s
    upload_speed = round(sent_diff / 1024 / time_diff, 2)
    download_speed = round(recv_diff / 1024 / time_diff, 2)
    
    # 更新上次值
    last_net_bytes_sent = current_net.bytes_sent
    last_net_bytes_recv = current_net.bytes_recv
    last_net_time = current_time
    
    return upload_speed, download_speed

def collect_real_time_data():
    """定时采集所有实时数据（含网卡流量）"""
    cache_update_counter = 0
    while True:
        timestamp = time.time()
        
        # 1. 清理过期缓存
        for key in ["cpu_usage", "mem_usage", "gpu_usage", "net_upload_speed", "net_download_speed"]:
            DATA_CACHE[key] = [item for item in DATA_CACHE[key] if timestamp - item[0] <= CACHE_DURATION]
        
        # 2. 采集基础数据
        DATA_CACHE["cpu_usage"].append((timestamp, psutil.cpu_percent(interval=None)))
        DATA_CACHE["mem_usage"].append((timestamp, psutil.virtual_memory().percent))
        DATA_CACHE["cpu_core_usage"] = psutil.cpu_percent(interval=None, percpu=True)
        
        # 3. GPU占用率
        gpu_usage = 0
        if NVML_AVAILABLE:
            try:
                handle = nvml.nvmlDeviceGetHandleByIndex(0)
                gpu_usage = nvml.nvmlDeviceGetUtilizationRates(handle).gpu
            except:
                pass
        DATA_CACHE["gpu_usage"].append((timestamp, gpu_usage))
        
        # 4. 网卡流量速度
        upload_speed, download_speed = calculate_net_speed()
        DATA_CACHE["net_upload_speed"].append((timestamp, upload_speed))
        DATA_CACHE["net_download_speed"].append((timestamp, download_speed))
        
        # 5. 每10秒更新缓存文件
        cache_update_counter += 1
        if cache_update_counter >= 10:
            update_cache_file()
            cache_update_counter = 0
        
        time.sleep(1)

def update_cache_file():
    """更新缓存文件（含网卡流量）"""
    try:
        cache_data = {
            "hardware_info": get_hardware_info(),
            "real_time_data": {
                "cpu_usage": DATA_CACHE["cpu_usage"][-1][1] if DATA_CACHE["cpu_usage"] else 0,
                "mem_usage": DATA_CACHE["mem_usage"][-1][1] if DATA_CACHE["mem_usage"] else 0,
                "gpu_usage": DATA_CACHE["gpu_usage"][-1][1] if DATA_CACHE["gpu_usage"] else 0,
                "net_upload_speed": DATA_CACHE["net_upload_speed"][-1][1] if DATA_CACHE["net_upload_speed"] else 0,
                "net_download_speed": DATA_CACHE["net_download_speed"][-1][1] if DATA_CACHE["net_download_speed"] else 0,
                "cpu_core_usage": DATA_CACHE["cpu_core_usage"] or [],
                "timestamp": time.time()
            },
            "disk_usage": get_hardware_info()["disks"]
        }
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"缓存更新失败: {e}")

# ========== API接口 ==========
@app.get("/api/hardware-info")
async def hardware_info():
    return get_hardware_info()

@app.get("/api/real-time-data")
async def real_time_data():
    """实时数据（含网卡流量）"""
    def format_data(data: List) -> List:
        return [[round(t, 0), val] for t, val in data]
    
    return {
        "cpu_usage": format_data(DATA_CACHE["cpu_usage"]),
        "mem_usage": format_data(DATA_CACHE["mem_usage"]),
        "gpu_usage": format_data(DATA_CACHE["gpu_usage"]),
        "net_upload_speed": format_data(DATA_CACHE["net_upload_speed"]),
        "net_download_speed": format_data(DATA_CACHE["net_download_speed"]),
        "cpu_core_usage": DATA_CACHE["cpu_core_usage"],
        "timestamp": time.time()
    }

@app.get("/api/disk-usage")
async def disk_usage():
    return get_hardware_info()["disks"]

@app.get("/api/cache")
async def get_cache():
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {"error": "缓存文件不存在"}

# ========== 启动 ==========
if __name__ == "__main__":
    # 初始化缓存
    update_cache_file()
    # 启动采集线程
    collect_thread = threading.Thread(target=collect_real_time_data, daemon=True)
    collect_thread.start()
    # 启动服务
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)