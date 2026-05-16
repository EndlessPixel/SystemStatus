// 全局变量
let API_BASE = "";
let isLocalAddress = false;
const LOCAL_CACHE_KEY = "system_monitor_cache";
const THEME_KEY = "system_monitor_theme";
let chart = null;
let netChart = null;
let systemChart = null;
let currentBranch = "";
let branchConfig = {};
const ANIMATION_DURATION = 800;
const ANIMATION_FRAME = 16;
let realTimeDataInterval = null;
let diskUsageInterval = null;
let hardwareInfoInterval = null;

// i18n - 国际化功能
const I18N_KEY = "system_monitor_language";
const LANGUAGES = {
    zh: {
        // 页面标题
        title: "系统监控面板",
        
        // 服务器选择
        selectServer: "选择监控服务器：",
        switchBtn: "切换",
        
        // 状态提示
        connecting: "正在连接后端服务...",
        connected: "已成功连接",
        disconnected: "未检测到后端",
        connectionFailed: "后端连接失败",
        usingCache: "使用缓存快速加载",
        usingLocalCache: "后端缓存不可用，使用浏览器本地缓存",
        noCache: "未检测到后端，且无可用缓存",
        
        // 硬件卡片
        cpu: "CPU",
        memory: "内存",
        gpu: "显卡",
        network: "网卡",
        cores: "核心数",
        physicalCores: "物理核心",
        total: "总容量",
        status: "状态",
        available: "可用",
        unavailable: "不可用",
        loading: "加载中...",
        unknown: "未知",
        unknownCPU: "未知CPU",
        unknownMemory: "未知内存",
        unknownGPU: "未知显卡",
        
        // 网络信息
        noNetwork: "未检测到网卡信息",
        noIP: "无IP",
        wifi: "WiFi",
        ethernet: "以太网",
        vpn: "VPN",
        bluetooth: "蓝牙",
        other: "其他",
        
        // 面板标题
        cpuCoresUsage: "CPU核心实时占用",
        diskUsage: "硬盘占用率",
        networkTraffic: "网卡流量监控",
        systemLoad: "系统负载监控",
        systemResourceTrend: "系统资源趋势",
        
        // 网络流量
        uploadSpeed: "实时上传速度",
        downloadSpeed: "实时下载速度",
        
        // 系统信息
        systemLoad1Min: "1分钟系统负载",
        processCount: "当前进程数",
        cpuTemperature: "CPU温度",
        bootTime: "开机时间",
        batteryInfo: "电池状态",
        noBattery: "未检测到电池信息",
        batteryCharging: "已充电",
        batteryUnplugged: "未连接电源",
        estimatedTimeLeft: "预计剩余",
        hours: "小时",
        minutes: "分钟",
        days: "天",
        hoursShort: "小时",
        minutesShort: "分钟",
        
        // 资源占用
        cpuUsage: "CPU占用率",
        memoryUsage: "内存占用率",
        gpuUsage: "GPU占用率",
        
        // 图表标题
        cpuMemoryGpuTrend: "CPU/内存/GPU 占用率趋势",
        networkTrafficTrend: "网卡流量速度趋势",
        systemLoadTrend: "系统负载趋势",
        
        // 图表标签
        cpuUsagePercent: "CPU占用率(%)",
        memoryUsagePercent: "内存占用率(%)",
        gpuUsagePercent: "GPU占用率(%)",
        uploadSpeedLabel: "上传速度",
        downloadSpeedLabel: "下载速度",
        systemLoadLabel: "系统负载",
        processCountLabel: "进程数",
        cpuTempLabel: "CPU温度",
        
        // 轴标签
        time: "时间",
        usagePercent: "占用率(%)",
        speedKb: "速度 (KB/s)",
        loadProcess: "系统负载/进程数",
        temperatureC: "CPU温度(°C)",
        
        // 折叠按钮
        collapseAll: "折叠所有图表",
        expandAll: "展开所有图表",
        
        // 主题
        darkMode: "深色模式",
        lightMode: "浅色模式",
        
        // 语言
        language: "语言",
        chinese: "中文",
        english: "English",
        
        // 重试
        retryConnection: "重试连接后端",
        retrying: "正在尝试重新连接后端...",
        maxRetriesReached: "后端连接失败，已达到最大重试次数",
        retryInSeconds: "连接失败，{count}秒后自动重试...",
        
        // 切换服务器
        switchingTo: "正在切换到",
        switchFailed: "切换失败",
        configNotFound: "配置不存在",
        switchSuccess: "已成功切换到",
        remoteAddressWarning: "当前连接（远端地址），无法使用缓存",
        usingDefaultConfig: "配置加载失败，使用默认本地地址",
        
        // 底部信息
        footerProject: "SystemStatus / EndlessPixel-SS",
        footerCopyright: "Copyright © 2024-2026 EndlessPixel Studio. All Rights Reserved.",
        footerGithub: "GitHub",
        
        // 图表加载
        chartLoading: "图表加载中...",
        
        // 其他
        localServer: "本地服务器",
        noDisk: "未检测到硬盘信息",
        core: "核心",
        noCPUCores: "未检测到CPU核心信息",
    },
    en: {
        // 页面标题
        title: "System Monitor",
        
        // 服务器选择
        selectServer: "Select Server:",
        switchBtn: "Switch",
        
        // 状态提示
        connecting: "Connecting to backend...",
        connected: "Connected successfully",
        disconnected: "Backend not detected",
        connectionFailed: "Backend connection failed",
        usingCache: "Loaded from cache",
        usingLocalCache: "Backend cache unavailable, using local cache",
        noCache: "No backend detected and no cache available",
        
        // 硬件卡片
        cpu: "CPU",
        memory: "Memory",
        gpu: "GPU",
        network: "Network",
        cores: "Cores",
        physicalCores: "Physical",
        total: "Total",
        loading: "Loading...",
        unknown: "Unknown",
        unknownCPU: "Unknown CPU",
        unknownMemory: "Unknown Memory",
        unknownGPU: "Unknown GPU",
        
        // 网络信息
        noNetwork: "No network adapters detected",
        noIP: "No IP",
        wifi: "WiFi",
        ethernet: "Ethernet",
        vpn: "VPN",
        bluetooth: "Bluetooth",
        other: "Other",
        
        // 面板标题
        cpuCoresUsage: "CPU Cores Usage",
        diskUsage: "Disk Usage",
        networkTraffic: "Network Traffic Monitor",
        systemLoad: "System Load Monitor",
        systemResourceTrend: "System Resource Trend",
        
        // 网络流量
        uploadSpeed: "Upload Speed",
        downloadSpeed: "Download Speed",
        
        // 系统信息
        systemLoad1Min: "1 Min Load",
        processCount: "Process Count",
        cpuTemperature: "CPU Temperature",
        bootTime: "Boot Time",
        batteryInfo: "Battery Status",
        noBattery: "No battery detected",
        batteryCharging: "Charging",
        batteryUnplugged: "Unplugged",
        estimatedTimeLeft: "Estimated time left",
        hours: "hours",
        minutes: "minutes",
        days: "days",
        hoursShort: "h",
        minutesShort: "m",
        
        // 资源占用
        cpuUsage: "CPU Usage",
        memoryUsage: "Memory Usage",
        gpuUsage: "GPU Usage",
        
        // 图表标题
        cpuMemoryGpuTrend: "CPU/Memory/GPU Usage Trend",
        networkTrafficTrend: "Network Traffic Trend",
        systemLoadTrend: "System Load Trend",
        
        // 图表标签
        cpuUsagePercent: "CPU Usage (%)",
        memoryUsagePercent: "Memory Usage (%)",
        gpuUsagePercent: "GPU Usage (%)",
        uploadSpeedLabel: "Upload",
        downloadSpeedLabel: "Download",
        systemLoadLabel: "Load",
        processCountLabel: "Processes",
        cpuTempLabel: "CPU Temp",
        
        // 轴标签
        time: "Time",
        usagePercent: "Usage (%)",
        speedKb: "Speed (KB/s)",
        loadProcess: "Load/Processes",
        temperatureC: "CPU Temp (°C)",
        
        // 折叠按钮
        collapseAll: "Collapse All",
        expandAll: "Expand All",
        
        // 主题
        darkMode: "Dark Mode",
        lightMode: "Light Mode",
        
        // 语言
        language: "Language",
        chinese: "中文",
        english: "English",
        
        // 重试
        retryConnection: "Retry Connection",
        retrying: "Retrying connection...",
        maxRetriesReached: "Max retries reached",
        retryInSeconds: "Retry in {count}s...",
        
        // 切换服务器
        switchingTo: "Switching to",
        switchFailed: "Switch failed",
        configNotFound: "Config not found",
        switchSuccess: "Switched to",
        remoteAddressWarning: "Remote address - cache unavailable",
        usingDefaultConfig: "Using default config",
        
        // 底部信息
        footerProject: "SystemStatus / EndlessPixel-SS",
        footerCopyright: "Copyright © 2024-2026 EndlessPixel Studio. All Rights Reserved.",
        footerGithub: "GitHub",
        
        // 图表加载
        chartLoading: "Loading charts...",
        
        // 其他
        localServer: "Local Server",
        noDisk: "No disk detected",
        core: "Core",
        noCPUCores: "No CPU cores detected",
    }
};

let currentLanguage = 'zh';

function initI18n() {
    const savedLang = localStorage.getItem(I18N_KEY);
    if (savedLang && LANGUAGES[savedLang]) {
        currentLanguage = savedLang;
    } else {
        const browserLang = navigator.language || navigator.userLanguage;
        currentLanguage = browserLang.startsWith('en') ? 'en' : 'zh';
    }
    updateAllTranslations();
    updateLanguageButton();
}

function setLanguage(lang) {
    if (LANGUAGES[lang]) {
        currentLanguage = lang;
        localStorage.setItem(I18N_KEY, lang);
        updateAllTranslations();
        updateLanguageButton();
        updateChartTranslations();
    }
}

function toggleLanguage() {
    const newLang = currentLanguage === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
}

function t(key, replacements = {}) {
    let text = LANGUAGES[currentLanguage][key] || LANGUAGES['zh'][key] || key;
    
    Object.keys(replacements).forEach(placeholder => {
        text = text.replace(`{${placeholder}}`, replacements[placeholder]);
    });
    
    return text;
}

function updateLanguageButton() {
    const langText = document.getElementById('lang-text');
    if (langText) {
        langText.textContent = currentLanguage === 'zh' ? 'EN' : '中';
    }
}

function updateAllTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
            el.placeholder = t(key);
        } else {
            el.textContent = t(key);
        }
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', t(key));
    });
    
    updateSpecificTranslations();
}

function updateSpecificTranslations() {
    document.title = t('title');
    
    const subTitle = document.querySelector('.sub-title');
    if (subTitle) {
        subTitle.textContent = t('title');
    }
    
    const branchLabel = document.querySelector('.branch-switcher label');
    if (branchLabel) {
        branchLabel.textContent = t('selectServer');
    }
    
    const switchBtn = document.getElementById('switch-btn');
    if (switchBtn) {
        switchBtn.textContent = t('switchBtn');
    }
    
    const toggleAllBtn = document.getElementById('toggle-all-btn');
    if (toggleAllBtn) {
        const toggleText = toggleAllBtn.querySelector('.toggle-text');
        if (toggleText) {
            toggleText.textContent = t('collapseAll');
        }
    }
    
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.textContent = t('retryConnection');
    }
    
    const footerProject = document.querySelector('.project');
    if (footerProject) {
        footerProject.innerHTML = `${t('footerProject')} - Go to <a class="github-link" href="https://github.com/EndlessPixel/SystemStatus">${t('footerGithub')}</a>`;
    }
    
    const footerCopyright = document.querySelector('.studio');
    if (footerCopyright) {
        footerCopyright.textContent = t('footerCopyright');
    }
}

function updateChartTranslations() {
    if (chart) {
        chart.setOption({
            title: {
                text: t('cpuMemoryGpuTrend')
            },
            legend: {
                data: [t('cpuUsagePercent'), t('memoryUsagePercent'), t('gpuUsagePercent')]
            },
            xAxis: {
                name: t('time')
            },
            yAxis: {
                name: t('usagePercent')
            }
        });
    }
    
    if (netChart) {
        netChart.setOption({
            title: {
                text: t('networkTrafficTrend')
            },
            legend: {
                data: [t('uploadSpeedLabel'), t('downloadSpeedLabel')]
            },
            xAxis: {
                name: t('time')
            },
            yAxis: {
                name: t('speedKb')
            }
        });
    }
    
    if (systemChart) {
        systemChart.setOption({
            title: {
                text: t('systemLoadTrend')
            },
            legend: {
                data: [t('systemLoadLabel'), t('processCountLabel'), t('cpuTempLabel')]
            },
            xAxis: {
                name: t('time')
            },
            yAxis: [
                {
                    name: t('loadProcess')
                },
                {
                    name: t('temperatureC')
                }
            ]
        });
    }
}

// 主题管理功能
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        // 检测系统主题
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeButton(theme);
    updateChartTheme(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function updateThemeButton(theme) {
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    
    if (theme === 'dark') {
        themeIcon.textContent = '☀️';
        themeText.textContent = '浅色模式';
    } else {
        themeIcon.textContent = '🌙';
        themeText.textContent = '深色模式';
    }
}

function updateChartTheme(theme) {
    const textColor = theme === 'dark' ? '#f5f5f7' : '#1d1d1f';
    const secondaryTextColor = theme === 'dark' ? '#98989d' : '#86868b';
    const axisLineColor = theme === 'dark' ? '#38383a' : '#e6e6e8';
    const splitLineColor = theme === 'dark' ? '#2c2c2e' : '#f5f5f7';

    // 更新所有图表
    [chart, netChart, systemChart].forEach(chartInstance => {
        if (chartInstance) {
            const option = {
                title: {
                    textStyle: { color: secondaryTextColor }
                },
                tooltip: {
                    backgroundColor: theme === 'dark' ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: theme === 'dark' ? '#38383a' : '#e6e6e8',
                    textStyle: { color: textColor }
                },
                legend: {
                    textStyle: { color: secondaryTextColor }
                },
                xAxis: {
                    nameTextStyle: { color: secondaryTextColor },
                    axisLine: { lineStyle: { color: axisLineColor } },
                    axisLabel: { color: secondaryTextColor },
                    splitLine: { lineStyle: { color: splitLineColor } }
                },
                yAxis: {
                    nameTextStyle: { color: secondaryTextColor },
                    axisLine: { lineStyle: { color: axisLineColor } },
                    axisLabel: { color: secondaryTextColor },
                    splitLine: { lineStyle: { color: splitLineColor } }
                }
            };

            // 只有systemChart有两个y轴
            if (chartInstance === systemChart) {
                option.yAxis = [
                    {
                        nameTextStyle: { color: secondaryTextColor },
                        axisLine: { lineStyle: { color: axisLineColor } },
                        axisLabel: { color: secondaryTextColor },
                        splitLine: { lineStyle: { color: splitLineColor } }
                    },
                    {
                        nameTextStyle: { color: secondaryTextColor },
                        axisLine: { lineStyle: { color: axisLineColor } },
                        axisLabel: { color: secondaryTextColor },
                        splitLine: { show: false }
                    }
                ];
            }

            chartInstance.setOption(option);
        }
    });
}

function animateNumber(element, targetValue, isPercent = true, suffix = '') {
    if (!element) return;

    if (element.animationFrame) {
        cancelAnimationFrame(element.animationFrame);
    }

    targetValue = Number(targetValue) || 0;

    const currentText = element.textContent;
    const startValue = parseFloat(currentText) || 0;

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

    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

        const easedProgress = 1 - Math.pow(1 - progress, 3);

        currentValue = startValue + (targetValue - startValue) * easedProgress;

        let displayText;
        if (isPercent) {
            displayText = `${currentValue.toFixed(1)}%${suffix}`;
        } else {
            displayText = `${currentValue.toFixed(1)}${suffix}`;
        }

        if (element.textContent !== displayText) {
            element.textContent = displayText;
        }

        if (progress < 1) {
            element.animationFrame = requestAnimationFrame(animate);
        } else {
            element.textContent = isPercent ? `${targetValue.toFixed(1)}%${suffix}` : `${targetValue.toFixed(1)}${suffix}`;
            delete element.animationFrame;
        }
    };

    element.animationFrame = requestAnimationFrame(animate);
}

async function loadBranchConfig() {
    try {
        const selectEl = document.getElementById("branch-select");
        if (!selectEl) {
            console.error("下拉框DOM元素不存在");
            throw new Error("下拉框元素未找到");
        }

        selectEl.innerHTML = "";

        let config = {};
        try {
            // 从API获取服务器配置
            const response = await fetch("/api/servers");
            if (!response.ok) throw new Error(`配置请求失败: ${response.status} ${response.statusText}`);
            config = await response.json();
        } catch (e) {
            console.error("从API加载配置失败，使用默认配置:", e);
        }

        branchConfig = config.branches || {
            local_server: { name: "本地服务器", api: "127.0.0.1", port: 8001 }
        };
        currentBranch = config.default_branch || Object.keys(branchConfig)[0] || "local_server";

        if (!branchConfig[currentBranch]) {
            currentBranch = Object.keys(branchConfig)[0];
        }

        const branchKeys = Object.keys(branchConfig);
        if (branchKeys.length === 0) {
            branchConfig = { local_server: { name: "本地服务器", api: "127.0.0.1", port: 8001 } };
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

        initBranchAPI(currentBranch);

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
        branchConfig = {
            local_server: { name: "本地服务器", api: "127.0.0.1", port: 8001 }
        };
        currentBranch = "local_server";

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

function initBranchAPI(branchKey) {
    const branch = branchConfig[branchKey] || { api: "127.0.0.1", port: 8001 };

    const apiHost = branch.api || "127.0.0.1";
    const apiPort = branch.port || 8001;
    API_BASE = `http://${apiHost}:${apiPort}/api`;

    isLocalAddress = apiHost === "localhost" ||
        apiHost.startsWith("127.") ||
        apiHost === "0.0.0.0" ||
        apiHost.startsWith("192.168.");

    updateStatusTip(`已加载【${branch.name || branchKey}】配置：${apiHost}:${apiPort}`, "success");
    if (!isLocalAddress) {
        updateStatusTip(`当前连接【${branch.name || branchKey}】(远端地址)，无法使用缓存`, "warning");
    }
}

async function switchBranch() {
    const selectEl = document.getElementById("branch-select");
    if (!selectEl) {
        updateStatusTip("切换失败：下拉框元素不存在", "error");
        return;
    }

    const newBranch = selectEl.value;
    if (!newBranch || newBranch === currentBranch) return;

    if (!branchConfig[newBranch]) {
        updateStatusTip(`切换失败：分支【${newBranch}】配置不存在`, "error");
        return;
    }

    updateStatusTip(`正在切换到【${branchConfig[newBranch].name || newBranch}】...`, "success");

    currentBranch = newBranch;
    initBranchAPI(currentBranch);

    clearOldData();
    await loadFromCache();

    const backendAvailable = await checkBackendStatus();
    if (backendAvailable) {
        updateStatusTip(`已成功切换到【${branchConfig[newBranch].name || newBranch}】`, "success");

        clearAllIntervals();

        getHardwareInfo();
        updateRealTimeData();
        updateDiskUsage();

        realTimeDataInterval = setInterval(updateRealTimeData, 2000);
        diskUsageInterval = setInterval(updateDiskUsage, 10000);
        hardwareInfoInterval = setInterval(getHardwareInfo, 30000);

        hideRetryButton();
    } else {
        updateStatusTip(`切换到【${branchConfig[newBranch].name || newBranch}】失败，后端不可用`, "error");
        showRetryButton();
    }
}

function clearOldData() {
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

    const resetElements = [
        { id: 'cpu-model', text: t('loading') },
        { id: 'cpu-cores', text: t('loading') },
        { id: 'mem-model', text: t('loading') },
        { id: 'mem-total', text: t('loading') },
        { id: 'gpu-model', text: t('loading') },
        { id: 'gpu-status', text: t('loading') },
        { id: 'net-upload-speed', text: '0 KB/s' },
        { id: 'net-download-speed', text: '0 KB/s' },
        { id: 'system-load', text: '0.00' },
        { id: 'process-count', text: '0' },
        { id: 'cpu-temperature', text: `0${currentLanguage === 'zh' ? '°C' : '°C'}` },
        { id: 'boot-time', text: `0${t('days')}0${t('hoursShort')}0${t('minutesShort')}` }
    ];

    resetElements.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.textContent = item.text;
            if (el.animationTimer) {
                clearInterval(el.animationTimer);
                delete el.animationTimer;
            }
            if (el.animationFrame) {
                cancelAnimationFrame(el.animationFrame);
                delete el.animationFrame;
            }
        }
    });

    const batteryInfoEl = document.getElementById('battery-info');
    if (batteryInfoEl) {
        batteryInfoEl.textContent = '电池状态: 未检测到电池信息';
    }

    const networkEl = document.getElementById('network-info');
    if (networkEl) networkEl.innerHTML = "加载中...";

    const cpuCoresEl = document.getElementById('cpu-cores-container');
    if (cpuCoresEl) cpuCoresEl.innerHTML = "加载中...";

    const diskEl = document.getElementById('disk-container');
    if (diskEl) diskEl.innerHTML = "加载中...";
}

function updateStatusTip(text, type = "success") {
    const tipEl = document.getElementById("status-tip");
    if (!tipEl) return;

    tipEl.textContent = text;
    tipEl.className = "status-tip";
    if (type === "success") tipEl.classList.add("tip-success");
    else if (type === "warning") tipEl.classList.add("tip-warning");
    else if (type === "error") tipEl.classList.add("tip-error");
}

// 获取屏幕宽度对应的最大数据点数
function getMaxDataPoints() {
    const screenWidth = window.innerWidth;
    // 根据屏幕宽度动态计算显示的数据点数量
    // 每50px宽度显示约10个数据点
    const minPoints = 15;  // 最小显示15个点
    const maxPoints = 120; // 最大显示120个点
    const calculatedPoints = Math.floor(screenWidth / 50 * 10);
    return Math.min(Math.max(calculatedPoints, minPoints), maxPoints);
}

// 获取采样间隔（根据当前需要显示的数据点数量）
function getSampleInterval() {
    const maxPoints = getMaxDataPoints();
    // CACHE_DURATION = 120秒，每秒1个数据点 = 120个数据点
    const totalPoints = 120;
    if (totalPoints <= maxPoints) {
        return 1; // 数据点足够，不需要采样
    }
    return Math.ceil(totalPoints / maxPoints);
}

// 对图表数据进行采样，保留开头、结尾，中间均匀采样
function sampleChartData(data, interval) {
    if (!data || data.length === 0) return [];
    if (interval <= 1 || data.length <= 30) return data;

    const sampled = [];
    for (let i = 0; i < data.length; i += interval) {
        sampled.push(data[i]);
    }
    // 确保最后一个数据点被包含
    if (sampled[sampled.length - 1] !== data[data.length - 1]) {
        sampled.push(data[data.length - 1]);
    }
    return sampled;
}

// 根据屏幕宽度动态调整图表高度
function adjustChartHeight() {
    const screenWidth = window.innerWidth;
    let chartHeight;

    // 根据屏幕宽度计算图表高度
    if (screenWidth < 480) {
        chartHeight = Math.floor(screenWidth * 0.5);  // 手机：50%宽度
    } else if (screenWidth < 768) {
        chartHeight = Math.floor(screenWidth * 0.6);  // 平板：60%宽度
    } else if (screenWidth < 1024) {
        chartHeight = 400; // 小屏幕：固定400px
    } else {
        chartHeight = 420; // 大屏幕：固定420px
    }

    // 限制最小和最大高度
    chartHeight = Math.min(Math.max(chartHeight, 200), 500);

    // 更新图表容器高度
    const chartIds = ['usage-chart', 'net-chart', 'system-chart'];
    chartIds.forEach(id => {
        const chartDom = document.getElementById(id);
        if (chartDom) {
            chartDom.style.height = `${chartHeight}px`;
        }
    });

    // 调整ECharts实例大小
    if (chart) chart.resize();
    if (netChart) netChart.resize();
    if (systemChart) systemChart.resize();
}

function initChart() {
    const chartDom = document.getElementById('usage-chart');
    if (chartDom) {
        chart = echarts.init(chartDom);
        chart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: 'CPU/内存/GPU 占用率趋势',
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
                data: ['CPU占用率(%)', '内存占用率(%)', 'GPU占用率(%)'],
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
                    areaStyle: { opacity: 0.1 },
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

async function loadLocalTmpJson() {
    try {
        const response = await fetch("tmp.json");
        if (!response.ok) throw new Error("tmp.json不存在");

        const cacheData = await response.json();
        renderHardwareInfo(cacheData.hardware_info);
        updateCPUCores(cacheData.real_time_data.cpu_core_usage);
        renderDiskUsage(cacheData.disk_usage);

        // 转换时间戳为毫秒（如果需要）
        const rtData = cacheData.real_time_data;
        const chartSeries = ['cpu_usage', 'mem_usage', 'gpu_usage', 
            'net_upload_speed', 'net_download_speed', 
            'system_load', 'process_count', 'cpu_temperature'];
        
        chartSeries.forEach(key => {
            if (Array.isArray(rtData[key])) {
                rtData[key] = rtData[key].map(item => [
                    typeof item[0] === 'number' && item[0] < 1e12 ? item[0] * 1000 : item[0],
                    item[1]
                ]);
            }
        });

        let uploadSpeed = rtData.net_upload_speed || 0;
        let downloadSpeed = rtData.net_download_speed || 0;

        if (Array.isArray(uploadSpeed) && uploadSpeed.length > 0) {
            uploadSpeed = uploadSpeed[uploadSpeed.length - 1][1] || 0;
        }
        if (Array.isArray(downloadSpeed) && downloadSpeed.length > 0) {
            downloadSpeed = downloadSpeed[downloadSpeed.length - 1][1] || 0;
        }

        uploadSpeed = Number(uploadSpeed) || 0;
        downloadSpeed = Number(downloadSpeed) || 0;

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
        updateStatusTip("未检测到后端，无法获取数据，正在使用缓存", "error");
        return true;
    } catch (error) {
        console.error("读取tmp.json失败:", error);
        updateStatusTip("未检测到后端，且无可用缓存", "error");
        return false;
    }
}

async function loadFromCache() {
    try {
        const cacheResponse = await fetch(`${API_BASE}/cache`);
        if (cacheResponse.ok) {
            const cacheData = await cacheResponse.json();
            if (!cacheData.error) {
                renderHardwareInfo(cacheData.hardware_info);
                updateCPUCores(cacheData.real_time_data.cpu_core_usage);
                renderDiskUsage(cacheData.disk_usage);

                // 转换时间戳为毫秒（如果需要）
                const rtData = cacheData.real_time_data;
                const chartSeries = ['cpu_usage', 'mem_usage', 'gpu_usage', 
                    'net_upload_speed', 'net_download_speed', 
                    'system_load', 'process_count', 'cpu_temperature'];
                
                chartSeries.forEach(key => {
                    if (Array.isArray(rtData[key])) {
                        rtData[key] = rtData[key].map(item => [
                            typeof item[0] === 'number' && item[0] < 1e12 ? item[0] * 1000 : item[0],
                            item[1]
                        ]);
                    }
                });

                let uploadSpeed = rtData.net_upload_speed || 0;
                let downloadSpeed = rtData.net_download_speed || 0;

                if (Array.isArray(uploadSpeed) && uploadSpeed.length > 0) {
                    uploadSpeed = uploadSpeed[uploadSpeed.length - 1][1] || 0;
                }
                if (Array.isArray(downloadSpeed) && downloadSpeed.length > 0) {
                    downloadSpeed = downloadSpeed[downloadSpeed.length - 1][1] || 0;
                }

                uploadSpeed = Number(uploadSpeed) || 0;
                downloadSpeed = Number(downloadSpeed) || 0;

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

        const localCache = localStorage.getItem(LOCAL_CACHE_KEY);
        if (localCache) {
            const cacheData = JSON.parse(localCache);
            renderHardwareInfo(cacheData.hardware_info);
            updateCPUCores(cacheData.real_time_data.cpu_core_usage);
            renderDiskUsage(cacheData.disk_usage);

            let uploadSpeed = cacheData.real_time_data.net_upload_speed || 0;
            let downloadSpeed = cacheData.real_time_data.net_download_speed || 0;

            if (Array.isArray(uploadSpeed) && uploadSpeed.length > 0) {
                uploadSpeed = uploadSpeed[uploadSpeed.length - 1][1] || 0;
            }
            if (Array.isArray(downloadSpeed) && downloadSpeed.length > 0) {
                downloadSpeed = downloadSpeed[downloadSpeed.length - 1][1] || 0;
            }

            uploadSpeed = Number(uploadSpeed) || 0;
            downloadSpeed = Number(downloadSpeed) || 0;

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

        return await loadLocalTmpJson();
    } catch (e) {
        console.log("缓存加载失败:", e);
        updateStatusTip("已连接后端", "success");
        return false;
    }
}

function renderHardwareInfo(data) {
    if (!data) return;

    const cpuModelEl = document.getElementById('cpu-model');
    const cpuCoresEl = document.getElementById('cpu-cores');
    if (cpuModelEl) cpuModelEl.textContent = data.cpu?.model || t('unknownCPU');
    if (cpuCoresEl) cpuCoresEl.textContent = `${data.cpu?.cores || 0} (${t('physicalCores')}: ${data.cpu?.physical_cores || 0})`;

    const memModelEl = document.getElementById('mem-model');
    const memTotalEl = document.getElementById('mem-total');
    if (memModelEl) memModelEl.textContent = data.memory?.model || t('unknownMemory');
    if (memTotalEl) memTotalEl.textContent = data.memory?.total || 0;

    const gpuModelEl = document.getElementById('gpu-model');
    const gpuStatusEl = document.getElementById('gpu-status');
    if (gpuModelEl) gpuModelEl.textContent = data.gpu?.model || t('unknownGPU');
    if (gpuStatusEl) gpuStatusEl.textContent = data.gpu?.available ? t('available') : t('unavailable');

    const netContainer = document.getElementById('network-info');
    if (netContainer) {
        netContainer.innerHTML = '';
        if (data.network && data.network.length > 0) {
            // 创建表格布局
            const table = document.createElement('table');
            table.className = 'network-table';
            
            data.network.forEach(iface => {
                const row = document.createElement('tr');
                row.className = 'network-row';
                
                // 根据网卡名称添加图标和类型
                const icon = getNetworkIcon(iface.name);
                const type = getNetworkType(iface.name);
                const typeClass = getTypeClass(iface.name);
                
                row.innerHTML = `
                    <td class="network-icon">${icon}</td>
                    <td class="network-name">${iface.name}</td>
                    <td class="network-type ${typeClass}"><span>${type}</span></td>
                    <td class="network-ips">${iface.addresses.join(', ') || `<span class="no-ip">${t('noIP')}</span>`}</td>
                `;
                
                table.appendChild(row);
            });
            
            netContainer.appendChild(table);
        } else {
            netContainer.innerHTML = `<p>${t('noNetwork')}</p>`;
        }
    }
}

// 获取网卡图标
function getNetworkIcon(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('wlan') || nameLower.includes('wi-fi') || nameLower.includes('wifi') || nameLower.includes('无线')) {
        return '📶';
    } else if (nameLower.includes('ethernet') || nameLower.includes('以太网') || nameLower.includes('本地连接')) {
        return '🔌';
    } else if (nameLower.includes('vpn') || nameLower.includes('tunnel')) {
        return '🔒';
    } else if (nameLower.includes('bluetooth') || nameLower.includes('蓝牙')) {
        return '📱';
    } else {
        return '🌐';
    }
}

// 获取网卡类型标签
function getNetworkType(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('wlan') || nameLower.includes('wi-fi') || nameLower.includes('wifi') || nameLower.includes('无线')) {
        return t('wifi');
    } else if (nameLower.includes('ethernet') || nameLower.includes('以太网') || nameLower.includes('本地连接')) {
        return t('ethernet');
    } else if (nameLower.includes('vpn')) {
        return t('vpn');
    } else if (nameLower.includes('bluetooth') || nameLower.includes('蓝牙')) {
        return t('bluetooth');
    } else {
        return t('other');
    }
}

// 获取类型样式类
function getTypeClass(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('wlan') || nameLower.includes('wi-fi') || nameLower.includes('wifi') || nameLower.includes('无线')) {
        return 'type-wifi';
    } else if (nameLower.includes('ethernet') || nameLower.includes('以太网') || nameLower.includes('本地连接')) {
        return 'type-ethernet';
    } else if (nameLower.includes('vpn')) {
        return 'type-vpn';
    } else if (nameLower.includes('bluetooth') || nameLower.includes('蓝牙')) {
        return 'type-bluetooth';
    } else {
        return 'type-other';
    }
}

function renderDiskUsage(disks) {
    const container = document.getElementById('disk-container');
    if (!container) return;

    if (!disks || disks.length === 0) {
        container.innerHTML = `<p>${t('noDisk')}</p>`;
        return;
    }

    const existingItems = container.querySelectorAll('.disk-item');
    const existingCount = existingItems.length;
    const newCount = disks.length;

    if (existingCount !== newCount) {
        container.innerHTML = '';
        disks.forEach(disk => {
            createDiskItem(container, disk, true);
        });
        return;
    }

    disks.forEach((disk, index) => {
        const diskItem = existingItems[index];
        updateDiskItem(diskItem, disk);
    });
}

function createDiskItem(container, disk, withAnimation = false) {
    const diskItem = document.createElement('div');
    diskItem.className = 'disk-item';
    diskItem.dataset.device = disk.device;
    diskItem.dataset.mountpoint = disk.mountpoint;

    let fillClass = 'low-fill';
    if (disk.usage_percent >= 30 && disk.usage_percent < 70) fillClass = 'medium-fill';
    else if (disk.usage_percent >= 70) fillClass = 'high-fill';

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
            <span class="disk-size">${disk.used.toFixed(1)}GB / ${disk.total.toFixed(1)}GB</span>
        </div>
    `;

    diskItem.insertBefore(progressBar, diskItem.querySelector('.disk-info').nextSibling);
    container.appendChild(diskItem);
}

function updateDiskItem(diskItem, disk) {
    if (!diskItem) return;

    const progressFill = diskItem.querySelector('.progress-fill');
    if (progressFill) {
        let fillClass = 'low-fill';
        if (disk.usage_percent >= 30 && disk.usage_percent < 70) fillClass = 'medium-fill';
        else if (disk.usage_percent >= 70) fillClass = 'high-fill';

        progressFill.className = `progress-fill ${fillClass}`;
        progressFill.style.width = `${disk.usage_percent}%`;
    }

    const diskInfo = diskItem.querySelector('.disk-info');
    if (diskInfo) {
        diskInfo.innerHTML = `
            <span class="disk-percent">${disk.usage_percent.toFixed(1)}%</span>
            <span class="disk-size">${disk.used.toFixed(1)}GB / ${disk.total.toFixed(1)}GB</span>
        `;
    }
}

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

async function getHardwareInfo() {
    if (!(await checkBackendStatus())) return;

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

async function updateRealTimeData() {
    if (!(await checkBackendStatus())) return;

    try {
        const response = await fetch(`${API_BASE}/real-time-data`);
        const data = await response.json();

        // 根据屏幕宽度获取采样间隔
        const sampleInterval = getSampleInterval();

        // 对数据进行采样
        const sampledCpuUsage = sampleChartData(data.cpu_usage, sampleInterval);
        const sampledMemUsage = sampleChartData(data.mem_usage, sampleInterval);
        const sampledGpuUsage = sampleChartData(data.gpu_usage, sampleInterval);
        const sampledNetUpload = sampleChartData(data.net_upload_speed, sampleInterval);
        const sampledNetDownload = sampleChartData(data.net_download_speed, sampleInterval);
        const sampledSystemLoad = sampleChartData(data.system_load, sampleInterval);
        const sampledProcessCount = sampleChartData(data.process_count, sampleInterval);
        const sampledCpuTemp = sampleChartData(data.cpu_temperature, sampleInterval);

        if (chart) {
            chart.setOption({
                series: [
                    { data: sampledCpuUsage },
                    { data: sampledMemUsage },
                    { data: sampledGpuUsage }
                ]
            });
        }

        if (netChart) {
            netChart.setOption({
                series: [
                    { data: sampledNetUpload },
                    { data: sampledNetDownload }
                ]
            });
        }

        if (systemChart) {
            systemChart.setOption({
                series: [
                    { data: sampledSystemLoad },
                    { data: sampledProcessCount },
                    { data: sampledCpuTemp }
                ]
            });
        }

        const cpuUsage = data.cpu_usage.length > 0 ? data.cpu_usage[data.cpu_usage.length - 1][1] : 0;
        const memUsage = data.mem_usage.length > 0 ? data.mem_usage[data.mem_usage.length - 1][1] : 0;
        const gpuUsage = data.gpu_usage.length > 0 ? data.gpu_usage[data.gpu_usage.length - 1][1] : 0;

        const cpuUsageEl = document.getElementById('cpu-usage-current');
        const memUsageEl = document.getElementById('mem-usage-current');
        const gpuUsageEl = document.getElementById('gpu-usage-current');

        if (cpuUsageEl) animateNumber(cpuUsageEl, cpuUsage, true);
        if (memUsageEl) animateNumber(memUsageEl, memUsage, true);
        if (gpuUsageEl) animateNumber(gpuUsageEl, gpuUsage, true);

        updateCPUCores(data.cpu_core_usage, true);

        const uploadSpeed = data.net_upload_speed.length > 0 ? data.net_upload_speed[data.net_upload_speed.length - 1][1] : 0;
        const downloadSpeed = data.net_download_speed.length > 0 ? data.net_download_speed[data.net_download_speed.length - 1][1] : 0;
        updateNetSpeedDisplay(uploadSpeed, downloadSpeed);

        const systemLoad = data.system_load.length > 0 ? data.system_load[data.system_load.length - 1][1] : 0;
        const processCount = data.process_count.length > 0 ? data.process_count[data.process_count.length - 1][1] : 0;
        const cpuTemperature = data.cpu_temperature.length > 0 ? data.cpu_temperature[data.cpu_temperature.length - 1][1] : 0;

        const systemLoadEl = document.getElementById('system-load');
        if (systemLoadEl) {
            animateNumber(systemLoadEl, systemLoad, false);
        }

        const processCountEl = document.getElementById('process-count');
        if (processCountEl) {
            animateNumber(processCountEl, processCount, false);
        }

        const cpuTemperatureEl = document.getElementById('cpu-temperature');
        if (cpuTemperatureEl) {
            animateNumber(cpuTemperatureEl, cpuTemperature, false, '°C');
        }

        const bootTimeEl = document.getElementById('boot-time');
        if (bootTimeEl && data.boot_time) {
            const bootTime = new Date(data.boot_time * 1000);
            const now = new Date();
            const diffMs = now - bootTime;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            bootTimeEl.textContent = `${diffDays}${t('days')}${diffHours}${t('hoursShort')}${diffMinutes}${t('minutesShort')}`;
        }

        const batteryInfoEl = document.getElementById('battery-info');
        if (batteryInfoEl && data.battery_info) {
            const battery = data.battery_info;
            if (battery.percent !== undefined) {
                if (battery.plugged) {
                    batteryInfoEl.innerHTML = `<span data-i18n="batteryInfo">${t('batteryInfo')}</span>: ${t('batteryCharging')} ${battery.percent.toFixed(0)}% (${t('batteryCharging')})`;
                } else {
                    const secsLeft = battery.secsleft;
                    let timeLeft = '';
                    if (secsLeft > 0) {
                        const hours = Math.floor(secsLeft / 3600);
                        const minutes = Math.floor((secsLeft % 3600) / 60);
                        timeLeft = `, ${t('estimatedTimeLeft')} ${hours}${t('hours')}${minutes}${t('minutes')}`;
                    }
                    batteryInfoEl.innerHTML = `<span data-i18n="batteryInfo">${t('batteryInfo')}</span>: ${battery.percent.toFixed(0)}% (${t('batteryUnplugged')}${timeLeft})`;
                }
            }
        }

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

function updateCPUCores(coreUsages, withAnimation = false) {
    const container = document.getElementById('cpu-cores-container');
    if (!container) return;

    if (!coreUsages || coreUsages.length === 0) {
        container.innerHTML = `<p>${t('noCPUCores')}</p>`;
        return;
    }

    const existingCoreBoxes = container.querySelectorAll('.core-box');
    const existingCount = existingCoreBoxes.length;
    const newCount = coreUsages.length;

    if (existingCount !== newCount) {
        container.innerHTML = '';

        coreUsages.forEach((usage, index) => {
            const coreBox = document.createElement('div');
            coreBox.className = 'core-box';

            const coreNumEl = document.createElement('div');
            coreNumEl.className = 'core-num';
            coreNumEl.textContent = `${t('core')} ${index + 1}`;

            const coreUsageEl = document.createElement('div');
            coreUsageEl.className = 'core-usage';
            coreUsageEl.textContent = `${usage.toFixed(1)}%`;

            coreBox.appendChild(coreNumEl);
            coreBox.appendChild(coreUsageEl);
            container.appendChild(coreBox);
        });
    }

    coreUsages.forEach((usage, index) => {
        const coreBox = container.children[index];
        if (!coreBox) return;

        const coreUsageEl = coreBox.querySelector('.core-usage');
        if (coreUsageEl) {
            if (withAnimation) {
                animateNumber(coreUsageEl, usage, true);
            } else {
                coreUsageEl.textContent = `${usage.toFixed(1)}%`;
            }
        }

        coreBox.className = 'core-box';
        if (usage < 30) coreBox.classList.add('low');
        else if (usage < 70) coreBox.classList.add('medium');
        else coreBox.classList.add('high');
    });
}

let autoRetryInterval = null;
let retryCount = 0;
const MAX_RETRY_COUNT = 5;

async function retryBackendConnection() {
    updateStatusTip(t('retrying'), "warning");
    hideRetryButton();

    const backendAvailable = await checkBackendStatus();

    if (backendAvailable) {
        updateStatusTip(`${t('connected')}【${branchConfig[currentBranch].name || currentBranch}】`, "success");
        await loadFromCache();
        getHardwareInfo();
        updateRealTimeData();
        updateDiskUsage();

        clearAllIntervals();

        realTimeDataInterval = setInterval(updateRealTimeData, 2000);
        diskUsageInterval = setInterval(updateDiskUsage, 10000);
        hardwareInfoInterval = setInterval(getHardwareInfo, 30000);

        if (autoRetryInterval) {
            clearInterval(autoRetryInterval);
            autoRetryInterval = null;
        }
        retryCount = 0;
    } else {
        retryCount++;
        if (retryCount < MAX_RETRY_COUNT) {
            updateStatusTip(t('retryInSeconds', { count: MAX_RETRY_COUNT - retryCount }), "error");
            setTimeout(retryBackendConnection, 1000);
        } else {
            updateStatusTip(t('maxRetriesReached'), "error");
            showRetryButton();
        }
    }
}

function showRetryButton() {
    const retryContainer = document.getElementById('retry-container');
    if (retryContainer) {
        retryContainer.style.display = 'flex';
    }
}

function hideRetryButton() {
    const retryContainer = document.getElementById('retry-container');
    if (retryContainer) {
        retryContainer.style.display = 'none';
    }
}

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

async function updateDiskUsage() {
    if (!(await checkBackendStatus())) return;

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

async function init() {
    initI18n();
    initTheme();
    initChart();
    adjustChartHeight();

    // 添加窗口resize事件监听
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            adjustChartHeight();
            // 窗口大小变化时立即更新图表数据
            updateRealTimeData();
        }, 250);
    });

    await loadBranchConfig();

    initToggleButtons();

    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', retryBackendConnection);
    }

    // 主题切换按钮事件
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // 语言切换按钮事件
    const langToggleBtn = document.getElementById('language-toggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }

    const backendAvailable = await checkBackendStatus();

    if (backendAvailable) {
            updateStatusTip(`已成功连接【${branchConfig[currentBranch].name || currentBranch}】`, "success");
            await loadFromCache();
            getHardwareInfo();
            updateRealTimeData();
            updateDiskUsage();

            clearAllIntervals();

            realTimeDataInterval = setInterval(updateRealTimeData, 2000);
            diskUsageInterval = setInterval(updateDiskUsage, 10000);
            hardwareInfoInterval = setInterval(getHardwareInfo, 30000);
        } else {
            await loadFromCache();
            showRetryButton();
            retryBackendConnection();
        }
}

let allChartsCollapsed = false;

function initToggleButtons() {
    const toggleBtns = document.querySelectorAll('.chart-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            toggleChart(targetId, btn);
        });
    });

    const toggleAllBtn = document.getElementById('toggle-all-btn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', toggleAllCharts);
    }
}

function toggleChart(chartId, btn) {
    const chartContainer = document.getElementById(chartId);
    const panel = chartContainer?.closest('.chart-panel');

    if (!chartContainer || !panel) return;

    const isCollapsed = chartContainer.classList.toggle('collapsed');
    btn.classList.toggle('collapsed', isCollapsed);
    panel.classList.toggle('collapsed', isCollapsed);

    if (!isCollapsed) {
        setTimeout(() => {
            resizeChart(chartId);
        }, 450);
    }
}

function toggleAllCharts() {
    allChartsCollapsed = !allChartsCollapsed;
    const toggleAllBtn = document.getElementById('toggle-all-btn');
    const toggleBtns = document.querySelectorAll('.chart-toggle-btn');
    const chartContainers = document.querySelectorAll('.chart-container');
    const panels = document.querySelectorAll('.chart-panel');

    if (toggleAllBtn) {
        toggleAllBtn.classList.toggle('collapsed', allChartsCollapsed);
        const textEl = toggleAllBtn.querySelector('.toggle-text');
        if (textEl) {
            textEl.textContent = allChartsCollapsed ? '展开所有图表' : '折叠所有图表';
        }
    }

    toggleBtns.forEach(btn => {
        btn.classList.toggle('collapsed', allChartsCollapsed);
    });

    chartContainers.forEach(container => {
        container.classList.toggle('collapsed', allChartsCollapsed);
    });

    panels.forEach(panel => {
        panel.classList.toggle('collapsed', allChartsCollapsed);
    });

    if (!allChartsCollapsed) {
        setTimeout(() => {
            ['net-chart', 'system-chart', 'usage-chart'].forEach(resizeChart);
        }, 450);
    }
}

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

document.addEventListener('DOMContentLoaded', init);
