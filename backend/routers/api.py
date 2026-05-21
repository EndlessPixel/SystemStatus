"""
API路由模块
提供所有REST API接口
"""
from fastapi import APIRouter
from typing import Dict
import json
import sys
from pathlib import Path

from ..hardware import get_hardware_info
from ..monitor import get_real_time_data, DATA_CACHE, CACHE_FILE

api_router = APIRouter(prefix="/api")

# 版本信息缓存
_version_info = None

def get_version_info():
    """获取版本信息，单例模式"""
    global _version_info
    if _version_info is not None:
        return _version_info
    
    # 尝试获取Git commit
    git_commit_sha = None
    base_dir = Path(__file__).parent.parent.parent.absolute()
    git_dir = base_dir / ".git"
    
    if git_dir.exists():
        try:
            import subprocess
            result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                cwd=str(base_dir),
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                git_commit_sha = result.stdout.strip()
        except Exception:
            pass
    
    _version_info = {
        "version": "2.0.0",
        "git_commit": git_commit_sha,
        "has_git": git_dir.exists()
    }
    return _version_info

@api_router.get("/version")
async def version_info():
    """获取版本信息"""
    return get_version_info()

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

@api_router.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "message": "SystemStatus API"}
