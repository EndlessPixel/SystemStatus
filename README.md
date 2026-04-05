# SystemStatus Monitor
一个轻量级的 **系统硬件监控工具**，基于 FastAPI + ECharts 实现，支持实时查看 CPU、内存、硬盘、网卡、显卡（含 Intel 核显）状态，自带缓存机制实现「现开现用」。

## 功能特性
✅ **硬件信息监控**
- CPU 型号、核心数、实时占用率（单核心+整体）
- 内存容量、型号、实时占用率
- 硬盘分区、已用/总容量、占用百分比
- 网卡名称与 IPv4 地址
- 显卡型号检测（兼容 Intel 核显 + NVIDIA 独显）
- Intel 核显使用率检测（使用 wmic）
- NVIDIA 显卡使用率检测（使用 NVML）

✅ **性能优化**
- 本地缓存文件 `tmp.json`，页面打开秒加载
- 浏览器 localStorage 缓存，断网也能看历史数据
- 每秒采集实时数据，折线图动态展示趋势
- 无 NVIDIA 显卡时永久禁用 NVML，避免错误刷屏
- 使用 wmic 替代 wmi COM 接口，彻底解决 Win32 IUnknown 异常
- 硬盘占用率增量更新，避免每次完全重绘
- 重启服务器后自动从缓存恢复历史数据
- 静态资源与后端服务合并，无需额外 http.server

✅ **UI/UX 改进**
- Apple 风格极简设计，通透、圆角、细腻阴影
- 硬盘占用率默认 2 列布局，窄屏自动切换 1 列
- 硬盘占用率显示具体 GB 数（已用/总容量）
- 所有图表面板支持折叠/展开功能
- 一键折叠/展开所有图表
- 平滑的折叠/展开动画效果
- 数字动画，更流畅的数值变化体验
- 单位显示稳定，不会时有时无

✅ **跨平台兼容**
- Windows 系统：通过 `wmic` 命令获取硬件详情
- Linux 系统：通过 `/proc/cpuinfo`/`dmidecode` 兼容

## 项目结构
```
SystemStatus/
├── ips.json         # 存储 IP 地址的 JSON 文件
├── main.py          # 后端 FastAPI 服务（已集成静态文件）
├── index.html       # 前端监控页面
├── script.js        # 前端交互逻辑
├── style.css        # 前端样式文件
├── echarts.js       # ECharts 图表库
├── LICENSE          # Apache License Version 2.0 开源许可证
├── README.md        # 项目说明文档
└── tmp.json         # 自动生成的缓存文件
```

## 快速开始
### 1. 环境准备
确保已安装 Python 3.8+，然后安装依赖：
```bash
pip install fastapi uvicorn psutil py3nvml
```
- `py3nvml`：可选，仅用于检测 NVIDIA 独显
- `wmi`：已不再需要，已使用 wmic 替代

### 2. 启动服务
```bash
python main.py
```
服务会启动在 `http://0.0.0.0:8001`

### 3. 访问监控页面
直接在浏览器中访问 `http://localhost:8001` 即可，无需额外的 http.server。

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
- 现在已集成静态文件，直接访问 http://localhost:8001 即可
- 生产环境请修改 `main.py` 中的 `allow_origins` 为具体域名

### Q3: 折线图没有数据？
- 检查后端服务是否正常运行
- 按 F12 打开控制台，查看是否有接口请求失败

### Q4: 没有 NVIDIA 显卡但报错？
- 已优化，无 NVIDIA 显卡时会永久禁用 NVML，不再尝试恢复
- 不会再出现持续的 NVMLError_LibraryNotFound 错误

### Q5: 重启服务器后数据丢失？
- 已优化，重启服务器后会自动从 tmp.json 缓存恢复历史数据

### Q6: Win32 IUnknown 异常？
- 已彻底解决，使用 wmic 替代 wmi COM 接口，避免异常

## 许可证
本项目基于 ** Apache License Version 2.0** 开源

## 贡献指南
欢迎提交 Issue 反馈 Bug 或需求，也可以直接提交 Pull Request 改进代码~
