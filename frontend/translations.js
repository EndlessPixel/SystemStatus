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
        japanese: "日本語",

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
        japanese: "日本語",

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
    },
    'ja': {
        // 页面标题
        title: "システム監視パネル",

        // 服务器选择
        selectServer: "監視サーバーを選択：",
        switchBtn: "切り替え",

        // 状态提示
        connecting: "バックエンドサービスに接続中...",
        connected: "接続に成功しました",
        disconnected: "バックエンドが検出されません",
        connectionFailed: "バックエンド接続に失敗しました",
        usingCache: "キャッシュを使用して高速読み込み",
        usingLocalCache: "バックエンドキャッシュが利用不可のため、ブラウザローカルキャッシュを使用",
        noCache: "バックエンドが検出されず、利用可能なキャッシュもありません",

        // 硬件卡片
        cpu: "CPU",
        memory: "メモリ",
        gpu: "グラフィックカード",
        network: "ネットワークカード",
        cores: "コア数",
        physicalCores: "物理コア",
        total: "総容量",
        status: "状態",
        available: "利用可能",
        unavailable: "利用不可",
        loading: "読み込み中...",
        unknown: "不明",
        unknownCPU: "CPU不明",
        unknownMemory: "メモリ不明",
        unknownGPU: "グラフィックカード不明",

        // 网络信息
        noNetwork: "ネットワークカード情報が検出されません",
        noIP: "IPなし",
        wifi: "WiFi",
        ethernet: "イーサネット",
        vpn: "VPN",
        bluetooth: "Bluetooth",
        other: "その他",

        // 面板标题
        cpuCoresUsage: "CPUコアリアルタイム使用率",
        diskUsage: "ディスク使用率",
        networkTraffic: "ネットワークカードトラフィック監視",
        systemLoad: "システム負荷監視",
        systemResourceTrend: "システムリソース推移",

        // 网络流量
        uploadSpeed: "リアルタイムアップロード速度",
        downloadSpeed: "リアルタイムダウンロード速度",

        // 系统信息
        systemLoad1Min: "1分間システム負荷",
        processCount: "現在のプロセス数",
        cpuTemperature: "CPU温度",
        bootTime: "起動時間",
        batteryInfo: "バッテリー状態",
        noBattery: "バッテリー情報が検出されません",
        batteryCharging: "充電中",
        batteryUnplugged: "電源未接続",
        estimatedTimeLeft: "残り時間",
        hours: "時間",
        minutes: "分",
        days: "日",
        hoursShort: "時間",
        minutesShort: "分",

        // 资源占用
        cpuUsage: "CPU使用率",
        memoryUsage: "メモリ使用率",
        gpuUsage: "GPU使用率",

        // 图表标题
        cpuMemoryGpuTrend: "CPU/メモリ/GPU 使用率推移",
        networkTrafficTrend: "ネットワークカードトラフィック速度推移",
        systemLoadTrend: "システム負荷推移",

        // 图表标签
        cpuUsagePercent: "CPU使用率(%)",
        memoryUsagePercent: "メモリ使用率(%)",
        gpuUsagePercent: "GPU使用率(%)",
        uploadSpeedLabel: "アップロード速度",
        downloadSpeedLabel: "ダウンロード速度",
        systemLoadLabel: "システム負荷",
        processCountLabel: "プロセス数",
        cpuTempLabel: "CPU温度",

        // 轴标签
        time: "時間",
        usagePercent: "使用率(%)",
        speedKb: "速度 (KB/s)",
        loadProcess: "システム負荷/プロセス数",
        temperatureC: "CPU温度(°C)",

        // 折叠按钮
        collapseAll: "すべてのグラフを折りたたむ",
        expandAll: "すべてのグラフを展開する",

        // 主题
        darkMode: "ダークモード",
        lightMode: "ライトモード",
        highContrastMode: "ハイコントラストモード",
        theme: "テーマ",
        themeLight: "ライト",
        themeDark: "ダーク",
        themeHighContrast: "ハイコントラスト",

        // 语言
        language: "言語",
        chinese: "中国語",
        english: "English",
        japanese: "日本語",

        // 重试
        retryConnection: "バックエンド接続を再試行",
        retrying: "バックエンドへの再接続を試行中...",
        maxRetriesReached: "バックエンド接続に失敗、最大再試行回数に達しました",
        retryInSeconds: "接続に失敗しました。{count}秒後に自動再試行...",

        // 切换服务器
        switchingTo: "{server}に切り替え中",
        switchFailed: "切り替えに失敗しました",
        configNotFound: "設定が存在しません",
        switchSuccess: "{server}に切り替えに成功しました",
        remoteAddressWarning: "現在の接続（リモートアドレス）はキャッシュを使用できません",
        usingDefaultConfig: "設定の読み込みに失敗したため、デフォルトのローカルアドレスを使用",

        // 底部信息
        footerProject: "SystemStatus / EndlessPixel-SS",
        footerCopyright: "Copyright © 2024-2026 EndlessPixel Studio. 全著作権所有。",
        footerGithub: "GitHub",

        // 图表加载
        chartLoading: "グラフ読み込み中...",

        // 其他
        localServer: "ローカルサーバー",
        noDisk: "ディスク情報が検出されません",
        core: "コア",
        noCPUCores: "CPUコア情報が検出されません",
    },
    // 俄语
    'ru': {
        // 页面标题
        title: "Панель мониторинга системы",

        // 服务器选择
        selectServer: "Выберите сервер мониторинга:",
        switchBtn: "Переключить",

        // 状态提示
        connecting: "Подключение к бэкенду...",
        connected: "Успешно подключено",
        disconnected: "Бэкенд не обнаружен",
        connectionFailed: "Ошибка подключения к бэкенду",
        usingCache: "Быстрая загрузка с использованием кэша",
        usingLocalCache: "Кэш бэкенда недоступен, используется локальный кэш браузера",
        noCache: "Бэкенд не обнаружен и нет доступного кэша",

        // 硬件卡片
        cpu: "ЦПУ",
        memory: "Память",
        gpu: "Видеокарта",
        network: "Сетевая карта",
        cores: "Количество ядер",
        physicalCores: "Физические ядра",
        total: "Общий объем",
        status: "Статус",
        available: "Доступно",
        unavailable: "Недоступно",
        loading: "Загрузка...",
        unknown: "Неизвестно",
        unknownCPU: "Неизвестный ЦПУ",
        unknownMemory: "Неизвестная память",
        unknownGPU: "Неизвестная видеокарта",

        // 网络信息
        noNetwork: "Информация о сетевой карте не обнаружена",
        noIP: "Без IP",
        wifi: "WiFi",
        ethernet: "Ethernet",
        vpn: "VPN",
        bluetooth: "Bluetooth",
        other: "Другое",

        // 面板标题
        cpuCoresUsage: "Реальное использование ядер ЦПУ",
        diskUsage: "Использование диска",
        networkTraffic: "Мониторинг сетевого трафика",
        systemLoad: "Мониторинг нагрузки системы",
        systemResourceTrend: "Динамика системных ресурсов",

        // 网络流量
        uploadSpeed: "Скорость отправки",
        downloadSpeed: "Скорость загрузки",

        // 系统信息
        systemLoad1Min: "Нагрузка за 1 мин",
        processCount: "Текущие процессы",
        cpuTemperature: "Температура ЦПУ",
        bootTime: "Время работы",
        batteryInfo: "Состояние батареи",
        noBattery: "Информация о батарее не обнаружена",
        batteryCharging: "Зарядка",
        batteryUnplugged: "Питание отключено",
        estimatedTimeLeft: "Осталось времени",
        hours: "ч",
        minutes: "мин",
        days: "д",
        hoursShort: "ч",
        minutesShort: "мин",

        // 资源占用
        cpuUsage: "Использование ЦПУ",
        memoryUsage: "Использование памяти",
        gpuUsage: "Использование видеокарты",

        // 图表标题
        cpuMemoryGpuTrend: "Динамика использования ЦПУ/Памяти/Видеокарты",
        networkTrafficTrend: "Динамика скорости сетевого трафика",
        systemLoadTrend: "Динамика нагрузки системы",

        // 图表标签
        cpuUsagePercent: "Использование ЦПУ (%)",
        memoryUsagePercent: "Использование памяти (%)",
        gpuUsagePercent: "Использование видеокарты (%)",
        uploadSpeedLabel: "Скорость отправки",
        downloadSpeedLabel: "Скорость загрузки",
        systemLoadLabel: "Нагрузка системы",
        processCountLabel: "Процессы",
        cpuTempLabel: "Температура ЦПУ",

        // 轴标签
        time: "Время",
        usagePercent: "Использование (%)",
        speedKb: "Скорость (KB/s)",
        loadProcess: "Нагрузка/Процессы",
        temperatureC: "Температура (°C)",

        // 折叠按钮
        collapseAll: "Свернуть все графики",
        expandAll: "Развернуть все графики",

        // 主题
        darkMode: "Темный режим",
        lightMode: "Светлый режим",
        highContrastMode: "Высокий контраст",
        theme: "Тема",
        themeLight: "Светлая",
        themeDark: "Темная",
        themeHighContrast: "Высокий контраст",

        // 语言
        language: "Язык",
        chinese: "简体中文",
        english: "English",
        japanese: "日本語",
        french: "Français",
        german: "Deutsch",

        // 重试
        retryConnection: "Повторить подключение",
        retrying: "Повторное подключение к бэкенду...",
        maxRetriesReached: "Ошибка подключения, достигнуто максимальное число попыток",
        retryInSeconds: "Ошибка подключения, повтор через {count} сек...",

        // 切换服务器
        switchingTo: "Переключение на",
        switchFailed: "Ошибка переключения",
        configNotFound: "Конфигурация не найдена",
        switchSuccess: "Успешно переключено на",
        remoteAddressWarning: "Текущее подключение (удаленный адрес) не использует кэш",
        usingDefaultConfig: "Ошибка загрузки конфигурации, используется локальный адрес по умолчанию",

        // 底部信息
        footerProject: "SystemStatus / EndlessPixel-SS",
        footerCopyright: "Copyright © 2024-2026 EndlessPixel Studio. Все права защищены.",
        footerGithub: "GitHub",

        // 图表加载
        chartLoading: "Загрузка графика...",

        // 其他
        localServer: "Локальный сервер",
        noDisk: "Информация о диске не обнаружена",
        core: "Ядро",
        noCPUCores: "Информация о ядрах ЦПУ не обнаружена",
    },

    // 韩语
    'ko': {
        // 页面标题
        title: "시스템 모니터링 패널",

        // 服务器选择
        selectServer: "모니터링 서버 선택:",
        switchBtn: "전환",

        // 状态提示
        connecting: "백엔드 서비스 연결 중...",
        connected: "연결 성공",
        disconnected: "백엔드를 찾을 수 없음",
        connectionFailed: "백엔드 연결 실패",
        usingCache: "캐시를 사용한 빠른 로드",
        usingLocalCache: "백엔드 캐시를 사용할 수 없어 브라우저 로컬 캐시 사용",
        noCache: "백엔드를 찾을 수 없고 사용 가능한 캐시가 없음",

        // 硬件卡片
        cpu: "CPU",
        memory: "메모리",
        gpu: "그래픽 카드",
        network: "네트워크 카드",
        cores: "코어 수",
        physicalCores: "물리 코어",
        total: "총 용량",
        status: "상태",
        available: "사용 가능",
        unavailable: "사용 불가",
        loading: "로딩 중...",
        unknown: "알 수 없음",
        unknownCPU: "알 수 없는 CPU",
        unknownMemory: "알 수 없는 메모리",
        unknownGPU: "알 수 없는 그래픽 카드",

        // 网络信息
        noNetwork: "네트워크 카드 정보를 찾을 수 없음",
        noIP: "IP 없음",
        wifi: "WiFi",
        ethernet: "이더넷",
        vpn: "VPN",
        bluetooth: "블루투스",
        other: "기타",

        // 面板标题
        cpuCoresUsage: "CPU 코어 실시간 사용률",
        diskUsage: "디스크 사용률",
        networkTraffic: "네트워크 트래픽 모니터링",
        systemLoad: "시스템 부하 모니터링",
        systemResourceTrend: "시스템 자원 추이",

        // 网络流量
        uploadSpeed: "실시간 업로드 속도",
        downloadSpeed: "실시간 다운로드 속도",

        // 系统信息
        systemLoad1Min: "1분 시스템 부하",
        processCount: "현재 프로세스 수",
        cpuTemperature: "CPU 온도",
        bootTime: "가동 시간",
        batteryInfo: "배터리 상태",
        noBattery: "배터리 정보를 찾을 수 없음",
        batteryCharging: "충전 중",
        batteryUnplugged: "전원 연결 해제",
        estimatedTimeLeft: "남은 시간",
        hours: "시간",
        minutes: "분",
        days: "일",
        hoursShort: "시간",
        minutesShort: "분",

        // 资源占用
        cpuUsage: "CPU 사용률",
        memoryUsage: "메모리 사용률",
        gpuUsage: "GPU 사용률",

        // 图表标题
        cpuMemoryGpuTrend: "CPU/메모리/GPU 사용률 추이",
        networkTrafficTrend: "네트워크 트래픽 속도 추이",
        systemLoadTrend: "시스템 부하 추이",

        // 图表标签
        cpuUsagePercent: "CPU 사용률 (%)",
        memoryUsagePercent: "메모리 사용률 (%)",
        gpuUsagePercent: "GPU 사용률 (%)",
        uploadSpeedLabel: "업로드 속도",
        downloadSpeedLabel: "다운로드 속도",
        systemLoadLabel: "시스템 부하",
        processCountLabel: "프로세스 수",
        cpuTempLabel: "CPU 온도",

        // 轴标签
        time: "시간",
        usagePercent: "사용률 (%)",
        speedKb: "속도 (KB/s)",
        loadProcess: "시스템 부하/프로세스 수",
        temperatureC: "CPU 온도 (°C)",

        // 折叠按钮
        collapseAll: "모든 그래프 접기",
        expandAll: "모든 그래프 펼치기",

        // 主题
        darkMode: "다크 모드",
        lightMode: "라이트 모드",
        highContrastMode: "고대비 모드",
        theme: "테마",
        themeLight: "라이트",
        themeDark: "다크",
        themeHighContrast: "고대비",

        // 语言
        language: "언어",
        chinese: "简体中文",
        english: "English",
        japanese: "日本語",
        french: "Français",
        german: "Deutsch",

        // 重试
        retryConnection: "백엔드 연결 재시도",
        retrying: "백엔드 재연결 시도 중...",
        maxRetriesReached: "백엔드 연결 실패, 최대 재시도 횟수 도달",
        retryInSeconds: "연결 실패, {count}초 후 자동 재시도...",

        // 切换服务器
        switchingTo: "전환 중:",
        switchFailed: "전환 실패",
        configNotFound: "설정을 찾을 수 없음",
        switchSuccess: "전환 성공:",
        remoteAddressWarning: "현재 연결(원격 주소)는 캐시를 사용할 수 없습니다",
        usingDefaultConfig: "설정 로드 실패, 기본 로컬 주소 사용",

        // 底部信息
        footerProject: "SystemStatus / EndlessPixel-SS",
        footerCopyright: "Copyright © 2024-2026 EndlessPixel Studio. 모든 권리 보유.",
        footerGithub: "GitHub",

        // 图表加载
        chartLoading: "그래프 로딩 중...",

        // 其他
        localServer: "로컬 서버",
        noDisk: "디스크 정보를 찾을 수 없음",
        core: "코어",
        noCPUCores: "CPU 코어 정보를 찾을 수 없음",
    },

    // 法语
    'fr': {
        // 页面标题
        title: "Panneau de surveillance système",

        // 服务器选择
        selectServer: "Choisir le serveur de surveillance :",
        switchBtn: "Changer",

        // 状态提示
        connecting: "Connexion au backend...",
        connected: "Connecté avec succès",
        disconnected: "Backend non détecté",
        connectionFailed: "Échec de la connexion au backend",
        usingCache: "Chargement rapide avec le cache",
        usingLocalCache: "Cache backend indisponible, utilisation du cache local du navigateur",
        noCache: "Backend non détecté et aucun cache disponible",

        // 硬件卡片
        cpu: "CPU",
        memory: "Mémoire",
        gpu: "Carte graphique",
        network: "Carte réseau",
        cores: "Nombre de cœurs",
        physicalCores: "Cœurs physiques",
        total: "Capacité totale",
        status: "Statut",
        available: "Disponible",
        unavailable: "Indisponible",
        loading: "Chargement...",
        unknown: "Inconnu",
        unknownCPU: "CPU inconnu",
        unknownMemory: "Mémoire inconnue",
        unknownGPU: "Carte graphique inconnue",

        // 网络信息
        noNetwork: "Informations carte réseau non détectées",
        noIP: "Sans IP",
        wifi: "WiFi",
        ethernet: "Ethernet",
        vpn: "VPN",
        bluetooth: "Bluetooth",
        other: "Autre",

        // 面板标题
        cpuCoresUsage: "Utilisation en temps réel des cœurs CPU",
        diskUsage: "Utilisation du disque",
        networkTraffic: "Surveillance du trafic réseau",
        systemLoad: "Surveillance de la charge système",
        systemResourceTrend: "Tendance des ressources système",

        // 网络流量
        uploadSpeed: "Vitesse d'envoi temps réel",
        downloadSpeed: "Vitesse de téléchargement temps réel",

        // 系统信息
        systemLoad1Min: "Charge système 1 min",
        processCount: "Nombre de processus",
        cpuTemperature: "Température CPU",
        bootTime: "Temps de fonctionnement",
        batteryInfo: "État de la batterie",
        noBattery: "Informations batterie non détectées",
        batteryCharging: "En charge",
        batteryUnplugged: "Alimentation déconnectée",
        estimatedTimeLeft: "Temps restant estimé",
        hours: "h",
        minutes: "min",
        days: "j",
        hoursShort: "h",
        minutesShort: "min",

        // 资源占用
        cpuUsage: "Utilisation CPU",
        memoryUsage: "Utilisation mémoire",
        gpuUsage: "Utilisation GPU",

        // 图表标题
        cpuMemoryGpuTrend: "Tendance utilisation CPU/Mémoire/GPU",
        networkTrafficTrend: "Tendance vitesse trafic réseau",
        systemLoadTrend: "Tendance charge système",

        // 图表标签
        cpuUsagePercent: "Utilisation CPU (%)",
        memoryUsagePercent: "Utilisation mémoire (%)",
        gpuUsagePercent: "Utilisation GPU (%)",
        uploadSpeedLabel: "Vitesse d'envoi",
        downloadSpeedLabel: "Vitesse de téléchargement",
        systemLoadLabel: "Charge système",
        processCountLabel: "Processus",
        cpuTempLabel: "Température CPU",

        // 轴标签
        time: "Temps",
        usagePercent: "Utilisation (%)",
        speedKb: "Vitesse (KB/s)",
        loadProcess: "Charge/Processus",
        temperatureC: "Température (°C)",

        // 折叠按钮
        collapseAll: "Réduire tous les graphiques",
        expandAll: "Afficher tous les graphiques",

        // 主题
        darkMode: "Mode sombre",
        lightMode: "Mode clair",
        highContrastMode: "Mode haut contraste",
        theme: "Thème",
        themeLight: "Clair",
        themeDark: "Sombre",
        themeHighContrast: "Haut contraste",

        // 语言
        language: "Langue",
        chinese: "简体中文",
        english: "English",
        japanese: "Japonais",
        french: "Français",
        german: "Deutsch",

        // 重试
        retryConnection: "Réessayer la connexion",
        retrying: "Tentative de reconnexion au backend...",
        maxRetriesReached: "Échec connexion, nombre max de tentatives atteint",
        retryInSeconds: "Échec connexion, nouvelle tentative dans {count}s...",

        // 切换服务器
        switchingTo: "Changement vers",
        switchFailed: "Échec du changement",
        configNotFound: "Configuration introuvable",
        switchSuccess: "Changé avec succès vers",
        remoteAddressWarning: "Connexion actuelle (adresse distante) n'utilise pas le cache",
        usingDefaultConfig: "Échec chargement config, utilisation adresse locale par défaut",

        // 底部信息
        footerProject: "SystemStatus / EndlessPixel-SS",
        footerCopyright: "Copyright © 2024-2026 EndlessPixel Studio. Tous droits réservés.",
        footerGithub: "GitHub",

        // 图表加载
        chartLoading: "Chargement du graphique...",

        // 其他
        localServer: "Serveur local",
        noDisk: "Informations disque non détectées",
        core: "Cœur",
        noCPUCores: "Informations cœurs CPU non détectées",
    },
};

window.LANGUAGE_CONFIG = {
    'zh': {
        name: 'Chinese',
        nativeName: '简体中文'
    },
    'en': {
        name: 'English',
        nativeName: 'English'
    },
    'ja': {
        name: 'Japanese',
        nativeName: '日本語'
    },
    'fr': {
        name: 'French',
        nativeName: 'Français'
    },
    'de': {
        name: 'German',
        nativeName: 'Deutsch'
    },
    // 补上俄语
    'ru': {
        name: 'Russian',
        nativeName: 'Русский'
    },
    // 补上韩语
    'ko': {
        name: 'Korean',
        nativeName: '한국어'
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
