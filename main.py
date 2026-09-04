import os
import sys
import asyncio
import subprocess
os.environ["PYTHONFAULTHANDLER"] = "0"
if sys.platform == "win32":
    try:
        import win32api
        win32api.SetConsoleCtrlHandler(None, 0)
    except:pass

    # Windows 下静默处理底层 socket 异常（如网络切换 / 客户端断开导致的
    # WinError 10054、WinError 64），避免 asyncio 把已断开连接的清理错误刷成 traceback。
    # 这些异常属于正常断连，不需要打日志，也不影响服务运行。

    # 1) 全局异常处理器：忽略 OSError / recvfrom / WinError 64 / WinError 10054
    def _loop_exception_handler(loop, context):
        exc = context.get("exception")
        msg = str(context.get("message", ""))
        if isinstance(exc, OSError) or "recvfrom" in msg or "WinError 64" in msg or "WinError 10054" in msg:
            return
        loop.default_exception_handler(context)

    # 2) monkeypatch：Proactor 在连接丢失回调里对关闭的 socket 调 shutdown() 会抛
    #    ConnectionResetError(WinError 10054)，这里直接吞掉，避免刷屏。
    try:
        _orig_call_connection_lost = asyncio.ProactorBasePipeTransport._call_connection_lost
        def _patched_call_connection_lost(self, exc):
            if exc is None or isinstance(exc, (ConnectionResetError, ConnectionAbortedError,
                                              BrokenPipeError)) or (isinstance(exc, OSError) and
                                              getattr(exc, "winerror", None) in (64, 10054)):
                exc = None
            try:
                _orig_call_connection_lost(self, exc)
            except (OSError, RuntimeError):
                pass
        asyncio.ProactorBasePipeTransport._call_connection_lost = _patched_call_connection_lost
    except Exception:
        pass
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from pathlib import Path
import threading
import time
from backend.hardware import init_nvml, shutdown_nvml
from backend.monitor import collect_real_time_data, restore_from_cache, update_cache_file
from backend.routers import api_router
try:
    from backend.app_config import get_server_config
except Exception:  # 部署遗漏 app_config 时回退默认监听配置
    def get_server_config():
        return {"host": "0.0.0.0", "port": 8001}
BASE_DIR = Path(__file__).parent.absolute()
FRONTEND_DIR = BASE_DIR / "frontend"
PUBLIC_DIR = BASE_DIR / "public"

# 监听地址与端口：优先使用 config.yml 中的 server 配置
_SERVER_CFG = get_server_config()
HOST = _SERVER_CFG.get("host", "0.0.0.0")
PORT = int(_SERVER_CFG.get("port", 8001))

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
    except Exception:pass
    return None
GIT_COMMIT_SHA = get_git_commit_sha()
app = FastAPI(
    title="SystemStatus - 系统监控平台",
    description="一个简洁美观的系统监控面板，合并前后端，开箱即用",
    version="2.0.0"
)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    print(f"\n[Request] {request.method} {request.url.path}")
    print(f"Source: {request.client.host if request.client else 'unknown'}")
    print(f"Headers:")
    for key, value in request.headers.items():
        print(f"   {key}: {value}")
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    print(f"[Response] Status: {response.status_code} | Time: {process_time:.2f}ms")
    return response
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=None,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)
app.include_router(api_router)
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
if PUBLIC_DIR.exists():
    app.mount("/public", StaticFiles(directory=str(PUBLIC_DIR)), name="public")
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
    custom_404_path = FRONTEND_DIR / "404.html"
    if custom_404_path.exists():
        return FileResponse(str(custom_404_path))
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
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
    logger.warning(f"参数校验失败: {request.url} {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )
collect_thread = None
def start_monitor():
    global collect_thread
    init_nvml()
    restore_from_cache()
    update_cache_file()
    collect_thread = threading.Thread(target=collect_real_time_data, daemon=True)
    collect_thread.start()
    print("[OK] SystemStatus 系统监控已启动")
    print(f"[OK] 前端页面: http://127.0.0.1:{PORT}/")
if __name__ == "__main__":
    start_monitor()
    try:
        import uvicorn
        import threading
        import time
        import socket

        # Windows 下用 wsproto 处理 WebSocket：基于纯 asyncio 流，规避 ProactorEventLoop
        # 在 UDP/传输 socket 上的 WinError 64 异常（默认 websockets 库会冒泡到 asyncio 回调）
        run_kwargs = {}
        if sys.platform == "win32":
            try:
                import wsproto  # noqa: F401
                run_kwargs["ws"] = "wsproto"
            except Exception:
                pass

        def make_config():
            cfg = uvicorn.Config(app, host=HOST, port=PORT, **run_kwargs)
            return cfg

        # 看门狗：监听 socket 因网络变动（WinError 64 等）失效后，uvicorn 不会自动重绑，
        # 表现为「端口占用但不再服务」。这里周期性探测本地连通性，发现监听死亡即让当前
        # server 退出，由外层循环重建并重新绑定端口，实现自愈。
        current_server = {"ref": None}

        def _watchdog():
            while True:
                time.sleep(5)
                srv = current_server["ref"]
                if srv is None:
                    continue
                alive = False
                try:
                    # uvicorn 内部维护的监听 server 列表非空，且本地 TCP 实际可连，才算活着
                    if getattr(srv, "servers", None):
                        with socket.create_connection(("127.0.0.1", PORT), timeout=2):
                            alive = True
                except Exception:
                    alive = False
                if not alive:
                    try:
                        srv.should_exit = True
                    except Exception:
                        pass

        wd = threading.Thread(target=_watchdog, daemon=True)
        wd.start()

        # 外层看门狗循环：server.run() 退出（异常或 should_exit）后，重建 server 重新绑定端口。
        # 每次重建都会创建全新的事件循环与监听 socket，从而彻底摆脱失效的底层网络名。
        restart_delay = 1
        while True:
            try:
                asyncio.set_event_loop(None)  # 丢弃可能已损坏的旧 loop
                if sys.platform == "win32":
                    try:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        loop.set_exception_handler(_loop_exception_handler)
                    except Exception:
                        pass
                server = uvicorn.Server(make_config())
                current_server["ref"] = server
                server.run()
            except Exception as e:
                print(f"[WARN] uvicorn server stopped ({e}); restarting in {restart_delay}s...")
            current_server["ref"] = None
            time.sleep(restart_delay)
            restart_delay = min(restart_delay * 2, 30)
    finally:
        shutdown_nvml()
