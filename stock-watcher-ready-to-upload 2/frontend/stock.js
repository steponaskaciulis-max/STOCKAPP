/* ==========================================================
   Valyxis — Stock Page Logic (FINAL / HARDENED)
   ========================================================== */

/* =========================
   URL + API
   ========================= */

const params = new URLSearchParams(window.location.search);
const TICKER = (params.get("ticker") || "").toUpperCase();
const API_BASE = "https://stockapp-kym2.onrender.com";

/* =========================
   DOM SAFE GETTER
   ========================= */

function $(id) {
  return document.getElementById(id) || null;
}

/* =========================
   DOM ELEMENTS
   ========================= */

const chartEl = $("chart");

const tickerEl = $("ticker");
const nameEl = $("company-name");
const sectorEl = $("company-sector");

const priceEl = $("price");
const changeEl = $("change");

const prevCloseEl = $("prev-close");
const high52El = $("high-52");
const peEl = $("pe");
const pegEl = $("peg");
const epsEl = $("eps");
const divEl = $("dividend");

/* =========================
   HELPERS
   ========================= */

function fmt(n, d = 2) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return Number(n).toFixed(d);
}

function setText(el, val) {
  if (!el) return;
  el.textContent = val ?? "—";
}

function colorize(el, val) {
  if (!el) return;
  if (val > 0) el.style.color = "#2ecc71";
  else if (val < 0) el.style.color = "#e74c3c";
  else el.style.color = "#aaa";
}

/* =========================
   CHART RENDER (BULLETPROOF)
   ========================= */

function renderChart(data) {
  if (!chartEl) return;

  chartEl.innerHTML = "";

  if (!Array.isArray(data) || data.length < 2) {
    chartEl.innerHTML = `<div style="padding:16px;color:#aaa">No chart data</div>`;
    return;
  }

  // FORCE REAL DIMENSIONS (even if CSS fails)
  const rect = chartEl.getBoundingClientRect();
  const width = Math.max(rect.width || 0, 700);
  const height = Math.max(rect.height || 0, 320);

  // Extract prices
  const prices = data.map(d => d.close).filter(n => !isNaN(n));
  const min = Math.min(...prices);
  const max = Math.max(...prices);

// =========================
// CHART SCALING (ANTI-FLAT)
// =========================

// Clean price values
const prices = data
  .map(d => Number(d.close))
  .filter(v => Number.isFinite(v));

if (prices.length < 2) {
  chartEl.innerHTML = `<div style="padding:16px;color:#aaa">No chart data</div>`;
  return;
}

// Dimensions (force usable size)
const rect = chartEl.getBoundingClientRect();
const width = Math.max(700, Math.floor(rect.width));
const height = Math.max(420, Math.floor(rect.height));

// Raw min / max
let min = Math.min(...prices);
let max = Math.max(...prices);

// --- Yahoo-style Y scaling ---
const realRange = max - min;
const minVisibleRange = max * 0.06; // 6% minimum movement
const range = Math.max(realRange, minVisibleRange);

// Recenter scale
const mid = (max + min) / 2;
min = mid - range / 2;
max = mid + range / 2;

// Build points
const points = prices.map((p, i) => {
  const x = (i / (prices.length - 1)) * width;
  const y = height - ((p - min) / (max - min)) * height;
  return `${x},${y}`;
});

const lastY = points[points.length - 1].split(",")[1];

// =========================
// SVG OUTPUT
// =========================
chartEl.innerHTML = `
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 ${width} ${height}"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4c8dff" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#4c8dff" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <polyline
      points="${points.join(" ")}"
      fill="none"
      stroke="#4c8dff"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <polygon
      points="0,${height} ${points.join(" ")} ${width},${height}"
      fill="url(#fillGrad)"
    />

    <circle
      cx="${width}"
      cy="${lastY}"
      r="4"
      fill="#2ecc71"
    />
  </svg>
`;


/* =========================
   LOAD STOCK DATA
   ========================= */

async function loadStock(period = "1y") {
  if (!TICKER) return;

  try {
    const res = await fetch(
      `${API_BASE}/history?ticker=${TICKER}&period=${period}`
    );

    if (!res.ok) throw new Error("API error");

    const json = await res.json();
    const meta = json.meta || {};
    const prices = json.prices || [];

    /* ---------- HEADER ---------- */

    setText(tickerEl, TICKER);
    setText(nameEl, meta.longName || TICKER);
    setText(sectorEl, meta.sector || "—");

    if (meta.price != null) {
      setText(priceEl, `$${fmt(meta.price)}`);
    } else {
      setText(priceEl, "$—");
    }

    if (prices.length >= 2) {
      const last = prices[prices.length - 1].close;
      const prev = prices[prices.length - 2].close;
      const diff = last - prev;
      const pct = (diff / prev) * 100;

      setText(changeEl, `${fmt(diff)} (${fmt(pct)}%)`);
      colorize(changeEl, diff);
    } else {
      setText(changeEl, "—");
    }

    /* ---------- STATS ---------- */

    setText(
      prevCloseEl,
      prices.length >= 2 ? fmt(prices[prices.length - 2].close) : "—"
    );

    setText(high52El, fmt(meta.high52w));
    setText(peEl, fmt(meta.pe));
    setText(pegEl, fmt(meta.peg));
    setText(epsEl, fmt(meta.eps));

    // Dividend already % from backend
    setText(
      divEl,
      meta.dividendYieldPct != null
        ? `${fmt(meta.dividendYieldPct)}%`
        : "—"
    );

    /* ---------- CHART ---------- */

    renderChart(prices);
  } catch (err) {
    if (chartEl) {
      chartEl.innerHTML =
        `<div style="padding:16px;color:#e74c3c">Error loading chart</div>`;
    }
    console.error(err);
  }
}

/* =========================
   TIMEFRAME BUTTONS
   ========================= */

document.querySelectorAll("[data-period]").forEach(btn => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("[data-period]")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    loadStock(btn.dataset.period);
  });
});

/* =========================
   INIT
   ========================= */

if (!TICKER) {
  alert("No ticker provided");
} else {
  loadStock("1y");
}
