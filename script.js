// 全局变量
let API_BASE = "";
let isLocalAddress = false;
const LOCAL_CACHE_KEY = "system_monitor_cache";
let chart = null;
let netChart = null;
let currentBranch = "";
let branchConfig = {};
// 数字动画相关配置
const ANIMATION_DURATION = 800; // 动画时长(ms)
const ANIMATION_FRAME = 16;     // 动画帧率(ms)

// ========== 工具函数：数字动画 ==========
function animateNumber(element, targetValue, isPercent = true) {
    if (!element) return;

    // 清空原有动画
    if (element.animationTimer) {
        clearInterval(element.animationTimer);
    }

    const startValue = parseFloat(element.textContent.replace(/[^0-9.]/g, "")) || 0;
    const diff = targetValue - startValue;
    const step = diff / (ANIMATION_DURATION / ANIMATION_FRAME);
    let currentValue = startValue;

    element.animationTimer = setInterval(() => {
        currentValue += step;

        // 边界处理
        if ((step > 0 && currentValue >= targetValue) || (step < 0 && currentValue <= targetValue)) {
            currentValue = targetValue;
            clearInterval(element.animationTimer);
            delete element.animationTimer;
        }

        // 格式化显示
        if (isPercent) {
            element.textContent = `${currentValue.toFixed(1)}%`;
        } else {
            element.textContent = `${currentValue.toFixed(1)}`;
        }
    }, ANIMATION_FRAME);
}

// ========== 加载分支配置 ==========
async function loadBranchConfig() {
    try {
        // 等待DOM完全加载后再操作下拉框
        await new Promise(resolve => {
            if (document.readyState === "complete") resolve();
            else document.addEventListener("DOMContentLoaded", resolve);
        });

        const selectEl = document.getElementById("branch-select");
        if (!selectEl) {
            console.error("下拉框DOM元素不存在");
            throw new Error("下拉框元素未找到");
        }

        // 先清空下拉框（避免重复）
        selectEl.innerHTML = "";

        let config = {};
        try {
            const response = await fetch("ips.json");
            if (!response.ok) throw new Error("配置文件请求失败");
            config = await response.json();
        } catch (e) {
            console.error("加载ips.json失败，使用默认配置:", e);
        }

        // 强制兜底配置
        branchConfig = config.branches || {
            local_server: { name: "本地服务器", api: "127.0.0.1", port: 8000 }
        };
        currentBranch = config.default_branch || Object.keys(branchConfig)[0] || "local_server";

        // 强制检查分支配置有效性
        if (!branchConfig[currentBranch]) {
            currentBranch = Object.keys(branchConfig)[0];
        }

        // 填充分支下拉框
        const branchKeys = Object.keys(branchConfig);
        if (branchKeys.length === 0) {
            branchConfig = { local_server: { name: "本地服务器", api: "127.0.0.1", port: 8000 } };
            branchKeys.push("local_server");
            currentBranch = "local_server";
        }

        branchKeys.forEach(key => {
            const branch = branchConfig[key];
            const option = document.createElement("option");
            option.value = key;
            option.textContent = branch.name || `服务器${key}`;
            if (key === currentBranch) option.selected = true;
            selectEl.appendChild(option);
        });

        // 初始化当前分支的API地址
        initBranchAPI(currentBranch);

        // 绑定切换按钮事件
        const switchBtn = document.getElementById("switch-btn");
        if (switchBtn) {
            switchBtn.removeEventListener("click", switchBranch);
            switchBtn.addEventListener("click", switchBranch);
        } else {
            console.error("切换按钮DOM元素不存在");
        }

        return true;
    } catch (error) {
        console.error("加载分支配置失败，强制使用默认配置:", error);
        // 终极兜底
        branchConfig = {
            local_server: { name: "本地服务器", api: "127.0.0.1", port: 8000 }
        };
        currentBranch = "local_server";

        // 手动填充分拉框
        const selectEl = document.getElementById("branch-select");
        if (selectEl) {
            selectEl.innerHTML = "";
            const option = document.createElement("option");
            option.value = "local_server";
            option.textContent = "本地服务器";
            option.selected = true;
            selectEl.appendChild(option);
        }

        initBranchAPI(currentBranch);
        updateStatusTip("配置加载失败，使用默认本地地址", "warning");
        return false;
    }
}

// ========== 初始化分支API地址 ==========
function initBranchAPI(branchKey) {
    const branch = branchConfig[branchKey] || { api: "127.0.0.1", port: 8000 };

    const apiHost = branch.api || "127.0.0.1";
    const apiPort = branch.port || 8000;
    API_BASE = `http://${apiHost}:${apiPort}/api`;

    // 判断是否为本地地址
    isLocalAddress = apiHost === "localhost" ||
        apiHost.startsWith("127.") ||
        apiHost === "0.0.0.0" ||
        apiHost.startsWith("192.168.");

    // 更新状态提示
    updateStatusTip(`已加载【${branch.name || branchKey}】配置：${apiHost}:${apiPort}`, "success");
    if (!isLocalAddress) {
        updateStatusTip(`当前连接【${branch.name || branchKey}】(远端地址)，无法使用缓存`, "warning");
    }
}

// ========== 切换分支 ==========
async function switchBranch() {
    const selectEl = document.getElementById("branch-select");
    if (!selectEl) {
        updateStatusTip("切换失败：下拉框元素不存在", "error");
        return;
    }

    const newBranch = selectEl.value;
    if (!newBranch || newBranch === currentBranch) return;

    // 检查新分支是否有效
    if (!branchConfig[newBranch]) {
        updateStatusTip(`切换失败：分支【${newBranch}】配置不存在`, "error");
        return;
    }

    // 重置状态提示
    updateStatusTip(`正在切换到【${branchConfig[newBranch].name || newBranch}】...`, "success");

    // 初始化新分支
    currentBranch = newBranch;
    initBranchAPI(currentBranch);

    // 重新检测后端状态并加载数据
    const backendAvailable = await checkBackendStatus();
    if (backendAvailable) {
        updateStatusTip(`已成功切换到【${branchConfig[newBranch].name || newBranch}】`, "success");
        // 清空旧数据，加载新数据
        clearOldData();
        await loadFromCache();
        getHardwareInfo();
        updateRealTimeData();
        updateDiskUsage();
    } else {
        updateStatusTip(`切换到【${branchConfig[newBranch].name || newBranch}】失败，后端不可用`, "error");
        await loadFromCache();
    }
}

// ========== 清空旧数据 ==========
function clearOldData() {
    // 清空图表数据
    if (chart) {
        chart.setOption({
            series: [{ data: [] }, { data: [] }, { data: [] }]
        });
    }
    if (netChart) {
        netChart.setOption({
            series: [{ data: [] }, { data: [] }]
        });
    }

    // 清空硬件信息（重置为初始状态）
    const resetElements = [
        { id: 'cpu-model', text: '加载中...' },
        { id: 'cpu-cores', text: '加载中...' },
        { id: 'mem-model', text: '加载中...' },
        { id: 'mem-total', text: '加载中...' },
        { id: 'gpu-model', text: '加载中...' },
        { id: 'gpu-status', text: '加载中...' },
        { id: 'net-upload-speed', text: '0 KB/s' },
        { id: 'net-download-speed', text: '0 KB/s' }
    ];

    resetElements.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.textContent = item.text;
            // 清除动画计时器
            if (el.animationTimer) {
                clearInterval(el.animationTimer);
                delete el.animationTimer;
            }
        }
    });

    // 清空复杂元素
    const networkEl = document.getElementById('network-info');
    if (networkEl) networkEl.innerHTML = "加载中...";

    const cpuCoresEl = document.getElementById('cpu-cores-container');
    if (cpuCoresEl) cpuCoresEl.innerHTML = "加载中...";

    const diskEl = document.getElementById('disk-container');
    if (diskEl) diskEl.innerHTML = "加载中...";
}

// ========== 更新状态提示 ==========
function updateStatusTip(text, type = "success") {
    const tipEl = document.getElementById("status-tip");
    if (!tipEl) return;

    tipEl.textContent = text;
    // 重置样式
    tipEl.className = "status-tip";
    // 添加对应样式
    if (type === "success") tipEl.classList.add("tip-success");
    else if (type === "warning") tipEl.classList.add("tip-warning");
    else if (type === "error") tipEl.classList.add("tip-error");
}

// ========== 初始化双折线图（布局优化） ==========
function initChart() {
    // 1. CPU/内存/GPU 图表
    const chartDom = document.getElementById('usage-chart');
    if (chartDom) {
        chart = echarts.init(chartDom);
        chart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: 'CPU/内存/GPU 占用率趋势',
                textStyle: { color: '#86868b', fontSize: 16, fontWeight: 500 },
                left: 'center',
                padding: [0, 0, 20, 0] // 增加标题下方间距
            },
            tooltip: {
                trigger: 'axis',
                padding: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e6e6e8',
                borderWidth: 1,
                textStyle: { color: '#1d1d1f', fontSize: 14 }
            },
            legend: {
                data: ['CPU占用率(%)', '内存占用率(%)', 'GPU占用率(%)'],
                textStyle: { color: '#86868b', fontSize: 14 },
                bottom: 10, // 图例移到底部，增加图表空间
                left: 'center'
            },
            grid: {
                left: '5%',
                right: '5%',
                top: '15%', // 增加顶部间距
                bottom: '20%', // 增加底部间距
                containLabel: true
            },
            xAxis: {
                type: 'time',
                name: '时间',
                nameTextStyle: { color: '#86868b', padding: [0, 0, 10, 0] },
                axisLine: { lineStyle: { color: '#e6e6e8' } },
                axisLabel: { color: '#86868b', fontSize: 12 },
                splitLine: { show: true, lineStyle: { color: '#f5f5f7' } }
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: 100,
                name: '占用率(%)',
                nameTextStyle: { color: '#86868b', padding: [0, 10, 0, 0] },
                axisLine: { lineStyle: { color: '#e6e6e8' } },
                axisLabel: { color: '#86868b', fontSize: 12 },
                splitLine: { show: true, lineStyle: { color: '#f5f5f7' } }
            },
            series: [
                {
                    name: 'CPU占用率(%)',
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: { width: 2 },
                    areaStyle: { opacity: 0.1 }, // 增加面积透明度，更简约
                    itemStyle: { color: '#0071e3' }
                },
                {
                    name: '内存占用率(%)',
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: { width: 2 },
                    areaStyle: { opacity: 0.1 },
                    itemStyle: { color: '#34c759' }
                },
                {
                    name: 'GPU占用率(%)',
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: { width: 2 },
                    areaStyle: { opacity: 0.1 },
                    itemStyle: { color: '#ff9500' }
                }
            ]
        });
    }

    // 2. 网卡流量图表
    const netChartDom = document.getElementById('net-chart');
    if (netChartDom) {
        netChart = echarts.init(netChartDom);
        netChart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: '网卡流量速度趋势',
                textStyle: { color: '#86868b', fontSize: 16, fontWeight: 500 },
                left: 'center',
                padding: [0, 0, 20, 0]
            },
            tooltip: {
                trigger: 'axis',
                padding: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e6e6e8',
                borderWidth: 1,
                textStyle: { color: '#1d1d1f', fontSize: 14 }
            },
            legend: {
                data: ['上传速度', '下载速度'],
                textStyle: { color: '#86868b', fontSize: 14 },
                bottom: 10,
                left: 'center'
            },
            grid: {
                left: '5%',
                right: '5%',
                top: '15%',
                bottom: '20%',
                containLabel: true
            },
            xAxis: {
                type: 'time',
                name: '时间',
                nameTextStyle: { color: '#86868b', padding: [0, 0, 10, 0] },
                axisLine: { lineStyle: { color: '#e6e6e8' } },
                axisLabel: { color: '#86868b', fontSize: 12 },
                splitLine: { show: true, lineStyle: { color: '#f5f5f7' } }
            },
            yAxis: {
                type: 'value',
                min: 0,
                name: '速度 (KB/s)',
                nameTextStyle: { color: '#86868b', padding: [0, 10, 0, 0] },
                axisLine: { lineStyle: { color: '#e6e6e8' } },
                axisLabel: { color: '#86868b', fontSize: 12 },
                splitLine: { show: true, lineStyle: { color: '#f5f5f7' } }
            },
            series: [
                {
                    name: '上传速度',
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: { width: 2 },
                    areaStyle: { opacity: 0.1 },
                    itemStyle: { color: '#0071e3' }
                },
                {
                    name: '下载速度',
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: { width: 2 },
                    areaStyle: { opacity: 0.1 },
                    itemStyle: { color: '#34c759' }
                }
            ]
        });
    }
}

// ========== 检测后端是否可用 ==========
async function checkBackendStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${API_BASE}/hardware-info`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.error("后端连接失败:", error);
        return false;
    }
}

// ========== 读取本地tmp.json缓存 ==========
async function loadLocalTmpJson() {
    try {
        const response = await fetch("tmp.json");
        if (!response.ok) throw new Error("tmp.json不存在");

        const cacheData = await response.json();
        renderHardwareInfo(cacheData.hardware_info);
        updateCPUCores(cacheData.real_time_data.cpu_core_usage);
        renderDiskUsage(cacheData.disk_usage);

        // 数字动画更新网卡速度
        const uploadSpeed = cacheData.real_time_data.net_upload_speed || 0;
        const downloadSpeed = cacheData.real_time_data.net_download_speed || 0;
        const uploadEl = document.getElementById('net-upload-speed');
        const downloadEl = document.getElementById('net-download-speed');

        if (uploadEl) {
            animateNumber(uploadEl, uploadSpeed, false);
            // 确保单位显示
            uploadEl.textContent = `${uploadSpeed.toFixed(1)} KB/s`;
        }
        if (downloadEl) {
            animateNumber(downloadEl, downloadSpeed, false);
            downloadEl.textContent = `${downloadSpeed.toFixed(1)} KB/s`;
        }

        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cacheData));
        updateStatusTip("未检测到后端，无法获取数据，正在使用缓存", "error");
        return true;
    } catch (error) {
        console.error("读取tmp.json失败:", error);
        updateStatusTip("未检测到后端，且无可用缓存", "error");
        return false;
    }
}

// ========== 从缓存加载初始数据 ==========
async function loadFromCache() {
    if (!isLocalAddress) {
        updateStatusTip(`当前连接远端地址，无法使用缓存`, "warning");
        return false;
    }

    try {
        // 1. 优先读取后端缓存接口
        const cacheResponse = await fetch(`${API_BASE}/cache`);
        if (cacheResponse.ok) {
            const cacheData = await cacheResponse.json();
            if (!cacheData.error) {
                renderHardwareInfo(cacheData.hardware_info);
                updateCPUCores(cacheData.real_time_data.cpu_core_usage);
                renderDiskUsage(cacheData.disk_usage);

                // 数字动画更新网卡速度
                const uploadSpeed = cacheData.real_time_data.net_upload_speed || 0;
                const downloadSpeed = cacheData.real_time_data.net_download_speed || 0;
                const uploadEl = document.getElementById('net-upload-speed');
                const downloadEl = document.getElementById('net-download-speed');

                if (uploadEl) {
                    animateNumber(uploadEl, uploadSpeed, false);
                    uploadEl.textContent = `${uploadSpeed.toFixed(1)} KB/s`;
                }
                if (downloadEl) {
                    animateNumber(downloadEl, downloadSpeed, false);
                    downloadEl.textContent = `${downloadSpeed.toFixed(1)} KB/s`;
                }

                localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cacheData));
                updateStatusTip("已连接后端，使用缓存快速加载", "success");
                return true;
            }
        }

        // 2. 读取浏览器本地缓存
        const localCache = localStorage.getItem(LOCAL_CACHE_KEY);
        if (localCache) {
            const cacheData = JSON.parse(localCache);
            renderHardwareInfo(cacheData.hardware_info);
            updateCPUCores(cacheData.real_time_data.cpu_core_usage);
            renderDiskUsage(cacheData.disk_usage);

            // 数字动画更新网卡速度
            const uploadSpeed = cacheData.real_time_data.net_upload_speed || 0;
            const downloadSpeed = cacheData.real_time_data.net_download_speed || 0;
            const uploadEl = document.getElementById('net-upload-speed');
            const downloadEl = document.getElementById('net-download-speed');

            if (uploadEl) {
                animateNumber(uploadEl, uploadSpeed, false);
                uploadEl.textContent = `${uploadSpeed.toFixed(1)} KB/s`;
            }
            if (downloadEl) {
                animateNumber(downloadEl, downloadSpeed, false);
                downloadEl.textContent = `${downloadSpeed.toFixed(1)} KB/s`;
            }

            updateStatusTip("后端缓存不可用，使用浏览器本地缓存", "warning");
            return true;
        }

        // 3. 读取本地tmp.json文件
        return await loadLocalTmpJson();
    } catch (e) {
        console.log("缓存加载失败:", e);
        updateStatusTip("已连接后端", "success");
        return false;
    }
}

// ========== 渲染硬件信息 ==========
function renderHardwareInfo(data) {
    if (!data) return;

    // CPU信息
    const cpuModelEl = document.getElementById('cpu-model');
    const cpuCoresEl = document.getElementById('cpu-cores');
    if (cpuModelEl) cpuModelEl.textContent = data.cpu?.model || "未知CPU";
    if (cpuCoresEl) cpuCoresEl.textContent = `${data.cpu?.cores || 0} (物理: ${data.cpu?.physical_cores || 0})`;

    // 内存信息
    const memModelEl = document.getElementById('mem-model');
    const memTotalEl = document.getElementById('mem-total');
    if (memModelEl) memModelEl.textContent = data.memory?.model || "未知内存";
    if (memTotalEl) memTotalEl.textContent = data.memory?.total || 0;

    // 显卡信息
    const gpuModelEl = document.getElementById('gpu-model');
    const gpuStatusEl = document.getElementById('gpu-status');
    if (gpuModelEl) gpuModelEl.textContent = data.gpu?.model || "未知显卡";
    if (gpuStatusEl) gpuStatusEl.textContent = data.gpu?.available ? '可用' : '不可用';

    // 网卡信息
    const netContainer = document.getElementById('network-info');
    if (netContainer) {
        netContainer.innerHTML = '';
        if (data.network && data.network.length > 0) {
            data.network.forEach(iface => {
                const p = document.createElement('p');
                p.textContent = `${iface.name}: ${iface.addresses.join(', ') || '无IP地址'}`;
                netContainer.appendChild(p);
            });
        } else {
            netContainer.innerHTML = "<p>未检测到网卡信息</p>";
        }
    }
}

// ========== 渲染硬盘信息（进度条动画） ==========
function renderDiskUsage(disks) {
    const container = document.getElementById('disk-container');
    if (!container) return;

    container.innerHTML = '';

    if (!disks || disks.length === 0) {
        container.innerHTML = "<p>未检测到硬盘信息</p>";
        return;
    }

    disks.forEach(disk => {
        const diskItem = document.createElement('div');
        diskItem.className = 'disk-item';

        let fillClass = 'low-fill';
        if (disk.usage_percent >= 30 && disk.usage_percent < 70) fillClass = 'medium-fill';
        else if (disk.usage_percent >= 70) fillClass = 'high-fill';

        // 创建进度条元素
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';

        const progressFill = document.createElement('div');
        progressFill.className = `progress-fill ${fillClass}`;
        progressFill.style.width = '0%'; // 初始宽度为0
        progressBar.appendChild(progressFill);

        // 进度条动画
        setTimeout(() => {
            progressFill.style.width = `${disk.usage_percent}%`;
        }, 100);

        diskItem.innerHTML = `
            <h4>${disk.device} (${disk.mountpoint})</h4>
            <div class="disk-info">
                已用: ${disk.used} GB / 总计: ${disk.total} GB 
                <span class="disk-percent">(${disk.usage_percent.toFixed(1)}%)</span>
            </div>
        `;

        // 插入进度条（放在信息下方，增加间距）
        diskItem.insertBefore(progressBar, diskItem.querySelector('.disk-info').nextSibling);

        container.appendChild(diskItem);
    });
}

// ========== 更新网卡速度显示（带动画） ==========
function updateNetSpeedDisplay(upload, download) {
    const uploadEl = document.getElementById('net-upload-speed');
    const downloadEl = document.getElementById('net-download-speed');

    if (uploadEl) {
        // 数字动画
        animateNumber(uploadEl, upload, false);
        // 确保单位显示（动画结束后）
        setTimeout(() => {
            uploadEl.textContent = `${upload.toFixed(1)} KB/s`;
        }, ANIMATION_DURATION);
    }

    if (downloadEl) {
        animateNumber(downloadEl, download, false);
        setTimeout(() => {
            downloadEl.textContent = `${download.toFixed(1)} KB/s`;
        }, ANIMATION_DURATION);
    }
}

// ========== 获取最新硬件信息 ==========
async function getHardwareInfo() {
    if (!isLocalAddress || !(await checkBackendStatus())) return;

    try {
        const response = await fetch(`${API_BASE}/hardware-info`);
        if (!response.ok) throw new Error(`HTTP错误：${response.status}`);

        const data = await response.json();
        renderHardwareInfo(data);

        const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
        localCache.hardware_info = data;
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(localCache));

    } catch (error) {
        console.error('获取最新硬件信息失败:', error);
    }
}

// ========== 更新实时监控数据（核心数字动画） ==========
async function updateRealTimeData() {
    if (!isLocalAddress || !(await checkBackendStatus())) return;

    try {
        const response = await fetch(`${API_BASE}/real-time-data`);
        const data = await response.json();

        // 更新CPU/内存/GPU图表
        if (chart) {
            chart.setOption({
                series: [
                    { data: data.cpu_usage },
                    { data: data.mem_usage },
                    { data: data.gpu_usage }
                ]
            });
        }

        // 更新网卡流量图表
        if (netChart) {
            netChart.setOption({
                series: [
                    { data: data.net_upload_speed },
                    { data: data.net_download_speed }
                ]
            });
        }

        // 更新CPU核心占用（带动画）
        updateCPUCores(data.cpu_core_usage, true);

        // 更新实时网卡速度显示（带动画）
        const uploadSpeed = data.net_upload_speed.length > 0 ? data.net_upload_speed[data.net_upload_speed.length - 1][1] : 0;
        const downloadSpeed = data.net_download_speed.length > 0 ? data.net_download_speed[data.net_download_speed.length - 1][1] : 0;
        updateNetSpeedDisplay(uploadSpeed, downloadSpeed);

        // 更新本地缓存
        const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
        localCache.real_time_data = {
            cpu_usage: data.cpu_usage.length > 0 ? data.cpu_usage[data.cpu_usage.length - 1][1] : 0,
            mem_usage: data.mem_usage.length > 0 ? data.mem_usage[data.mem_usage.length - 1][1] : 0,
            gpu_usage: data.gpu_usage.length > 0 ? data.gpu_usage[data.gpu_usage.length - 1][1] : 0,
            net_upload_speed: uploadSpeed,
            net_download_speed: downloadSpeed,
            cpu_core_usage: data.cpu_core_usage,
            timestamp: data.timestamp
        };
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(localCache));

    } catch (error) {
        console.error('获取实时数据失败:', error);
    }
}

// ========== 更新CPU核心显示（带动画） ==========
function updateCPUCores(coreUsages, withAnimation = false) {
    const container = document.getElementById('cpu-cores-container');
    if (!container) return;

    container.innerHTML = '';

    if (!coreUsages || coreUsages.length === 0) {
        container.innerHTML = "<p>未检测到CPU核心信息</p>";
        return;
    }

    coreUsages.forEach((usage, index) => {
        const coreBox = document.createElement('div');
        coreBox.className = 'core-box';

        if (usage < 30) coreBox.classList.add('low');
        else if (usage < 70) coreBox.classList.add('medium');
        else coreBox.classList.add('high');

        // 创建核心数字元素
        const coreNumEl = document.createElement('div');
        coreNumEl.className = 'core-num';
        coreNumEl.textContent = `核心 ${index + 1}`;

        const coreUsageEl = document.createElement('div');
        coreUsageEl.className = 'core-usage';
        coreUsageEl.textContent = '0%';

        coreBox.appendChild(coreNumEl);
        coreBox.appendChild(coreUsageEl);
        container.appendChild(coreBox);

        // 数字动画
        if (withAnimation) {
            animateNumber(coreUsageEl, usage, true);
        } else {
            coreUsageEl.textContent = `${usage.toFixed(1)}%`;
        }
    });
}

// ========== 更新硬盘占用进度条 ==========
async function updateDiskUsage() {
    if (!isLocalAddress || !(await checkBackendStatus())) return;

    try {
        const response = await fetch(`${API_BASE}/disk-usage`);
        const disks = await response.json();
        renderDiskUsage(disks);

        const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
        localCache.disk_usage = disks;
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(localCache));

    } catch (error) {
        console.error('获取硬盘信息失败:', error);
        const container = document.getElementById('disk-container');
        if (container) container.innerHTML = "<p>硬盘信息获取失败</p>";
    }
}

// ========== 页面初始化主函数 ==========
async function init() {
    // 1. 先初始化图表（避免DOM未加载）
    initChart();

    // 2. 加载分支配置（优先保证下拉框有数据）
    await loadBranchConfig();

    // 3. 检测后端状态
    const backendAvailable = await checkBackendStatus();

    if (backendAvailable) {
        updateStatusTip(`已成功连接【${branchConfig[currentBranch].name || currentBranch}】`, "success");
        // 加载缓存（快速显示）
        await loadFromCache();
        // 立即更新最新数据
        getHardwareInfo();
        updateRealTimeData();
        updateDiskUsage();

        // 定时更新（降低更新频率，更流畅）
        setInterval(updateRealTimeData, 2000); // 2秒更新一次，避免动画频繁
        setInterval(updateDiskUsage, 10000);
        setInterval(getHardwareInfo, 30000);
    } else {
        // 后端不可用，尝试加载缓存
        await loadFromCache();
    }
}

// 确保DOM完全加载后执行初始化
document.addEventListener('DOMContentLoaded', init);
// 兜底：如果DOMContentLoaded未触发，延迟执行
setTimeout(init, 100);