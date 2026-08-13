// 语言翻译 - SystemStatus
window.LANGUAGE_DATA = window.LANGUAGE_DATA || {};
window.LANGUAGE_DATA['fr'] = {
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
        russian: "Русский",
        korean: "한국어",
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

        // 数据加载
        loadingData: "Chargement des données depuis le backend...",
        loading: "Chargement...",
        speedUnit: "KB/s",
        temperatureUnit: "°C",
        bootTimeFormat: "Format du temps de démarrage",
        diskError: "Erreur de disque",
        cpuFreqTrend: "Tendance fréquence CPU",
        cpuCurrentFreq: "Fréquence actuelle",
        cpuMaxFreq: "Fréquence max",
        cpuMinFreq: "Fréquence min",

        // Barre latérale
        appName: "SystemStatus",
        navOverview: "Aperçu",
        navCPU: "Moniteur CPU",
        navMemory: "Moniteur mémoire",
        navDisk: "Moniteur disque",
        navGPU: "Moniteur GPU",
        navNetwork: "Moniteur réseau",

        // Aperçu matériel
        cpuInfo: "Infos CPU",
        memoryInfo: "Infos mémoire",
        gpuInfo: "Infos GPU",
        cpuModel: "Modèle CPU",
        cpuCores: "Cœurs",
        cpuArch: "Architecture",
        memoryTotal: "Taille mémoire",
        gbUnit: "Go",
        memoryFrequency: "Fréquence mémoire",
        memoryType: "Type mémoire",
        notDetected: "Non détecté",
        gpuStatus: "État GPU",

        // Mémoire
        memoryUsageTrend: "Tendance mémoire",

        // Détails GPU
        gpuUsageTrend: "Tendance GPU",
        gpuMemoryUsed: "VRAM utilisée",
        gpuMemoryTotal: "VRAM totale",
        gpuTemperature: "Temp GPU",
        gpuUtilization: "Utilisation GPU",
        gpuPowerDraw: "Conso GPU",
        gpuPowerLimit: "Limite conso",

        // Disque SMART
        smartTitle: "Attributs SMART",
        smartAttr: "Attribut",
        smartValue: "Valeur",
        smartWorst: "Pire",
        smartThresh: "Seuil",
        smartRaw: "Brut",
        smartNoData: "Pas de données SMART (droits root ou smartmontools requis)",
        smartUnavailable: "Non supporté"
};
