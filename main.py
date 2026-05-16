import os
import sys

# 在程序最顶部添加
os.environ["PYTHONFAULTHANDLER"] = "0"

# 禁用wmi以避免Win32 exception (Windows)
if sys.platform == "win32":
    try:
        import win32api
        win32api.SetConsoleCtrlHandler(None, 0)
    except:
        pass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from pathlib import Path
import threading

# 导入后端模块
from backend.hardware import init_nvml, shutdown_nvml
from backend.monitor import collect_real_time_data, restore_from_cache, update_cache_file
from backend.routers import api_router

# 获取项目根目录
BASE_DIR = Path(__file__).parent.absolute()
FRONTEND_DIR = BASE_DIR / "frontend"

# 初始化FastAPI
app = FastAPI(
    title="SystemStatus - 系统监控平台",
    description="一个简洁美观的系统监控面板，合并前后端，开箱即用",
    version="2.0.0"
)

# 配置跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册API路由
app.include_router(api_router)

# 挂载前端静态文件
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

@app.get("/")
async def root():
    """返回前端页面"""
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return HTMLResponse(
        content="""
        <html>
            <head><title>SystemStatus</title></head>
            <body>
                <h1>SystemStatus - 系统监控平台</h1>
                <p>前端文件未找到，请确保frontend/index.html存在</p>
            </body>
        </html>
        """,
        status_code=200
    )

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    """自定义404处理"""
    # 检查是否有自定义404页面
    custom_404_path = FRONTEND_DIR / "404.html"
    if custom_404_path.exists():
        return FileResponse(str(custom_404_path))

    # 如果没有自定义404页面，返回默认页面
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))

    # 最后的兜底方案
    return JSONResponse(
        status_code=200,
        content={
            "error": "页面未找到",
            "message": "已自动跳转到首页",
            "status": "ok"
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """处理验证错误"""
    return JSONResponse(
        status_code=200,
        content={"status": "ok", "message": "请求参数已接收"}
    )

# 采集线程
collect_thread = None

def start_monitor():
    """启动监控采集"""
    global collect_thread

    # 初始化NVML
    init_nvml()

    # 从缓存恢复数据
    restore_from_cache()

    # 初始化缓存
    update_cache_file()

    # 启动采集线程
    collect_thread = threading.Thread(target=collect_real_time_data, daemon=True)
    collect_thread.start()

    print("✓ SystemStatus 系统监控已启动")
    print(f"✓ 前端页面: http://127.0.0.1:8001/")
    print(f"✓ API接口: http://127.0.0.1:8001/api")
    print(f"✓ 服务器配置: http://127.0.0.1:8001/api/servers")

if __name__ == "__main__":
    # 启动监控
    start_monitor()

    try:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8001)
    finally:
        shutdown_nvml()
