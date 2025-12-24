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
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

  // Force usable height
  if (chartEl.clientHeight < 200) {
    chartEl.style.height = "420px";
  }

  const rect = chartEl.getBoundingClientRect();
  const width = Math.max(720, rect.width);
  const height = Math.max(420, rect.height);

  const closes = data.map(d => Number(d.close)).filter(Number.isFinite);

  let min = Math.min(...closes);
  let max = Math.max(...closes);

  // Anti-flat scaling (Yahoo-style)
  const realRange = max - min;
  const minVisibleRange = max * 0.06;
  const range = Math.max(realRange, minVisibleRange);
  const mid = (min + max) / 2;
  min = mid - range / 2;
  max = mid + range / 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.close - min) / (max - min)) * height;
    return { x, y, price: d.close, time: d.t };
  });

  chartEl.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4c8dff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#4c8dff" stop-opacity="0"/>
        </linearGradient>
      </defs>

      <!-- Area -->
      <polygon
        points="0,${height} ${points.map(p => `${p.x},${p.y}`).join(" ")} ${width},${height}"
        fill="url(#fillGrad)"
      />

      <!-- Line -->
      <polyline
        points="${points.map(p => `${p.x},${p.y}`).join(" ")}"
        fill="none"
        stroke="#4c8dff"
        stroke-width="2.5"
        stroke-linecap="round"
      />

      <!-- Crosshair -->
      <line id="crosshair" y1="0" y2="${height}" stroke="#8892b0" stroke-dasharray="4" opacity="0" />

      <!-- Hover point -->
      <circle id="hoverDot" r="5" fill="#fff" stroke="#4c8dff" stroke-width="2" opacity="0" />
    </svg>

    <div id="tooltip" style="
      position:absolute;
      pointer-events:none;
      background:#0b1220;
      color:#f4f7ff;
      border:1px solid rgba(255,255,255,0.1);
      border-radius:8px;
      padding:8px 10px;
      font-size:12px;
      opacity:0;
      transform:translate(-50%, -110%);
      white-space:nowrap;
    "></div>
  `;

  const svg = chartEl.querySelector("svg");
  const crosshair = chartEl.querySelector("#crosshair");
  const dot = chartEl.querySelector("#hoverDot");
  const tooltip = chartEl.querySelector("#tooltip");

  svg.addEventListener("mousemove", e => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());

    const idx = Math.round((cursor.x / width) * (points.length - 1));
    const p = points[Math.max(0, Math.min(points.length - 1, idx))];

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
      <strong>$${p.price.toFixed(2)}</strong><br/>
      ${formatDate(p.time)}
    `;
  });

  svg.addEventListener("mouseleave", () => {
    crosshair.style.opacity = 0;
    dot.style.opacity = 0;
    tooltip.style.opacity = 0;
  });
}


  const min = Math.min(...closes);
  const max = Math.max(...closes);

  // ✅ Prevent “flatness” even when range is tiny
  const rawRange = max - min;
  const range = rawRange > 0 ? rawRange : Math.max(Math.abs(min) * 0.02, 1); // 2% of price or $1
  const padding = range * 0.15;

  const denom = range + padding * 2;

  // Build points
  const points = closes.map((p, i) => {
    const x = (i / (closes.length - 1)) * width;
    const y = height - ((p - (min - padding)) / denom) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const lastXY = points[points.length - 1].split(",");
  const lastX = Number(lastXY[0]);
  const lastY = Number(lastXY[1]);

  chartEl.innerHTML = `
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 ${width} ${height}"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4c8dff" stop-opacity="0.35"></stop>
          <stop offset="100%" stop-color="#4c8dff" stop-opacity="0"></stop>
        </linearGradient>
      </defs>

      <!-- Area fill -->
      <polygon
        points="0,${height} ${points.join(" ")} ${width},${height}"
        fill="url(#fillGrad)"
      ></polygon>

      <!-- Line -->
      <polyline
        points="${points.join(" ")}"
        fill="none"
        stroke="#4c8dff"
        stroke-width="2.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      ></polyline>

      <!-- Last point -->
      <circle cx="${lastX}" cy="${lastY}" r="4.5" fill="#2ecc71"></circle>
    </svg>
  `;
}

/* =========================
   Load Data
   ========================= */

async function loadStock(period = "1y") {
  if (!TICKER) return;

  try {
    // show loading state
    if (chartEl) chartEl.innerHTML = `<div style="padding:16px;color:#aab2c0">Loading chart…</div>`;

    const url = `${API_BASE}/history?ticker=${encodeURIComponent(TICKER)}&period=${encodeURIComponent(period)}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }

    const json = await res.json();
    const meta = json.meta || {};
    const prices = Array.isArray(json.prices) ? json.prices : [];

    // Header
    setText(nameEl, meta.longName || TICKER);
    setText(sectorEl, meta.sector || "—");

    // Price (top right)
    if (meta.price != null) {
      priceEl && (priceEl.textContent = fmtMoney(meta.price));
    } else {
      priceEl && (priceEl.textContent = "$—");
    }

    // Change (use last two points in the *current timeframe*)
    if (prices.length >= 2) {
      const last = Number(prices[prices.length - 1].close);
      const prev = Number(prices[prices.length - 2].close);

      if (Number.isFinite(last) && Number.isFinite(prev) && prev !== 0) {
        const diff = last - prev;
        const pct = (diff / prev) * 100;

        changeEl && (changeEl.textContent = `${diff >= 0 ? "+" : ""}${fmt(diff)} (${diff >= 0 ? "+" : ""}${fmt(pct)}%)`);
        colorize(changeEl, diff);
      } else {
        changeEl && (changeEl.textContent = "—");
      }
    } else {
      changeEl && (changeEl.textContent = "—");
    }

    // Stats
    // Previous close: best effort
    const prevClose =
      prices.length >= 2 ? prices[prices.length - 2].close :
      prices.length === 1 ? prices[0].close :
      null;

    setText(prevCloseEl, fmt(prevClose));
    setText(high52El, fmt(meta.high52w));
    setText(peEl, fmt(meta.pe));
    setText(pegEl, fmt(meta.peg));
    setText(epsEl, fmt(meta.eps));

if (meta.dividendYieldPct != null && Number.isFinite(Number(meta.dividendYieldPct))) {
  const raw = Number(meta.dividendYieldPct);

  /*
    BACKEND REALITY CHECK:
    - Backend already multiplied by 100
    - So:
        75   → 0.75%
        2    → 0.02%
        0.6  → 0.006%
  */

  const percent = raw / 100;

  setText(divEl, `${fmt(percent, 2)}%`);
} else {
  setText(divEl, "—");
}

    // Render chart
    renderChart(prices);
  } catch (err) {
    console.error(err);
    if (chartEl) chartEl.innerHTML = `<div style="padding:16px;color:#ff6b6b">Error loading chart</div>`;

    // Don’t wipe your stats if the API fails; just show placeholders if needed
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
