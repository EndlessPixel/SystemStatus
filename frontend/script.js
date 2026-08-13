// 全局变量
const API_BASE = "/api";
const LOCAL_CACHE_KEY = "system_monitor_cache";
const THEME_KEY = "system_monitor_theme";

// 主题配置：键对应 data-theme 值，labelKey 指向 translations.js 中的文案键
window.THEME_CONFIG = window.THEME_CONFIG || {
    'light': { labelKey: 'themeLight' },
    'dark': { labelKey: 'themeDark' },
    'high-contrast': { labelKey: 'themeHighContrast' }
};
let chart = null;
let netChart = null;
let systemChart = null;
let freqChart = null;
let cpuFreqMax = 0;
let cpuFreqMin = 0;
const ANIMATION_DURATION = 800;
const ANIMATION_FRAME = 16;
const I18N_KEY = "system_monitor_language";
let currentLanguage = 'zh';
let cachedHardwareInfo = null;
let cachedCpuCores = [];
let appConfig = { show_network: true, show_battery: true };
function initI18n() {
    if (!window.LANGUAGES) {
        console.error('Language files not loaded!');
        showPrompt('Language files not loaded!', false);
        return;
    }
    const savedLang = localStorage.getItem(I18N_KEY);
    if (savedLang && window.LANGUAGES[savedLang]) {
        currentLanguage = savedLang;
    } else {
        const browserLang = navigator.language || navigator.userLanguage;
        const detectedLang = Object.keys(window.LANGUAGE_CONFIG).find(lang =>
            browserLang.toLowerCase().startsWith(lang.toLowerCase())
        );
        currentLanguage = detectedLang || 'zh';
    }
    initLanguageSelect();
    updateAllTranslations();
    updateLanguageSelect();
}

function initLanguageSelect() {
    const select = document.getElementById('language-select');
    if (!select) return;

    select.innerHTML = '';

    Object.keys(window.LANGUAGE_CONFIG).forEach(langKey => {
        const option = document.createElement('option');
        option.value = langKey;
        option.textContent = window.LANGUAGE_CONFIG[langKey].nativeName;
        select.appendChild(option);
    });

    // 添加事件监听器
    select.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });
}

function setLanguage(lang) {
    if (window.LANGUAGES[lang]) {
        currentLanguage = lang;
        localStorage.setItem(I18N_KEY, lang);
        updateAllTranslations();
        updateLanguageSelect();
        updateThemeSelect();
        updateChartTranslations();
    }
}

function t(key, replacements = {}) {
    let text = window.LANGUAGES[currentLanguage][key] || window.LANGUAGES['zh'][key] || key;
    Object.keys(replacements).forEach(placeholder => {
        text = text.replace(`{${placeholder}}`, replacements[placeholder]);
    });
    return text;
}

function updateLanguageSelect() {
    const select = document.getElementById('language-select');
    if (select) {
        select.value = currentLanguage;
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
    if (subTitle) {subTitle.textContent = t('title');}
    const branchLabel = document.querySelector('.branch-switcher label');
    if (branchLabel) {branchLabel.textContent = t('selectServer');}
    const switchBtn = document.getElementById('switch-btn');
    if (switchBtn) {switchBtn.textContent = t('switchBtn');}
    const toggleAllBtn = document.getElementById('toggle-all-btn');
    if (toggleAllBtn) {const toggleText = toggleAllBtn.querySelector('.toggle-text');if (toggleText) {toggleText.textContent = t('collapseAll');}}
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {retryBtn.textContent = t('retryConnection');}
    const footerProject = document.querySelector('.project');
    if (footerProject) {footerProject.innerHTML = `${t('footerProject')} - Go to <a class="github-link" href="https://github.com/EndlessPixel/SystemStatus">${t('footerGithub')}</a>`;}
    const footerCopyright = document.querySelector('.studio');
    if (footerCopyright) {footerCopyright.textContent = t('footerCopyright');}
    updateNetworkTypeLabels();
}

function updateChartTranslations() {
    if (chart) {chart.setOption({
            title: {text: t('cpuMemoryGpuTrend')},
            legend: {data: [t('cpuUsagePercent'), t('memoryUsagePercent'), t('gpuUsagePercent')]},
            xAxis: {name: t('time')},
            yAxis: {name: t('usagePercent')},
            series: [{name: t('cpuUsagePercent')},{name: t('memoryUsagePercent')},{name: t('gpuUsagePercent')}]});}

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
            },
            series: [{
                    name: t('uploadSpeedLabel')
                },
                {
                    name: t('downloadSpeedLabel')
                }
            ]
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
            yAxis: [{
                    name: t('loadProcess')
                },
                {
                    name: t('temperatureC')
                }
            ],
            series: [{
                    name: t('systemLoadLabel')
                },
                {
                    name: t('processCountLabel')
                },
                {
                    name: t('cpuTempLabel')
                }
            ]
        });
    }
}

// 主题管理功能
function initTheme() {
    // 初始化主题下拉框
    initThemeSelect();

    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme && window.THEME_CONFIG[savedTheme]) {
        setTheme(savedTheme);
    } else {
        // 检测系统主题
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    }
}

function initThemeSelect() {
    const select = document.getElementById('theme-select');
    if (!select) return;

    select.innerHTML = '';

    Object.keys(window.THEME_CONFIG).forEach(themeKey => {
        const theme = window.THEME_CONFIG[themeKey];
        const option = document.createElement('option');
        option.value = themeKey;
        option.textContent = t(theme.labelKey);
        select.appendChild(option);
    });

    // 添加事件监听器
    select.addEventListener('change', (e) => {
        setTheme(e.target.value);
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeSelect();
    updateChartTheme(theme);

    // 更新body的class以支持特定的样式
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function updateThemeSelect() {
    const select = document.getElementById('theme-select');
    if (!select) return;

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

    // 检查是否真的需要重新生成选项
    let needsRegenerate = false;

    // 如果选项数量不对，或者文本不匹配，就需要重新生成
    if (select.options.length !== Object.keys(window.THEME_CONFIG).length) {
        needsRegenerate = true;
    } else {
        // 检查每个选项的文本是否需要更新
        let index = 0;
        for (const themeKey of Object.keys(window.THEME_CONFIG)) {
            const theme = window.THEME_CONFIG[themeKey];
            const expectedText = t(theme.labelKey);
            if (select.options[index]?.textContent !== expectedText) {
                needsRegenerate = true;
                break;
            }
            index++;
        }
    }

    if (needsRegenerate) {
        // 重新生成所有选项以更新翻译
        select.innerHTML = '';

        Object.keys(window.THEME_CONFIG).forEach(themeKey => {
            const theme = window.THEME_CONFIG[themeKey];
            const option = document.createElement('option');
            option.value = themeKey;
            option.textContent = t(theme.labelKey);
            select.appendChild(option);
        });
    }

    // 总是设置选中的主题
    select.value = currentTheme;
}

function updateChartTheme(theme) {
    const textColor = theme === 'dark' ? '#f5f5f7' : '#1d1d1f';
    const secondaryTextColor = theme === 'dark' ? '#98989d' : '#86868b';
    const axisLineColor = theme === 'dark' ? '#38383a' : '#e6e6e8';
    const splitLineColor = theme === 'dark' ? '#2c2c2e' : '#f5f5f7';

    // 更新所有图表
    [chart, netChart, systemChart, freqChart].forEach(chartInstance => {
        if (chartInstance) {
            const option = {
                title: {
                    textStyle: {
                        color: secondaryTextColor
                    }
                },
                tooltip: {
                    backgroundColor: theme === 'dark' ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: theme === 'dark' ? '#38383a' : '#e6e6e8',
                    textStyle: {
                        color: textColor
                    }
                },
                legend: {
                    textStyle: {
                        color: secondaryTextColor
                    }
                },
                xAxis: {
                    nameTextStyle: {
                        color: secondaryTextColor
                    },
                    axisLine: {
                        lineStyle: {
                            color: axisLineColor
                        }
                    },
                    axisLabel: {
                        color: secondaryTextColor
                    },
                    splitLine: {
                        lineStyle: {
                            color: splitLineColor,
                            type: 'dashed'
                        }
                    }
                },
                yAxis: {
                    nameTextStyle: {
                        color: secondaryTextColor
                    },
                    axisLine: {
                        lineStyle: {
                            color: axisLineColor
                        }
                    },
                    axisLabel: {
                        color: secondaryTextColor
                    },
                    splitLine: {
                        lineStyle: {
                            color: splitLineColor,
                            type: 'dashed'
                        }
                    }
                }
            };

            // 只有systemChart有两个y轴
            if (chartInstance === systemChart) {
                option.yAxis = [{
                        nameTextStyle: {
                            color: secondaryTextColor
                        },
                        axisLine: {
                            lineStyle: {
                                color: axisLineColor
                            }
                        },
                        axisLabel: {
                            color: secondaryTextColor
                        },
                        splitLine: {
                            lineStyle: {
                                color: splitLineColor,
                                type: 'dashed'
                            }
                        }
                    },
                    {
                        nameTextStyle: {
                            color: secondaryTextColor
                        },
                        axisLine: {
                            lineStyle: {
                                color: axisLineColor
                            }
                        },
                        axisLabel: {
                            color: secondaryTextColor
                        },
                        splitLine: {
                            show: false
                        }
                    }
                ];
            }

            chartInstance.setOption(option);
        }
    });
}

function formatTime(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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



function clearOldData() {
    if (chart) {
        chart.setOption({
            series: [{
                data: []
            }, {
                data: []
            }, {
                data: []
            }]
        });
    }
    if (netChart) {
        netChart.setOption({
            series: [{
                data: []
            }, {
                data: []
            }]
        });
    }
    if (systemChart) {
        systemChart.setOption({
            series: [{
                data: []
            }, {
                data: []
            }, {
                data: []
            }]
        });
    }

    const resetElements = [{
            id: 'cpu-model',
            text: t('loading')
        },
        {
            id: 'cpu-cores',
            text: t('loading')
        },
        {
            id: 'mem-model',
            text: t('loading')
        },
        {
            id: 'mem-total',
            text: t('loading')
        },
        {
            id: 'gpu-model',
            text: t('loading')
        },
        {
            id: 'gpu-status',
            text: t('loading')
        },
        {
            id: 'net-upload-speed',
            text: `0 ${t('speedUnit')}`
        },
        {
            id: 'net-download-speed',
            text: `0 ${t('speedUnit')}`
        },
        {
            id: 'system-load',
            text: '0.00'
        },
        {
            id: 'process-count',
            text: '0'
        },
        {
            id: 'cpu-temperature',
            text: `0${t('temperatureUnit')}`
        },
        {
            id: 'boot-time-info',
            text: `0${t('days')} 0${t('hoursShort')} 0${t('minutesShort')}`
        },
        {
            id: 'cpu-freq-current',
            text: '0 MHz'
        },
        {
            id: 'cpu-freq-max',
            text: '0 MHz'
        },
        {
            id: 'cpu-freq-min',
            text: '0 MHz'
        },
        {
            id: 'battery-info',
            text: t('noBattery')
        }
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
        batteryInfoEl.textContent = t('noBattery');
    }

    const networkEl = document.getElementById('network-info');
    if (networkEl) networkEl.innerHTML = t('loading');

    const cpuCoresEl = document.getElementById('cpu-cores-container');
    if (cpuCoresEl) cpuCoresEl.innerHTML = t('loading');

    const diskEl = document.getElementById('disk-container');
    if (diskEl) diskEl.innerHTML = t('loading');
}

function updateStatusTip(text, type = "success") {
    // 使用提示框组件显示提示
    const isSuccess = (type === "success");
    if (typeof showPrompt === 'function') {
        showPrompt(text, isSuccess);
    }
}

// 获取屏幕宽度对应的最大数据点数
function getMaxDataPoints() {
    const screenWidth = window.innerWidth;
    // 根据屏幕宽度动态计算显示的数据点数量
    // 每50px宽度显示约10个数据点
    const minPoints = 15; // 最小显示15个点
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

// Header滚动检测和悬浮效果
function initHeaderScroll() {
    const header = document.querySelector('.header');
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!header || !headerPlaceholder) return;

    let lastScrollY = 0;
    let ticking = false;
    const SCROLL_UP_THRESHOLD = 80; // 向上滚动超过80px时添加scrolled类
    const SCROLL_DOWN_THRESHOLD = 60; // 向下滚动低于60px时移除scrolled类

    // 获取头部初始高度（包括margin和padding）
    function getHeaderHeight() {
        const styles = window.getComputedStyle(header);
        return header.offsetHeight +
            parseInt(styles.marginTop) +
            parseInt(styles.marginBottom);
    }

    // 初始化占位符高度
    headerPlaceholder.style.height = getHeaderHeight() + 'px';

    function updateHeaderOnScroll() {
        const scrollY = window.scrollY;
        const isScrolled = header.classList.contains('scrolled');

        // 使用双阈值避免在临界点附近反复切换
        if (!isScrolled && scrollY > SCROLL_UP_THRESHOLD) {
            header.classList.add('scrolled');
            // 滚动状态下，占位符高度使用较小的值
            const smallHeight = getHeaderHeight();
            headerPlaceholder.style.height = smallHeight + 'px';
        } else if (isScrolled && scrollY < SCROLL_DOWN_THRESHOLD) {
            header.classList.remove('scrolled');
            // 恢复原始高度，需要重新计算（因为header可能已经改变）
            setTimeout(() => {
                headerPlaceholder.style.height = getHeaderHeight() + 'px';
            }, 10);
        }

        lastScrollY = scrollY;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateHeaderOnScroll();
            });
            ticking = true;
        }
    });

    // 窗口大小变化时更新占位符高度
    window.addEventListener('resize', () => {
        if (!header.classList.contains('scrolled')) {
            headerPlaceholder.style.height = getHeaderHeight() + 'px';
        }
    });

    // 初始化时检查一次
    updateHeaderOnScroll();
}

// 根据屏幕宽度动态调整图表高度
function adjustChartHeight() {
    const screenWidth = window.innerWidth;
    let chartHeight;

    // 根据屏幕宽度计算图表高度
    if (screenWidth < 480) {
        chartHeight = Math.floor(screenWidth * 0.5); // 手机：50%宽度
    } else if (screenWidth < 768) {
        chartHeight = Math.floor(screenWidth * 0.6); // 平板：60%宽度
    } else if (screenWidth < 1024) {
        chartHeight = 400; // 小屏幕：固定400px
    } else {
        chartHeight = 420; // 大屏幕：固定420px
    }

    // 限制最小和最大高度
    chartHeight = Math.min(Math.max(chartHeight, 200), 500);

    // 更新图表容器高度
    const chartIds = ['usage-chart', 'net-chart', 'system-chart', 'cpu-freq-container'];
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
    if (freqChart) freqChart.resize();
}

// 所有图表面板的统一配置。模板按此渲染，保证 data-chart-id / 内容容器 id / 折叠按钮 data-target 三者一致，
// 且折叠行为统一，避免各面板手工 HTML 不一致导致的折叠空隙等问题。
// infoHtml：面板标题下方的说明文字（可含 data-i18n 与具体 span id），无则留空字符串。
// contentHtml：主体内容（图表容器或动态列表容器），其 id 固定为 panel.id。
const CHART_PANELS = [
    {
        id: 'cpu-cores-container',
        titleI18n: 'cpuCoresUsage',
        title: 'CPU核心实时占用',
        infoHtml: '',
        contentHtml: '加载中...'
    },
    {
        id: 'cpu-freq-container',
        titleI18n: 'cpuFreqTrend',
        title: 'CPU频率趋势',
        infoHtml: `
            <p><span data-i18n="cpuCurrentFreq">当前主频</span>: <span id="cpu-freq-current">0 MHz</span></p>
            <p><span data-i18n="cpuMaxFreq">最大主频</span>: <span id="cpu-freq-max">0 MHz</span></p>
            <p><span data-i18n="cpuMinFreq">最小主频</span>: <span id="cpu-freq-min">0 MHz</span></p>
        `,
        contentHtml: ''  // 内部 echarts 容器由 initChart 按 id 初始化
    },
    {
        id: 'disk-container',
        titleI18n: 'diskUsage',
        title: '硬盘占用率',
        infoHtml: '',
        contentHtml: '加载中...'
    },
    {
        id: 'net-chart',
        titleI18n: 'networkTraffic',
        title: '网卡流量监控',
        infoHtml: `
            <p><span data-i18n="uploadSpeed">实时上传速度</span>: <span id="net-upload-speed">0 KB/s</span></p>
            <p><span data-i18n="downloadSpeed">实时下载速度</span>: <span id="net-download-speed">0 KB/s</span></p>
        `,
        contentHtml: ''
    },
    {
        id: 'system-chart',
        titleI18n: 'systemLoad',
        title: '系统负载监控',
        infoHtml: `
            <p><span data-i18n="systemLoad1Min">1分钟系统负载</span>: <span id="system-load">0.00</span></p>
            <p><span data-i18n="processCount">当前进程数</span>: <span id="process-count">0</span></p>
            <p><span data-i18n="cpuTemperature">CPU温度</span>: <span id="cpu-temperature">0°C</span></p>
        `,
        contentHtml: ''
    },
    {
        id: 'usage-chart',
        titleI18n: 'systemResourceTrend',
        title: '系统资源趋势',
        infoHtml: `
            <p><span data-i18n="cpuUsage">CPU占用率</span>: <span id="cpu-usage-current">0%</span></p>
            <p><span data-i18n="memoryUsage">内存占用率</span>: <span id="mem-usage-current">0%</span></p>
            <p><span data-i18n="gpuUsage">GPU占用率</span>: <span id="gpu-usage-current">0%</span></p>
        `,
        contentHtml: ''
    }
];

function createChartPanel(panel) {
    const section = document.createElement('div');
    section.className = 'panel chart-panel';
    section.setAttribute('data-chart-id', panel.id);

    const header = document.createElement('div');
    header.className = 'panel-header';
    const title = document.createElement('h2');
    title.className = 'panel-title';
    title.setAttribute('data-i18n', panel.titleI18n);
    title.textContent = panel.title;
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn chart-toggle-btn';
    toggleBtn.setAttribute('data-target', panel.id);
    toggleBtn.innerHTML = '<span class="toggle-icon">▼</span>';
    header.appendChild(title);
    header.appendChild(toggleBtn);

    const frag = document.createDocumentFragment();
    if (panel.infoHtml) {
        const info = document.createElement('div');
        info.className = 'panel-info';
        info.innerHTML = panel.infoHtml;
        frag.appendChild(info);
    }
    const content = document.createElement('div');
    content.id = panel.id;
    content.className = 'content-slot chart-container';
    if (panel.contentHtml) {
        content.innerHTML = panel.contentHtml;
    }
    frag.appendChild(content);

    section.appendChild(header);
    section.appendChild(frag);
    return section;
}

function renderAllPanels() {
    const root = document.getElementById('charts-root');
    if (!root) return;
    CHART_PANELS.forEach(panel => root.appendChild(createChartPanel(panel)));
    // 面板为动态生成，需在生成后立即翻译其内部 data-i18n（标题、说明文字）
    if (typeof updateAllTranslations === 'function') {
        updateAllTranslations();
    }
}

function initChart() {
    const chartDom = document.getElementById('usage-chart');
    if (chartDom) {
        chart = echarts.init(chartDom);
        const textColor = '#86868b';
        const primaryTextColor = '#1d1d1f';
        const borderColor = '#e6e6e8';
        const bgColor = '#f5f5f7';
        const tooltipBgColor = 'rgba(255, 255, 255, 0.95)';

        chart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: t('cpuMemoryGpuTrend'),
                textStyle: {
                    color: textColor,
                    fontSize: 16,
                    fontWeight: 500
                },
                left: 'center',
                padding: [0, 0, 20, 0]
            },
            tooltip: {
                trigger: 'axis',
                padding: 12,
                backgroundColor: tooltipBgColor,
                borderColor: borderColor,
                borderWidth: 1,
                extraCssText: 'border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);',
                axisPointer: {
                    type: 'line',
                    lineStyle: {
                        color: borderColor,
                        type: 'dashed'
                    }
                },
                textStyle: {
                    color: primaryTextColor,
                    fontSize: 14
                }
            },
            legend: {
                data: [t('cpuUsagePercent'), t('memoryUsagePercent'), t('gpuUsagePercent')],
                textStyle: {
                    color: textColor,
                    fontSize: 14
                },
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
                name: t('time'),
                nameTextStyle: {
                    color: textColor,
                    padding: [0, 0, 10, 0]
                },
                axisLine: {
                    lineStyle: {
                        color: borderColor
                    }
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 12
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: borderColor,
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: 100,
                name: t('usagePercent'),
                nameTextStyle: {
                    color: textColor,
                    padding: [0, 10, 0, 0]
                },
                axisLine: {
                    lineStyle: {
                        color: borderColor
                    }
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 12
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: borderColor,
                        type: 'dashed'
                    }
                }
            },
            series: [{
                    name: t('cpuUsagePercent'),
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: {
                        width: 2
                    },
                    areaStyle: {
                        opacity: 0.1
                    },
                    itemStyle: {
                        color: '#0071e3'
                    }
                },
                {
                    name: t('memoryUsagePercent'),
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: {
                        width: 2
                    },
                    areaStyle: {
                        opacity: 0.1
                    },
                    itemStyle: {
                        color: '#34c759'
                    }
                },
                {
                    name: t('gpuUsagePercent'),
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: {
                        width: 2
                    },
                    areaStyle: {
                        opacity: 0.1
                    },
                    itemStyle: {
                        color: '#ff9500'
                    }
                }
            ]
        });
    }

    const netChartDom = document.getElementById('net-chart');
    if (netChartDom) {
        netChart = echarts.init(netChartDom);
        const textColor = '#86868b';
        const primaryTextColor = '#1d1d1f';
        const borderColor = '#e6e6e8';
        const bgColor = '#f5f5f7';
        const tooltipBgColor = 'rgba(255, 255, 255, 0.95)';

        netChart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: t('networkTrafficTrend'),
                textStyle: {
                    color: textColor,
                    fontSize: 16,
                    fontWeight: 500
                },
                left: 'center',
                padding: [0, 0, 20, 0]
            },
            tooltip: {
                trigger: 'axis',
                padding: 12,
                backgroundColor: tooltipBgColor,
                borderColor: borderColor,
                borderWidth: 1,
                extraCssText: 'border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);',
                axisPointer: {
                    type: 'line',
                    lineStyle: {
                        color: borderColor,
                        type: 'dashed'
                    }
                },
                textStyle: {
                    color: primaryTextColor,
                    fontSize: 14
                }
            },
            legend: {
                data: [t('uploadSpeedLabel'), t('downloadSpeedLabel')],
                textStyle: {
                    color: textColor,
                    fontSize: 14
                },
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
                name: t('time'),
                nameTextStyle: {
                    color: textColor,
                    padding: [0, 0, 10, 0]
                },
                axisLine: {
                    lineStyle: {
                        color: borderColor
                    }
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 12
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: borderColor,
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'value',
                min: 0,
                name: t('speedKb'),
                nameTextStyle: {
                    color: textColor,
                    padding: [0, 10, 0, 0]
                },
                axisLine: {
                    lineStyle: {
                        color: borderColor
                    }
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 12
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: borderColor,
                        type: 'dashed'
                    }
                }
            },
            series: [{
                    name: t('uploadSpeedLabel'),
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: {
                        width: 2
                    },
                    areaStyle: {
                        opacity: 0.1
                    },
                    itemStyle: {
                        color: '#0071e3'
                    }
                },
                {
                    name: t('downloadSpeedLabel'),
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: {
                        width: 2
                    },
                    areaStyle: {
                        opacity: 0.1
                    },
                    itemStyle: {
                        color: '#34c759'
                    }
                }
            ]
        });
    }

    const systemChartDom = document.getElementById('system-chart');
    if (systemChartDom) {
        systemChart = echarts.init(systemChartDom);
        const textColor = '#86868b';
        const primaryTextColor = '#1d1d1f';
        const borderColor = '#e6e6e8';
        const bgColor = '#f5f5f7';
        const tooltipBgColor = 'rgba(255, 255, 255, 0.95)';

        systemChart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: t('systemLoadTrend'),
                textStyle: {
                    color: textColor,
                    fontSize: 16,
                    fontWeight: 500
                },
                left: 'center',
                padding: [0, 0, 20, 0]
            },
            tooltip: {
                trigger: 'axis',
                padding: 12,
                backgroundColor: tooltipBgColor,
                borderColor: borderColor,
                borderWidth: 1,
                extraCssText: 'border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);',
                axisPointer: {
                    type: 'line',
                    lineStyle: {
                        color: borderColor,
                        type: 'dashed'
                    }
                },
                textStyle: {
                    color: primaryTextColor,
                    fontSize: 14
                }
            },
            legend: {
                data: [t('systemLoadLabel'), t('processCountLabel'), t('cpuTempLabel')],
                textStyle: {
                    color: textColor,
                    fontSize: 14
                },
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
                name: t('time'),
                nameTextStyle: {
                    color: textColor,
                    padding: [0, 0, 10, 0]
                },
                axisLine: {
                    lineStyle: {
                        color: borderColor
                    }
                },
                axisLabel: {
                    color: textColor,
                    fontSize: 12
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: borderColor,
                        type: 'dashed'
                    }
                }
            },
            yAxis: [{
                    type: 'value',
                    min: 0,
                    name: t('loadProcess'),
                    nameTextStyle: {
                        color: textColor,
                        padding: [0, 10, 0, 0]
                    },
                    axisLine: {
                        lineStyle: {
                            color: borderColor
                        }
                    },
                    axisLabel: {
                        color: textColor,
                        fontSize: 12
                    },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            color: borderColor,
                            type: 'dashed'
                        }
                    }
                },
                {
                    type: 'value',
                    min: 0,
                    max: 100,
                    name: t('temperatureC'),
                    nameTextStyle: {
                        color: textColor,
                        padding: [0, 10, 0, 0]
                    },
                    axisLine: {
                        lineStyle: {
                            color: borderColor
                        }
                    },
                    axisLabel: {
                        color: textColor,
                        fontSize: 12
                    },
                    splitLine: {
                        show: false
                    }
                }
            ],
            series: [{
                    name: t('systemLoadLabel'),
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: {
                        width: 2
                    },
                    areaStyle: {
                        opacity: 0.1
                    },
                    itemStyle: {
                        color: '#0071e3'
                    }
                },
                {
                    name: t('processCountLabel'),
                    type: 'line',
                    data: [],
                    smooth: true,
                    lineStyle: {
                        width: 2
                    },
                    areaStyle: {
                        opacity: 0.1
                    },
                    itemStyle: {
                        color: '#34c759'
                    }
                },
                {
                    name: t('cpuTempLabel'),
                    type: 'line',
                    yAxisIndex: 1,
                    data: [],
                    smooth: true,
                    lineStyle: {
                        width: 2
                    },
                    areaStyle: {
                        opacity: 0.1
                    },
                    itemStyle: {
                        color: '#ff9500'
                    }
                }
            ]
        });
    }

    // CPU 频率趋势图（总体频率，单位 MHz）
    const freqDom = document.getElementById('cpu-freq-container');
    if (freqDom) {
        const textColor = '#86868b';
        const borderColor = '#e6e6e8';
        freqChart = echarts.init(freqDom);
        freqChart.setOption({
            backgroundColor: 'transparent',
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '8%',
                containLabel: true
            },
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    const p = params[0];
                    return `${formatTime(p.value[0])}<br/>${t('cpuCurrentFreq')}: ${(p.value[1] / 1000).toFixed(2)} GHz`;
                }
            },
            xAxis: {
                type: 'time',
                axisLine: {
                    lineStyle: {
                        color: textColor
                    }
                },
                axisLabel: {
                    color: textColor,
                    formatter: (value) => formatTime(value)
                },
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                name: 'MHz',
                nameTextStyle: {
                    color: textColor
                },
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: textColor
                    }
                },
                axisLabel: {
                    color: textColor,
                    formatter: (value) => (value / 1000).toFixed(1) + 'G'
                },
                splitLine: {
                    lineStyle: {
                        color: borderColor,
                        type: 'dashed'
                    }
                }
            },
            series: [{
                name: t('cpuCurrentFreq'),
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: [],
                lineStyle: {
                    width: 2
                },
                areaStyle: {
                    opacity: 0.1
                },
                itemStyle: {
                    color: '#34c759'
                }
            }]
        });
    }
}

async function checkBackendStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${API_BASE}/health`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.error("后端连接失败:", error);
        // 显示错误提示
        showPrompt(`后端连接失败: ${t('backendError')}`, false);
        return false;
    }
}

async function loadLocalTmpJson() {
    try {
        const response = await fetch(`${API_BASE}/cache`);
        if (!response.ok) throw new Error("缓存接口不可用");

        const cacheData = await response.json();
        renderHardwareInfo(cacheData.hardware_info);
        updateCPUCores(cacheData.real_time_data.cpu_core_usage, cacheData.real_time_data.cpu_core_freq);
        renderDiskUsage(cacheData.disk_usage);

        // 转换时间戳为毫秒（如果需要）
        const rtData = cacheData.real_time_data;
        const chartSeries = ['cpu_usage', 'mem_usage', 'gpu_usage',
            'net_upload_speed', 'net_download_speed',
            'system_load', 'process_count', 'cpu_temperature'
        ];

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
        return true;
    } catch (error) {
        console.error("读取tmp.json失败:", error);
        // 显示错误提示
        showPrompt(`读取tmp.json失败: ${t('readTmpJsonError')}`, false);
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
                updateCPUCores(cacheData.real_time_data.cpu_core_usage, cacheData.real_time_data.cpu_core_freq);
                renderDiskUsage(cacheData.disk_usage);

                // 转换时间戳为毫秒（如果需要）
                const rtData = cacheData.real_time_data;
                const chartSeries = ['cpu_usage', 'mem_usage', 'gpu_usage',
                    'net_upload_speed', 'net_download_speed',
                    'system_load', 'process_count', 'cpu_temperature'
                ];

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
                updateStatusTip(t('usingCache'), "success");
                return true;
            }
        }

        const localCache = localStorage.getItem(LOCAL_CACHE_KEY);
        if (localCache) {
            const cacheData = JSON.parse(localCache);
            renderHardwareInfo(cacheData.hardware_info);
            updateCPUCores(cacheData.real_time_data.cpu_core_usage, cacheData.real_time_data.cpu_core_freq);
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

            updateStatusTip(t('usingLocalCache'), "warning");
            return true;
        }

        return await loadLocalTmpJson();
    } catch (e) {
        console.log(`${t('cacheLoadError')}:`, e);
        updateStatusTip(`${t('cacheLoadError')}`, "success");
        return false;
    }
}

function renderHardwareInfo(data) {
    if (!data) return;
    cachedHardwareInfo = data;
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
            const table = document.createElement('table');
            table.className = 'network-table';
            data.network.forEach(iface => {
                const row = document.createElement('tr');
                row.className = 'network-row';
                const icon = getNetworkIcon(iface.name);
                const type = getNetworkType(iface.name);
                const typeClass = getTypeClass(iface.name);
                row.innerHTML = `<td class="network-icon">${icon}</td><td class="network-name">${iface.name}</td><td class="network-type ${typeClass}"><span>${type}</span></td><td class="network-ips">${iface.addresses.join(', ') || `<span class="no-ip">${t('noIP')}</span>`}</td>`;
                table.appendChild(row);
            });
            netContainer.appendChild(table);
        } else {
            netContainer.innerHTML = `<p>${t('noNetwork')}</p>`;
        }
    }
}

function updateNetworkTypeLabels() {
    if (!cachedHardwareInfo) return;
    const cpuCoresEl = document.getElementById('cpu-cores');
    if (cpuCoresEl) {
        cpuCoresEl.textContent = `${cachedHardwareInfo.cpu?.cores || 0} (${t('physicalCores')}: ${cachedHardwareInfo.cpu?.physical_cores || 0})`;
    }
    const gpuStatusEl = document.getElementById('gpu-status');
    if (gpuStatusEl) {
        gpuStatusEl.textContent = cachedHardwareInfo.gpu?.available ? t('available') : t('unavailable');
    }
    const netContainer = document.getElementById('network-info');
    if (netContainer && cachedHardwareInfo.network && cachedHardwareInfo.network.length > 0) {
        netContainer.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'network-table';
        cachedHardwareInfo.network.forEach(iface => {
            const row = document.createElement('tr');
            row.className = 'network-row';
            const icon = getNetworkIcon(iface.name);
            const type = getNetworkType(iface.name);
            const typeClass = getTypeClass(iface.name);
            row.innerHTML = `<td class="network-icon">${icon}</td><td class="network-name">${iface.name}</td><td class="network-type ${typeClass}"><span>${type}</span></td><td class="network-ips">${iface.addresses.join(', ') || `<span class="no-ip">${t('noIP')}</span>`}</td>`;
            table.appendChild(row);
        });
        netContainer.appendChild(table);
    } else if (netContainer) {
        netContainer.innerHTML = `<p>${t('noNetwork')}</p>`;
    }
}

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
    diskItem.innerHTML = `<h4>${disk.device} (${disk.mountpoint})</h4><div class="disk-info"><span class="disk-percent">${disk.usage_percent.toFixed(1)}%</span><span class="disk-size">${disk.used.toFixed(1)}GB / ${disk.total.toFixed(1)}GB</span></div>`;
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
        diskInfo.innerHTML = `<span class="disk-percent">${disk.usage_percent.toFixed(1)}%</span><span class="disk-size">${disk.used.toFixed(1)}GB / ${disk.total.toFixed(1)}GB</span>`;
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
function handleSnapshot(snapshot) {
    if (!snapshot) return;
    const data = snapshot.real_time_data || {};
    const sampleInterval = getSampleInterval();
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
            series: [{
                data: sampledCpuUsage
            }, {
                data: sampledMemUsage
            }, {
                data: sampledGpuUsage
            }]
        });
    }
    if (netChart) {
        netChart.setOption({
            series: [{
                data: sampledNetUpload
            }, {
                data: sampledNetDownload
            }]
        });
    }
    if (systemChart) {
        systemChart.setOption({
            series: [{
                data: sampledSystemLoad
            }, {
                data: sampledProcessCount
            }, {
                data: sampledCpuTemp
            }]
        });
    }
    const sampledCpuFreq = sampleChartData(data.cpu_freq, sampleInterval);
    if (freqChart) {
        freqChart.setOption({
            series: [{
                data: sampledCpuFreq
            }]
        });
    }
    const cpuUsage = data.cpu_usage?.length > 0 ? data.cpu_usage[data.cpu_usage.length - 1][1] : 0;
    const memUsage = data.mem_usage?.length > 0 ? data.mem_usage[data.mem_usage.length - 1][1] : 0;
    const gpuUsage = data.gpu_usage?.length > 0 ? data.gpu_usage[data.gpu_usage.length - 1][1] : 0;
    const cpuUsageEl = document.getElementById('cpu-usage-current');
    const memUsageEl = document.getElementById('mem-usage-current');
    const gpuUsageEl = document.getElementById('gpu-usage-current');
    if (cpuUsageEl) animateNumber(cpuUsageEl, cpuUsage, true);
    if (memUsageEl) animateNumber(memUsageEl, memUsage, true);
    if (gpuUsageEl) animateNumber(gpuUsageEl, gpuUsage, true);
    updateCPUCores(data.cpu_core_usage, data.cpu_core_freq, true);
    // 总体 CPU 频率文本（current/max/min，单位 MHz）
    const cpuFreqArr = data.cpu_freq || [];
    const cpuFreqLast = cpuFreqArr.length > 0 ? cpuFreqArr[cpuFreqArr.length - 1][1] : 0;
    if (data.cpu_core_freq && data.cpu_core_freq.length > 0) {
        for (const f of data.cpu_core_freq) {
            if (f > cpuFreqMax) cpuFreqMax = f;
            if (cpuFreqMin === 0 || f < cpuFreqMin) cpuFreqMin = f;
        }
    }
    const freqCurEl = document.getElementById('cpu-freq-current');
    if (freqCurEl) freqCurEl.textContent = `${cpuFreqLast} MHz`;
    const freqMaxEl = document.getElementById('cpu-freq-max');
    if (freqMaxEl) freqMaxEl.textContent = `${cpuFreqMax} MHz`;
    const freqMinEl = document.getElementById('cpu-freq-min');
    if (freqMinEl) freqMinEl.textContent = `${cpuFreqMin} MHz`;
    const uploadSpeed = data.net_upload_speed?.length > 0 ? data.net_upload_speed[data.net_upload_speed.length - 1][1] : 0;
    const downloadSpeed = data.net_download_speed?.length > 0 ? data.net_download_speed[data.net_download_speed.length - 1][1] : 0;
    updateNetSpeedDisplay(uploadSpeed, downloadSpeed);
    const systemLoad = data.system_load?.length > 0 ? data.system_load[data.system_load.length - 1][1] : 0;
    const processCount = data.process_count?.length > 0 ? data.process_count[data.process_count.length - 1][1] : 0;
    const cpuTemperature = data.cpu_temperature?.length > 0 ? data.cpu_temperature[data.cpu_temperature.length - 1][1] : 0;
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
    const bootTimeEl = document.getElementById('boot-time-info');
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
        if (battery && battery.percent !== undefined) {
            if (battery.plugged) {
                batteryInfoEl.textContent = `${battery.percent.toFixed(0)}% (${t('batteryCharging')})`;
            } else {
                const secsLeft = battery.secsleft;
                let timeLeft = '';
                if (secsLeft > 0) {
                    const hours = Math.floor(secsLeft / 3600);
                    const minutes = Math.floor((secsLeft % 3600) / 60);
                    timeLeft = `, ${t('estimatedTimeLeft')} ${hours}${t('hours')}${minutes}${t('minutes')}`;
                }
                batteryInfoEl.textContent = `${battery.percent.toFixed(0)}% (${t('batteryUnplugged')}${timeLeft})`;
            }
        } else if (batteryInfoEl) {
            batteryInfoEl.textContent = t('noBattery');
        }
    } else if (batteryInfoEl) {
        batteryInfoEl.textContent = t('noBattery');
    }
    if (snapshot.hardware_info) {
        renderHardwareInfo(snapshot.hardware_info);
    }
    if (snapshot.disk_usage) {
        renderDiskUsage(snapshot.disk_usage);
    }
    updateLocalCacheFromSnapshot(snapshot);
}

function updateLocalCacheFromSnapshot(snapshot) {
    const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
    localCache.hardware_info = snapshot.hardware_info || localCache.hardware_info;
    localCache.real_time_data = snapshot.real_time_data || localCache.real_time_data;
    localCache.disk_usage = snapshot.disk_usage || localCache.disk_usage;
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(localCache));
}

let wsConnection = null;
let wsReconnectTimer = null;
const WS_RECONNECT_DELAY = 3000;

function connectWebSocket() {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }
    if (wsConnection && (wsConnection.readyState === WebSocket.OPEN || wsConnection.readyState === WebSocket.CONNECTING)) {
        return;
    }
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}${API_BASE}/ws`;
    try {
        wsConnection = new WebSocket(wsUrl);
    } catch (e) {
        wsReconnectTimer = setTimeout(connectWebSocket, WS_RECONNECT_DELAY);
        return;
    }
    wsConnection.onopen = () => {
        updateStatusTip(t('connected'), "success");
    };
    wsConnection.onmessage = (event) => {
        try {
            const snapshot = JSON.parse(event.data);
            handleSnapshot(snapshot);
        } catch (e) {
            console.error('解析 WebSocket 数据失败:', e);
        }
    };
    wsConnection.onclose = () => {
        updateStatusTip(t('disconnected'), "warning");
        // 降级到 HTTP /api/data，并安排重连
        fetch(`${API_BASE}/data`)
            .then(r => r.ok ? r.json() : null)
            .then(snapshot => { if (snapshot) handleSnapshot(snapshot); })
            .catch(() => {});
        wsReconnectTimer = setTimeout(connectWebSocket, WS_RECONNECT_DELAY);
    };
    wsConnection.onerror = () => {
        wsConnection.close();
    };
}

function startMonitoring() {
    connectWebSocket();
}

function stopMonitoring() {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }
    if (wsConnection) {
        wsConnection.close();
        wsConnection = null;
    }
}

function updateCPUCores(coreUsages, coreFreqs, withAnimation = false) {
    const container = document.getElementById('cpu-cores-container');
    if (!container) return;
    if (coreUsages && coreUsages.length > 0) {
        cachedCpuCores = [...coreUsages];
    }
    if (!coreUsages || coreUsages.length === 0) {
        container.innerHTML = `<p>${t('noCPUCores')}</p>`;
        cachedCpuCores = [];
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
            const coreFreqEl = document.createElement('div');
            coreFreqEl.className = 'core-freq';
            coreFreqEl.textContent = coreFreqs && coreFreqs[index] !== undefined ? `${(coreFreqs[index] / 1000).toFixed(2)} GHz` : '-';
            coreBox.appendChild(coreNumEl);
            coreBox.appendChild(coreUsageEl);
            coreBox.appendChild(coreFreqEl);
            container.appendChild(coreBox);
        });
    }
    coreUsages.forEach((usage, index) => {
        const coreBox = container.children[index];
        if (!coreBox) return;
        const coreNumEl = coreBox.querySelector('.core-num');
        if (coreNumEl) {
            coreNumEl.textContent = `${t('core')} ${index + 1}`;
        }
        const coreUsageEl = coreBox.querySelector('.core-usage');
        if (coreUsageEl) {
            if (withAnimation) {
                animateNumber(coreUsageEl, usage, true);
            } else {
                coreUsageEl.textContent = `${usage.toFixed(1)}%`;
            }
        }
        const coreFreqEl = coreBox.querySelector('.core-freq');
        if (coreFreqEl && coreFreqs && coreFreqs[index] !== undefined) {
            coreFreqEl.textContent = `${(coreFreqs[index] / 1000).toFixed(2)} GHz`;
        } else if (coreFreqEl) {
            coreFreqEl.textContent = '-';
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
    const backendAvailable = await checkBackendStatus();
    if (backendAvailable) {
        updateStatusTip(t('connected'), "success");
        await loadFromCache();
        startMonitoring();
        if (autoRetryInterval) {
            clearInterval(autoRetryInterval);
            autoRetryInterval = null;
        }
        retryCount = 0;
    } else {
        retryCount++;
        if (retryCount < MAX_RETRY_COUNT) {
            updateStatusTip(t('retryInSeconds', {
                count: MAX_RETRY_COUNT - retryCount
            }), "error");
            setTimeout(retryBackendConnection, 1000);
        } else {
            showPrompt(`最大重试次数已达到: ${t('maxRetriesReachedError')}`, false);
        }
    }
}

function clearAllIntervals() {
    stopMonitoring();
}
async function loadVersionInfo() {
    try {
        const response = await fetch(`${API_BASE}/version`);
        const versionData = await response.json();
        const versionElement = document.getElementById('version-info');
        if (versionElement && versionData.git_commit) {
            versionElement.textContent = `v${versionData.version} (${versionData.git_commit})`;
            versionElement.style.display = 'inline';
        }
    } catch (error) {
        console.log('获取版本信息失败:', error);
    }
}
async function loadAppConfig() {
    try {
        const resp = await fetch(`${API_BASE}/config`);
        if (resp.ok) {
            appConfig = await resp.json();
        }
    } catch (e) {
        console.log('获取 /api/config 失败，使用默认显示配置:', e);
    }
    applyDisplayConfig();
}

function applyDisplayConfig() {
    // 网卡信息面板：隐藏其所在的 .card 容器
    if (appConfig.show_network === false) {
        const netEl = document.getElementById('network-info');
        const netCard = netEl ? netEl.closest('.card') : null;
        if (netCard) netCard.style.display = 'none';
    }
    // 电池状态行
    if (appConfig.show_battery === false) {
        const batteryEl = document.getElementById('battery-info');
        if (batteryEl) batteryEl.style.display = 'none';
    }
}

async function init() {
    initI18n();
    initTheme();
    initHeaderScroll();
    await loadAppConfig();
    loadVersionInfo();
    renderAllPanels();
    initChart();
    adjustChartHeight();
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            adjustChartHeight();
        }, 250);
    });
    initToggleButtons();
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', retryBackendConnection);
    }
    const backendAvailable = await checkBackendStatus();
    if (backendAvailable) {
        updateStatusTip(t('connected'), "success");
        await loadFromCache();
        startMonitoring();
    } else {
        await loadFromCache();
        retryBackendConnection();
    }
    showPrompt(t('loadingData'), true);
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
            textEl.textContent = allChartsCollapsed ? t('expandAll') : t('collapseAll');
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
            ['net-chart', 'system-chart', 'usage-chart', 'cpu-freq-container'].forEach(resizeChart);
        }, 450);
    }
}

function resizeChart(chartId) {
    let chartInstance = null;
    if (chartId === 'usage-chart') chartInstance = chart;
    else if (chartId === 'net-chart') chartInstance = netChart;
    else if (chartId === 'system-chart') chartInstance = systemChart;
    else if (chartId === 'cpu-freq-container') chartInstance = freqChart;
    if (chartInstance) {
        setTimeout(() => {
            chartInstance.resize();
        }, 50);
    }
}
document.addEventListener('DOMContentLoaded', init);