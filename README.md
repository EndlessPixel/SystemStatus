# SystemStatus Monitor
一个轻量级的 **系统硬件监控工具**，基于 FastAPI + ECharts 实现，支持实时查看 CPU、内存、硬盘、网卡、显卡（含 Intel 核显）状态，自带缓存机制实现「现开现用」。

## 功能特性
✅ **硬件信息监控**
- CPU 型号、核心数、实时占用率（单核心+整体）
- 内存容量、型号、实时占用率
- 硬盘分区、已用/总容量、占用百分比
- 网卡名称与 IPv4 地址
- 显卡型号检测（兼容 Intel 核显 + NVIDIA 独显）

✅ **性能优化**
- 本地缓存文件 `tmp.json`，页面打开秒加载
- 浏览器 localStorage 缓存，断网也能看历史数据
- 每秒采集实时数据，折线图动态展示趋势

✅ **跨平台兼容**
- Windows 系统：通过 `wmic` 命令获取硬件详情
- Linux 系统：通过 `/proc/cpuinfo`/`dmidecode` 兼容

## 项目结构
```
SystemStatus/
├── main.py          # 后端 FastAPI 服务
├── index.html       # 前端监控页面
├── script.js        # 前端交互逻辑
├── LICENSE          # MIT 开源许可证
├── README.md        # 项目说明文档
└── tmp.json         # 自动生成的缓存文件
```

## 快速开始
### 1. 环境准备
确保已安装 Python 3.8+，然后安装依赖：
```bash
pip install fastapi uvicorn psutil wmi py3nvml
```
- `py3nvml`：可选，仅用于检测 NVIDIA 独显
- `wmi`：Windows 平台必装，用于读取硬件信息

### 2. 启动后端服务
```bash
python main.py
```
服务会启动在 `http://0.0.0.0:8000`

### 3. 访问监控页面
直接用浏览器打开 `index.html`，或通过 VS Code Live Server 启动（避免跨域问题）。

## 接口文档
| 接口地址 | 请求方式 | 功能描述 |
|----------|----------|----------|
| `/api/hardware-info` | GET | 获取硬件基础信息（CPU/内存/显卡/网卡） |
| `/api/real-time-data` | GET | 获取实时监控数据（折线图 + 核心占用） |
| `/api/disk-usage` | GET | 获取硬盘分区占用信息 |
| `/api/cache` | GET | 获取 `tmp.json` 缓存数据 |

## 常见问题
### Q1: 内存/显卡型号显示 Unknown？
- Windows：确保已安装显卡/内存驱动，以管理员身份运行命令行
- Linux：安装 `dmidecode` 工具：`sudo apt install dmidecode`

### Q2: 页面显示跨域错误？
- 后端已配置 CORS 允许所有来源，推荐用 Live Server 打开前端页面
- 生产环境请修改 `main.py` 中的 `allow_origins` 为具体域名

### Q3: 折线图没有数据？
- 检查后端服务是否正常运行
- 按 F12 打开控制台，查看是否有接口请求失败

## 许可证
本项目基于 ** Apache License Version 2.0** 开源

## 贡献指南
欢迎提交 Issue 反馈 Bug 或需求，也可以直接提交 Pull Request 改进代码~
