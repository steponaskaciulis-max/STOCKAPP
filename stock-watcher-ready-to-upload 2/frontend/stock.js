const API = "https://stockapp-kym2.onrender.com";

/* ================= HELPERS ================= */

function $(id) {
  return document.getElementById(id);
}

function getTicker() {
  const t = new URLSearchParams(window.location.search).get("ticker");
  console.log("Ticker from URL:", t);
  return t;
}

function fmt(x, d = 2) {
  if (x === null || x === undefined || isNaN(x)) return "—";
  return Number(x).toFixed(d);
}

function cls(x) {
  if (x === null || x === undefined) return "";
  return x >= 0 ? "positive" : "negative";
}

/* ================= CHART ================= */

function drawChart(container, prices) {
  console.log("Drawing chart with", prices?.length, "points");

  container.innerHTML = "";

  if (!prices || prices.length < 2) {
    container.innerHTML = "<div style='color:#888'>No chart data</div>";
    return;
  }

  const w = container.offsetWidth || 900;
  const h = container.offsetHeight || 420;
  const pad = 40;

  const values = prices.map(p => p.close);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);

  const x = i => pad + (i / (prices.length - 1)) * (w - pad * 2);
  const y = v => h - pad - ((v - min) / (max - min)) * (h - pad * 2);

  let d = "";
  prices.forEach((p, i) => {
    d += (i === 0 ? "M" : "L") + `${x(i)},${y(p.close)} `;
  });

  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", d);
  path.setAttribute("stroke", "#4f8cff");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("fill", "none");

  svg.appendChild(path);
  container.appendChild(svg);
}

/* ================= LOAD ================= */

async function loadStock(period = "1y") {
  const ticker = getTicker();
  if (!ticker) {
    console.error("No ticker in URL");
    return;
  }

  const url = `${API}/history?ticker=${encodeURIComponent(ticker)}&period=${period}`;
  console.log("Fetching:", url);

  const res = await fetch(url);
  const data = await res.json();

  console.log("API response:", data);

  window.__lastChartData = data.prices;

  if (!data || !data.meta) {
    console.error("Invalid API response");
    return;
  }

  $("ticker").textContent = ticker.toUpperCase();
  $("company").textContent = data.meta.longName || "—";
  $("sector").textContent = data.meta.sector || "—";

  $("price").textContent =
    data.meta.price ? `$${fmt(data.meta.price)}` : "—";

  if (data.prices && data.prices.length >= 2) {
    const prev = data.prices.at(-2).close;
    const last = data.prices.at(-1).close;
    const delta = last - prev;
    const pct = (delta / prev) * 100;

    $("change").textContent = `${fmt(delta)} (${fmt(pct)}%)`;
    $("change").className = cls(delta);
    $("prevClose").textContent = fmt(prev);
  }

  $("high52w").textContent = fmt(data.meta.high52w);
  $("pe").textContent = fmt(data.meta.pe);
  $("peg").textContent = fmt(data.meta.peg);
  $("eps").textContent = fmt(data.meta.eps);

  dividendEl.textContent =
  meta.dividendYieldPct != null
    ? Number(meta.dividendYieldPct).toFixed(2) + "%"
    : "—";
e
  setTimeout(() => {
    drawChart($("chart"), data.prices);
  }, 100);
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready — loading stock");
  loadStock("1y");

  document.querySelectorAll(".tf").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tf").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadStock(btn.dataset.range);
    });
  });
});
