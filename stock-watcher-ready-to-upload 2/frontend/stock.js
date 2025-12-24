/* =========================
   Valyxis — Stock Chart Page
   ========================= */

const params = new URLSearchParams(window.location.search);
const TICKER = (params.get("ticker") || "").toUpperCase();
const API_BASE =
  window.VALYXIS_API_BASE ||
  "https://stockapp-kym2.onrender.com";


/* =========================
   DOM ELEMENTS
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
   STATE
   ========================= */

let lastChartData = [];

/* =========================
   HELPERS
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
   CHART RENDERER (SVG)
   ========================= */

function renderChart(data) {
  if (!chartEl) return;

  if (!Array.isArray(data) || data.length < 2) {
    chartEl.innerHTML = "<div class='chart-error'>No data</div>";
    return;
  }

  lastChartData = data;

  const w = chartEl.clientWidth || 800;
  const h = chartEl.clientHeight || 360;

  const prices = data.map(d => d.close).filter(v => typeof v === "number");

  if (prices.length < 2) {
    chartEl.innerHTML = "<div class='chart-error'>Invalid data</div>";
    return;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = (max - min) * 0.1 || 1;

  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - (min - pad)) / ((max - min) + pad * 2)) * h;
    return `${x},${y}`;
  }).join(" ");

  const lastY = points.split(" ").pop().split(",")[1];

  chartEl.innerHTML = `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polyline
        points="${points}"
        fill="none"
        stroke="#4c8dff"
        stroke-width="2"
      />
      <circle
        cx="${w}"
        cy="${lastY}"
        r="4"
        fill="#2ecc71"
      />
    </svg>
  `;
}

/* =========================
   LOAD STOCK DATA
   ========================= */

async function loadStock(period = "1y") {
  if (!TICKER) return;

  try {
    const res = await fetch(
      `${API_BASE}/history?ticker=${encodeURIComponent(TICKER)}&period=${period}`
    );

    if (!res.ok) throw new Error("API error");

    const json = await res.json();

    const meta = json.meta || {};
    const prices = Array.isArray(json.prices) ? json.prices : [];

    /* ----- HEADER ----- */
    nameEl.textContent = meta.longName || TICKER;
    sectorEl.textContent = meta.sector || "—";

    priceEl.textContent =
      meta.price != null ? `$${fmt(meta.price)}` : "$—";

    /* ----- DAILY CHANGE ----- */
    if (prices.length >= 2) {
      const prev = prices.at(-2).close;
      const last = prices.at(-1).close;
      const diff = last - prev;
      const pct = (diff / prev) * 100;

      changeEl.textContent = `${fmt(diff)} (${fmt(pct)}%)`;
      colorize(changeEl, diff);
    } else {
      changeEl.textContent = "—";
    }

    /* ----- STATS ----- */
    prevCloseEl.textContent =
      prices.length >= 2 ? fmt(prices.at(-2).close) : "—";

    high52El.textContent = fmt(meta.high52w);
    peEl.textContent = fmt(meta.pe);
    pegEl.textContent = fmt(meta.peg);
    epsEl.textContent = fmt(meta.eps);

    // ✅ DIVIDEND IS ALREADY A PERCENT FROM BACKEND
    divEl.textContent =
      meta.dividendYieldPct != null
        ? fmt(meta.dividendYieldPct) + "%"
        : "—";

    /* ----- CHART ----- */
    renderChart(prices);

  } catch (err) {
    console.error(err);
    chartEl.innerHTML =
      "<div class='chart-error'>Error loading chart</div>";
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
