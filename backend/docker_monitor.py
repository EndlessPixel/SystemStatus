"""
Docker 容器监控
通过 Docker Engine REST API（unix socket）读取容器状态与资源占用。
仅依赖标准库；socket 不存在或无权限时返回空列表，不影响主监控流程。

容器内使用需挂载：-v /var/run/docker.sock:/var/run/docker.sock:ro
"""
import http.client
import json
import os
import socket
import time
from typing import Dict, List


DOCKER_SOCKET_CANDIDATES = ("/var/run/docker.sock",)
_TTL = 3.0  # stats 需按秒级更新，但不能每秒 fork HTTP 请求
_cache: Dict = {"ts": 0.0, "data": []}


def _socket_path() -> str:
    host = os.environ.get("DOCKER_HOST", "")
    candidates = list(DOCKER_SOCKET_CANDIDATES)
    if host.startswith("unix://"):
        candidates.insert(0, host[len("unix://"):])
    for path in candidates:
        if path and os.path.exists(path):
            return path
    return ""


class _UnixHTTPConnection(http.client.HTTPConnection):
    """让标准库 HTTPConnection 走 unix domain socket。"""

    def __init__(self, path: str, timeout: float = 3):
        super().__init__("localhost", timeout=timeout)
        self._path = path

    def connect(self):
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(self.timeout)
        sock.connect(self._path)
        self.sock = sock


def _api_get(path: str, source: str):
    conn = _UnixHTTPConnection(source, timeout=3)
    try:
        conn.request("GET", path, headers={"Accept": "application/json"})
        resp = conn.getresponse()
        body = resp.read()
        if resp.status != 200:
            raise RuntimeError(f"Docker API {path} returned HTTP {resp.status}")
        return json.loads(body.decode("utf-8", errors="ignore"))
    finally:
        conn.close()


def _to_mb(n) -> float:
    return round(int(n) / (1024 ** 2), 1) if n else 0.0


def _container_stats(source: str, container_id: str) -> Dict:
    """取单个容器的一次性 stats 快照，计算 CPU/内存/网络。"""
    s = _api_get(f"/containers/{container_id}/stats?stream=false", source)
    cpu_stats = s.get("cpu_stats") or {}
    precpu = s.get("precpu_stats") or {}
    usage = cpu_stats.get("cpu_usage") or {}
    pre_usage = precpu.get("cpu_usage") or {}
    cpu_delta = (usage.get("total_usage") or 0) - (pre_usage.get("total_usage") or 0)
    system_delta = (cpu_stats.get("system_cpu_usage") or 0) - (precpu.get("system_cpu_usage") or 0)
    online = cpu_stats.get("online_cpus") or len(usage.get("percpu_usage") or []) or 1
    cpu_percent = round(cpu_delta / system_delta * online * 100, 1) if system_delta > 0 else 0.0

    mem = s.get("memory_stats") or {}
    mem_cache = (mem.get("stats") or {}).get("cache") or 0
    mem_usage = max(0, (mem.get("usage") or 0) - mem_cache)
    mem_limit = mem.get("limit") or 0
    nets = s.get("networks") or {}
    return {
        "cpu_percent": cpu_percent,
        "mem_used_mb": _to_mb(mem_usage),
        "mem_limit_mb": _to_mb(mem_limit),
        "mem_percent": round(mem_usage / mem_limit * 100, 1) if mem_limit > 0 else None,
        "net_rx_mb": _to_mb(sum(v.get("rx_bytes") or 0 for v in nets.values())),
        "net_tx_mb": _to_mb(sum(v.get("tx_bytes") or 0 for v in nets.values())),
    }


def _read_containers() -> List[Dict]:
    source = _socket_path()
    if not source:
        return []
    try:
        items = _api_get("/containers/json?all=1", source)
    except Exception:
        return []

    result: List[Dict] = []
    for c in items:
        container_id = c.get("Id", "")
        names = c.get("Names") or []
        name = names[0].lstrip("/") if names else (c.get("ID") or container_id[:12])
        status = c.get("State") or "unknown"
        stats: Dict = {}
        if status == "running":
            try:
                stats = _container_stats(source, container_id)
            except Exception:
                pass
        result.append({
            "id": container_id[:12],
            "name": name,
            "image": c.get("Image", ""),
            "status": status,
            "running": status == "running",
            "cpu_percent": stats.get("cpu_percent"),
            "mem_used_mb": stats.get("mem_used_mb"),
            "mem_limit_mb": stats.get("mem_limit_mb"),
            "mem_percent": stats.get("mem_percent"),
            "net_rx_mb": stats.get("net_rx_mb"),
            "net_tx_mb": stats.get("net_tx_mb"),
        })
    return result


def get_docker_containers() -> List[Dict]:
    """返回容器列表（带 3 秒 TTL 缓存），失败时返回空列表。"""
    now = time.time()
    if now - _cache["ts"] < _TTL:
        return _cache["data"]
    _cache["data"] = _read_containers()
    _cache["ts"] = now
    return _cache["data"]
