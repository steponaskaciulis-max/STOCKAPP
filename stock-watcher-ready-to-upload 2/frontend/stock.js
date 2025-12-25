/* =========================
   Valyxis — Stock Chart Page
   ========================= */

const params = new URLSearchParams(window.location.search);
const TICKER = (params.get("ticker") || "").toUpperCase();

// Backend
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

/* =========================
   Helpers
   ========================= */

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function fmt(n, d = 2) {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(d) : "—";
}

function fmtMoney(n) {
  const num = Number(n);
  return Number.isFinite(num) ? `$${num.toFixed(2)}` : "$—";
}

function fmtAxisMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toFixed(0)}`;
}

function colorize(el, v) {
  if (!el) return;
  el.style.color = v > 0 ? "#2ecc71" : v < 0 ? "#e74c3c" : "#aab2c0";
}

function setText(el, v) {
  if (el) el.textContent = v;
}

/* =========================
   Chart Renderer
   ========================= */

function renderChart(data) {
  if (!chartEl || !Array.isArray(data) || data.length < 2) {
    chartEl.innerHTML = `<div style="padding:16px;color:#aaa">No chart data</div>`;
    return;
  }

  chartEl.style.height = "420px";

  const rect = chartEl.getBoundingClientRect();
  const width = Math.max(720, rect.width);
  const height = Math.max(420, rect.height);

  const M = { left: 64, right: 24, top: 18, bottom: 38 };
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;

  const prices = data.map(d => Number(d.close)).filter(Number.isFinite);
  let min = Math.min(...prices);
  let max = Math.max(...prices);

  const minRange = max * 0.06;
  const range = Math.max(max - min, minRange, 1);
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

  const svgPoints = points.map(p => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];

  // Price label positioning (FIXED)
  const labelW = 72;
  const labelH = 28;

  const labelX = Math.min(
    Math.max(last.x + 12, M.left),
    width - M.right - labelW
  );

  const labelY = Math.min(
    Math.max(last.y - labelH / 2, M.top + 4),
    height - M.bottom - labelH - 4
  );

  chartEl.innerHTML = `
<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
  <defs>
    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4c8dff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#4c8dff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  ${[0,1,2,3,4].map(i => {
    const y = yScale(min + (i/4)*(max-min));
    return `<line x1="${M.left}" x2="${width-M.right}" y1="${y}" y2="${y}"
      stroke="rgba(255,255,255,0.08)"/>`;
  }).join("")}

  <polygon
    points="${M.left},${height-M.bottom} ${svgPoints} ${width-M.right},${height-M.bottom}"
    fill="url(#fillGrad)"
  />

  <polyline
    points="${svgPoints}"
    fill="none"
    stroke="rgba(0,0,0,0.55)"
    stroke-width="6"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <polyline
    points="${svgPoints}"
    fill="none"
    stroke="#4c8dff"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <circle cx="${last.x}" cy="${last.y}" r="5" fill="#2ecc71"/>

  <rect
    x="${labelX}"
    y="${labelY}"
    width="${labelW}"
    height="${labelH}"
    rx="6"
    fill="#0b0b0f"
    stroke="#2ecc71"
  />

  <text
    x="${labelX + labelW / 2}"
    y="${labelY + 18}"
    text-anchor="middle"
    fill="#e5e7eb"
    font-size="12"
    font-weight="600"
  >
    ${fmtMoney(last.price)}
  </text>
</svg>`;
}

/* =========================
   Load Data
   ========================= */

async function loadStock(period="1y") {
  if (!TICKER) return;

  try {
    chartEl.innerHTML = `<div style="padding:16px;color:#aab2c0">Loading chart…</div>`;

    const res = await fetch(`${API_BASE}/history?ticker=${TICKER}&period=${period}`);
    if (!res.ok) throw new Error("API error");

    const json = await res.json();
    const meta = json.meta || {};
    const prices = json.prices || [];

    setText(nameEl, meta.longName || TICKER);
    setText(sectorEl, meta.sector || "—");
    setText(priceEl, fmtMoney(meta.price));

    if (prices.length >= 2) {
      const diff = prices.at(-1).close - prices.at(-2).close;
      const pct = (diff / prices.at(-2).close) * 100;
      setText(changeEl, `${diff>=0?"+":""}${fmt(diff)} (${fmt(pct)}%)`);
      colorize(changeEl, diff);
    }

    setText(prevCloseEl, fmt(prices.at(-2)?.close));
    setText(high52El, fmt(meta.high52w));
    setText(peEl, fmt(meta.pe));
    setText(pegEl, fmt(meta.peg));
    setText(epsEl, fmt(meta.eps));

    if (meta.dividendYieldPct != null) {
      setText(divEl, `${fmt(meta.dividendYieldPct / 100, 2)}%`);
    } else setText(divEl, "—");

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
