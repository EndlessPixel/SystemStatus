/* SystemStatus 前端 —— 侧边栏 + 实时数据渲染
 * 数据源：后端 WebSocket /api/ws（每秒推送完整快照）
 * 降级：WebSocket 不可用时回退到 /api/data 轮询
 *
 * 渲染策略：每个模块「结构只构建一次」，后续更新只改文本/进度条宽度/图表数据，
 *          避免 innerHTML 全量重建导致 ECharts 实例失效、进度条闪烁。
 */

(function () {
    "use strict";

    /* ============ 多语言 ============ */
    const LANGS = window.LANGUAGES || {};
    const LANG_ORDER = window.LANGUAGE_ORDER || Object.keys(LANGS);

    /* cookie 工具 */
    function getCookie(name) {
        const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
        return m ? decodeURIComponent(m[1]) : null;
    }
    function setCookie(name, value, days = 365) {
        const exp = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${exp};SameSite=Lax`;
    }

    function detectLang() {
        const saved = getCookie("lang");
        if (saved && LANGS[saved]) return saved;     // cookie 优先
        const nav = (navigator.language || "zh-CN").toLowerCase();
        if (LANGS[nav]) return nav;                 // 完整匹配，如 zh-CN / en-US
        const short = nav.split("-")[0];            // 短码回退，如 zh / en
        if (LANGS[short]) return short;
        const prefix = Object.keys(LANGS).find((k) => k.split("-")[0] === short);
        return prefix || "zh-CN";
    }
    let lang = detectLang();
    let T = LANGS[lang] || {};
    // web_ui 标题自定义配置（来自 /api/config），默认无覆盖
    let webUiCfg = { page_title: { enable: false, lang: {} }, web_title: { enable: false, lang: {} } };
    const t = (key, fallback) => (T[key] !== undefined ? T[key] : (fallback !== undefined ? fallback : key));

    /* CSS 变量实际计算值（供 ECharts canvas 使用，var() 在 canvas 中不生效） */
    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
    }

    /* ============ 工具函数 ============ */
    const $ = (sel, root = document) => root.querySelector(sel);
    const el = (tag, cls, html) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    };
    const esc = (s) => (s == null ? "—" : String(s));
    const fmtUptime = (bootTime) => {
        if (!bootTime) return "—";
        const s = Math.floor(Date.now() / 1000 - bootTime);
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${d}${t("day", "天")} ${h}${t("hour", "时")} ${m}${t("min", "分")}`;
    };
    const colorByPct = (p) =>
        p >= 85 ? "var(--color-red)" : p >= 60 ? "var(--color-orange)" : "var(--color-green)";

    function card(titleI18n) {
        const c = el("div", "card");
        const title = el("div", "card-title", t(titleI18n, titleI18n));
        if (titleI18n) title.setAttribute("data-i18n", titleI18n);
        c.appendChild(title);
        return c;
    }
    // 折叠/展开「每核占用」「每核频率」两张卡片（数量对不上时默认收起）
    const _coreCardsCollapsed = { state: false };
    function setCoreCardsCollapsed(collapsed, hint) {
        const cardA = $("#card-cpu-cores"), cardB = $("#card-cpu-core-freq");
        const hintEl = $("#cpu-cores-hint");
        if (!cardA || !cardB) return;
        _coreCardsCollapsed.state = collapsed;
        [cardA, cardB].forEach((cardEl) => {
            cardEl.classList.toggle("collapsed", collapsed);
            const title = cardEl.querySelector(".card-title");
            if (title) title.classList.toggle("collapsible", collapsed);
        });
        if (hintEl) {
            hintEl.textContent = hint || "";
            hintEl.classList.toggle("hidden", !hint);
        }
    }
    function toggleCoreCards() {
        const cardA = $("#card-cpu-cores");
        if (!cardA) return;
        setCoreCardsCollapsed(!cardA.classList.contains("collapsed"), "");
    }
    function metricRow(parent, labelI18n, valueId, unit) {
        const row = el("div", "flex items-baseline justify-between py-1.5");
        row.appendChild(el("span", "metric-label", t(labelI18n, labelI18n)));
        const right = el("span");
        const val = el("span", "metric-value");
        val.style.fontSize = "20px";
        if (valueId) val.id = valueId;
        val.textContent = "—";
        right.appendChild(val);
        if (unit) right.appendChild(el("span", "metric-unit", unit));
        row.appendChild(right);
        parent.appendChild(row);
        return val;
    }
    function setBar(fillEl, pct) {
        const p = Math.max(0, Math.min(100, Number(pct) || 0));
        fillEl.style.width = p + "%";
        fillEl.style.background = colorByPct(p);
    }

    /* ============ ECharts 折线图 ============ */
    const charts = {};
    function ensureChart(domId) {
        const dom = document.getElementById(domId);
        if (!dom) return null;
        if (charts[domId]) return charts[domId];
        // 容器不可见（display:none）时 clientWidth/Height 为 0，
        // 此时不初始化，交由「模块激活」时再 init，避免零尺寸实例。
        if (!dom.clientWidth || !dom.clientHeight) return null;
        charts[domId] = echarts.init(dom);
        return charts[domId];
    }
    function lineOption(series, color, unit) {
        const area = color.replace("rgb(", "rgba(").replace(")", ",.18)");
        return {
            grid: { left: 44, right: 16, top: 18, bottom: 24 },
            tooltip: { trigger: "axis" },
            xAxis: { type: "time", axisLine: { show: false }, axisTick: { show: false },
                axisLabel: { color: cssVar("--color-faint"), fontSize: 11 } },
            yAxis: { type: "value", max: (v) => Math.max(100, Math.ceil(v.max / 100) * 100),
                axisLabel: { color: cssVar("--color-faint"), fontSize: 11, formatter: "{value}" + (unit || "") },
                splitLine: { lineStyle: { color: "rgba(128,128,128,.12)" } } },
            series: [{
                type: "line", showSymbol: false, smooth: true, data: series,
                lineStyle: { width: 2, color },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: area }, { offset: 1, color: "rgba(0,0,0,0)" },
                ]) },
            }],
        };
    }

    /* ============ 模块构建（仅一次） ============ */
    const refs = {}; // 保存需要更新的 DOM 引用

    function buildBasic() {
        const sec = $("#sec-basic");
        sec.innerHTML = "";
        const grid = el("div", "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5");
        // 概览
        const ov = card("navBasic");
        refs.bCpu = metricRow(ov, "cpu", "b-cpu", "");
        refs.bCore = metricRow(ov, "core", "b-core", "");
        refs.bMem = metricRow(ov, "memory", "b-mem", "GB");
        const gpuLine = el("div", "mt-3 text-[13px] text-[var(--color-subtle)]");
        gpuLine.innerHTML = `${t("gpu", "显卡")}: <span class="font-medium" id="b-gpu">—</span>`;
        const netLine = el("div", "text-[13px] text-[var(--color-subtle)]");
        netLine.innerHTML = `${t("network", "网卡")}: <span class="font-medium" id="b-net">—</span>`;
        ov.appendChild(gpuLine); ov.appendChild(netLine);
        grid.appendChild(ov);
        // 运行时间
        const up = card("uptime");
        refs.bUptime = metricRow(up, "bootTime", "b-uptime", "");
        const loadLine = el("div", "mt-3 text-[13px] text-[var(--color-faint)]");
        loadLine.innerHTML = `${t("sysLoad", "系统负载")}: <span class="font-medium text-[var(--color-ink)]" id="b-load">—</span>`;
        const procLine = el("div", "text-[13px] text-[var(--color-faint)]");
        procLine.innerHTML = `${t("procCount", "进程数")}: <span class="font-medium text-[var(--color-ink)]" id="b-proc">—</span>`;
        up.appendChild(loadLine); up.appendChild(procLine);
        grid.appendChild(up);
        // 系统信息
        const sys = card("sysInfo");
        refs.bOs = metricRow(sys, "sysOs", "b-os", "");
        refs.bArch = metricRow(sys, "sysArch", "b-arch", "");
        refs.bLang = metricRow(sys, "sysLang", "b-lang", "");
        refs.bBoot = metricRow(sys, "bootTime", "b-sysboot", "");
        grid.appendChild(sys);
        // 内存型号
        const mm = card("memModel");
        refs.bMemModel = metricRow(mm, "model", "b-memmodel", "");
        refs.bMemFreq = metricRow(mm, "freq", "b-memfreq", "MHz");
        grid.appendChild(mm);
        sec.appendChild(grid);
    }

    function buildCpu() {
        const sec = $("#sec-cpu");
        sec.innerHTML = "";
        const grid = el("div", "grid grid-cols-1 xl:grid-cols-2 gap-5");
        // 整体占用 + 图表
        const big = card("cpuUsage");
        const head = el("div", "flex items-end gap-2 mb-2");
        const v = el("span", "metric-value"); v.id = "cpu-val"; v.textContent = "0";
        head.appendChild(v); head.appendChild(el("span", "metric-unit", "%"));
        big.appendChild(head);
        const track = el("div", "bar-track mt-2"); const fill = el("div", "bar-fill"); track.appendChild(fill);
        refs.cpuFill = fill; big.appendChild(track);
        const chart = el("div"); chart.id = "cpu-chart"; chart.style.cssText = "height:200px;margin-top:14px";
        big.appendChild(chart);
        grid.appendChild(big);
        // 频率 + 图表
        const freq = card("cpuFreq");
        const fhead = el("div", "flex items-end gap-2 mb-2");
        const fv = el("span", "metric-value"); fv.id = "cpu-freq-val"; fv.textContent = "0";
        fhead.appendChild(fv); fhead.appendChild(el("span", "metric-unit", "MHz"));
        freq.appendChild(fhead);
        const fchart = el("div"); fchart.id = "cpu-freq-chart"; fchart.style.cssText = "height:200px;margin-top:10px";
        freq.appendChild(fchart);
        grid.appendChild(freq);
        // 每核使用率（整行）
        const core = card("perCore");
        core.className += " xl:col-span-2";
        core.id = "card-cpu-cores";
        const cw = el("div", "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-2"); cw.id = "cpu-cores";
        core.appendChild(cw); refs.cpuCores = cw;
        const coreHint = el("div", "cpu-core-hint hidden"); coreHint.id = "cpu-cores-hint";
        core.appendChild(coreHint);
        grid.appendChild(core);
        core.querySelector(".card-title").addEventListener("click", () => toggleCoreCards());
        // 每核频率（整行）
        const coreFreq = card("perCoreFreq");
        coreFreq.className += " xl:col-span-2";
        coreFreq.id = "card-cpu-core-freq";
        const cfw = el("div", "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-2"); cfw.id = "cpu-core-freqs";
        coreFreq.appendChild(cfw); refs.cpuCoreFreqs = cfw;
        grid.appendChild(coreFreq);
        sec.appendChild(grid);
    }

    function buildMemory() {
        const sec = $("#sec-memory");
        sec.innerHTML = "";
        const grid = el("div", "grid grid-cols-1 xl:grid-cols-2 gap-5");
        const usage = card("memUsage");
        const head = el("div", "flex items-end gap-2 mb-1");
        refs.memUsed = el("span", "metric-value"); refs.memUsed.textContent = "0";
        head.appendChild(refs.memUsed); head.appendChild(el("span", "metric-unit", "/ 0 GB"));
        usage.appendChild(head);
        const pctTxt = el("div", "text-[13px] text-[var(--color-faint)] mb-1");
        pctTxt.id = "mem-pct"; pctTxt.textContent = "0%";
        usage.appendChild(pctTxt);
        const track = el("div", "bar-track mt-2"); const fill = el("div", "bar-fill"); track.appendChild(fill);
        refs.memFill = fill; usage.appendChild(track);
        const chart = el("div"); chart.id = "mem-chart"; chart.style.cssText = "height:200px;margin-top:14px";
        usage.appendChild(chart);
        grid.appendChild(usage);

        const detail = card("memDetail");
        refs.memTotal = metricRow(detail, "total", "mem-total", "GB");
        refs.memUsedD = metricRow(detail, "used", "mem-used", "GB");
        refs.memFree = metricRow(detail, "free", "mem-free", "GB");
        refs.memModel = metricRow(detail, "model", "mem-model", "");
        refs.memFreq = metricRow(detail, "freq", "mem-freq", "MHz");
        grid.appendChild(detail);

        // 交换分区 / 页面文件（整行）
        const swap = card("swap");
        swap.className += " xl:col-span-2";
        const shead = el("div", "flex items-end gap-2 mb-1");
        refs.swapUsed = el("span", "metric-value"); refs.swapUsed.textContent = "0";
        shead.appendChild(refs.swapUsed); shead.appendChild(el("span", "metric-unit", "/ 0 GB"));
        swap.appendChild(shead);
        const spct = el("div", "text-[13px] text-[var(--color-faint)] mb-1"); spct.id = "swap-pct"; spct.textContent = "0%";
        swap.appendChild(spct);
        const strack = el("div", "bar-track mt-2"); const sfill = el("div", "bar-fill"); strack.appendChild(sfill);
        refs.swapFill = sfill; swap.appendChild(strack);
        const sgrid = el("div", "grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3 text-[13px]");
        sgrid.id = "swap-detail"; swap.appendChild(sgrid);
        refs.swapDetail = sgrid;
        grid.appendChild(swap);
        sec.appendChild(grid);
    }

    function buildDisk() {
        const sec = $("#sec-disk");
        sec.innerHTML = "";
        refs.diskGrid = el("div", "grid grid-cols-1 xl:grid-cols-2 gap-5");
        sec.appendChild(refs.diskGrid);
        refs.diskCards = {};  // physical_disk -> {card, parts, fills, chartId}
    }

    function buildGpu() {
        const sec = $("#sec-gpu");
        sec.innerHTML = "";
        const grid = el("div", "grid grid-cols-1 xl:grid-cols-2 gap-5");
        const g = card("gpu");
        refs.gpuModel = metricRow(g, "model", "gpu-model", "");
        refs.gpuUsage = metricRow(g, "usage", "gpu-usage", "%");
        refs.gpuTemp = metricRow(g, "temp", "gpu-temp", "°C");
        refs.gpuFreq = metricRow(g, "freq", "gpu-freq", "MHz");
        // GPU 使用率历史图
        const gchart = el("div"); gchart.id = "gpu-chart"; gchart.style.cssText = "height:160px;margin-top:12px";
        g.appendChild(gchart);
        grid.appendChild(g);
        const gm = card("gpuMem");
        refs.gpuMemTotal = metricRow(gm, "memTotal", "gpu-memtotal", "MB");
        refs.gpuMemUsed = metricRow(gm, "memUsed", "gpu-memused", "MB");
        refs.gpuPower = metricRow(gm, "power", "gpu-power", "W");
        refs.gpuPowerLimit = metricRow(gm, "powerLimit", "gpu-powerlimit", "W");
        grid.appendChild(gm);
        sec.appendChild(grid);
        // 左下角说明：很多信息无法获取的原因
        refs.gpuHint = el("div", "mt-4 text-[13px] leading-relaxed text-[var(--color-faint)] rounded-xl "
            + "bg-[var(--color-hover)] px-4 py-3");
        refs.gpuHint.innerHTML = `💡 ${t("gpuHint", "为什么很多信息无法获取？部分硬件数据依赖底层命令或驱动：")}<br>`
            + `<span class="text-[var(--color-subtle)]">• ${t("gpuHintIntel", "Intel 核显使用率/频率/功耗：需 root 权限并安装 intel-gpu-tools（intel_gpu_top），请用 sudo 运行本程序")}</span><br>`
            + `<span class="text-[var(--color-subtle)]">• ${t("gpuHintNvidia", "NVIDIA 显存/温度/功耗：需安装 nvidia-ml-py（NVML）")}</span><br>`
            + `<span class="text-[var(--color-subtle)]">• ${t("gpuHintReadme", "更多权限与依赖说明请对照 README「Linux 权限说明」章节")}</span>`;
        sec.appendChild(refs.gpuHint);
        refs.gpuEmpty = el("div", "text-[var(--color-faint)] text-[14px]");
        refs.gpuEmpty.textContent = t("noGpu", "未检测到可用的独立显卡（或驱动未安装）");
    }

    function buildNetwork() {
        const sec = $("#sec-network");
        sec.innerHTML = "";
        const grid = el("div", "grid grid-cols-1 xl:grid-cols-2 gap-5");
        // 整体流量
        const traffic = card("traffic");
        const head = el("div", "grid grid-cols-2 gap-4 mb-2");
        const down = el("div");
        down.innerHTML = `<div class="text-[12px] text-[var(--color-faint)] mb-1">↓ ${t("download", "下载")}</div>
            <div class="flex items-end gap-1"><span class="metric-value" id="net-down" style="font-size:24px">0</span><span class="metric-unit">KB/s</span></div>`;
        const up = el("div");
        up.innerHTML = `<div class="text-[12px] text-[var(--color-faint)] mb-1">↑ ${t("upload", "上传")}</div>
            <div class="flex items-end gap-1"><span class="metric-value" id="net-up" style="font-size:24px">0</span><span class="metric-unit">KB/s</span></div>`;
        head.appendChild(down); head.appendChild(up);
        traffic.appendChild(head);
        const chart = el("div"); chart.id = "net-chart"; chart.style.cssText = "height:200px";
        traffic.appendChild(chart);
        grid.appendChild(traffic);

        // 各网卡实时上传/下载
        const iface = card("interfaces");
        refs.netList = el("div", "flex flex-col gap-1");
        iface.appendChild(refs.netList);
        grid.appendChild(iface);
        sec.appendChild(grid);

        // 选中网卡的上下行曲线（整行）
        const nicCard = card("nicTraffic");
        nicCard.className += " xl:col-span-2";
        refs.nicSelected = el("div", "text-[12px] text-[var(--color-faint)] mb-1");
        nicCard.appendChild(refs.nicSelected);
        const nicChart = el("div"); nicChart.id = "net-nic-chart"; nicChart.style.cssText = "height:200px";
        nicCard.appendChild(nicChart);
        grid.appendChild(nicCard);
        refs.netSelectedNic = null;
    }

    function buildProcess() {
        const sec = $("#sec-process");
        sec.innerHTML = "";
        const c = card("navProcess");
        const hint = el("div", "text-[12px] text-[var(--color-faint)] mb-3", t("processHint", "按 CPU 占用降序，仅显示前 20 个（只读）"));
        c.appendChild(hint);
        const wrap = el("div", "overflow-x-auto");
        const table = el("table", "w-full text-[13px] border-collapse");
        table.innerHTML = `<thead>
            <tr class="text-[var(--color-faint)] text-left" style="border-bottom:1px solid var(--color-border)">
                <th class="py-2 pr-3 font-medium">PID</th>
                <th class="py-2 pr-3 font-medium">${t("procName", "进程名")}</th>
                <th class="py-2 pr-3 font-medium text-right">CPU</th>
                <th class="py-2 pr-3 font-medium text-right">MEM</th>
                <th class="py-2 pr-3 font-medium text-right">DISK ↓↑</th>
                <th class="py-2 pr-3 font-medium text-right">${t("procNet", "网络 ↓↑")}</th>
                <th class="py-2 pr-3 font-medium text-right">GPU</th>
            </tr>
        </thead>`;
        refs.procBody = el("tbody");
        table.appendChild(refs.procBody);
        wrap.appendChild(table);
        c.appendChild(wrap);
        sec.appendChild(c);
    }

    function updateProcess(snap) {
        const list = snap.real_time_data.processes || snap.processes || [];
        if (!refs.procBody) return;
        if (!list.length) {
            refs.procBody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-[var(--color-faint)]">—</td></tr>`;
            return;
        }
        // 仅在数量变化时全量重建，避免每秒重排抖动
        if (refs.procBody.childElementCount !== list.length) {
            refs.procBody.innerHTML = "";
            list.forEach(() => {
                const tr = el("tr");
                tr.style.borderBottom = "1px solid var(--color-border)";
                tr.innerHTML = `<td class="py-1.5 pr-3 font-mono text-[12px] text-[var(--color-subtle)] proc-pid"></td>
                    <td class="py-1.5 pr-3 proc-name" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></td>
                    <td class="py-1.5 pr-3 text-right proc-cpu font-medium"></td>
                    <td class="py-1.5 pr-3 text-right proc-mem"></td>
                    <td class="py-1.5 pr-3 text-right proc-disk text-[12px] text-[var(--color-subtle)]"></td>
                    <td class="py-1.5 pr-3 text-right proc-net text-[12px] text-[var(--color-subtle)]"></td>
                    <td class="py-1.5 pr-3 text-right proc-gpu"></td>`;
                refs.procBody.appendChild(tr);
            });
        }
        list.forEach((p, i) => {
            const tr = refs.procBody.children[i];
            if (!tr) return;
            tr.querySelector(".proc-pid").textContent = p.pid;
            tr.querySelector(".proc-name").textContent = p.name;
            tr.querySelector(".proc-name").title = p.name;
            const cpu = tr.querySelector(".proc-cpu"); cpu.textContent = p.cpu + "%"; cpu.style.color = colorByPct(p.cpu);
            tr.querySelector(".proc-mem").textContent = p.mem + "%";
            tr.querySelector(".proc-disk").textContent = `${p.disk_read} / ${p.disk_write} KB/s`;
            tr.querySelector(".proc-net").textContent = `${p.net_down} / ${p.net_up} KB/s`;
            const gpu = tr.querySelector(".proc-gpu");
            gpu.textContent = p.gpu ? p.gpu + " MB" : "—";
            gpu.style.color = p.gpu ? "var(--color-orange)" : "var(--color-faint)";
        });
    }

    /* ============ 模块更新（每次快照） ============ */
    function updateBasic(snap) {
        const hw = snap.hardware_info || {};
        const rt = snap.real_time_data || {};
        const cpu = hw.cpu || {}, mem = hw.memory || {}, net = hw.network || [], gpu = hw.gpu || {};
        refs.bCpu.textContent = esc(cpu.model);
        refs.bCore.textContent = `${cpu.cores || 0} / ${cpu.physical_cores || 0}`;
        refs.bMem.textContent = mem.total != null ? mem.total : "—";
        $("#b-gpu").textContent = esc(gpu.model);
        $("#b-net").textContent = net.map((n) => n.name).join(", ") || "—";
        refs.bUptime.textContent = fmtUptime(rt.boot_time);
        const load = (rt.system_load || []).slice(-1)[0]?.[1];
        $("#b-load").textContent = load != null ? load : "—";
        const proc = (rt.process_count || []).slice(-1)[0]?.[1];
        $("#b-proc").textContent = proc != null ? proc : "—";
        refs.bMemModel.textContent = esc(mem.model);
        refs.bMemFreq.textContent = mem.mem_frequency != null ? mem.mem_frequency : "—";
        const sysinfo = hw.system || {};
        refs.bOs.textContent = esc(sysinfo.os);
        refs.bArch.textContent = esc(sysinfo.arch);
        refs.bLang.textContent = esc(sysinfo.lang);
        refs.bBoot.textContent = fmtUptime(sysinfo.boot_time);
    }

    function updateCpu(snap) {
        const rt = snap.real_time_data || {};
        const usage = rt.cpu_usage || [];
        const last = usage.length ? usage[usage.length - 1][1] : 0;
        $("#cpu-val").textContent = Number(last).toFixed(1);
        setBar(refs.cpuFill, last);

        const cores = rt.cpu_core_usage || [];
        if (cores.length !== refs.cpuCores.childElementCount) {
            refs.cpuCores.innerHTML = "";
            refs.coreFills = [];
            cores.forEach((u, i) => {
                const row = el("div");
                row.innerHTML = `<div class="flex justify-between text-[12px] mb-1">
                    <span class="text-[var(--color-subtle)]">#${i}</span>
                    <span class="font-medium core-val">${Math.round(u)}%</span></div>`;
                const track = el("div", "bar-track"); const fill = el("div", "bar-fill");
                track.appendChild(fill); row.appendChild(track);
                refs.cpuCores.appendChild(row);
                refs.coreFills.push({ fill, val: row.querySelector(".core-val") });
            });
        }
        cores.forEach((u, i) => {
            if (refs.coreFills[i]) { setBar(refs.coreFills[i].fill, u); refs.coreFills[i].val.textContent = Math.round(u) + "%"; }
        });

        // 每核频率（只渲染实际读到的，不强行扩展到与占用核心数一致，
        // 否则虚拟化环境里会多出大量「—」）。
        const coreFreqs = rt.cpu_core_freq || [];
        if (coreFreqs.length !== refs.cpuCoreFreqs.childElementCount) {
            refs.cpuCoreFreqs.innerHTML = "";
            refs.coreFreqVals = [];
            coreFreqs.forEach((_, i) => {
                const row = el("div");
                row.innerHTML = `<div class="flex justify-between text-[12px] mb-1">
                    <span class="text-[var(--color-subtle)]">#${i}</span>
                    <span class="font-medium core-freq-val">—</span></div>`;
                refs.cpuCoreFreqs.appendChild(row);
                refs.coreFreqVals.push(row.querySelector(".core-freq-val"));
            });
        }
        coreFreqs.forEach((v, i) => {
            if (refs.coreFreqVals[i]) {
                refs.coreFreqVals[i].textContent = v != null ? Math.round(v) + " MHz" : "—";
            }
        });

        // 折叠/提示策略：
        //  - 完全读不到频率（cpu_core_freq_available=false）→ 折叠两块并提示
        //  - 读到了但数量与占用核心不一致（QEMU/LXC 常见）→ 不折叠，仅附简短说明
        const freqAvailable = rt.cpu_core_freq_available !== false;
        const consistent = rt.cpu_cores_consistent !== false;
        if (!freqAvailable) {
            setCoreCardsCollapsed(true, t("coreFreqNone", "无法读取每核心频率，已默认收起"));
        } else if (!consistent) {
            setCoreCardsCollapsed(false, t("coreFreqPartial",
                "仅检测到 {n} 个核心频率，无法与 {m} 个占用核心一一对应")
                .replace("{n}", coreFreqs.length).replace("{m}", cores.length));
        } else {
            setCoreCardsCollapsed(false, "");
        }

        const freq = rt.cpu_freq || [];
        const fLast = freq.length ? freq[freq.length - 1][1] : 0;
        $("#cpu-freq-val").textContent = Math.round(fLast);
        renderCpuCharts(snap);
    }
    function renderCpuCharts(snap) {
        const rt = (snap || lastSnap || {}).real_time_data || {};
        const usage = rt.cpu_usage || [];
        const freq = rt.cpu_freq || [];
        const ch = ensureChart("cpu-chart");
        if (ch) ch.setOption(lineOption(usage, "rgb(0,113,227)", "%"));
        const fh = ensureChart("cpu-freq-chart");
        if (fh) fh.setOption(lineOption(freq, "rgb(52,199,89)", ""));
    }

    function updateMemory(snap) {
        const rt = snap.real_time_data || {};
        const mem = (snap.hardware_info || {}).memory || {};
        const usage = rt.mem_usage || [];
        const last = usage.length ? usage[usage.length - 1][1] : 0;
        const totalGb = mem.total || 0;
        const usedGb = (totalGb * last) / 100;
        refs.memUsed.textContent = usedGb.toFixed(1);
        refs.memUsed.nextSibling.textContent = "/ " + totalGb + " GB";
        $("#mem-pct").textContent = Number(last).toFixed(1) + "%";
        setBar(refs.memFill, last);
        refs.memTotal.textContent = totalGb;
        refs.memUsedD.textContent = usedGb.toFixed(1);
        refs.memFree.textContent = (totalGb - usedGb).toFixed(1);
        refs.memModel.textContent = esc(mem.model);
        refs.memFreq.textContent = mem.mem_frequency != null ? mem.mem_frequency : "—";

        // 交换分区 / 页面文件
        const swap = (snap.hardware_info || {}).swap || {};
        const swapTotal = swap.total || 0;
        const swapUsed = swap.used || 0;
        const swapPct = swap.percent || (swapTotal ? (swapUsed / swapTotal * 100) : 0);
        if (swapTotal > 0) {
            refs.swapUsed.textContent = swapUsed.toFixed(1);
            refs.swapUsed.nextSibling.textContent = "/ " + swapTotal + " GB";
            $("#swap-pct").textContent = Number(swapPct).toFixed(1) + "%";
            setBar(refs.swapFill, swapPct);
            let html = `<div><span class="text-[var(--color-subtle)]">${t("swapFree", "空闲")}:</span> <span class="font-medium">${(swap.free || 0).toFixed(1)} GB</span></div>`;
            html += `<div><span class="text-[var(--color-subtle)]">${t("swapSin", "换入")}:</span> <span class="font-medium">${(swap.sin || 0).toFixed(2)} GB</span></div>`;
            html += `<div><span class="text-[var(--color-subtle)]">${t("swapSout", "换出")}:</span> <span class="font-medium">${(swap.sout || 0).toFixed(2)} GB</span></div>`;
            const pfs = swap.pagefiles || [];
            if (pfs.length) {
                pfs.forEach((pf, i) => {
                    const size = pf.system_managed ? t("swapAuto", "系统托管") :
                        `${pf.initial_size_mb}~${pf.maximum_size_mb} MB`;
                    html += `<div class="col-span-2 sm:col-span-3"><span class="text-[var(--color-subtle)]">${esc(pf.name)}:</span> <span class="font-medium">${size}</span></div>`;
                });
            }
            refs.swapDetail.innerHTML = html;
        } else {
            refs.swapUsed.textContent = "0";
            refs.swapUsed.nextSibling.textContent = "/ 0 GB";
            $("#swap-pct").textContent = "—";
            setBar(refs.swapFill, 0);
            refs.swapDetail.innerHTML = `<div class="col-span-2 sm:col-span-3 text-[var(--color-faint)]">${t("swapNone", "未检测到交换分区 / 页面文件")}</div>`;
        }

        renderMemCharts(snap);
    }
    function renderMemCharts(snap) {
        const usage = ((snap || lastSnap || {}).real_time_data || {}).mem_usage || [];
        const ch = ensureChart("mem-chart");
        if (ch) ch.setOption(lineOption(usage, "rgb(255,159,10)", "%"));
    }

    function updateDisk(snap) {
        const hw = snap.hardware_info || {};
        const disks = snap.disk_usage || hw.disks || [];
        const physicalDisks = hw.physical_disks || [];
        if (!disks.length) {
            refs.diskGrid.innerHTML = `<div class="card"><div class="text-[var(--color-faint)] text-[14px]">—</div></div>`;
            return;
        }
        // 按物理磁盘聚合分区
        const byDisk = {};
        disks.forEach((d) => {
            const pd = d.physical_disk || d.device;
            (byDisk[pd] = byDisk[pd] || []).push(d);
        });
        const pdList = physicalDisks.length ? physicalDisks : Object.keys(byDisk);

        // 仅在物理磁盘集合变化时重建卡片
        const curKeys = Object.keys(refs.diskCards);
        if (curKeys.length !== pdList.length || pdList.some((k) => !refs.diskCards[k])) {
            refs.diskGrid.innerHTML = "";
            refs.diskCards = {};
            pdList.forEach((pd) => {
                const parts = byDisk[pd] || [];
                const c = el("div", "card");
                const head = el("div", "flex items-baseline justify-between mb-2");
                const total = parts.reduce((s, p) => s + (p.total || 0), 0);
                head.innerHTML = `<span class="font-medium text-[15px]">${esc(pd)}</span>
                    <span class="text-[12px] text-[var(--color-faint)]">${t("diskTotal", "合计")} ${total.toFixed(1)} GB · ${parts.length} ${t("partitions", "分区")}</span>`;
                c.appendChild(head);
                // 分区列表
                const plist = el("div", "flex flex-col gap-2 mb-2");
                const fills = [];
                parts.forEach((p) => {
                    const row = el("div");
                    row.innerHTML = `<div class="flex items-baseline justify-between text-[13px] mb-1">
                        <span class="font-medium">${esc(p.device)}</span>
                        <span class="text-[12px] text-[var(--color-faint)]">${esc(p.fstype)} · ${esc(p.mountpoint)}</span>
                        <span class="text-[12px] text-[var(--color-subtle)]">${p.used}/${p.total} GB</span>
                        <span class="disk-pct font-medium ml-2" style="min-width:42px;text-align:right">0%</span></div>`;
                    const track = el("div", "bar-track"); const fill = el("div", "bar-fill"); track.appendChild(fill);
                    row.appendChild(track);
                    plist.appendChild(row);
                    fills.push({ fill, pct: row.querySelector(".disk-pct"), data: p });
                });
                c.appendChild(plist);
                // IO 图表（读写 + 等待）
                const chart = el("div"); const chartId = "disk-io-" + pd.replace(/[^a-zA-Z0-9]/g, "_");
                chart.id = chartId; chart.style.cssText = "height:180px;margin-top:8px";
                c.appendChild(chart);
                refs.diskGrid.appendChild(c);
                refs.diskCards[pd] = { card: c, parts: plist, fills, chartId, total };
            });
        }
        // 增量更新分区使用率
        pdList.forEach((pd) => {
            const ref = refs.diskCards[pd];
            if (!ref) return;
            ref.fills.forEach((f) => {
                const pct = f.data.usage_percent ?? 0;
                setBar(f.fill, pct);
                f.pct.textContent = pct + "%";
                f.pct.style.color = colorByPct(pct);
            });
        });
        renderDiskCharts(snap);
    }

    function renderDiskCharts(snap) {
        const diskIo = (snap || lastSnap || {}).real_time_data || {};
        const io = diskIo.disk_io || {};
        Object.keys(refs.diskCards || {}).forEach((pd) => {
            const ref = refs.diskCards[pd];
            const series = io[pd];
            const ch = ensureChart(ref.chartId);
            if (!ch) return;  // 容器隐藏或零尺寸时跳过，待激活时渲染
            if (!series) {
                ch.clear(); return;
            }
            const option = {
                grid: { left: 48, right: 48, top: 30, bottom: 24 },
                tooltip: { trigger: "axis" },
                legend: {
                    data: [t("read", "读取"), t("write", "写入"), t("ioWait", "等待")],
                    textStyle: { color: cssVar("--color-subtle"), fontSize: 11 },
                    top: 0
                },
                xAxis: { type: "time", axisLabel: { color: cssVar("--color-faint"), fontSize: 10 }, axisLine: { lineStyle: { color: cssVar("--color-border") } } },
                yAxis: [
                    { type: "value", name: "KB/s", nameTextStyle: { color: cssVar("--color-faint"), fontSize: 10 },
                      axisLabel: { color: cssVar("--color-faint"), fontSize: 10 }, splitLine: { lineStyle: { color: cssVar("--color-border") } } },
                    { type: "value", name: "%", min: 0, max: 100, position: "right",
                      axisLabel: { color: cssVar("--color-faint"), fontSize: 10 }, splitLine: { show: false } }
                ],
                series: [
                    { name: t("read", "读取"), type: "line", showSymbol: false, smooth: true, yAxisIndex: 0,
                      lineStyle: { width: 1.5, color: "rgb(10,132,255)" }, itemStyle: { color: "rgb(10,132,255)" },
                      areaStyle: { color: "rgba(10,132,255,0.12)" }, data: series.read || [] },
                    { name: t("write", "写入"), type: "line", showSymbol: false, smooth: true, yAxisIndex: 0,
                      lineStyle: { width: 1.5, color: "rgb(255,59,48)" }, itemStyle: { color: "rgb(255,59,48)" },
                      areaStyle: { color: "rgba(255,59,48,0.12)" }, data: series.write || [] },
                    { name: t("ioWait", "等待"), type: "line", showSymbol: false, smooth: true, yAxisIndex: 1,
                      lineStyle: { width: 1.5, color: "rgb(255,149,0)", type: "dashed" }, itemStyle: { color: "rgb(255,149,0)" },
                      data: series.busy || [] }
                ]
            };
            ch.setOption(option);
        });
    }

    function updateGpu(snap) {
        const hw = snap.hardware_info || {};
        const info = hw.gpu || {}, det = hw.gpu_details || {};
        const sec = $("#sec-gpu");
        const hasGpu = det.available || info.available;
        // 切换 有/无 显卡视图
        if (hasGpu === refs._gpuHas) {
            // 仅更新数值
        } else {
            refs._gpuHas = hasGpu;
            sec.innerHTML = "";
            if (!hasGpu) { sec.appendChild(refs.gpuEmpty); return; }
            buildGpuContent();
        }
        if (!hasGpu) return;
        refs.gpuModel.textContent = esc(info.model || det.model);
        // 利用率：优先用硬件详情里的静态值，否则回退到实时采集（Intel 等无 NVML 显卡）
        if (det.utilization != null) {
            refs.gpuUsage.textContent = det.utilization;
        } else {
            const last = ((snap.real_time_data || {}).gpu_usage || []);
            refs.gpuUsage.textContent = last.length ? Number(last[last.length - 1][1]).toFixed(1) : "—";
        }
        refs.gpuTemp.textContent = det.temperature != null ? det.temperature : "—";
        // 频率：优先硬件详情静态值，否则回退到实时 Intel 详情
        const intelDet = (snap.real_time_data || {}).gpu_intel_details;
        if (det.frequency != null) {
            refs.gpuFreq.textContent = det.frequency;
        } else if (intelDet && intelDet.frequency != null) {
            refs.gpuFreq.textContent = intelDet.frequency;
        } else {
            refs.gpuFreq.textContent = "—";
        }
        refs.gpuMemTotal.textContent = det.memory_total != null ? det.memory_total : "—";
        refs.gpuMemUsed.textContent = det.memory_used != null ? det.memory_used : "—";
        refs.gpuPower.textContent = det.power_draw != null ? det.power_draw : "—";
        refs.gpuPowerLimit.textContent = det.power_limit != null ? det.power_limit : "—";
        renderGpuCharts(snap);
    }
    function renderGpuCharts(snap) {
        const usage = ((snap || lastSnap || {}).real_time_data || {}).gpu_usage || [];
        const ch = ensureChart("gpu-chart");
        if (ch) ch.setOption(lineOption(usage, "rgb(175,82,222)", "%"));
    }
    function buildGpuContent() {
        const sec = $("#sec-gpu");
        if (charts["gpu-chart"]) { charts["gpu-chart"].dispose(); delete charts["gpu-chart"]; }
        const grid = el("div", "grid grid-cols-1 xl:grid-cols-2 gap-5");
        const g = card("gpu");
        refs.gpuModel = metricRow(g, "model", "gpu-model", "");
        refs.gpuUsage = metricRow(g, "usage", "gpu-usage", "%");
        refs.gpuTemp = metricRow(g, "temp", "gpu-temp", "°C");
        refs.gpuFreq = metricRow(g, "freq", "gpu-freq", "MHz");
        const gchart = el("div"); gchart.id = "gpu-chart"; gchart.style.cssText = "height:160px;margin-top:12px";
        g.appendChild(gchart);
        grid.appendChild(g);
        const gm = card("gpuMem");
        refs.gpuMemTotal = metricRow(gm, "memTotal", "gpu-memtotal", "MB");
        refs.gpuMemUsed = metricRow(gm, "memUsed", "gpu-memused", "MB");
        refs.gpuPower = metricRow(gm, "power", "gpu-power", "W");
        refs.gpuPowerLimit = metricRow(gm, "powerLimit", "gpu-powerlimit", "W");
        grid.appendChild(gm);
        sec.appendChild(grid);
        if (refs.gpuHint) sec.appendChild(refs.gpuHint);
    }

    function updateNetwork(snap) {
        const rt = snap.real_time_data || {};
        const up = rt.net_upload_speed || [], down = rt.net_download_speed || [];
        const upLast = up.length ? up[up.length - 1][1] : 0;
        const downLast = down.length ? down[down.length - 1][1] : 0;
        $("#net-down").textContent = Number(downLast).toFixed(1);
        $("#net-up").textContent = Number(upLast).toFixed(1);

        // 各网卡实时上传/下载
        const net = (snap.hardware_info || {}).network || [];
        const perNic = rt.net_io_per_nic || {};
        const nicOrder = net.map((n) => n.name);
        // 默认选中第一张网卡
        if (!refs.netSelectedNic && nicOrder.length) refs.netSelectedNic = nicOrder[0];

        if (refs.netList.childElementCount !== net.length) {
            refs.netList.innerHTML = "";
            net.forEach((n) => {
                const row = el("div", "flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer");
                row.style.transition = "background .15s";
                row.innerHTML = `<span class="metric-label nic-name">${esc(n.name)}</span>
                    <span class="text-[12px] font-mono nic-rate text-[var(--color-subtle)]"></span>`;
                row.addEventListener("click", () => {
                    refs.netSelectedNic = n.name;
                    highlightNic();
                    renderNicChart(snap);
                });
                refs.netList.appendChild(row);
            });
        }
        net.forEach((n, i) => {
            const row = refs.netList.children[i];
            if (!row) return;
            const s = (perNic[n.name] || {});
            const dLast = (s.down || [])[0] ? s.down[s.down.length - 1][1] : 0;
            const uLast = (s.up || [])[0] ? s.up[s.up.length - 1][1] : 0;
            row.querySelector(".nic-rate").textContent = `↓ ${dLast.toFixed(1)}  ↑ ${uLast.toFixed(1)} KB/s`;
        });
        highlightNic();

        renderNetCharts(snap);
        renderNicChart(snap);
    }

    function highlightNic() {
        if (!refs.netList) return;
        Array.from(refs.netList.children).forEach((row) => {
            const active = row.querySelector(".nic-name").textContent === refs.netSelectedNic;
            row.style.background = active ? "var(--color-accent-soft)" : "transparent";
        });
    }
    function renderNetCharts(snap) {
        const rt = (snap || lastSnap || {}).real_time_data || {};
        const up = rt.net_upload_speed || [], down = rt.net_download_speed || [];
        const ch = ensureChart("net-chart");
        if (ch) {
            ch.setOption({
                grid: { left: 44, right: 16, top: 30, bottom: 24 },
                tooltip: { trigger: "axis" },
                legend: { data: [t("download", "下载"), t("upload", "上传")], textStyle: { color: cssVar("--color-subtle") }, top: 0, right: 0 },
                xAxis: { type: "time", axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: cssVar("--color-faint"), fontSize: 11 } },
                yAxis: { type: "value", axisLabel: { color: cssVar("--color-faint"), fontSize: 11 }, splitLine: { lineStyle: { color: "rgba(128,128,128,.12)" } } },
                series: [
                    { name: t("download", "下载"), type: "line", showSymbol: false, smooth: true, data: down, lineStyle: { width: 2, color: "rgb(52,199,89)" }, areaStyle: { color: "rgba(52,199,89,.12)" } },
                    { name: t("upload", "上传"), type: "line", showSymbol: false, smooth: true, data: up, lineStyle: { width: 2, color: "rgb(255,159,10)" }, areaStyle: { color: "rgba(255,159,10,.12)" } },
                ],
            });
        }
    }

    function renderNicChart(snap) {
        const rt = (snap || lastSnap || {}).real_time_data || {};
        const perNic = rt.net_io_per_nic || {};
        const nic = refs.netSelectedNic;
        const ch = ensureChart("net-nic-chart");
        if (!ch) return;
        const series = (nic && perNic[nic]) || { up: [], down: [] };
        if (refs.nicSelected) refs.nicSelected.textContent = `${esc(nic || "—")} · ${t("nicTraffic", "网卡流量")}`;
        ch.setOption({
            grid: { left: 44, right: 16, top: 30, bottom: 24 },
            tooltip: { trigger: "axis" },
            legend: { data: [t("download", "下载"), t("upload", "上传")], textStyle: { color: cssVar("--color-subtle") }, top: 0, right: 0 },
            xAxis: { type: "time", axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: cssVar("--color-faint"), fontSize: 11 } },
            yAxis: { type: "value", axisLabel: { color: cssVar("--color-faint"), fontSize: 11 }, splitLine: { lineStyle: { color: "rgba(128,128,128,.12)" } } },
            series: [
                { name: t("download", "下载"), type: "line", showSymbol: false, smooth: true, data: series.down || [], lineStyle: { width: 2, color: "rgb(52,199,89)" }, areaStyle: { color: "rgba(52,199,89,.12)" } },
                { name: t("upload", "上传"), type: "line", showSymbol: false, smooth: true, data: series.up || [], lineStyle: { width: 2, color: "rgb(255,159,10)" }, areaStyle: { color: "rgba(255,159,10,.12)" } },
            ],
        });
    }

    let lastSnap = null;
    function firstRender(snap) {
        lastSnap = snap;
        buildBasic(); buildCpu(); buildMemory(); buildDisk(); buildGpu(); buildNetwork(); buildProcess();
        updateAll(snap);
        // 基础信息模块默认可见（无图表）；其余模块的图表在「首次激活」时再 init
    }
    function updateAll(snap) {
        lastSnap = snap;
        updateBasic(snap); updateCpu(snap); updateMemory(snap); updateDisk(snap); updateGpu(snap); updateNetwork(snap); updateProcess(snap);
    }
    // 某模块被激活（可见）时，渲染其图表（此时容器尺寸正确）
    function activateCharts(section) {
        switch (section) {
            case "cpu":     renderCpuCharts(lastSnap); break;
            case "memory":  renderMemCharts(lastSnap); break;
            case "gpu":     renderGpuCharts(lastSnap); break;
            case "network": renderNetCharts(lastSnap); break;
            case "disk":    renderDiskCharts(lastSnap); break;
        }
    }

    /* ============ 连接状态 ============ */
    function setStatus(ok) {
        const dot = $("#status-dot"), txt = $("#status-text");
        dot.style.background = ok ? "var(--color-green)" : "var(--color-red)";
        txt.textContent = ok ? t("connected", "已连接") : t("disconnected", "连接断开");
    }

    /* ============ 侧边栏 ============ */
    const NAV = [
        { i18n: "navBasic",   section: "basic" },
        { i18n: "navCpu",     section: "cpu" },
        { i18n: "navMemory",  section: "memory" },
        { i18n: "navDisk",    section: "disk" },
        { i18n: "navGpu",     section: "gpu" },
        { i18n: "navNetwork", section: "network" },
        { i18n: "navProcess", section: "process" },
    ];
    function buildNav() {
        const nav = $("#sidebar-nav");
        const activeSection = (nav.querySelector(".nav-item.active") || {}).dataset &&
            nav.querySelector(".nav-item.active").dataset.section;
        nav.innerHTML = "";
        NAV.forEach((item) => {
            const a = el("div", "nav-item");
            if (item.section === activeSection) a.classList.add("active");
            a.dataset.section = item.section;
            a.innerHTML = `<span class="dot"></span><span>${t(item.i18n, item.i18n)}</span>`;
            a.addEventListener("click", () => switchSection(item.section, a));
            nav.appendChild(a);
        });
    }
    function switchSection(section, node) {
        document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
        node.classList.add("active");
        document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
        const target = document.querySelector(`.section[data-section="${section}"]`);
        if (target) target.classList.add("active");
        setCookie("section", section);
        // 下一帧布局完成后渲染该模块图表（容器此时已可见，尺寸正确）
        requestAnimationFrame(() => {
            activateCharts(section);
            Object.values(charts).forEach((c) => c.resize());
        });
    }

    // WebUI 标题自定义：config.web_ui 启用且当前语言有配置时，用配置值覆盖 i18n 默认文本
    function effectiveText(i18nKey, def) {
        const sub = (webUiCfg || {})[i18nKey];
        if (sub && sub.enable && sub.lang && sub.lang[lang]) {
            return sub.lang[lang];
        }
        return t(i18nKey, def);
    }

    function applyI18n() {
        document.querySelectorAll("[data-i18n]").forEach((e) => {
            const key = e.getAttribute("data-i18n");
            // pageTitle（页面大标题）允许被 web_ui.web_title 覆盖
            if (key === "pageTitle") {
                e.textContent = effectiveText("web_title", "系统概览");
            } else {
                e.textContent = t(key, key);
            }
        });
        // 侧边栏导航文字（无 data-i18n 属性，需单独刷新）
        document.querySelectorAll(".nav-item").forEach((n) => {
            const item = NAV.find((x) => x.section === n.dataset.section);
            if (item) n.querySelector("span:last-child").textContent = t(item.i18n, item.i18n);
        });
        // 浏览器标签页标题，可被 web_ui.page_title 覆盖
        document.title = effectiveText("page_title", "系统监控面板");
    }

    /* ============ 语言切换 ============ */
    function setLang(next) {
        if (!LANGS[next]) return;
        lang = next;
        T = LANGS[lang] || {};
        setCookie("lang", lang);
        document.documentElement.lang = lang;
        applyI18n();
        const sel = $("#lang-select"); if (sel) sel.value = lang;
        // 图表内部文本（legend / 轴名）依赖 t()，需重渲染可见图表
        const activeSection = document.querySelector(".section.active");
        const sec = activeSection ? activeSection.dataset.section : "basic";
        if (lastSnap) {
            requestAnimationFrame(() => {
                activateCharts(sec);
                Object.values(charts).forEach((c) => c && c.resize());
            });
        }
    }

    /* ============ 主题切换 ============ */
    function setTheme(mode) {
        if (mode === "light" || mode === "dark") document.documentElement.dataset.theme = mode;
        else delete document.documentElement.dataset.theme;
        setCookie("theme", mode);
        const sel = $("#theme-select"); if (sel) sel.value = mode;
        // ECharts 在 canvas 渲染，需重渲染以套用新 CSS 变量色
        if (lastSnap) {
            requestAnimationFrame(() => {
                const activeSection = document.querySelector(".section.active");
                const sec = activeSection ? activeSection.dataset.section : "basic";
                activateCharts(sec);
                Object.values(charts).forEach((c) => c && c.resize());
            });
        }
    }

    /* ============ 自定义背景 ============ */
    const BG_CANDIDATES = ["/public/background.jpg", "/public/background.png", "/public/background.webp"];
    function applyBackground() {
        const on = getCookie("bg") === "on";
        if (!on) {
            document.body.style.backgroundImage = "";
            document.body.classList.remove("has-custom-bg");
            return;
        }
        // 探测静态目录下存在哪张背景图（jpg/png/webp）
        let i = 0;
        const tryNext = () => {
            if (i >= BG_CANDIDATES.length) return; // 均无则保留默认背景
            const url = BG_CANDIDATES[i++];
            const img = new Image();
            img.onload = () => {
                document.body.style.backgroundImage = `url("${url}")`;
                document.body.style.backgroundSize = "cover";
                document.body.style.backgroundPosition = "center";
                document.body.style.backgroundAttachment = "fixed";
                document.body.classList.add("has-custom-bg");
            };
            img.onerror = tryNext;
            img.src = url;
        };
        tryNext();
    }
    function setBg(on) {
        setCookie("bg", on ? "on" : "off");
        applyBackground();
    }

    /* ============ 数据连接 ============ */
    let built = false;
    function onSnapshot(snap) {
        if (!snap || !snap.real_time_data) return;
        if (!built) { firstRender(snap); built = true; }
        else updateAll(snap);
    }
    function startWebSocket() {
        const proto = location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(`${proto}://${location.host}/api/ws`);
        ws.onopen = () => setStatus(true);
        ws.onmessage = (ev) => { try { onSnapshot(JSON.parse(ev.data)); } catch (e) {} };
        ws.onclose = () => { setStatus(false); startPolling(); };
        ws.onerror = () => { ws.close(); };
    }
    let pollTimer = null;
    function startPolling() {
        if (pollTimer) return;
        const poll = async () => {
            try {
                const r = await fetch("/api/data");
                if (r.ok) { onSnapshot(await r.json()); setStatus(true); }
            } catch (e) { setStatus(false); }
        };
        poll(); pollTimer = setInterval(poll, 2000);
    }

    function boot() {
        document.documentElement.lang = lang;
        // 拉取 WebUI 配置（标题自定义等），拿到后再渲染文案
        fetch("/api/config").then((r) => r.json()).then((cfg) => {
            if (cfg && cfg.web_ui) webUiCfg = cfg.web_ui;
            applyI18n();
        }).catch(() => {});
        buildNav();
        // 恢复上次打开的页面（cookie）
        const savedSection = getCookie("section");
        if (savedSection && NAV.some((n) => n.section === savedSection)) {
            const node = document.querySelector(`.nav-item[data-section="${savedSection}"]`);
            if (node) switchSection(savedSection, node);
        }
        initControls();
        applyBackground();
        fetch("/api/cache").then((r) => r.json()).then(onSnapshot).catch(() => {});
        startWebSocket();
        window.addEventListener("resize", () => Object.values(charts).forEach((c) => c.resize()));
    }

    /* ============ 语言 / 主题控件 ============ */
    function initControls() {
        // 语言下拉
        const langSel = $("#lang-select");
        if (langSel) {
            langSel.innerHTML = "";
            LANG_ORDER.forEach((code) => {
                const cfg = (window.LANGUAGE_CONFIG || {})[code] || {};
                const opt = el("option", null, cfg.nativeName || cfg.name || code);
                opt.value = code;
                langSel.appendChild(opt);
            });
            langSel.value = lang;
            langSel.addEventListener("change", (e) => setLang(e.target.value));
        }
        // 主题下拉
        const themeSel = $("#theme-select");
        if (themeSel) {
            const savedTheme = getCookie("theme") || "auto";
            if (savedTheme === "light" || savedTheme === "dark") document.documentElement.dataset.theme = savedTheme;
            else delete document.documentElement.dataset.theme;
            themeSel.value = savedTheme;
            themeSel.addEventListener("change", (e) => setTheme(e.target.value));
        }
        // 自定义背景开关
        const bgToggle = $("#bg-toggle");
        if (bgToggle) {
            bgToggle.checked = getCookie("bg") === "on";
            bgToggle.addEventListener("change", (e) => setBg(e.target.checked));
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
