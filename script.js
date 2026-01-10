// API基础地址（后端服务地址）
const API_BASE = "http://localhost:8000/api";

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

// 获取硬件基础信息（修复DOM更新逻辑）
async function getHardwareInfo() {
    try {
        console.log("开始请求硬件信息接口...");
        const response = await fetch(`${API_BASE}/hardware-info`);

        // 检查响应状态
        if (!response.ok) {
            throw new Error(`HTTP错误，状态码：${response.status}`);
        }

        const data = await response.json();
        console.log("硬件信息接口返回数据：", data); // 打印数据，方便调试

        // 更新CPU信息（修复：确保DOM元素正确赋值）
        if (data.cpu && data.cpu.model) {
            document.getElementById('cpu-model').textContent = data.cpu.model;
        } else {
            document.getElementById('cpu-model').textContent = "未知CPU型号";
        }

        if (data.cpu) {
            document.getElementById('cpu-cores').textContent = `${data.cpu.cores} (物理: ${data.cpu.physical_cores || 0})`;
        }

        // 更新内存信息
        if (data.memory) {
            document.getElementById('mem-model').textContent = data.memory.model || "未知内存型号";
            document.getElementById('mem-total').textContent = data.memory.total || 0;
        }

        // 更新显卡信息
        if (data.gpu) {
            document.getElementById('gpu-model').textContent = data.gpu.model || "未知显卡型号";
            document.getElementById('gpu-status').textContent = data.gpu.available ? '可用' : '不可用';
        }

        // 更新网卡信息（修复：循环渲染网卡列表）
        const netContainer = document.getElementById('network-info');
        netContainer.innerHTML = ''; // 清空原有内容
        if (data.network && data.network.length > 0) {
            data.network.forEach(iface => {
                const p = document.createElement('p');
                p.textContent = `${iface.name}: ${iface.addresses.join(', ') || '无IP地址'}`;
                netContainer.appendChild(p);
            });
        } else {
            netContainer.innerHTML = "<p>未检测到网卡信息</p>";
        }

        // 初始化硬盘信息
        await updateDiskUsage();

    } catch (error) {
        console.error('获取硬件信息失败:', error);
        // 错误兜底：显示默认值
        document.getElementById('cpu-model').textContent = "获取失败";
        document.getElementById('cpu-cores').textContent = "获取失败";
        document.getElementById('mem-model').textContent = "获取失败";
        document.getElementById('mem-total').textContent = "0";
        document.getElementById('gpu-model').textContent = "获取失败";
        document.getElementById('gpu-status').textContent = "获取失败";
        document.getElementById('network-info').textContent = "获取失败";
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

    } catch (error) {
        console.error('获取硬盘信息失败:', error);
        document.getElementById('disk-container').innerHTML = "<p>硬盘信息获取失败</p>";
    }
}

// 页面加载完成后初始化（修复：确保DOM加载完成后执行）
document.addEventListener('DOMContentLoaded', function () {
    console.log("页面DOM加载完成，开始初始化...");
    initChart();
    getHardwareInfo(); // 立即获取硬件信息
    updateRealTimeData();

    // 每秒更新一次实时数据
    setInterval(updateRealTimeData, 1000);
    // 每10秒更新一次硬盘信息（硬盘变化较慢）
    setInterval(updateDiskUsage, 10000);
    // 额外：每30秒刷新一次硬件信息（防止数据过期）
    setInterval(getHardwareInfo, 30000);
});