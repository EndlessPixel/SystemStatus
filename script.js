// API基础地址（后端服务地址）
const API_BASE = "http://localhost:8000/api";
// 缓存文件路径（前端本地临时缓存）
const LOCAL_CACHE_KEY = "system_monitor_cache";

// 初始化折线图
let chart = null;
function initChart() {
    const chartDom = document.getElementById('usage-chart');
    chart = echarts.init(chartDom);

    const option = {
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
    };

    chart.setOption(option);
}

// 从缓存加载初始数据（现开现用）
async function loadFromCache() {
    try {
        // 1. 优先读取后端缓存文件
        const cacheResponse = await fetch(`${API_BASE}/cache`);
        if (cacheResponse.ok) {
            const cacheData = await cacheResponse.json();
            if (!cacheData.error) {
                // 更新硬件信息
                renderHardwareInfo(cacheData.hardware_info);
                // 更新CPU核心
                updateCPUCores(cacheData.real_time_data.cpu_core_usage);
                // 更新硬盘信息
                renderDiskUsage(cacheData.disk_usage);
                console.log("从后端缓存加载初始数据成功");
                // 保存到本地缓存
                localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cacheData));
                return;
            }
        }

        // 2. 备用：读取本地缓存
        const localCache = localStorage.getItem(LOCAL_CACHE_KEY);
        if (localCache) {
            const cacheData = JSON.parse(localCache);
            renderHardwareInfo(cacheData.hardware_info);
            updateCPUCores(cacheData.real_time_data.cpu_core_usage);
            renderDiskUsage(cacheData.disk_usage);
            console.log("从本地缓存加载初始数据成功");
        }
    } catch (e) {
        console.log("缓存加载失败，使用默认值:", e);
        // 兜底：显示基础占位符
        document.getElementById('cpu-model').textContent = "加载中...";
        document.getElementById('mem-model').textContent = "加载中...";
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

// 获取最新硬件信息（更新缓存）
async function getHardwareInfo() {
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
    try {
        const response = await fetch(`${API_BASE}/real-time-data`);
        const data = await response.json();

        // 更新折线图数据
        chart.setOption({
            series: [
                { data: data.cpu_usage },
                { data: data.mem_usage },
                { data: data.gpu_usage }
            ]
        });

        // 更新CPU核心占用
        updateCPUCores(data.cpu_core_usage);

        // 更新本地缓存
        const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
        localCache.real_time_data = {
            cpu_usage: data.cpu_usage[data.cpu_usage.length - 1][1],
            mem_usage: data.mem_usage[data.mem_usage.length - 1][1],
            gpu_usage: data.gpu_usage[data.gpu_usage.length - 1][1],
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
    console.log("页面DOM加载完成，开始初始化...");
    initChart();
    // 第一步：加载缓存（现开现用）
    loadFromCache();
    // 第二步：立即请求最新数据更新
    getHardwareInfo();
    updateRealTimeData();
    updateDiskUsage();

    // 定时更新
    setInterval(updateRealTimeData, 1000);    // 每秒更新实时数据
    setInterval(updateDiskUsage, 10000);      // 每10秒更新硬盘
    setInterval(getHardwareInfo, 30000);      // 每30秒更新硬件信息
});