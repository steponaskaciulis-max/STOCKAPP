/* =========================
   Valyxis — Stock Chart Page
   ========================= */

const params = new URLSearchParams(window.location.search);
const TICKER = (params.get("ticker") || "").toUpperCase();
const API_BASE = "";

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
let currentPeriod = "1y";

/* =========================
   Helpers
   ========================= */

function fmt(n, d = 2) {
  return n == null || isNaN(n) ? "—" : Number(n).toFixed(d);
}

function colorize(el, val) {
  if (!el) return;
  if (val > 0) el.style.color = "#2ecc71";
  else if (val < 0) el.style.color = "#e74c3c";
  else el.style.color = "#aaa";
}

/* =========================
   Chart (SVG)
   ========================= */

function renderChart(data) {
  if (!chartEl || !data || data.length < 2) {
    chartEl.innerHTML = `<div style="padding:16px;color:#aaa">No chart data</div>`;
    return;
  }

  lastChartData = data;

  // Use actual rendered size of the box
  const rect = chartEl.getBoundingClientRect();
  const w = Math.max(800, Math.floor(rect.width));
  const h = Math.max(420, Math.floor(rect.height));

  // Extract prices and REMOVE invalid values
  const prices = data
    .map(d => Number(d.close))
    .filter(v => Number.isFinite(v));

  if (prices.length < 2) {
    chartEl.innerHTML = `<div style="padding:16px;color:#aaa">No chart data</div>`;
    return;
  }

  // ---- ROBUST SCALING (THIS FIXES FLAT CHARTS) ----
  const sorted = [...prices].sort((a, b) => a - b);
  const n = sorted.length;

  const min = sorted[Math.floor(n * 0.05)];
  const max = sorted[Math.ceil(n * 0.95) - 1];
  const range = max - min || 1;
  const pad = range * 0.15;

  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - (min - pad)) / (range + pad * 2)) * h;
    return `${x},${y}`;
  }).join(" ");

  chartEl.innerHTML = `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4c8dff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#4c8dff" stop-opacity="0"/>
        </linearGradient>
      </defs>

      <polyline
        points="${points}"
        fill="none"
        stroke="#4c8dff"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <polygon
        points="${points} ${w},${h} 0,${h}"
        fill="url(#fillGrad)"
      />

      <circle
        cx="${w}"
        cy="${points.split(" ").pop().split(",")[1]}"
        r="4"
        fill="#2ecc71"
      />
    </svg>
  `;
}

/* =========================
   Load Data
   ========================= */

async function loadStock(period = "1y") {
  currentPeriod = period;

  try {
    const res = await fetch(
      `${API_BASE}/history?ticker=${TICKER}&period=${period}`
    );

    if (!res.ok) throw new Error("API error");

    const json = await res.json();
    const { meta, prices } = json;

    // Header
    nameEl.textContent = meta.longName || TICKER;
    sectorEl.textContent = meta.sector || "—";
    priceEl.textContent = meta.price != null ? `$${fmt(meta.price)}` : "$—";

    // Change
    if (prices.length >= 2) {
      const diff = prices.at(-1).close - prices.at(-2).close;
      const pct = (diff / prices.at(-2).close) * 100;
      changeEl.textContent = `${fmt(diff)} (${fmt(pct)}%)`;
      colorize(changeEl, diff);
    } else {
      changeEl.textContent = "—";
    }

    // Stats
    prevCloseEl.textContent =
      prices.length >= 2 ? fmt(prices.at(-2).close) : "—";

    high52El.textContent = fmt(meta.high52w);
    peEl.textContent = fmt(meta.pe);
    pegEl.textContent = fmt(meta.peg);
    epsEl.textContent = fmt(meta.eps);

    divEl.textContent =
      meta.dividendYieldPct != null
        ? fmt(meta.dividendYieldPct) + "%"
        : "—";

    renderChart(prices);
  } catch (err) {
    chartEl.innerHTML = `<div style="padding:16px;color:#e74c3c">Error loading chart</div>`;
    console.error(err);
  }
}

/* =========================
   Timeframe Buttons
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
   Resize (keeps chart correct)
   ========================= */

window.addEventListener("resize", () => {
  if (lastChartData.length) {
    renderChart(lastChartData);
  }
});

/* =========================
   Init
   ========================= */

if (!TICKER) {
  alert("No ticker provided");
} else {
  loadStock("1y");
}
