from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psutil
import time
import threading
from typing import Dict, List, Optional
import json
import platform
import os
try:
    import py3nvml.py3nvml as nvml
    NVML_AVAILABLE = True
except ImportError:
    NVML_AVAILABLE = False

# 初始化FastAPI
app = FastAPI(title="System Monitor API")

# 配置跨域（解决前端跨域问题）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境请替换为具体前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据缓存（存储2分钟内的监控数据，按时间戳排序）
DATA_CACHE = {
    "cpu_usage": [],  # [(timestamp, usage), ...]
    "mem_usage": [],  # [(timestamp, usage), ...]
    "gpu_usage": [],  # [(timestamp, usage), ...]
    "cpu_core_usage": [],  # 每个核心的占用率（纯列表，不参与时间缓存）
}
CACHE_DURATION = 120  # 2分钟（秒）
CACHE_FILE = "tmp.json"  # 缓存文件路径

# 初始化显卡监控
if NVML_AVAILABLE:
    try:
        nvml.nvmlInit()
    except:
        NVML_AVAILABLE = False

def get_memory_model() -> str:
    """获取内存型号（Windows/Linux兼容）"""
    try:
        if platform.system() == "Windows":
            # Windows通过wmic获取内存信息
            import subprocess
            output = subprocess.check_output(
                'wmic memorychip get devicelocator,manufacturer,partnumber,capacity',
                shell=True,
                text=True,
                stderr=subprocess.DEVNULL
            )
            lines = [line.strip() for line in output.split('\n') if line.strip()]
            if len(lines) > 1:
                # 提取第一条内存信息
                parts = lines[1].split()
                if len(parts) >= 3:
                    return f"{parts[0]} {parts[1]} {parts[2]}"
            return "DDR (Windows)"
        elif platform.system() == "Linux":
            # Linux通过dmidecode获取（需安装dmidecode）
            output = subprocess.check_output(
                'dmidecode -t memory | grep -E "Manufacturer|Part Number|Size"',
                shell=True,
                text=True,
                stderr=subprocess.DEVNULL
            )
            return output.strip()[:100]  # 截取前100字符
        return "Unknown Memory"
    except:
        return "DDR Series"  # 兜底

def get_hardware_info() -> Dict:
    """获取硬件基础信息（兼容新版psutil）"""
    info = {}
    
    # CPU信息（兼容修复）
    info["cpu"] = {
        "model": get_cpu_model(),
        "cores": psutil.cpu_count(logical=True),
        "physical_cores": psutil.cpu_count(logical=False)
    }
    
    # 内存信息（补充型号）
    mem = psutil.virtual_memory()
    info["memory"] = {
        "total": round(mem.total / (1024**3), 2),  # GB
        "model": get_memory_model()  # 替换为实际内存型号
    }
    
    # 硬盘信息
    disks = []
    for part in psutil.disk_partitions(all=False):
        if "cdrom" in part.opts or part.fstype == "":
            continue
        try:
            usage = psutil.disk_usage(part.mountpoint)
        except:
            continue
        disks.append({
            "device": part.device,
            "mountpoint": part.mountpoint,
            "fstype": part.fstype,
            "total": round(usage.total / (1024**3), 2),
            "used": round(usage.used / (1024**3), 2),
            "usage_percent": round(usage.percent, 1)
        })
    info["disks"] = disks
    
    # 显卡信息
    info["gpu"] = {"model": "Unknown", "available": False}
    if NVML_AVAILABLE:
        try:
            handle = nvml.nvmlDeviceGetHandleByIndex(0)
            gpu_name = nvml.nvmlDeviceGetName(handle).decode("utf-8")
            info["gpu"] = {
                "model": gpu_name,
                "available": True
            }
        except:
            pass
    
    # 网卡信息
    net_ifaces = []
    for iface, addrs in psutil.net_if_addrs().items():
        if iface == "lo":
            continue
        net_ifaces.append({
            "name": iface,
            "addresses": [addr.address for addr in addrs if addr.family == 2]  # IPv4
        })
    info["network"] = net_ifaces
    
    return info

def get_cpu_model() -> str:
    """兼容不同系统和psutil版本的CPU型号获取"""
    try:
        # Windows系统
        if platform.system() == "Windows":
            import subprocess
            output = subprocess.check_output(
                'wmic cpu get name',
                shell=True,
                text=True,
                stderr=subprocess.DEVNULL
            )
            lines = [line.strip() for line in output.split('\n') if line.strip()]
            if len(lines) > 1:
                return lines[1]
        # Linux系统
        elif platform.system() == "Linux":
            with open('/proc/cpuinfo', 'r') as f:
                for line in f:
                    if line.startswith('model name'):
                        return line.split(':')[1].strip()
        # 备用方案（psutil兼容）
        return f"CPU ({psutil.cpu_count(logical=False)}核{psutil.cpu_count(logical=True)}线程)"
    except:
        return "Unknown CPU Model"

def update_cache_file():
    """更新tmp.json缓存文件（包含硬件信息+最新实时数据）"""
    try:
        # 组装完整缓存数据
        cache_data = {
            "hardware_info": get_hardware_info(),
            "real_time_data": {
                "cpu_usage": DATA_CACHE["cpu_usage"][-1][1] if DATA_CACHE["cpu_usage"] else 0,
                "mem_usage": DATA_CACHE["mem_usage"][-1][1] if DATA_CACHE["mem_usage"] else 0,
                "gpu_usage": DATA_CACHE["gpu_usage"][-1][1] if DATA_CACHE["gpu_usage"] else 0,
                "cpu_core_usage": DATA_CACHE["cpu_core_usage"] or [],
                "timestamp": time.time()
            },
            "disk_usage": get_hardware_info()["disks"]
        }
        
        # 写入缓存文件
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"更新缓存文件失败: {e}")

def collect_real_time_data():
    """定时采集实时数据（每秒一次）"""
    cache_update_counter = 0  # 每10秒更新一次缓存文件
    while True:
        timestamp = time.time()
        
        # 只清理带时间戳的缓存数据（排除cpu_core_usage）
        for key in ["cpu_usage", "mem_usage", "gpu_usage"]:
            DATA_CACHE[key] = [item for item in DATA_CACHE[key] if timestamp - item[0] <= CACHE_DURATION]
        
        # CPU整体占用率
        cpu_usage = psutil.cpu_percent(interval=None)
        DATA_CACHE["cpu_usage"].append((timestamp, cpu_usage))
        
        # 内存占用率
        mem_usage = psutil.virtual_memory().percent
        DATA_CACHE["mem_usage"].append((timestamp, mem_usage))
        
        # GPU占用率
        gpu_usage = 0
        if NVML_AVAILABLE:
            try:
                handle = nvml.nvmlDeviceGetHandleByIndex(0)
                gpu_usage = nvml.nvmlDeviceGetUtilizationRates(handle).gpu
            except:
                pass
        DATA_CACHE["gpu_usage"].append((timestamp, gpu_usage))
        
        # CPU核心占用率（纯列表，不存储时间戳）
        cpu_core_usage = psutil.cpu_percent(interval=None, percpu=True)
        DATA_CACHE["cpu_core_usage"] = cpu_core_usage  # 直接覆盖为最新值
        
        # 每10秒更新一次缓存文件
        cache_update_counter += 1
        if cache_update_counter >= 10:
            update_cache_file()
            cache_update_counter = 0
        
        time.sleep(1)

# 初始化缓存文件（启动时立即生成）
update_cache_file()

# 启动数据采集线程
collect_thread = threading.Thread(target=collect_real_time_data, daemon=True)
collect_thread.start()

# API接口：新增获取缓存文件接口
@app.get("/api/cache")
async def get_cache():
    """获取缓存文件数据"""
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {"error": "缓存文件不存在"}

# 原有API接口保持不变
@app.get("/api/hardware-info")
async def hardware_info():
    """获取硬件基础信息"""
    return get_hardware_info()

@app.get("/api/real-time-data")
async def real_time_data():
    """获取实时监控数据"""
    # 格式化时间戳为前端可用格式
    def format_data(data: List) -> List:
        return [[round(t, 0), val] for t, val in data]
    
    return {
        "cpu_usage": format_data(DATA_CACHE["cpu_usage"]),
        "mem_usage": format_data(DATA_CACHE["mem_usage"]),
        "gpu_usage": format_data(DATA_CACHE["gpu_usage"]),
        "cpu_core_usage": DATA_CACHE["cpu_core_usage"],
        "timestamp": time.time()
    }

@app.get("/api/disk-usage")
async def disk_usage():
    """获取硬盘占用信息"""
    return get_hardware_info()["disks"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)