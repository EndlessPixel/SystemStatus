// 语言翻译文件 - System Status Monitor
// 可以在此文件中轻松添加新语言
// 注意：使用 window 对象导出，避免与其他脚本冲突
window.LANGUAGES = {
    'zh': {
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
        highContrastMode: "高对比度模式",
        theme: "主题",
        themeLight: "浅色",
        themeDark: "深色",
        themeHighContrast: "高对比度",
        
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
    'en': {
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
        highContrastMode: "High Contrast Mode",
        theme: "Theme",
        themeLight: "Light",
        themeDark: "Dark",
        themeHighContrast: "High Contrast",
        
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

// 语言配置 - 添加新语言只需在此配置即可
window.LANGUAGE_CONFIG = {
    'zh': { 
        name: '简体中文', 
        nativeName: '简体中文' 
    },
    'en': { 
        name: 'English', 
        nativeName: 'English' 
    }
};

// 主题配置 - 添加新主题只需在此配置即可
window.THEME_CONFIG = {
    'light': { 
        name: 'light',
        labelKey: 'themeLight',
        icon: '☀️'
    },
    'dark': { 
        name: 'dark', 
        labelKey: 'themeDark',
        icon: '🌙'
    },
    'high-contrast': { 
        name: 'high-contrast', 
        labelKey: 'themeHighContrast',
        icon: '⚫'
    }
};

// 移除重复的导出行，因为上面已经直接赋值给 window 对象