// 全局变量
let API_BASE = "";
let isLocalAddress = false;
const LOCAL_CACHE_KEY = "system_monitor_cache";
let chart = null;
let netChart = null;
let systemChart = null;
let currentBranch = "";
let branchConfig = {};
// 数字动画相关配置
const ANIMATION_DURATION = 800; // 动画时长(ms)
const ANIMATION_FRAME = 16;     // 动画帧率(ms)
// 全局定时器变量
let realTimeDataInterval = null;
let diskUsageInterval = null;
let hardwareInfoInterval = null;

// ========== 工具函数：数字动画 ==========
function animateNumber(element, targetValue, isPercent = true, suffix = '') {
    if (!element) return;

    // 清空原有动画
    if (element.animationFrame) {
        cancelAnimationFrame(element.animationFrame);
    }

    // 优化起始值获取，避免正则表达式
    const currentText = element.textContent;
    const startValue = parseFloat(currentText) || 0;
    
    // 如果目标值与当前值相差很小，直接设置并返回
    if (Math.abs(targetValue - startValue) < 0.1) {
        if (isPercent) {
            element.textContent = `${targetValue.toFixed(1)}%${suffix}`;
        } else {
            element.textContent = `${targetValue.toFixed(1)}${suffix}`;
        }
        return;
    }

    const startTime = performance.now();
    let currentValue = startValue;

    // 使用requestAnimationFrame替代setInterval
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
        
        // 使用缓动函数，使动画更自然
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        currentValue = startValue + (targetValue - startValue) * easedProgress;

        // 格式化显示
        let displayText;
        if (isPercent) {
            displayText = `${currentValue.toFixed(1)}%${suffix}`;
        } else {
            displayText = `${currentValue.toFixed(1)}${suffix}`;
        }
        
        // 只有当文本发生变化时才更新DOM
        if (element.textContent !== displayText) {
            element.textContent = displayText;
        }

        if (progress < 1) {
            element.animationFrame = requestAnimationFrame(animate);
        } else {
            // 确保最终值准确
            element.textContent = isPercent ? `${targetValue.toFixed(1)}%${suffix}` : `${targetValue.toFixed(1)}${suffix}`;
            delete element.animationFrame;
        }
    };

    element.animationFrame = requestAnimationFrame(animate);
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

    // 清空旧数据，加载新数据
    clearOldData();
    await loadFromCache();
    
    // 重新检测后端状态并加载数据
    const backendAvailable = await checkBackendStatus();
    if (backendAvailable) {
        updateStatusTip(`已成功切换到【${branchConfig[newBranch].name || newBranch}】`, "success");
        
        // 清除现有定时器
        clearAllIntervals();
        
        // 立即更新最新数据
        getHardwareInfo();
        updateRealTimeData();
        updateDiskUsage();
        
        // 启动定时更新
        realTimeDataInterval = setInterval(updateRealTimeData, 2000); // 2秒更新一次，避免动画频繁
        diskUsageInterval = setInterval(updateDiskUsage, 10000);
        hardwareInfoInterval = setInterval(getHardwareInfo, 30000);
        
        // 隐藏重试按钮
        hideRetryButton();
    } else {
        updateStatusTip(`切换到【${branchConfig[newBranch].name || newBranch}】失败，后端不可用`, "error");
        // 显示重试按钮
        showRetryButton();
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
    if (systemChart) {
        systemChart.setOption({
            series: [{ data: [] }, { data: [] }, { data: [] }]
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
        { id: 'net-download-speed', text: '0 KB/s' },
        { id: 'system-load', text: '0.00' },
        { id: 'process-count', text: '0' },
        { id: 'cpu-temperature', text: '0°C' },
        { id: 'boot-time', text: '0天0小时0分钟' }
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
            // 清除animationFrame
            if (el.animationFrame) {
                cancelAnimationFrame(el.animationFrame);
                delete el.animationFrame;
            }
        }
    });

    // 重置电池信息
    const batteryInfoEl = document.getElementById('battery-info');
    if (batteryInfoEl) {
        batteryInfoEl.textContent = '电池状态: 未检测到电池信息';
    }

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

    // 3. 系统负载图表
    const systemChartDom = document.getElementById('system-chart');
    if (systemChartDom) {
        systemChart = echarts.init(systemChartDom);
        systemChart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: '系统负载趋势',
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
                data: ['系统负载', '进程数', 'CPU温度'],
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
            yAxis: [
                {
                    type: 'value',
                    min: 0,
                    name: '系统负载/进程数',
                    nameTextStyle: { color: '#86868b', padding: [0, 10, 0, 0] },
                    axisLine: { lineStyle: { color: '#e6e6e8' } },
                    axisLabel: { color: '#86868b', fontSize: 12 },
                    splitLine: { show: true, lineStyle: { color: '#f5f5f7' } }
                },
                {
                    type: 'value',
                    min: 0,
                    max: 100,
                    name: 'CPU温度(°C)',
                    nameTextStyle: { color: '#86868b', padding: [0, 10, 0, 0] },
                    axisLine: { lineStyle: { color: '#e6e6e8' } },
                    axisLabel: { color: '#86868b', fontSize: 12 },
                    splitLine: { show: false }
                }
            ],
            series: [
                {
                    name: '系统负载',
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: { width: 2 },
                    areaStyle: { opacity: 0.1 },
                    itemStyle: { color: '#0071e3' }
                },
                {
                    name: '进程数',
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: { width: 2 },
                    areaStyle: { opacity: 0.1 },
                    itemStyle: { color: '#34c759' }
                },
                {
                    name: 'CPU温度',
                    type: 'line',
                    yAxisIndex: 1,
                    data: [],
                    smooth: true,
                    lineStyle: { width: 2 },
                    areaStyle: { opacity: 0.1 },
                    itemStyle: { color: '#ff9500' }
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

// ========== 渲染硬盘信息（增量更新） ==========
function renderDiskUsage(disks) {
    const container = document.getElementById('disk-container');
    if (!container) return;

    if (!disks || disks.length === 0) {
        container.innerHTML = "<p>未检测到硬盘信息</p>";
        return;
    }

    // 获取已有的硬盘元素
    const existingItems = container.querySelectorAll('.disk-item');
    const existingCount = existingItems.length;
    const newCount = disks.length;

    // 如果硬盘数量变化，完全重新渲染
    if (existingCount !== newCount) {
        container.innerHTML = '';
        disks.forEach(disk => {
            createDiskItem(container, disk, true);
        });
        return;
    }

    // 增量更新现有硬盘元素
    disks.forEach((disk, index) => {
        const diskItem = existingItems[index];
        updateDiskItem(diskItem, disk);
    });
}

// 创建硬盘元素
function createDiskItem(container, disk, withAnimation = false) {
    const diskItem = document.createElement('div');
    diskItem.className = 'disk-item';
    diskItem.dataset.device = disk.device;
    diskItem.dataset.mountpoint = disk.mountpoint;

    let fillClass = 'low-fill';
    if (disk.usage_percent >= 30 && disk.usage_percent < 70) fillClass = 'medium-fill';
    else if (disk.usage_percent >= 70) fillClass = 'high-fill';

    // 创建进度条元素
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = `progress-fill ${fillClass}`;
    if (withAnimation) {
        progressFill.style.width = '0%';
        setTimeout(() => {
            progressFill.style.width = `${disk.usage_percent}%`;
        }, 100);
    } else {
        progressFill.style.width = `${disk.usage_percent}%`;
    }
    progressBar.appendChild(progressFill);

    diskItem.innerHTML = `
        <h4>${disk.device} (${disk.mountpoint})</h4>
        <div class="disk-info">
            <span class="disk-percent">${disk.usage_percent.toFixed(1)}%</span>
        </div>
    `;

    diskItem.insertBefore(progressBar, diskItem.querySelector('.disk-info').nextSibling);
    container.appendChild(diskItem);
}

// 更新硬盘元素
function updateDiskItem(diskItem, disk) {
    if (!diskItem) return;

    // 更新进度条颜色
    const progressFill = diskItem.querySelector('.progress-fill');
    if (progressFill) {
        let fillClass = 'low-fill';
        if (disk.usage_percent >= 30 && disk.usage_percent < 70) fillClass = 'medium-fill';
        else if (disk.usage_percent >= 70) fillClass = 'high-fill';
        
        progressFill.className = `progress-fill ${fillClass}`;
        progressFill.style.width = `${disk.usage_percent}%`;
    }

    // 更新文本信息
    const diskInfo = diskItem.querySelector('.disk-info');
    if (diskInfo) {
        diskInfo.innerHTML = `
            <span class="disk-percent">${disk.usage_percent.toFixed(1)}%</span>
        `;
    }
}

// ========== 更新网卡速度显示（带动画） ==========
function updateNetSpeedDisplay(upload, download) {
    const uploadEl = document.getElementById('net-upload-speed');
    const downloadEl = document.getElementById('net-download-speed');

    if (uploadEl) {
        animateNumber(uploadEl, upload, false, ' KB/s');
    }

    if (downloadEl) {
        animateNumber(downloadEl, download, false, ' KB/s');
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

        // 更新系统负载图表
        if (systemChart) {
            systemChart.setOption({
                series: [
                    { data: data.system_load },
                    { data: data.process_count },
                    { data: data.cpu_temperature }
                ]
            });
        }

        // 更新系统资源趋势实时信息
        const cpuUsage = data.cpu_usage.length > 0 ? data.cpu_usage[data.cpu_usage.length - 1][1] : 0;
        const memUsage = data.mem_usage.length > 0 ? data.mem_usage[data.mem_usage.length - 1][1] : 0;
        const gpuUsage = data.gpu_usage.length > 0 ? data.gpu_usage[data.gpu_usage.length - 1][1] : 0;
        
        const cpuUsageEl = document.getElementById('cpu-usage-current');
        const memUsageEl = document.getElementById('mem-usage-current');
        const gpuUsageEl = document.getElementById('gpu-usage-current');
        
        if (cpuUsageEl) animateNumber(cpuUsageEl, cpuUsage, true);
        if (memUsageEl) animateNumber(memUsageEl, memUsage, true);
        if (gpuUsageEl) animateNumber(gpuUsageEl, gpuUsage, true);

        // 更新CPU核心占用（带动画）
        updateCPUCores(data.cpu_core_usage, true);

        // 更新实时网卡速度显示（带动画）
        const uploadSpeed = data.net_upload_speed.length > 0 ? data.net_upload_speed[data.net_upload_speed.length - 1][1] : 0;
        const downloadSpeed = data.net_download_speed.length > 0 ? data.net_download_speed[data.net_download_speed.length - 1][1] : 0;
        updateNetSpeedDisplay(uploadSpeed, downloadSpeed);

        // 更新系统负载、进程数、CPU温度等数据
        const systemLoad = data.system_load.length > 0 ? data.system_load[data.system_load.length - 1][1] : 0;
        const processCount = data.process_count.length > 0 ? data.process_count[data.process_count.length - 1][1] : 0;
        const cpuTemperature = data.cpu_temperature.length > 0 ? data.cpu_temperature[data.cpu_temperature.length - 1][1] : 0;
        
        // 更新系统负载显示
        const systemLoadEl = document.getElementById('system-load');
        if (systemLoadEl) {
            animateNumber(systemLoadEl, systemLoad, false);
        }
        
        // 更新进程数显示
        const processCountEl = document.getElementById('process-count');
        if (processCountEl) {
            animateNumber(processCountEl, processCount, false);
        }
        
        // 更新CPU温度显示
        const cpuTemperatureEl = document.getElementById('cpu-temperature');
        if (cpuTemperatureEl) {
            animateNumber(cpuTemperatureEl, cpuTemperature, false, '°C');
        }
        
        // 更新开机时间
        const bootTimeEl = document.getElementById('boot-time');
        if (bootTimeEl && data.boot_time) {
            const bootTime = new Date(data.boot_time * 1000);
            const now = new Date();
            const diffMs = now - bootTime;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            bootTimeEl.textContent = `${diffDays}天${diffHours}小时${diffMinutes}分钟`;
        }
        
        // 更新电池信息
        const batteryInfoEl = document.getElementById('battery-info');
        if (batteryInfoEl && data.battery_info) {
            const battery = data.battery_info;
            if (battery.percent !== undefined) {
                if (battery.plugged) {
                    batteryInfoEl.textContent = `电池状态: 已充电 ${battery.percent.toFixed(0)}% (已连接电源)`;
                } else {
                    const secsLeft = battery.secsleft;
                    let timeLeft = '';
                    if (secsLeft > 0) {
                        const hours = Math.floor(secsLeft / 3600);
                        const minutes = Math.floor((secsLeft % 3600) / 60);
                        timeLeft = `，预计剩余 ${hours}小时${minutes}分钟`;
                    }
                    batteryInfoEl.textContent = `电池状态: ${battery.percent.toFixed(0)}% (未连接电源${timeLeft})`;
                }
            }
        }

        // 更新本地缓存
        const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
        localCache.real_time_data = {
            cpu_usage: data.cpu_usage.length > 0 ? data.cpu_usage[data.cpu_usage.length - 1][1] : 0,
            mem_usage: data.mem_usage.length > 0 ? data.mem_usage[data.mem_usage.length - 1][1] : 0,
            gpu_usage: data.gpu_usage.length > 0 ? data.gpu_usage[data.gpu_usage.length - 1][1] : 0,
            net_upload_speed: uploadSpeed,
            net_download_speed: downloadSpeed,
            system_load: systemLoad,
            process_count: processCount,
            cpu_temperature: cpuTemperature,
            boot_time: data.boot_time,
            battery_info: data.battery_info,
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

    if (!coreUsages || coreUsages.length === 0) {
        container.innerHTML = "<p>未检测到CPU核心信息</p>";
        return;
    }

    // 获取当前已存在的核心元素
    const existingCoreBoxes = container.querySelectorAll('.core-box');
    const existingCount = existingCoreBoxes.length;
    const newCount = coreUsages.length;

    // 如果核心数量变化，重新创建所有元素
    if (existingCount !== newCount) {
        container.innerHTML = '';
        
        coreUsages.forEach((usage, index) => {
            const coreBox = document.createElement('div');
            coreBox.className = 'core-box';
            
            // 创建核心数字元素
            const coreNumEl = document.createElement('div');
            coreNumEl.className = 'core-num';
            coreNumEl.textContent = `核心 ${index + 1}`;

            const coreUsageEl = document.createElement('div');
            coreUsageEl.className = 'core-usage';
            coreUsageEl.textContent = `${usage.toFixed(1)}%`;

            coreBox.appendChild(coreNumEl);
            coreBox.appendChild(coreUsageEl);
            container.appendChild(coreBox);
        });
    }

    // 更新现有元素的样式和内容
    coreUsages.forEach((usage, index) => {
        const coreBox = container.children[index];
        if (!coreBox) return;
        
        // 更新核心使用率
        const coreUsageEl = coreBox.querySelector('.core-usage');
        if (coreUsageEl) {
            if (withAnimation) {
                animateNumber(coreUsageEl, usage, true);
            } else {
                coreUsageEl.textContent = `${usage.toFixed(1)}%`;
            }
        }
        
        // 更新样式类
        coreBox.className = 'core-box';
        if (usage < 30) coreBox.classList.add('low');
        else if (usage < 70) coreBox.classList.add('medium');
        else coreBox.classList.add('high');
    });
}

// ========== 自动重试机制 ==========
let autoRetryInterval = null;
let retryCount = 0;
const MAX_RETRY_COUNT = 5;

// 重试连接后端
async function retryBackendConnection() {
    updateStatusTip("正在尝试重新连接后端...", "warning");
    hideRetryButton();
    
    const backendAvailable = await checkBackendStatus();
    
    if (backendAvailable) {
        updateStatusTip(`已成功连接【${branchConfig[currentBranch].name || currentBranch}】`, "success");
        // 加载缓存（快速显示）
        await loadFromCache();
        // 立即更新最新数据
        getHardwareInfo();
        updateRealTimeData();
        updateDiskUsage();
        
        // 清除现有定时器
        clearAllIntervals();
        
        // 启动定时更新
        realTimeDataInterval = setInterval(updateRealTimeData, 2000); // 2秒更新一次，避免动画频繁
        diskUsageInterval = setInterval(updateDiskUsage, 10000);
        hardwareInfoInterval = setInterval(getHardwareInfo, 30000);
        
        // 清除自动重试
        if (autoRetryInterval) {
            clearInterval(autoRetryInterval);
            autoRetryInterval = null;
        }
        retryCount = 0;
    } else {
        retryCount++;
        if (retryCount < MAX_RETRY_COUNT) {
            updateStatusTip(`连接失败，${MAX_RETRY_COUNT - retryCount}秒后自动重试...`, "error");
            // 延迟重试
            setTimeout(retryBackendConnection, 1000);
        } else {
            updateStatusTip("后端连接失败，已达到最大重试次数", "error");
            showRetryButton();
        }
    }
}

// 显示重试按钮
function showRetryButton() {
    const retryContainer = document.getElementById('retry-container');
    if (retryContainer) {
        retryContainer.style.display = 'flex';
    }
}

// 隐藏重试按钮
function hideRetryButton() {
    const retryContainer = document.getElementById('retry-container');
    if (retryContainer) {
        retryContainer.style.display = 'none';
    }
}

// 清除所有定时器
function clearAllIntervals() {
    if (realTimeDataInterval) {
        clearInterval(realTimeDataInterval);
        realTimeDataInterval = null;
    }
    if (diskUsageInterval) {
        clearInterval(diskUsageInterval);
        diskUsageInterval = null;
    }
    if (hardwareInfoInterval) {
        clearInterval(hardwareInfoInterval);
        hardwareInfoInterval = null;
    }
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

    // 3. 初始化折叠按钮事件
    initToggleButtons();

    // 4. 绑定重试按钮事件
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', retryBackendConnection);
    }

    // 5. 检测后端状态
    const backendAvailable = await checkBackendStatus();

    if (backendAvailable) {
            updateStatusTip(`已成功连接【${branchConfig[currentBranch].name || currentBranch}】`, "success");
            // 加载缓存（快速显示）
            await loadFromCache();
            // 立即更新最新数据
            getHardwareInfo();
            updateRealTimeData();
            updateDiskUsage();

            // 清除现有定时器
            clearAllIntervals();
            
            // 定时更新（降低更新频率，更流畅）
            realTimeDataInterval = setInterval(updateRealTimeData, 2000); // 2秒更新一次，避免动画频繁
            diskUsageInterval = setInterval(updateDiskUsage, 10000);
            hardwareInfoInterval = setInterval(getHardwareInfo, 30000);
        } else {
            // 后端不可用，尝试加载缓存
            await loadFromCache();
            // 显示重试按钮
            showRetryButton();
            // 开始自动重试
            retryBackendConnection();
        }
}

// ========== 图表折叠功能 ==========
let allChartsCollapsed = false;

// 初始化折叠按钮事件
function initToggleButtons() {
    // 单个图表折叠按钮
    const toggleBtns = document.querySelectorAll('.chart-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            toggleChart(targetId, btn);
        });
    });

    // 一键折叠/展开所有按钮
    const toggleAllBtn = document.getElementById('toggle-all-btn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', toggleAllCharts);
    }
}

// 折叠/展开单个图表
function toggleChart(chartId, btn) {
    const chartContainer = document.getElementById(chartId);
    const panel = chartContainer?.closest('.chart-panel');
    
    if (!chartContainer || !panel) return;

    const isCollapsed = chartContainer.classList.toggle('collapsed');
    btn.classList.toggle('collapsed', isCollapsed);
    panel.classList.toggle('collapsed', isCollapsed);

    // 如果展开图表，等待动画完成后调用 resize 确保图表正确显示
    if (!isCollapsed) {
        setTimeout(() => {
            resizeChart(chartId);
        }, 450);
    }
}

// 折叠/展开所有图表
function toggleAllCharts() {
    allChartsCollapsed = !allChartsCollapsed;
    const toggleAllBtn = document.getElementById('toggle-all-btn');
    const toggleBtns = document.querySelectorAll('.chart-toggle-btn');
    const chartContainers = document.querySelectorAll('.chart-container');
    const panels = document.querySelectorAll('.chart-panel');

    // 更新一键按钮状态
    if (toggleAllBtn) {
        toggleAllBtn.classList.toggle('collapsed', allChartsCollapsed);
        const textEl = toggleAllBtn.querySelector('.toggle-text');
        if (textEl) {
            textEl.textContent = allChartsCollapsed ? '展开所有图表' : '折叠所有图表';
        }
    }

    // 更新所有图表和按钮
    toggleBtns.forEach(btn => {
        btn.classList.toggle('collapsed', allChartsCollapsed);
    });

    chartContainers.forEach(container => {
        container.classList.toggle('collapsed', allChartsCollapsed);
    });

    panels.forEach(panel => {
        panel.classList.toggle('collapsed', allChartsCollapsed);
    });

    // 如果展开所有图表，等待动画完成后调用 resize
    if (!allChartsCollapsed) {
        setTimeout(() => {
            ['net-chart', 'system-chart', 'usage-chart'].forEach(resizeChart);
        }, 450);
    }
}

// 调整图表大小
function resizeChart(chartId) {
    let chartInstance = null;
    if (chartId === 'usage-chart') chartInstance = chart;
    else if (chartId === 'net-chart') chartInstance = netChart;
    else if (chartId === 'system-chart') chartInstance = systemChart;

    if (chartInstance) {
        setTimeout(() => {
            chartInstance.resize();
        }, 50);
    }
}

// 确保DOM完全加载后执行初始化
document.addEventListener('DOMContentLoaded', init);
// 兜底：如果DOMContentLoaded未触发，延迟执行
setTimeout(init, 100);