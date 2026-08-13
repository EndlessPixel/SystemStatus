# SystemStatus

<p align="center">
  <a href="https://hub.docker.com/r/systemmini/systemstatus">
    <img src="https://img.shields.io/docker/pulls/systemmini/systemstatus?label=Docker%20Pulls" alt="Docker Pulls">
  </a>
  <img src="https://img.shields.io/github/stars/EndlessPixel/SystemStatus?label=Stars" alt="Stars">
  <img src="https://img.shields.io/github/license/EndlessPixel/SystemStatus" alt="License">
  <img src="https://img.shields.io/badge/Python-3.8+-blue?logo=python" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-Web%20Framework-green?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-lightgrey" alt="Platform">
</p>

<p align="center">
  <b>🐳 Docker 一行命令启动 · 轻量级系统硬件监控面板</b><br/>
  <b>实时监控 CPU / 内存 / 硬盘 / 网卡 / 显卡（Intel 核显 + NVIDIA 独显）</b>
</p>

---

## 🤔 它是什么？适合谁？

**SystemStatus** 是一个基于 **FastAPI + ECharts** 的轻量级系统监控工具，专为以下场景设计：

| 适合你，如果你... | ❌ 不适合你，如果你... |
|---|---|
| 有一台远程 Windows / Linux 服务器，不想装 RDP / VNC | 需要 Kubernetes / 集群级监控（请用 Prometheus） |
| 用 Docker / NAS（群晖 / Unraid / TrueNAS），想一键跑监控 | 追求极致性能、单二进制部署（请用 btop / htop） |
| 想在手机浏览器随时查看服务器状态 | 就在本机用，且有任务管理器 / Activity Monitor |
| 需要 Intel 核显使用率监控（独家支持） | |
| 希望界面和文档完全中文，开箱即用 | |

> 💡 **一句话定位：** 一个为「非运维人员」设计的、Docker 一行启动的系统监控面板。

---

## 🐳 Docker 一键部署（推荐）

### 快速启动

```bash
docker pull systemmini/systemstatus

docker run -d \
  --name systemstatus \
  -p 8001:8001 \
  --privileged \
  systemmini/systemstatus
```

浏览器访问 **http://localhost:8001** 即可。

### Windows / macOS（Docker Desktop）

无需额外参数，直接运行即可，适合：

- 🖥️ Windows Server 远程监控
- 💻 本地开发调试
- 🏠 NAS / 家庭服务器

> 💡 相比 netdata / glances，SystemStatus 镜像更小、启动更快、UI 更简洁。

---

## 🚀 本地开发启动

### 环境准备

确保已安装 **Python 3.8+**，然后根据操作系统安装对应依赖：

```bash
# Linux / macOS 等类 Unix 系统
pip install -r requirements-unix.txt

# Windows 系统（额外包含 wmi 依赖）
pip install -r requirements-windows.txt
```

> 📦 依赖文件已按平台拆分：
> - `requirements-unix.txt`：通用依赖（不含 `wmi`）
> - `requirements-windows.txt`：在通用依赖基础上额外包含 `wmi`（Windows 硬件信息采集所需）

#### 🐧 关于 Linux 的 `--break-system-packages`

在较新的 Linux 发行版（如 Ubuntu 23.04+、Debian 12+、Fedora 等）中，系统的 `pip` 受 **PEP 668（Externally Managed Environment）** 保护，直接使用 `pip install` 会报错：

```
error: externally-managed-environment
× This environment is externally managed
```

此时有两种推荐做法：

**方式一（推荐）：使用虚拟环境**

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements-unix.txt
```

**方式二：强制安装到系统（不推荐，仅用于测试）**

```bash
pip install -r requirements-unix.txt --break-system-packages
```

`--break-system-packages` 会跳过外部管理环境的保护，把包装进系统 Python 目录，**可能干扰系统包管理器（apt/dnf 等）**，生产环境请优先使用虚拟环境。Docker 部署不受影响（`Dockerfile` 内为独立容器环境）。

### 配置文件 `config.yml`（可选）

项目根目录下的 `config.yml` 用于自定义运行参数。**文件不存在或字段缺失时会自动使用内置默认值，不影响启动。**

目前支持以下配置项：

```yaml
server:
  host: 0.0.0.0      # 监听地址，0.0.0.0 表示允许外部访问
  port: 8001         # 监听端口

display:
  show_network: true   # 是否显示网卡信息面板
  show_battery: true   # 是否显示电池状态（关闭后后端不再采集电池数据）

disk_filter:
  devices: []                 # 按设备名完整匹配，如 /dev/nvme0n1p1
  mountpoints:                # 按挂载点匹配（完整或前缀），如 /boot/efi、/snap
    - /boot/efi
  fstypes:                    # 按文件系统类型匹配，如 vfat、squashfs、tmpfs
    - vfat
    - squashfs
    - tmpfs
```

- `server`：修改监听地址与端口（等价于原 `PORT` 常量），重启生效。
- `display`：控制网卡、电池面板是否显示；`show_battery: false` 时后端完全跳过电池采集，更省资源。
- `disk_filter`：被匹配到的分区不会出现在监控面板中（三者为「或」关系，命中任意一项即过滤）。默认值已包含 `/boot/efi` 以及 `vfat / squashfs / tmpfs`，可覆盖大多数发行版下冗余的 EFI、snap、loop 分区。

> 💡 修改 `config.yml` 后重启服务生效；字段缺失或文件不存在时自动使用上方默认值。

### 启动服务

```bash
python main.py
```

服务启动在 **http://0.0.0.0:8001**，浏览器访问即可。

---

## ✨ 功能特性

### 🖥️ 硬件信息监控

- **CPU**：型号、核心数、实时占用率（单核心 + 整体折线图）
- **内存**：容量、型号、实时占用率
- **硬盘**：分区列表、已用/总容量（GB 显示）、占用百分比
- **网卡**：名称与 IPv4 地址
- **显卡**：型号检测（兼容 **Intel 核显 + NVIDIA 独显**）
  - Intel 核显使用率检测（wmic）
  - NVIDIA 显卡使用率检测（NVML）

### ⚡ 性能优化

- 本地缓存文件 `tmp.json`，页面打开秒加载
- 浏览器 `localStorage` 缓存，断网也能看历史数据
- 每秒采集实时数据，折线图动态展示趋势
- 无 NVIDIA 显卡时自动禁用 NVML，避免错误刷屏
- 使用 `wmic` 替代 `wmi` COM 接口，彻底解决 Win32 IUnknown 异常
- 硬盘占用率增量更新，避免每次完全重绘
- 重启服务器后自动从缓存恢复历史数据
- 静态资源与后端服务合并，无需额外 http.server

### 🎨 主题与外观

- Apple 风格极简设计，通透、圆角、细腻阴影
- 三种主题：浅色模式 / 深色模式 / 高对比度模式
- 主题通过下拉菜单快速切换
- 折叠面板时自动消除空白空间

### 🌍 多语言支持 (i18n)

- 内置：**简体中文、English、日本語、Deutsch、Français、Русский**
- 自动检测浏览器语言偏好
- 所有 UI 元素（图表、下拉菜单、网络标签）完全翻译
- 语言文件独立管理，方便扩展

### 📱 UI/UX

- 响应式布局，手机 / 平板 / 桌面端均友好
- 硬盘占用率默认 2 列布局，窄屏自动切换 1 列
- 所有图表面板支持折叠/展开，一键全部折叠/展开
- 平滑的折叠/展开动画
- 数字动画，数值变化更流畅

### 🔌 跨平台兼容

- **Windows**：通过 `wmic` 命令获取硬件详情
- **Linux**：通过 `/proc/cpuinfo` / `dmidecode` 兼容

---

## 🌟 独特之处

> **SystemStatus 是极少数同时做到以下三点的开源监控工具：**

| 能力 | SystemStatus | netdata | glances | btop |
|---|---|---|---|---|
| Intel 核显监控 | ✅ | ⚠️ | ❌ | ❌ |
| Docker 一键部署 | ✅ | ✅ | ✅ | ❌ |
| Apple 风格 Web UI | ✅ | ✅ | ❌ | ❌ |

- 🏆 **唯一原生支持 Intel 核显使用率** 的轻量 Web 监控工具
- 🛡️ 针对 Windows WMI 稳定性做了大量工程优化
- 🪶 极低依赖，单容器即可运行

---

## 📡 API 接口

| 接口地址 | 请求方式 | 功能描述 |
|---|---|---|
| `/api/ws` | WebSocket | 实时推送完整监控快照（硬件信息 + 实时数据 + 磁盘），约每秒一次 |
| `/api/data` | GET | 一次性获取完整监控快照（用于初始化与降级） |
| `/api/cache` | GET | 获取 `tmp.json` 缓存数据（无缓存时实时生成完整快照） |
| `/api/version` | GET | 获取当前 Git 提交 SHA 版本信息 |
| `/api/health` | GET | 轻量健康检查（不触发硬件采集） |

---

## 🤝 贡献指南

欢迎提交 Issue 反馈 Bug 或需求，也可以直接提交 Pull Request 改进代码！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feat/xxx`
3. 提交 Commit：`git commit -m "feat: 新增 xxx"`
4. 推送分支并提交 Pull Request

---

## 📄 许可证

本项目基于 **Apache License Version 2.0** 开源。

---

## 💬 关于

- 🐳 Docker Hub：[systemmini/systemstatus](https://hub.docker.com/r/systemmini/systemstatus)
- 🐙 GitHub：[EndlessPixel/SystemStatus](https://github.com/EndlessPixel/SystemStatus)
- 问题与建议：欢迎提交 [Issue](https://github.com/EndlessPixel/SystemStatus/issues)
- 由 **EndlessPixel Studio** 维护 ❤️

> ⭐ Star 是对我们最大的支持！
