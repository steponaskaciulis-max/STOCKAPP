/* =========================
   Valyxis — Stock Chart Page
   ========================= */

const params = new URLSearchParams(window.location.search);
const TICKER = (params.get("ticker") || "").toUpperCase();

// ✅ IMPORTANT: Your backend (Render)
const API_BASE = "https://stockapp-kym2.onrender.com";

// DOM
const chartEl = document.getElementById("chart");
const priceEl = document.getElementById("price");
const changeEl = document.getElementById("change");
const nameEl = document.getElementById("company-name");
const sectorEl = document.getElementById("company-sector");

const prevCloseEl = document.getElementById("prev-close");
const high52El = document.getElementById("high-52");
const peEl = document.getElementById("pe");
const pegEl = document.getElementById("peg");
const epsEl = document.getElementById("eps");
const divEl = document.getElementById("dividend");

let lastChartData = [];

/* =========================
   Helpers
   ========================= */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmt(n, d = 2) {
  if (n == null) return "—";
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(d) : "—";
}

function fmtMoney(n, d = 2) {
  if (n == null) return "$—";
  const num = Number(n);
  return Number.isFinite(num) ? `$${num.toFixed(d)}` : "$—";
}

function fmtAxisMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  // simple compact-ish formatting
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
  return `$${num.toFixed(0)}`;
}

function colorize(el, val) {
  if (!el) return;
  if (val > 0) el.style.color = "#2ecc71";
  else if (val < 0) el.style.color = "#e74c3c";
  else el.style.color = "#aab2c0";
}

function setText(el, value) {
  if (!el) return;
  el.textContent = value;
}

/* =========================
   Chart (SVG)
   ========================= */

function renderChart(data) {
  if (!chartEl || !Array.isArray(data) || data.length < 2) {
    chartEl.innerHTML = `<div style="padding:16px;color:#aaa">No chart data</div>`;
    return;
  }

  lastChartData = data;

  // Ensure chart box has height (in case CSS is weird)
  if (chartEl.clientHeight < 200) chartEl.style.height = "420px";

  const rect = chartEl.getBoundingClientRect();
  const width = Math.max(720, Math.floor(rect.width || chartEl.clientWidth || 720));
  const height = Math.max(420, Math.floor(rect.height || chartEl.clientHeight || 420));

  // ---- Plot margins for axes/labels ----
  const M = { left: 64, right: 18, top: 18, bottom: 38 };
  const plotW = Math.max(10, width - M.left - M.right);
  const plotH = Math.max(10, height - M.top - M.bottom);

  const closes = data.map(d => Number(d.close)).filter(Number.isFinite);
  if (closes.length < 2) {
    chartEl.innerHTML = `<div style="padding:16px;color:#aaa">No chart data</div>`;
    return;
  }

  let min = Math.min(...closes);
  let max = Math.max(...closes);

  // Anti-flat scaling (keeps movement visible like Yahoo)
  const realRange = max - min;
  const minVisibleRange = max * 0.06; // 6% of price
  const range = Math.max(realRange, minVisibleRange, 1);
  const mid = (min + max) / 2;
  min = mid - range / 2;
  max = mid + range / 2;

  const xScale = (i) => M.left + (i / (data.length - 1)) * plotW;
  const yScale = (price) => M.top + ((max - price) / (max - min)) * plotH;

  const points = data.map((d, i) => {
    const price = Number(d.close);
    return {
      x: xScale(i),
      y: yScale(price),
      price,
      time: d.t
    };
  });

  const svgPoints = points.map(p => `${p.x},${p.y}`).join(" ");

   // Last point helpers (FIXES chart crash)
const lastPoint = points[points.length - 1];
const lastY = lastPoint.y;
const lastPrice = lastPoint.price;

   
  // ---- Axis ticks ----
  const yTicks = 4; // horizontal gridlines
  const xTicks = 4; // vertical gridlines (visual only)
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, k) => min + (k / yTicks) * (max - min));

  const xTickIdx = Array.from({ length: xTicks + 1 }, (_, k) => Math.round((k / xTicks) * (data.length - 1)));

  // Labels: start/mid/end
  const labelIdx = [
    0,
    Math.round((data.length - 1) / 2),
    data.length - 1
  ];

  chartEl.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4c8dff" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#4c8dff" stop-opacity="0"/>
        </linearGradient>

        <clipPath id="chartClip">
          <rect x="0" y="0" width="${width}" height="${height}" rx="14" ry="14" />
        </clipPath>
      </defs>

      <!-- Grid: horizontal -->
      ${yTickVals.map((v) => {
        const y = yScale(v);
        return `
          <line x1="${M.left}" x2="${width - M.right}" y1="${y}" y2="${y}"
                stroke="rgba(255,255,255,0.08)" stroke-width="1" />
        `;
      }).join("")}

      <!-- Grid: vertical -->
      ${xTickIdx.map((idx) => {
        const x = xScale(idx);
        return `
          <line x1="${x}" x2="${x}" y1="${M.top}" y2="${height - M.bottom}"
                stroke="rgba(255,255,255,0.06)" stroke-width="1" />
        `;
      }).join("")}

      <!-- Y axis baseline -->
      <line x1="${M.left}" x2="${M.left}" y1="${M.top}" y2="${height - M.bottom}"
            stroke="rgba(255,255,255,0.10)" stroke-width="1" />

      <!-- X axis baseline -->
      <line x1="${M.left}" x2="${width - M.right}" y1="${height - M.bottom}" y2="${height - M.bottom}"
            stroke="rgba(255,255,255,0.10)" stroke-width="1" />

      <!-- Y labels -->
      ${yTickVals.map((v) => {
        const y = yScale(v);
        return `
          <text x="${M.left - 10}" y="${y + 4}"
                text-anchor="end"
                fill="rgba(244,247,255,0.70)"
                font-size="12"
                font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial">
            ${fmtAxisMoney(v)}
          </text>
        `;
      }).join("")}

      <!-- X labels (start / mid / end) -->
      ${labelIdx.map((idx) => {
        const x = xScale(idx);
        const y = height - 12;
        const anchor = idx === 0 ? "start" : (idx === data.length - 1 ? "end" : "middle");
        return `
          <text x="${x}" y="${y}"
                text-anchor="${anchor}"
                fill="rgba(244,247,255,0.70)"
                font-size="12"
                font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial">
            ${formatDateShort(data[idx].t)}
          </text>
        `;
      }).join("")}

      <!-- Area -->
      <polygon
        clip-path="url(#chartClip)"
        points="${M.left},${height - M.bottom} ${svgPoints} ${width - M.right},${height - M.bottom}"
        fill="url(#fillGrad)"
      />

      <!-- OUTLINE (behind) -->
      <polyline
        points="${svgPoints}"
        fill="none"
        stroke="rgba(0,0,0,0.55)"
        stroke-width="6"
        stroke-linejoin="round"
        stroke-linecap="round"
        clip-path="url(#chartClip)"
      />

<!-- Last price dot -->
<circle
  cx="${width}"
  cy="${lastY}"
  r="5"
  fill="#2ecc71"
  stroke="#0b0b0f"
  stroke-width="2"
/>

<!-- Last price label -->
<rect
  x="${width - 70}"
  y="${lastY - 14}"
  rx="6"
  ry="6"
  width="68"
  height="28"
  fill="#0b0b0f"
  stroke="#2ecc71"
  stroke-width="1"
/>

<text
  x="${width - 36}"
  y="${lastY + 5}"
  fill="#e5e7eb"
  font-size="12"
  font-weight="600"
  text-anchor="middle"
>
  ${lastPrice.toFixed(2)}
</text>


      <!-- MAIN LINE -->
      <polyline
        points="${svgPoints}"
        fill="none"
        stroke="#4c8dff"
        stroke-width="3"
        stroke-linejoin="round"
        stroke-linecap="round"
        clip-path="url(#chartClip)"
      />

      <!-- Crosshair -->
      <line id="crosshair" y1="${M.top}" y2="${height - M.bottom}"
            stroke="#8892b0" stroke-dasharray="4" opacity="0" />

      <!-- Hover point -->
      <circle id="hoverDot" r="5" fill="#fff" stroke="#4c8dff" stroke-width="2" opacity="0" />
    </svg>

    <div id="tooltip" style="
      position:absolute;
      pointer-events:none;
      background:#0b1220;
      color:#f4f7ff;
      border:1px solid rgba(255,255,255,0.12);
      border-radius:10px;
      padding:10px 12px;
      font-size:12px;
      opacity:0;
      transform:translate(-50%, -120%);
      white-space:nowrap;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    "></div>
  `;

  const svg = chartEl.querySelector("svg");
  const crosshair = chartEl.querySelector("#crosshair");
  const dot = chartEl.querySelector("#hoverDot");
  const tooltip = chartEl.querySelector("#tooltip");

  svg.addEventListener("mousemove", (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Convert cursor.x to an index inside plot area
    const t = (cursor.x - M.left) / plotW;
    const idx = Math.round(t * (points.length - 1));
    const clamped = Math.max(0, Math.min(points.length - 1, idx));
    const p = points[clamped];

    if (!p) return;

    crosshair.setAttribute("x1", p.x);
    crosshair.setAttribute("x2", p.x);
    crosshair.style.opacity = 1;

    dot.setAttribute("cx", p.x);
    dot.setAttribute("cy", p.y);
    dot.style.opacity = 1;

    tooltip.style.opacity = 1;
    tooltip.style.left = `${p.x}px`;
    tooltip.style.top = `${p.y}px`;
    tooltip.innerHTML = `
      <strong>${fmtMoney(p.price, 2)}</strong><br/>
      ${formatDate(p.time)}
    `;
  });

  svg.addEventListener("mouseleave", () => {
    crosshair.style.opacity = 0;
    dot.style.opacity = 0;
    tooltip.style.opacity = 0;
  });
}

/* =========================
   Load Data
   ========================= */

async function loadStock(period = "1y") {
  if (!TICKER) return;

  try {
    if (chartEl) chartEl.innerHTML = `<div style="padding:16px;color:#aab2c0">Loading chart…</div>`;

    const url = `${API_BASE}/history?ticker=${encodeURIComponent(TICKER)}&period=${encodeURIComponent(period)}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`API error ${res.status}`);

    const json = await res.json();
    const meta = json.meta || {};
    const prices = Array.isArray(json.prices) ? json.prices : [];

    // Header
    setText(nameEl, meta.longName || TICKER);
    setText(sectorEl, meta.sector || "—");

    // Price
    if (meta.price != null) setText(priceEl, fmtMoney(meta.price));
    else setText(priceEl, "$—");

    // Change
    if (prices.length >= 2) {
      const last = Number(prices[prices.length - 1].close);
      const prev = Number(prices[prices.length - 2].close);

      if (Number.isFinite(last) && Number.isFinite(prev) && prev !== 0) {
        const diff = last - prev;
        const pct = (diff / prev) * 100;
        setText(changeEl, `${diff >= 0 ? "+" : ""}${fmt(diff)} (${diff >= 0 ? "+" : ""}${fmt(pct)}%)`);
        colorize(changeEl, diff);
      } else {
        setText(changeEl, "—");
      }
    } else {
      setText(changeEl, "—");
    }

    // Stats
    const prevClose =
      prices.length >= 2 ? prices[prices.length - 2].close :
      prices.length === 1 ? prices[0].close :
      null;

    setText(prevCloseEl, fmt(prevClose));
    setText(high52El, fmt(meta.high52w));
    setText(peEl, fmt(meta.pe));
    setText(pegEl, fmt(meta.peg));
    setText(epsEl, fmt(meta.eps));

    // Dividend fix: backend returns "percent*100" sometimes -> normalize
    if (meta.dividendYieldPct != null && Number.isFinite(Number(meta.dividendYieldPct))) {
      const raw = Number(meta.dividendYieldPct);
      const percent = raw / 100; // 75 -> 0.75%
      setText(divEl, `${fmt(percent, 2)}%`);
    } else {
      setText(divEl, "—");
    }

    renderChart(prices);
  } catch (err) {
    console.error(err);
    if (chartEl) chartEl.innerHTML = `<div style="padding:16px;color:#ff6b6b">Error loading chart</div>`;
    if (priceEl && priceEl.textContent.trim() === "") priceEl.textContent = "$—";
    if (changeEl && changeEl.textContent.trim() === "") changeEl.textContent = "—";
  }
}

/* =========================
   Timeframe Buttons
   ========================= */

document.querySelectorAll("[data-period]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-period]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadStock(btn.dataset.period);
  });
});

/* =========================
   Init
   ========================= */

if (!TICKER) {
  alert("No ticker provided");
} else {
  loadStock("1y");
}
