const API = "https://stockapp-kym2.onrender.com";

let currentData = [];
let sortKey = null;
let sortAsc = true;

/* ---------- helpers ---------- */

function cls(x) {
  if (x === null || x === undefined) return "";
  return x > 0 ? "pos" : x < 0 ? "neg" : "";
}

function fmt(x, digits = 2) {
  if (x === null || x === undefined) return "—";
  return Number(x).toFixed(digits);
}

/* ---------- sparkline ---------- */

function sparkline(values, width = 90, height = 24) {
  if (!values || values.length < 2) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const color = values.at(-1) >= values[0] ? "#3ddc84" : "#ff6b6b";

  return `
    <svg width="${width}" height="${height}">
      <polyline fill="none" stroke="${color}" stroke-width="1.5" points="${pts}" />
    </svg>
  `;
}

/* ---------- sorting ---------- */

function sortBy(key) {
  sortAsc = sortKey === key ? !sortAsc : true;
  sortKey = key;

  currentData.sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (x == null) return 1;
    if (y == null) return -1;
    return typeof x === "string"
      ? sortAsc ? x.localeCompare(y) : y.localeCompare(x)
      : sortAsc ? x - y : y - x;
  });

  renderTable();
}

/* ---------- rendering ---------- */

function renderTable() {
  let html = `
    <table>
      <thead>
        <tr>
          <th onclick="sortBy('ticker')">Ticker</th>
          <th onclick="sortBy('company')">Company</th>
          <th>Spark</th>
          <th onclick="sortBy('sector')">Sector</th>

          <th onclick="sortBy('price')">Price</th>
          <th onclick="sortBy('dailyChangePct')">1D %</th>

          <th onclick="sortBy('pe')">P/E</th>
          <th onclick="sortBy('peg')">PEG</th>

          <th onclick="sortBy('eps')">EPS</th>
          <th onclick="sortBy('dividendYieldPct')">Div %</th>

          <th onclick="sortBy('weeklyChangePct')">1W %</th>
          <th onclick="sortBy('monthlyChangePct')">1M %</th>
        </tr>
      </thead>
      <tbody>
  `;

  currentData.forEach(s => {
    html += `
      <tr>
        <td><strong>${s.ticker}</strong></td>
        <td>${s.company || "—"}</td>
        <td>${sparkline(s.spark)}</td>
        <td>${s.sector || "—"}</td>

        <td>${fmt(s.price)}</td>
        <td class="${cls(s.dailyChangePct)}">${fmt(s.dailyChangePct)}%</td>

        <td>${fmt(s.pe)}</td>
        <td>${fmt(s.peg)}</td>

        <td>${fmt(s.eps)}</td>
        <td>${fmt(s.dividendYieldPct)}%</td>

        <td class="${cls(s.weeklyChangePct)}">${fmt(s.weeklyChangePct)}%</td>
        <td class="${cls(s.monthlyChangePct)}">${fmt(s.monthlyChangePct)}%</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  document.getElementById("table").innerHTML = html;
}

/* ---------- load ---------- */

async function load() {
  const input = document.getElementById("tickers");
  const btn = document.getElementById("loadBtn");
  const icon = document.getElementById("loadIcon");
  const spinner = document.getElementById("spinner");

  const tickers = input.value.trim().split(/\s+/).filter(Boolean);
  if (!tickers.length) return;

  btn.disabled = true;
  icon.classList.add("hidden");
  spinner.classList.remove("hidden");

  try {
    const qs = tickers.map(t => `tickers=${t}`).join("&");
    const r = await fetch(`${API}/metrics?${qs}`);
    currentData = (await r.json()).data;
    sortKey = null;
    renderTable();
    document.getElementById("updated").innerText =
      "Updated: " + new Date().toLocaleTimeString();
  } finally {
    btn.disabled = false;
    spinner.classList.add("hidden");
    icon.classList.remove("hidden");
  }
}

/* ---------- watchlist + keyboard ---------- */

function saveWatchlist() {
  localStorage.setItem(
    "stockWatcherWatchlist",
    document.getElementById("tickers").value.trim()
  );
  alert("Watchlist saved");
}

function loadWatchlist() {
  const v = localStorage.getItem("stockWatcherWatchlist");
  if (!v) return alert("No watchlist");
  document.getElementById("tickers").value = v;
  load();
}

window.addEventListener("load", () => {
  document.getElementById("tickers").addEventListener("keydown", e => {
    if (e.key === "Enter") load();
  });
});
