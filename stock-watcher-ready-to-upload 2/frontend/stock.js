/* =========================
   Valyxis — Stock Chart Page
   ========================= */

(() => {
  const params = new URLSearchParams(window.location.search);
  const TICKER = (params.get("ticker") || "").toUpperCase();

  // ✅ Your Render backend base URL:
  const API_BASE = "https://stockapp-kym2.onrender.com";

  // --- Helpers ---
  const $ = (sel) => document.querySelector(sel);

  function pick(...selectors) {
    for (const s of selectors) {
      const el = $(s);
      if (el) return el;
    }
    return null;
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function fmt(n, d = 2) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return Number(n).toFixed(d);
  }

  function fmtMoney(n, d = 2) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return `$${Number(n).toFixed(d)}`;
  }

  function fmtPct(n, d = 2) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return `${Number(n).toFixed(d)}%`;
  }

  function colorize(el, val) {
    if (!el) return;
    if (val > 0) el.style.color = "#2ecc71";
    else if (val < 0) el.style.color = "#e74c3c";
    else el.style.color = "#aeb3bd";
  }

  function buildHistoryUrl(period, ticker = TICKER) {
    return `${API_BASE}/history?ticker=${encodeURIComponent(
      ticker
    )}&period=${encodeURIComponent(period)}`;
  }

  // --- DOM targets ---
  const chartEl = pick("#chart", ".chart-container #chart");

  const priceEl = pick("#price", "#header-price", ".js-price");
  const changeEl = pick("#change", "#header-change", ".js-change");

  const tickerEl = pick("#ticker", ".js-ticker");
  const nameEl = pick("#company-name", ".js-company-name");
  const sectorEl = pick("#company-sector", ".js-sector");

  const prevCloseEl = pick("#prev-close", ".js-prev-close");
  const high52El = pick("#high-52", ".js-high52");
  const peEl = pick("#pe", ".js-pe");
  const pegEl = pick("#peg", ".js-peg");
  const epsEl = pick("#eps", ".js-eps");
  const divEl = pick("#dividend", ".js-dividend");

  // --- Chart (SVG) ---
  function renderChart(data) {
    if (!chartEl) return;

    if (!Array.isArray(data) || data.length < 2) {
      chartEl.innerHTML = "<div class='chart-error'>No chart data</div>";
      return;
    }

    const rect = chartEl.getBoundingClientRect();
const w = Math.max(600, Math.floor(rect.width || chartEl.clientWidth));
const h = 420; // hard lock height to prevent flattening

    const prices = data
      .map((d) => d.close)
      .filter((x) => x != null && !Number.isNaN(Number(x)));

    if (prices.length < 2) {
      chartEl.innerHTML = "<div class='chart-error'>No chart data</div>";
      return;
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = 0.1 * (max - min || 1);

    const points = prices
      .map((p, i) => {
        const x = (i / (prices.length - 1)) * w;
        const y =
          h -
          ((p - (min - pad)) / ((max - min) + pad * 2)) * h;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

    const last = points.split(" ").pop().split(",");
    const lastX = last[0];
    const lastY = last[1];

    chartEl.innerHTML = `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4c8dff" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#4c8dff" stop-opacity="0" />
          </linearGradient>
        </defs>

        <g opacity="0.18">
          ${Array.from({ length: 5 })
            .map((_, i) => {
              const y = ((i / 4) * h).toFixed(2);
              return `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#ffffff" stroke-width="1"/>`;
            })
            .join("")}
        </g>

        <path d="M 0 ${h} L ${points.replace(/ /g, " L ")} L ${w} ${h} Z" fill="url(#areaGrad)"></path>

        <polyline points="${points}" fill="none" stroke="#4c8dff" stroke-width="2.25" />

        <circle cx="${lastX}" cy="${lastY}" r="4.5" fill="#2ecc71"></circle>
      </svg>
    `;
  }

  // --- Load Data ---
  async function loadStock(period = "1y") {
    try {
      if (!TICKER) throw new Error("No ticker provided");

      const url = buildHistoryUrl(period);
      const r = await fetch(url);

      if (!r.ok) throw new Error(`API error ${r.status}`);

      const json = await r.json();

      const meta = json.meta || {};
      const prices = Array.isArray(json.prices) ? json.prices : [];

      setText(tickerEl, json.ticker || TICKER);
      setText(nameEl, meta.longName || TICKER);
      setText(sectorEl, meta.sector || "—");
      setText(priceEl, meta.price != null ? fmtMoney(meta.price) : "—");

      if (prices.length >= 2) {
        const prev = prices[prices.length - 2]?.close;
        const last = prices[prices.length - 1]?.close;
        if (prev != null && last != null) {
          const diff = last - prev;
          const pct = (diff / prev) * 100;
          setText(changeEl, `${fmtMoney(diff)} (${fmtPct(pct)})`);
          colorize(changeEl, diff);
        }
      } else {
        setText(changeEl, "—");
      }

      setText(prevCloseEl, prices.length >= 2 ? fmt(prices[prices.length - 2]?.close) : "—");
      setText(high52El, meta.high52w != null ? fmt(meta.high52w) : "—");
      setText(peEl, meta.pe != null ? fmt(meta.pe) : "—");
      setText(pegEl, meta.peg != null ? fmt(meta.peg) : "—");
      setText(epsEl, meta.eps != null ? fmt(meta.eps) : "—");
      setText(divEl, meta.dividendYieldPct != null ? fmtPct(meta.dividendYieldPct) : "—");

      renderChart(prices);
    } catch (e) {
      console.error("Error loading chart:", e);
      if (chartEl) chartEl.innerHTML = "<div class='chart-error'>Error loading chart</div>";
    }
  }

  function wireButtons() {
    const buttons = document.querySelectorAll("[data-period]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        loadStock(btn.dataset.period || "1y");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!TICKER) {
      alert("No ticker provided. Use URL like: stock.html?ticker=AAPL");
      return;
    }
    wireButtons();
    loadStock("1y");
  });
})();
