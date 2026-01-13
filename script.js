// 全局变量
let API_BASE = "";
let isLocalAddress = false; // 是否为本地地址
const LOCAL_CACHE_KEY = "system_monitor_cache";
let chart = null;
let netChart = null;

// 第一步：读取ips.json配置
async function loadConfig() {
    try {
        const response = await fetch("ips.json");
        if (!response.ok) throw new Error("配置文件读取失败");

        const config = await response.json();
        const apiHost = config.api || "127.0.0.1";
        const apiPort = config.port || 8000;
        API_BASE = `http://${apiHost}:${apiPort}/api`;

        // 判断是否为本地地址
        isLocalAddress = apiHost === "localhost" ||
            apiHost.startsWith("127.") ||
            apiHost === "0.0.0.0" ||
            apiHost.startsWith("192.168."); // 局域网也视为本地

        // 更新状态提示
        updateStatusTip(`已加载配置：${apiHost}:${apiPort}`, "success");
        if (!isLocalAddress) {
            updateStatusTip(`当前连接远端地址(${apiHost}:${apiPort})，无法使用缓存`, "warning");
        }

        return true;
    } catch (error) {
        console.error("加载配置失败，使用默认地址:", error);
        API_BASE = "http://127.0.0.1:8000/api";
        isLocalAddress = true;
        updateStatusTip("配置文件读取失败，使用默认本地地址", "warning");
        return false;
    }
}

// 更新状态提示
function updateStatusTip(text, type = "success") {
    const tipEl = document.getElementById("status-tip");
    tipEl.textContent = text;
    // 重置样式
    tipEl.className = "status-tip";
    // 添加对应样式
    if (type === "success") tipEl.classList.add("tip-success");
    else if (type === "warning") tipEl.classList.add("tip-warning");
    else if (type === "error") tipEl.classList.add("tip-error");
}

// 初始化双折线图
function initChart() {
    // 1. CPU/内存/GPU 图表
    const chartDom = document.getElementById('usage-chart');
    chart = echarts.init(chartDom);
    chart.setOption({
        title: { text: 'CPU/内存/GPU 2分钟占用率趋势' },
        tooltip: { trigger: 'axis' },
        legend: { data: ['CPU占用率(%)', '内存占用率(%)', 'GPU占用率(%)'] },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'time', name: '时间' },
        yAxis: { type: 'value', min: 0, max: 100, name: '占用率(%)' },
        series: [
            { name: 'CPU占用率(%)', type: 'line', data: [], smooth: true },
            { name: '内存占用率(%)', type: 'line', data: [], smooth: true },
            { name: 'GPU占用率(%)', type: 'line', data: [], smooth: true }
        ]
    });

    // 2. 网卡流量图表
    const netChartDom = document.getElementById('net-chart');
    netChart = echarts.init(netChartDom);
    netChart.setOption({
        title: { text: '网卡流量 2分钟速度趋势 (KB/s)' },
        tooltip: { trigger: 'axis' },
        legend: { data: ['上传速度', '下载速度'] },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'time', name: '时间' },
        yAxis: { type: 'value', min: 0, name: '速度 (KB/s)' },
        series: [
            { name: '上传速度', type: 'line', data: [], smooth: true, color: '#409EFF' },
            { name: '下载速度', type: 'line', data: [], smooth: true, color: '#67C23A' }
        ]
    });
}

// 检测后端是否可用
async function checkBackendStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

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

// 读取本地tmp.json缓存
async function loadLocalTmpJson() {
    try {
        const response = await fetch("tmp.json");
        if (!response.ok) throw new Error("tmp.json不存在");

        const cacheData = await response.json();
        renderHardwareInfo(cacheData.hardware_info);
        updateCPUCores(cacheData.real_time_data.cpu_core_usage);
        renderDiskUsage(cacheData.disk_usage);
        updateNetSpeedDisplay(
            cacheData.real_time_data.net_upload_speed || 0,
            cacheData.real_time_data.net_download_speed || 0
        );

        // 保存到本地缓存
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cacheData));
        updateStatusTip("未检测到后端，无法获取数据，正在使用缓存", "error");
        return true;
    } catch (error) {
        console.error("读取tmp.json失败:", error);
        updateStatusTip("未检测到后端，且无可用缓存", "error");
        return false;
    }
}

// 从缓存加载初始数据
async function loadFromCache() {
    // 非本地地址，禁用缓存
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
                updateNetSpeedDisplay(
                    cacheData.real_time_data.net_upload_speed || 0,
                    cacheData.real_time_data.net_download_speed || 0
                );
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
            updateNetSpeedDisplay(
                cacheData.real_time_data.net_upload_speed || 0,
                cacheData.real_time_data.net_download_speed || 0
            );
            updateStatusTip("后端缓存不可用，使用浏览器本地缓存", "warning");
            return true;
        }

        // 3. 读取本地tmp.json文件
        return await loadLocalTmpJson();
    } catch (e) {
        console.log("缓存加载失败:", e);
        updateStatusTip("无可用缓存，等待后端连接...", "warning");
        return false;
    }
}

// 渲染硬件信息
function renderHardwareInfo(data) {
    if (!data) return;

    // CPU信息
    document.getElementById('cpu-model').textContent = data.cpu?.model || "未知CPU";
    document.getElementById('cpu-cores').textContent = `${data.cpu?.cores || 0} (物理: ${data.cpu?.physical_cores || 0})`;

    // 内存信息
    document.getElementById('mem-model').textContent = data.memory?.model || "未知内存";
    document.getElementById('mem-total').textContent = data.memory?.total || 0;

    // 显卡信息
    document.getElementById('gpu-model').textContent = data.gpu?.model || "未知显卡";
    document.getElementById('gpu-status').textContent = data.gpu?.available ? '可用' : '不可用';

    // 网卡信息
    const netContainer = document.getElementById('network-info');
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

// 渲染硬盘信息
function renderDiskUsage(disks) {
    const container = document.getElementById('disk-container');
    container.innerHTML = '';

    if (!disks || disks.length === 0) {
        container.innerHTML = "<p>未检测到硬盘信息</p>";
        return;
    }

    disks.forEach(disk => {
        const diskItem = document.createElement('div');
        diskItem.className = 'disk-item';

        // 进度条颜色
        let fillClass = 'low-fill';
        if (disk.usage_percent >= 30 && disk.usage_percent < 70) fillClass = 'medium-fill';
        else if (disk.usage_percent >= 70) fillClass = 'high-fill';

        diskItem.innerHTML = `
            <h4>${disk.device} (${disk.mountpoint})</h4>
            <div class="progress-bar">
                <div class="progress-fill ${fillClass}" style="width: ${disk.usage_percent}%"></div>
            </div>
            <div class="disk-info">
                已用: ${disk.used} GB / 总计: ${disk.total} GB (${disk.usage_percent}%)
            </div>
        `;
        container.appendChild(diskItem);
    });
}

// 更新网卡速度显示
function updateNetSpeedDisplay(upload, download) {
    const uploadEl = document.getElementById('net-upload-speed');
    const downloadEl = document.getElementById('net-download-speed');
    if (uploadEl) uploadEl.textContent = `${upload} KB/s`;
    if (downloadEl) downloadEl.textContent = `${download} KB/s`;
}

// 获取最新硬件信息
async function getHardwareInfo() {
    // 非本地地址/后端不可用，直接返回
    if (!isLocalAddress || !(await checkBackendStatus())) return;

    try {
        const response = await fetch(`${API_BASE}/hardware-info`);
        if (!response.ok) throw new Error(`HTTP错误：${response.status}`);

        const data = await response.json();
        renderHardwareInfo(data);

        // 更新本地缓存
        const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
        localCache.hardware_info = data;
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(localCache));

    } catch (error) {
        console.error('获取最新硬件信息失败:', error);
    }
}

// 更新实时监控数据
async function updateRealTimeData() {
    // 非本地地址/后端不可用，直接返回
    if (!isLocalAddress || !(await checkBackendStatus())) return;

    try {
        const response = await fetch(`${API_BASE}/real-time-data`);
        const data = await response.json();

        // 更新CPU/内存/GPU图表
        chart.setOption({
            series: [
                { data: data.cpu_usage },
                { data: data.mem_usage },
                { data: data.gpu_usage }
            ]
        });

        // 更新网卡流量图表
        netChart.setOption({
            series: [
                { data: data.net_upload_speed },
                { data: data.net_download_speed }
            ]
        });

        // 更新CPU核心占用
        updateCPUCores(data.cpu_core_usage);

        // 更新实时网卡速度显示
        updateNetSpeedDisplay(
            data.net_upload_speed[data.net_upload_speed.length - 1][1],
            data.net_download_speed[data.net_download_speed.length - 1][1]
        );

        // 更新本地缓存
        const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
        localCache.real_time_data = {
            cpu_usage: data.cpu_usage[data.cpu_usage.length - 1][1],
            mem_usage: data.mem_usage[data.mem_usage.length - 1][1],
            gpu_usage: data.gpu_usage[data.gpu_usage.length - 1][1],
            net_upload_speed: data.net_upload_speed[data.net_upload_speed.length - 1][1],
            net_download_speed: data.net_download_speed[data.net_download_speed.length - 1][1],
            cpu_core_usage: data.cpu_core_usage,
            timestamp: data.timestamp
        };
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(localCache));

    } catch (error) {
        console.error('获取实时数据失败:', error);
    }
}

// 更新CPU核心显示
function updateCPUCores(coreUsages) {
    const container = document.getElementById('cpu-cores-container');
    container.innerHTML = '';

    if (!coreUsages || coreUsages.length === 0) {
        container.innerHTML = "<p>未检测到CPU核心信息</p>";
        return;
    }

    coreUsages.forEach((usage, index) => {
        const coreBox = document.createElement('div');
        coreBox.className = 'core-box';

        // 根据占用率设置颜色
        if (usage < 30) coreBox.classList.add('low');
        else if (usage < 70) coreBox.classList.add('medium');
        else coreBox.classList.add('high');

        coreBox.innerHTML = `
            <div class="core-num">核心 ${index + 1}</div>
            <div class="core-usage">${usage}%</div>
        `;
        container.appendChild(coreBox);
    });
}

// 更新硬盘占用进度条
async function updateDiskUsage() {
    // 非本地地址/后端不可用，直接返回
    if (!isLocalAddress || !(await checkBackendStatus())) return;

    try {
        const response = await fetch(`${API_BASE}/disk-usage`);
        const disks = await response.json();
        renderDiskUsage(disks);

        // 更新本地缓存
        const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
        localCache.disk_usage = disks;
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(localCache));

    } catch (error) {
        console.error('获取硬盘信息失败:', error);
        document.getElementById('disk-container').innerHTML = "<p>硬盘信息获取失败</p>";
    }
}

// 页面初始化主函数
async function init() {
    // 1. 加载配置
    await loadConfig();

    // 2. 初始化图表
    initChart();

    // 3. 检测后端状态
    const backendAvailable = await checkBackendStatus();

    if (backendAvailable) {
        updateStatusTip("已成功连接后端服务", "success");
        // 加载缓存（快速显示）
        await loadFromCache();
        // 立即更新最新数据
        getHardwareInfo();
        updateRealTimeData();
        updateDiskUsage();

        // 定时更新
        setInterval(updateRealTimeData, 1000);
        setInterval(updateDiskUsage, 10000);
        setInterval(getHardwareInfo, 30000);
    } else {
        // 后端不可用，尝试加载缓存
        await loadFromCache();
    }
}

// 页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', init);