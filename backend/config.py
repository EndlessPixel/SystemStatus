"""
服务器配置管理
从config/servers.json加载配置，并提供API接口
"""
import json
import os
from typing import Dict, Optional
from pathlib import Path

class ServerConfig:
    """服务器配置管理类"""

    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            config_dir = Path(__file__).parent.parent / "config"
            config_path = config_dir / "servers.json"

        self.config_path = Path(config_path)
        self.config = self._load_config()

    def _load_config(self) -> Dict:
        """加载配置文件"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    return config
            else:
                # 返回默认配置
                return self._get_default_config()
        except Exception as e:
            print(f"配置文件加载失败: {e}")
            return self._get_default_config()

    def _get_default_config(self) -> Dict:
        """获取默认配置"""
        return {
            "note": {
                "line1": "前端获取信息选项 - 多服务器分支配置",
                "line2": "branches对象中可添加多个服务器配置",
                "line3": "default_branch指定默认选中的服务器分支key",
                "line4": "每个分支包含name(显示名)、api(服务器IP)、port(端口)"
            },
            "default_branch": "local_server",
            "branches": {
                "local_server": {
                    "name": "本地服务器",
                    "api": "127.0.0.1",
                    "port": 8001
                }
            }
        }

    def get_branches(self) -> Dict:
        """获取所有分支配置"""
        return self.config.get("branches", {})

    def get_default_branch(self) -> str:
        """获取默认分支"""
        return self.config.get("default_branch", "local_server")

    def get_branch_info(self, branch_key: str) -> Optional[Dict]:
        """获取指定分支信息"""
        branches = self.get_branches()
        return branches.get(branch_key)

    def save_config(self):
        """保存配置到文件"""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=4)
            return True
        except Exception as e:
            print(f"配置保存失败: {e}")
            return False

    def add_branch(self, key: str, name: str, api: str, port: int) -> bool:
        """添加新分支"""
        self.config["branches"][key] = {
            "name": name,
            "api": api,
            "port": port
        }
        return self.save_config()

    def remove_branch(self, key: str) -> bool:
        """删除分支"""
        if key in self.config["branches"]:
            del self.config["branches"][key]
            return self.save_config()
        return False

    def set_default_branch(self, key: str) -> bool:
        """设置默认分支"""
        if key in self.config["branches"]:
            self.config["default_branch"] = key
            return self.save_config()
        return False

# 全局配置实例
server_config = ServerConfig()
