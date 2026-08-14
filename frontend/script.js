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

    function detectLang() {
        const nav = (navigator.language || "zh-CN").toLowerCase();
        if (LANGS[nav]) return nav;                 // 完整匹配，如 zh-CN / en-US
        const short = nav.split("-")[0];            // 短码回退，如 zh / en
        if (LANGS[short]) return short;
        // 在所有语言中寻找相同短码的第一个匹配
        const prefix = Object.keys(LANGS).find((k) => k.split("-")[0] === short);
        return prefix || "zh-CN";
    }
    const lang = detectLang();
    const T = LANGS[lang] || {};
    const t = (key, fallback) => (T[key] !== undefined ? T[key] : (fallback !== undefined ? fallback : key));

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
        c.appendChild(el("div", "card-title", t(titleI18n, titleI18n)));
        return c;
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
        if (!charts[domId]) charts[domId] = echarts.init(dom);
        return charts[domId];
    }
    function lineOption(series, color, unit) {
        const area = color.replace("rgb(", "rgba(").replace(")", ",.18)");
        return {
            grid: { left: 44, right: 16, top: 18, bottom: 24 },
            tooltip: { trigger: "axis" },
            xAxis: { type: "time", axisLine: { show: false }, axisTick: { show: false },
                axisLabel: { color: "var(--color-faint)", fontSize: 11 } },
            yAxis: { type: "value", max: (v) => Math.max(100, Math.ceil(v.max / 100) * 100),
                axisLabel: { color: "var(--color-faint)", fontSize: 11, formatter: "{value}" + (unit || "") },
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
        const grid = el("div", "grid grid-cols-1 xl:grid-cols-3 gap-5");
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
        // 每核
        const core = card("perCore");
        const cw = el("div", "grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2"); cw.id = "cpu-cores";
        core.appendChild(cw); refs.cpuCores = cw;
        grid.appendChild(core);
        // 频率 + 图表
        const freq = card("cpuFreq");
        const fhead = el("div", "flex items-end gap-2 mb-2");
        const fv = el("span", "metric-value"); fv.id = "cpu-freq-val"; fv.textContent = "0";
        fhead.appendChild(fv); fhead.appendChild(el("span", "metric-unit", "MHz"));
        freq.appendChild(fhead);
        const fchart = el("div"); fchart.id = "cpu-freq-chart"; fchart.style.cssText = "height:160px;margin-top:10px";
        freq.appendChild(fchart);
        grid.appendChild(freq);
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
        sec.appendChild(grid);
    }

    function buildDisk() {
        const sec = $("#sec-disk");
        sec.innerHTML = "";
        refs.diskGrid = el("div", "grid grid-cols-1 md:grid-cols-2 gap-5");
        sec.appendChild(refs.diskGrid);
    }

    function buildGpu() {
        const sec = $("#sec-gpu");
        sec.innerHTML = "";
        const grid = el("div", "grid grid-cols-1 xl:grid-cols-2 gap-5");
        const g = card("gpu");
        refs.gpuModel = metricRow(g, "model", "gpu-model", "");
        refs.gpuUsage = metricRow(g, "usage", "gpu-usage", "%");
        refs.gpuTemp = metricRow(g, "temp", "gpu-temp", "°C");
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
        refs.gpuEmpty = el("div", "text-[var(--color-faint)] text-[14px]");
        refs.gpuEmpty.textContent = t("noGpu", "未检测到可用的独立显卡（或驱动未安装）");
    }

    function buildNetwork() {
        const sec = $("#sec-network");
        sec.innerHTML = "";
        const grid = el("div", "grid grid-cols-1 xl:grid-cols-2 gap-5");
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

        const iface = card("interfaces");
        refs.netList = el("div"); iface.appendChild(refs.netList);
        grid.appendChild(iface);
        sec.appendChild(grid);
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

        const freq = rt.cpu_freq || [];
        const fLast = freq.length ? freq[freq.length - 1][1] : 0;
        $("#cpu-freq-val").textContent = Math.round(fLast);
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
        const ch = ensureChart("mem-chart");
        if (ch) ch.setOption(lineOption(usage, "rgb(255,159,10)", "%"));
    }

    function updateDisk(snap) {
        const disks = snap.disk_usage || (snap.hardware_info || {}).disks || [];
        if (!disks.length) {
            refs.diskGrid.innerHTML = `<div class="card"><div class="text-[var(--color-faint)] text-[14px]">—</div></div>`;
            return;
        }
        // 仅在数量变化时重建卡片，避免进度条闪烁
        if (refs.diskGrid.childElementCount !== disks.length) {
            refs.diskGrid.innerHTML = "";
            refs.diskFills = [];
            disks.forEach((d) => {
                const c = el("div", "card");
                const head = el("div", "flex items-baseline justify-between mb-1");
                head.innerHTML = `<span class="font-medium text-[14px]">${esc(d.device)}</span>
                    <span class="text-[12px] text-[var(--color-faint)]">${esc(d.fstype)} · ${esc(d.mountpoint)}</span>`;
                const mid = el("div", "flex items-end gap-2 mb-1");
                mid.innerHTML = `<span class="metric-value" style="font-size:22px">${esc(d.used)}</span>
                    <span class="metric-unit">/ ${esc(d.total)} GB</span>
                    <span class="ml-auto text-[13px] font-medium disk-pct">0%</span>`;
                const track = el("div", "bar-track mt-2"); const fill = el("div", "bar-fill");
                track.appendChild(fill);
                c.appendChild(head); c.appendChild(mid); c.appendChild(track);
                refs.diskGrid.appendChild(c);
                refs.diskFills.push({ fill, pct: mid.querySelector(".disk-pct") });
            });
        }
        disks.forEach((d, i) => {
            const pct = d.usage_percent ?? 0;
            if (refs.diskFills[i]) {
                setBar(refs.diskFills[i].fill, pct);
                refs.diskFills[i].pct.textContent = pct + "%";
                refs.diskFills[i].pct.style.color = colorByPct(pct);
            }
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
        refs.gpuUsage.textContent = det.utilization != null ? det.utilization : "—";
        refs.gpuTemp.textContent = det.temperature != null ? det.temperature : "—";
        refs.gpuMemTotal.textContent = det.memory_total != null ? det.memory_total : "—";
        refs.gpuMemUsed.textContent = det.memory_used != null ? det.memory_used : "—";
        refs.gpuPower.textContent = det.power_draw != null ? det.power_draw : "—";
        refs.gpuPowerLimit.textContent = det.power_limit != null ? det.power_limit : "—";
        const ch = ensureChart("gpu-chart");
        if (ch) ch.setOption(lineOption(snap.real_time_data?.gpu_usage || [], "rgb(175,82,222)", "%"));
    }
    function buildGpuContent() {
        const sec = $("#sec-gpu");
        if (charts["gpu-chart"]) { charts["gpu-chart"].dispose(); delete charts["gpu-chart"]; }
        const grid = el("div", "grid grid-cols-1 xl:grid-cols-2 gap-5");
        const g = card("gpu");
        refs.gpuModel = metricRow(g, "model", "gpu-model", "");
        refs.gpuUsage = metricRow(g, "usage", "gpu-usage", "%");
        refs.gpuTemp = metricRow(g, "temp", "gpu-temp", "°C");
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
    }

    function updateNetwork(snap) {
        const rt = snap.real_time_data || {};
        const up = rt.net_upload_speed || [], down = rt.net_download_speed || [];
        const upLast = up.length ? up[up.length - 1][1] : 0;
        const downLast = down.length ? down[down.length - 1][1] : 0;
        $("#net-down").textContent = Number(downLast).toFixed(1);
        $("#net-up").textContent = Number(upLast).toFixed(1);
        const net = (snap.hardware_info || {}).network || [];
        refs.netList.innerHTML = net.length
            ? net.map((n) => `<div class="flex items-baseline justify-between py-1.5">
                <span class="metric-label">${esc(n.name)}</span>
                <span class="text-[13px] font-medium">${(n.addresses || []).join(", ") || "—"}</span></div>`).join("")
            : `<div class="text-[var(--color-faint)] text-[14px]">—</div>`;
        const ch = ensureChart("net-chart");
        if (ch) {
            ch.setOption({
                grid: { left: 44, right: 16, top: 30, bottom: 24 },
                tooltip: { trigger: "axis" },
                legend: { data: [t("download", "下载"), t("upload", "上传")], textStyle: { color: "var(--color-subtle)" }, top: 0, right: 0 },
                xAxis: { type: "time", axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "var(--color-faint)", fontSize: 11 } },
                yAxis: { type: "value", axisLabel: { color: "var(--color-faint)", fontSize: 11 }, splitLine: { lineStyle: { color: "rgba(128,128,128,.12)" } } },
                series: [
                    { name: t("download", "下载"), type: "line", showSymbol: false, smooth: true, data: down, lineStyle: { width: 2, color: "rgb(52,199,89)" }, areaStyle: { color: "rgba(52,199,89,.12)" } },
                    { name: t("upload", "上传"), type: "line", showSymbol: false, smooth: true, data: up, lineStyle: { width: 2, color: "rgb(255,159,10)" }, areaStyle: { color: "rgba(255,159,10,.12)" } },
                ],
            });
        }
    }

    function firstRender(snap) {
        buildBasic(); buildCpu(); buildMemory(); buildDisk(); buildGpu(); buildNetwork();
        updateAll(snap);
        // 首帧后 resize，确保图表容器尺寸正确
        setTimeout(() => Object.values(charts).forEach((c) => c.resize()), 60);
    }
    function updateAll(snap) {
        updateBasic(snap); updateCpu(snap); updateMemory(snap); updateDisk(snap); updateGpu(snap); updateNetwork(snap);
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
    ];
    function buildNav() {
        const nav = $("#sidebar-nav");
        nav.innerHTML = "";
        NAV.forEach((item, idx) => {
            const a = el("div", "nav-item" + (idx === 0 ? " active" : ""));
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
        setTimeout(() => Object.values(charts).forEach((c) => c.resize()), 50);
    }

    function applyI18n() {
        document.querySelectorAll("[data-i18n]").forEach((e) => {
            e.textContent = t(e.getAttribute("data-i18n"), e.getAttribute("data-i18n"));
        });
        document.title = t("title", "系统监控面板");
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
        applyI18n();
        buildNav();
        fetch("/api/cache").then((r) => r.json()).then(onSnapshot).catch(() => {});
        startWebSocket();
        window.addEventListener("resize", () => Object.values(charts).forEach((c) => c.resize()));
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
