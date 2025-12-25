/* =========================
   Valyxis — Stock Chart Page
   ========================= */

const params = new URLSearchParams(window.location.search);
const TICKER = (params.get("ticker") || "").toUpperCase();
const API_BASE = "https://stockapp-kym2.onrender.com";

/* =========================
   DOM
   ========================= */

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

/* =========================
   Helpers
   ========================= */

const fmt = (n, d = 2) =>
  Number.isFinite(Number(n)) ? Number(n).toFixed(d) : "—";

const money = n =>
  Number.isFinite(Number(n)) ? `$${Number(n).toFixed(2)}` : "$—";

const shortDate = t =>
  new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const colorize = (el, v) => {
  if (!el) return;
  el.style.color = v > 0 ? "#2ecc71" : v < 0 ? "#e74c3c" : "#aab2c0";
};

/* =========================
   Chart
   ========================= */

function renderChart(data) {
  if (!chartEl || !data?.length) {
    chartEl.innerHTML = `<div style="padding:16px;color:#aaa">No chart data</div>`;
    return;
  }

  chartEl.style.height = "420px";

  const rect = chartEl.getBoundingClientRect();
  const width = Math.max(760, rect.width);
  const height = 420;

  const M = { left: 64, right: 32, top: 18, bottom: 40 };
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;

  const prices = data.map(d => d.close);
  let min = Math.min(...prices);
  let max = Math.max(...prices);

  const range = Math.max(max - min, max * 0.06, 1);
  const mid = (min + max) / 2;
  min = mid - range / 2;
  max = mid + range / 2;

  const xScale = i => M.left + (i / (data.length - 1)) * plotW;
  const yScale = p => M.top + ((max - p) / (max - min)) * plotH;

  const points = data.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.close),
    price: d.close,
    time: d.t
  }));

  const path = points.map(p => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];

  /* =========================
     PRICE LABEL (FIXED)
     ========================= */

  const labelW = 74;
  const labelH = 30;

  const placeRight = last.x < width - M.right - labelW - 10;

  const labelX = placeRight
    ? last.x + 10
    : last.x - labelW - 10;

  const labelY = Math.min(
    Math.max(last.y - labelH / 2, M.top + 4),
    height - M.bottom - labelH - 4
  );

  /* =========================
     AXES
     ========================= */

  const yTicks = 5;
  const xTicks = 3;

  chartEl.innerHTML = `
<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4c8dff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#4c8dff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Y GRID + LABELS -->
  ${Array.from({ length: yTicks }).map((_, i) => {
    const p = min + (i / (yTicks - 1)) * (max - min);
    const y = yScale(p);
    return `
      <line x1="${M.left}" x2="${width - M.right}" y1="${y}" y2="${y}"
        stroke="rgba(255,255,255,0.08)"/>
      <text x="${M.left - 10}" y="${y + 4}" text-anchor="end"
        fill="#9aa3b2" font-size="12">$${p.toFixed(0)}</text>
    `;
  }).join("")}

  <!-- X LABELS -->
  ${Array.from({ length: xTicks }).map((_, i) => {
    const idx = Math.floor((i / (xTicks - 1)) * (data.length - 1));
    const x = xScale(idx);
    return `
      <text x="${x}" y="${height - 10}" text-anchor="middle"
        fill="#9aa3b2" font-size="12">
        ${shortDate(data[idx].t)}
      </text>
    `;
  }).join("")}

  <!-- AREA -->
  <polygon
    points="${M.left},${height - M.bottom} ${path} ${width - M.right},${height - M.bottom}"
    fill="url(#fillGrad)"
  />

  <!-- OUTLINE -->
  <polyline points="${path}" fill="none"
    stroke="rgba(0,0,0,0.5)" stroke-width="6"
    stroke-linecap="round" stroke-linejoin="round"/>

  <!-- MAIN LINE -->
  <polyline points="${path}" fill="none"
    stroke="#4c8dff" stroke-width="3"
    stroke-linecap="round" stroke-linejoin="round"/>

  <!-- LAST POINT -->
  <circle cx="${last.x}" cy="${last.y}" r="5" fill="#2ecc71"/>

  <!-- PRICE BOX -->
  <rect x="${labelX}" y="${labelY}" width="${labelW}" height="${labelH}"
    rx="6" fill="#0b0b0f" stroke="#2ecc71"/>

  <text x="${labelX + labelW / 2}" y="${labelY + 19}"
    text-anchor="middle" fill="#e5e7eb" font-size="13" font-weight="600">
    ${money(last.price)}
  </text>
</svg>`;
}

/* =========================
   Load Data
   ========================= */

async function loadStock(period = "1y") {
  try {
    chartEl.innerHTML = `<div style="padding:16px;color:#aaa">Loading chart…</div>`;
    const res = await fetch(`${API_BASE}/history?ticker=${TICKER}&period=${period}`);
    const json = await res.json();

    const meta = json.meta;
    const prices = json.prices;

    nameEl.textContent = meta.longName || TICKER;
    sectorEl.textContent = meta.sector || "—";
    priceEl.textContent = money(meta.price);

    if (prices.length > 1) {
      const diff = prices.at(-1).close - prices.at(-2).close;
      const pct = (diff / prices.at(-2).close) * 100;
      changeEl.textContent = `${diff >= 0 ? "+" : ""}${fmt(diff)} (${fmt(pct)}%)`;
      colorize(changeEl, diff);
    }

    prevCloseEl.textContent = fmt(prices.at(-2)?.close);
    high52El.textContent = fmt(meta.high52w);
    peEl.textContent = fmt(meta.pe);
    pegEl.textContent = fmt(meta.peg);
    epsEl.textContent = fmt(meta.eps);

    if (meta.dividendYieldPct != null)
      divEl.textContent = `${fmt(meta.dividendYieldPct / 100)}%`;

    renderChart(prices);

  } catch {
    chartEl.innerHTML = `<div style="padding:16px;color:#ff6b6b">Error loading chart</div>`;
  }
}

/* =========================
   Timeframes
   ========================= */

document.querySelectorAll("[data-period]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("[data-period]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadStock(btn.dataset.period);
  };
});

/* =========================
   Init
   ========================= */

if (!TICKER) alert("No ticker provided");
else loadStock("1y");
