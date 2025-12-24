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

  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const trendUp = values.at(-1) >= values[0];
  const color = trendUp ? "#3ddc84" : "#ff6b6b";

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline
        fill="none"
        stroke="${color}"
        stroke-width="1.5"
        points="${pts}"
      />
    </svg>
  `;
}

/* ---------- sorting ---------- */

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

    if (x == null) return 1;
    if (y == null) return -1;

    if (typeof x === "string") {
      return sortAsc ? x.localeCompare(y) : y.localeCompare(x);
    }

    return sortAsc ? x - y : y - x;
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
        <td>${s.ticker}</td>
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

  html += `
      </tbody>
    </table>
  `;

  document.getElementById("table").innerHTML = html;
}

/* ---------- data loading ---------- */

async function load() {
  const input = document.getElementById("tickers");
  const btn = document.getElementById("loadBtn");
  const icon = document.getElementById("loadIcon");
  const spinner = document.getElementById("spinner");

  const tickers = input.value.trim().split(/\s+/).filter(Boolean);
  if (!tickers.length) return;

  // UI loading state
  btn.disabled = true;
  icon.classList.add("hidden");
  spinner.classList.remove("hidden");

  try {
    const qs = tickers.map(t => `tickers=${t}`).join("&");
    const res = await fetch(`${API}/metrics?${qs}`);
    const json = await res.json();

    currentData = json.data;
    sortKey = null;
    sortAsc = true;

    renderTable();

    const updated = document.getElementById("updated");
    if (updated) {
      updated.innerText = "Updated: " + new Date().toLocaleTimeString();
    }
  } catch (e) {
    alert("Failed to load data");
  } finally {
    btn.disabled = false;
    spinner.classList.add("hidden");
    icon.classList.remove("hidden");
  }
}

/* ---------- watchlists ---------- */

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

/* ---------- keyboard + auto-load ---------- */

window.addEventListener("load", () => {
  const input = document.getElementById("tickers");

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      load();
    }
  });

  const saved = localStorage.getItem("stockWatcherWatchlist");
  if (saved) {
    input.value = saved;
    load();
  }
});
