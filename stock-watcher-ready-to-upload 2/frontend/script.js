const API = "https://stockapp-kym2.onrender.com";

function sparkline(values, width = 80, height = 24) {
  if (!values || values.length < 2) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline
        fill="none"
        stroke="#3ddc84"
        stroke-width="1.5"
        points="${pts}"
      />
    </svg>
  `;
}

let currentData = [];
let sortKey = null;
let sortAsc = true;

function cls(x) {
  if (x === null || x === undefined) return "";
  return x > 0 ? "pos" : x < 0 ? "neg" : "";
}

function fmt(x, digits = 2) {
  if (x === null || x === undefined) return "—";
  return Number(x).toFixed(digits);
}

function sortBy(key) {
  if (sortKey === key) {
    sortAsc = !sortAsc;
  } else {
    sortKey = key;
    sortAsc = true;
  }

  currentData.sort((a, b) => {
    const x = a[key];
    const y = b[key];

    if (x === null || x === undefined) return 1;
    if (y === null || y === undefined) return -1;

    if (typeof x === "string") {
      return sortAsc ? x.localeCompare(y) : y.localeCompare(x);
    }

    return sortAsc ? x - y : y - x;
  });

  renderTable();
}

function renderTable() {
  let html = `
    <table>
      <thead>
        <tr>
          <th onclick="sortBy('ticker')">Ticker</th>
          <th onclick="sortBy('sector')">Sector</th>
          <th onclick="sortBy('price')">Price</th>
          <th onclick="sortBy('pe')">P/E</th>
          <th onclick="sortBy('high52w')">52W High</th>
          <th onclick="sortBy('pctFrom52wHigh')">% from 52W</th>
          <th onclick="sortBy('weeklyChangePct')">1W %</th>
          <th onclick="sortBy('monthlyChangePct')">1M %</th>
        </tr>
      </thead>
      <tbody>
  `;

  currentData.forEach(s => {
    html += `
      <tr>
        <td>${s.ticker}</td>
        <td>${s.sector || "—"}</td>
        <td>${fmt(s.price)}</td>
        <td>${fmt(s.pe)}</td>
        <td>${fmt(s.high52w)}</td>
        <td class="${cls(s.pctFrom52wHigh)}">${fmt(s.pctFrom52wHigh)}%</td>
        <td class="${cls(s.weeklyChangePct)}">${fmt(s.weeklyChangePct)}%</td>
        <td class="${cls(s.monthlyChangePct)}">${fmt(s.monthlyChangePct)}%</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  document.getElementById("table").innerHTML = html;
}

async function load() {
  const tickers = document
    .getElementById("tickers")
    .value.trim()
    .split(/\s+/);

  if (tickers.length === 0) return;

  const qs = tickers.map(t => `tickers=${t}`).join("&");
  const r = await fetch(`${API}/metrics?${qs}`);
  const j = await r.json();

  currentData = j.data;
  sortKey = null;
  sortAsc = true;

  renderTable();
}
function saveWatchlist() {
  const tickers = document.getElementById("tickers").value.trim();
  if (!tickers) {
    alert("Nothing to save");
    return;
  }
  localStorage.setItem("stockWatcherWatchlist", tickers);
  alert("Watchlist saved");
}

function loadWatchlist() {
  const saved = localStorage.getItem("stockWatcherWatchlist");
  if (!saved) {
    alert("No saved watchlist");
    return;
  }
  document.getElementById("tickers").value = saved;
  load();
}
window.addEventListener("load", () => {
  const saved = localStorage.getItem("stockWatcherWatchlist");
  if (saved) {
    document.getElementById("tickers").value = saved;
    load();
  }
});
