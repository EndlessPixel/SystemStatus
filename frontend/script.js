// 全局变量
const API_BASE = "/api";
const LOCAL_CACHE_KEY = "system_monitor_cache";
const THEME_KEY = "system_monitor_theme";
let chart = null;
let netChart = null;
let systemChart = null;
const ANIMATION_DURATION = 800;
const ANIMATION_FRAME = 16;
let realTimeDataInterval = null;
let diskUsageInterval = null;
let hardwareInfoInterval = null;
const I18N_KEY = "system_monitor_language";
let currentLanguage = 'zh';
let cachedHardwareInfo = null;
let cachedCpuCores = [];
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

    // 直接更新网络类型标签，避免重新发起网络请求
    updateNetworkTypeLabels();
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
            },
            series: [{
                    name: t('cpuUsagePercent')
                },
                {
                    name: t('memoryUsagePercent')
                },
                {
                    name: t('gpuUsagePercent')
                }
            ]
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
    [chart, netChart, systemChart].forEach(chartInstance => {
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
                            color: splitLineColor
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
                            color: splitLineColor
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
                                color: splitLineColor
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
            id: 'boot-time',
            text: `0${t('days')} 0${t('hoursShort')} 0${t('minutesShort')}`
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
        batteryInfoEl.innerHTML = `<span data-i18n="batteryInfo">${t('batteryInfo')}</span>: ${t('noBattery')}`;
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
                        color: bgColor
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
                        color: bgColor
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
                        color: bgColor
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
                        color: bgColor
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
                        color: bgColor
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
                            color: bgColor
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
        // 显示错误提示
        showPrompt(`后端连接失败: ${t('backendError')}`, false);
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
                updateCPUCores(cacheData.real_time_data.cpu_core_usage);
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
        showPrompt(`获取最新硬件信息失败: ${t('getHardwareInfoError')}`, false);
    }
}
async function updateRealTimeData() {
    if (!(await checkBackendStatus())) return;
    try {
        const response = await fetch(`${API_BASE}/real-time-data`);
        const data = await response.json();
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
        console.error(`${t('realTimeErrorError')}:`, error);
        showPrompt(`${t('realTimeErrorError')}`, false);
    }
}

function updateCPUCores(coreUsages, withAnimation = false) {
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
            coreBox.appendChild(coreNumEl);
            coreBox.appendChild(coreUsageEl);
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
        showPrompt(`获取硬盘信息失败: ${t('diskError')}`, false);
        const container = document.getElementById('disk-container');
        if (container) container.innerHTML = `<p>${t('noDisk')}</p>`;
    }
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
async function init() {
    initI18n();
    initTheme();
    initHeaderScroll();
    loadVersionInfo();
    initChart();
    adjustChartHeight();
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            adjustChartHeight();
            updateRealTimeData();
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
        getHardwareInfo();
        updateRealTimeData();
        updateDiskUsage();
        clearAllIntervals();
        realTimeDataInterval = setInterval(updateRealTimeData, 2000);
        diskUsageInterval = setInterval(updateDiskUsage, 10000);
        hardwareInfoInterval = setInterval(getHardwareInfo, 30000);
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