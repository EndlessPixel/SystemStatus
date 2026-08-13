from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import time
import json
import os
import asyncio

from .. import monitor
from ..hardware import get_hardware_info, get_gpu_info

api_router = APIRouter(prefix="/api")

CACHE_FILE = "tmp.json"
WS_PUSH_INTERVAL = 1.0  # WebSocket 推送间隔（秒）


@api_router.get("/health")
async def health_check():
    """轻量健康检查，不触发任何硬件采集，用于前端心跳检测"""
    return {"status": "ok"}


@api_router.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "message": "SystemStatus API"}


@api_router.get("/version")
async def get_version():
    """获取Git版本信息"""
    try:
        import subprocess
        git_hash = subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'],
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            stderr=subprocess.DEVNULL
        ).decode('utf-8').strip()
        return {"version": git_hash}
    except:
        return {"version": "unknown"}


@api_router.get("/data")
async def get_data():
    """一次性获取完整监控快照（硬件信息 + 实时数据 + 磁盘）"""
    return monitor.get_full_snapshot()


@api_router.get("/cache")
async def get_cache():
    """从 tmp.json 缓存文件读取完整快照，文件不存在时实时生成"""
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return monitor.get_full_snapshot()


@api_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """实时监控 WebSocket：连接后按固定间隔推送完整快照"""
    await websocket.accept()
    try:
        while True:
            try:
                await websocket.send_json(monitor.get_full_snapshot())
            except Exception:
                break
            await asyncio.sleep(WS_PUSH_INTERVAL)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
