"""
API路由模块
提供所有REST API接口
"""
from fastapi import APIRouter
from typing import Dict
import json

from ..hardware import get_hardware_info
from ..monitor import get_real_time_data, DATA_CACHE, CACHE_FILE

api_router = APIRouter(prefix="/api")

@api_router.get("/hardware-info")
async def hardware_info():
    """获取硬件信息"""
    return get_hardware_info()

@api_router.get("/real-time-data")
async def real_time_data():
    """获取实时监控数据"""
    return get_real_time_data()

@api_router.get("/disk-usage")
async def disk_usage():
    """获取硬盘使用情况"""
    return get_hardware_info()["disks"]

@api_router.get("/cache")
async def get_cache():
    """获取缓存数据"""
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {"error": "缓存文件不存在"}

@api_router.get("/servers")
async def get_servers():
    """获取服务器配置列表"""
    from ..config import server_config

    branches = server_config.get_branches()
    default_branch = server_config.get_default_branch()

    return {
        "default_branch": default_branch,
        "branches": branches
    }

@api_router.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "message": "SystemStatus API"}
