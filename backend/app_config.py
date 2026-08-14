"""
通用应用配置
从项目根目录的 config.yml 加载配置；文件不存在或解析失败时回退到默认值。
"""
from pathlib import Path
from typing import Dict, List

try:
    import yaml
except ImportError:
    yaml = None

BASE_DIR = Path(__file__).parent.parent
CONFIG_PATH = BASE_DIR / "config.yml"


def _default_config() -> Dict:
    return {
        "server": {
            "host": "0.0.0.0",
            "port": 8001,
        },
        "display": {
            "show_network": True,
            "show_battery": True,
        },
        "disk_filter": {
            "devices": [],
            "mountpoints": ["/boot/efi"],
            "fstypes": ["vfat", "squashfs", "tmpfs"],
        },
        "web_ui": {
            "page_title": {
                "enable": False,
                "lang": {},
            },
            "web_title": {
                "enable": False,
                "lang": {},
            },
        },
    }


def _merge_dict(base: Dict, override: Dict) -> Dict:
    """递归合并 override 到 base（仅保留 base 中已有的 key）。"""
    result = dict(base)
    for key, val in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(val, dict):
            result[key] = _merge_dict(result[key], val)
        else:
            result[key] = val
    return result


def _load_config() -> Dict:
    if yaml is None:
        return _default_config()
    if not CONFIG_PATH.exists():
        return _default_config()
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        return _merge_dict(_default_config(), data)
    except Exception as e:
        print(f"配置文件 {CONFIG_PATH} 加载失败，使用默认配置: {e}")
        return _default_config()


_CONFIG = _load_config()


def get_server_config() -> Dict:
    """返回服务监听配置：host / port。"""
    return _CONFIG.get("server", _default_config()["server"])


def get_display_config() -> Dict:
    """返回显示开关配置：show_network / show_battery（均为 bool）。"""
    return _CONFIG.get("display", _default_config()["display"])


def get_disk_filter() -> Dict[str, List[str]]:
    """返回磁盘过滤配置：devices / mountpoints / fstypes 三个列表。"""
    return _CONFIG.get("disk_filter", _default_config()["disk_filter"])


def get_web_ui_config() -> Dict:
    """返回 WebUI 配置：page_title / web_title 两个子项，各自含 enable 与按语言覆盖的字典。"""
    return _CONFIG.get("web_ui", _default_config()["web_ui"])
