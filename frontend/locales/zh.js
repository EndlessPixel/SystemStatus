// 语言翻译 - SystemStatus
// 此文件由 translations.js 自动聚合，请勿手动修改外层结构
window.LANGUAGE_DATA = window.LANGUAGE_DATA || {};
window.LANGUAGE_DATA['zh'] = {
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
        japanese: "日本語",
        french: "Français",
        german: "Deutsch",
        russian: "Русский",
        korean: "한국어",

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

        // 数据加载
        loadingData: "正在从后端加载数据...",
        loading: "加载中...",
        speedUnit: "KB/s",
        temperatureUnit: "°C",
        bootTimeFormat: "开机时间格式",
        diskError: "硬盘错误",

        cpuFreqTrend: "CPU频率趋势",
        cpuCurrentFreq: "当前主频",
        cpuMaxFreq: "最大主频",
        cpuMinFreq: "最小主频",

        // 侧边栏导航
        appName: "SystemStatus",
        navOverview: "基础信息",
        navCPU: "CPU监控",
        navMemory: "内存监控",
        navDisk: "硬盘监控",
        navGPU: "GPU监控",
        navNetwork: "网络监控",

        // 硬件概览卡片
        cpuInfo: "CPU 信息",
        memoryInfo: "内存信息",
        gpuInfo: "显卡信息",
        cpuModel: "CPU 型号",
        cpuCores: "核心数",
        cpuArch: "架构",
        memoryTotal: "内存容量",
        gbUnit: "GB",
        memoryFrequency: "内存频率",
        memoryType: "内存类型",
        notDetected: "未检测到",
        gpuStatus: "显卡状态",

        // 内存监控
        memoryUsageTrend: "内存占用率趋势",

        // GPU 监控详情
        gpuUsageTrend: "GPU占用率趋势",
        gpuMemoryUsed: "显存已用",
        gpuMemoryTotal: "显存总计",
        gpuTemperature: "显卡温度",
        gpuUtilization: "显卡利用率",
        gpuPowerDraw: "显卡功耗",
        gpuPowerLimit: "功耗上限",

        // 硬盘 SMART
        smartTitle: "SMART 属性",
        smartAttr: "属性名",
        smartValue: "当前值",
        smartWorst: "最差值",
        smartThresh: "阈值",
        smartRaw: "原始值",
        smartNoData: "未获取到 SMART 数据（可能需要 root 权限或安装 smartmontools）",
        smartUnavailable: "不支持"
};
