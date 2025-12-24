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

/* =========================
   Helpers
   ========================= */

function fmt(n, d = 2) {
  return n == null || isNaN(n) ? "—" : Number(n).toFixed(d);
}

function colorize(el, val) {
  if (val > 0) el.style.color = "#2ecc71";
  else if (val < 0) el.style.color = "#e74c3c";
  else el.style.color = "#aaa";
}

/* =========================
   Chart (SVG)
   ========================= */

function renderChart(data) {
  if (!data || data.length < 2) {
    chartEl.innerHTML = "";
    return;
  }

  lastChartData = data;

  const w = chartEl.clientWidth;
  const h = chartEl.clientHeight;

  const prices = data.map(d => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = 0.1 * (max - min || 1);

  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - (min - pad)) / ((max - min) + pad * 2)) * h;
    return `${x},${y}`;
  }).join(" ");

  chartEl.innerHTML = `
    <svg width="${w}" height="${h}">
      <polyline
        points="${pts}"
        fill="none"
        stroke="#4c8dff"
        stroke-width="2"
      />
      <circle
        cx="${w}"
        cy="${pts.split(" ").pop().split(",")[1]}"
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
  const res = await fetch(
    `${API_BASE}/history?ticker=${TICKER}&period=${period}`
  );
  const json = await res.json();

  const { meta, prices } = json;

  // Header
  nameEl.textContent = meta.longName || TICKER;
  sectorEl.textContent = meta.sector || "—";

  priceEl.textContent = meta.price ? `$${fmt(meta.price)}` : "$—";

  // Change
  if (prices.length >= 2) {
    const diff = prices.at(-1).close - prices.at(-2).close;
    const pct = (diff / prices.at(-2).close) * 100;
    changeEl.textContent = `${fmt(diff)} (${fmt(pct)}%)`;
    colorize(changeEl, diff);
  } else {
    changeEl.textContent = "—";
  }

  // Stats (NO DOUBLE MULTIPLY)
  prevCloseEl.textContent =
    prices.length ? fmt(prices.at(-2)?.close) : "—";

  high52El.textContent = fmt(meta.high52w);
  peEl.textContent = fmt(meta.pe);
  pegEl.textContent = fmt(meta.peg);
  epsEl.textContent = fmt(meta.eps);

  // 🔥 FIXED DIVIDEND (already % from backend)
  divEl.textContent =
    meta.dividendYieldPct != null
      ? fmt(meta.dividendYieldPct) + "%"
      : "—";

  renderChart(prices);
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
   Init
   ========================= */

if (!TICKER) {
  alert("No ticker provided");
} else {
  loadStock("1y");
}
