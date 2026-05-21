import os
import sys
import subprocess

# 在程序最顶部添加
os.environ["PYTHONFAULTHANDLER"] = "0"

# 禁用wmi以避免Win32 exception (Windows)
if sys.platform == "win32":
    try:
        import win32api
        win32api.SetConsoleCtrlHandler(None, 0)
    except:
        pass

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from pathlib import Path
import threading
import time

# 导入后端模块
from backend.hardware import init_nvml, shutdown_nvml
from backend.monitor import collect_real_time_data, restore_from_cache, update_cache_file
from backend.routers import api_router

# 获取项目根目录
BASE_DIR = Path(__file__).parent.absolute()
FRONTEND_DIR = BASE_DIR / "frontend"
PUBLIC_DIR = BASE_DIR / "public"  # 公共静态文件目录，用于扩展性
PORT = 8001  # 服务器默认端口号

# 获取Git版本信息
def get_git_commit_sha():
    """获取当前Git仓库的commit SHA"""
    git_dir = BASE_DIR / ".git"
    if not git_dir.exists():
        return None
    
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    
    return None

# 获取版本信息
GIT_COMMIT_SHA = get_git_commit_sha()

# 初始化FastAPI
app = FastAPI(
    title="SystemStatus - 系统监控平台",
    description="一个简洁美观的系统监控面板，合并前后端，开箱即用",
    version="2.0.0"
)

# 添加请求日志中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # 记录请求信息
    print(f"\n[Request] {request.method} {request.url.path}")
    print(f"Source: {request.client.host if request.client else 'unknown'}")
    print(f"Headers:")
    for key, value in request.headers.items():
        print(f"   {key}: {value}")
    
    # 处理请求
    response = await call_next(request)
    
    # 记录响应信息
    process_time = (time.time() - start_time) * 1000
    print(f"[Response] Status: {response.status_code} | Time: {process_time:.2f}ms")
    
    return response

# 配置跨域 - 更宽松的设置以适应反向代理环境
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# 注册API路由
app.include_router(api_router)

# 挂载前端静态文件
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

# 挂载公共静态文件目录（用于扩展性）
if PUBLIC_DIR.exists():
    app.mount("/public", StaticFiles(directory=str(PUBLIC_DIR)), name="public")

# 根路径文件路由 - 常用网站文件（public目录下的文件可以直接通过/访问）
@app.get("/robots.txt", include_in_schema=False)
async def robots_txt():
    file_path = PUBLIC_DIR / "robots.txt"
    if file_path.exists():
        return FileResponse(str(file_path), media_type="text/plain")
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml():
    file_path = PUBLIC_DIR / "sitemap.xml"
    if file_path.exists():
        return FileResponse(str(file_path), media_type="application/xml")
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/baidusitemap.xml", include_in_schema=False)
async def baidusitemap_xml():
    file_path = PUBLIC_DIR / "baidusitemap.xml"
    if file_path.exists():
        return FileResponse(str(file_path), media_type="application/xml")
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon_ico():
    file_path = PUBLIC_DIR / "favicon.ico"
    if file_path.exists():
        return FileResponse(str(file_path), media_type="image/x-icon")
    frontend_path = FRONTEND_DIR / "favicon.ico"
    if frontend_path.exists():
        return FileResponse(str(frontend_path), media_type="image/x-icon")
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/security.txt", include_in_schema=False)
async def security_txt():
    file_path = PUBLIC_DIR / "security.txt"
    if file_path.exists():
        return FileResponse(str(file_path), media_type="text/plain")
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/humans.txt", include_in_schema=False)
async def humans_txt():
    file_path = PUBLIC_DIR / "humans.txt"
    if file_path.exists():
        return FileResponse(str(file_path), media_type="text/plain")
    raise HTTPException(status_code=404, detail="File not found")

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

    print("[OK] SystemStatus 系统监控已启动")
    print(f"[OK] 前端页面: http://127.0.0.1:{PORT}/")
    print(f"[OK] API接口: http://127.0.0.1:{PORT}/api")

if __name__ == "__main__":
    # 启动监控
    start_monitor()

    try:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=PORT)
    finally:
        shutdown_nvml()
