const API = "https://stockapp-kym2.onrender.com";

/* ================= STORAGE ================= */

function getStore() {
  return JSON.parse(localStorage.getItem("stockWatcher")) || { watchlists: {} };
}

function saveStore(store) {
  localStorage.setItem("stockWatcher", JSON.stringify(store));
}

/* ================= DASHBOARD ================= */

function renderWatchlists() {
  const el = document.getElementById("watchlists");
  if (!el) return;

  const store = getStore();
  const names = Object.keys(store.watchlists);

  if (names.length === 0) {
    el.innerHTML = "<p>No watchlists yet.</p>";
    return;
  }

  el.innerHTML = names.map(name => `
    <div class="watchlist-card" onclick="openWatchlist('${name}')">
      <h3>${name}</h3>
      <p>${store.watchlists[name].length} stocks</p>
    </div>
  `).join("");
}

function createWatchlist() {
  const name = prompt("Watchlist name:");
  if (!name) return;

  const store = getStore();
  if (store.watchlists[name]) {
    alert("Watchlist already exists");
    return;
  }

  store.watchlists[name] = [];
  saveStore(store);
  renderWatchlists();
}

function openWatchlist(name) {
  window.location.href = `watchlist.html?name=${encodeURIComponent(name)}`;
}

/* ================= WATCHLIST VIEW ================= */

async function loadWatchlistView() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");
  if (!name) return;

  const store = getStore();
  const tickers = store.watchlists[name] || [];

  document.getElementById("watchlistTitle").innerText = name;
  document.getElementById("tickers").value = tickers.join(" ");

  if (tickers.length === 0) return;

  const qs = tickers.map(t => `tickers=${t}`).join("&");
  const r = await fetch(`${API}/metrics?${qs}`);
  const data = (await r.json()).data;

  renderTable(data);

  document.getElementById("updated").innerText =
    "Updated: " + new Date().toLocaleTimeString();
}

function updateWatchlist() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");

  const tickers = document
    .getElementById("tickers")
    .value.trim()
    .split(/\s+/)
    .filter(Boolean);

  const store = getStore();
  store.watchlists[name] = tickers;
  saveStore(store);

  loadWatchlistView();
}

/* ================= HELPERS ================= */

function fmt(x, digits = 2) {
  if (x === null || x === undefined) return "—";
  return Number(x).toFixed(digits);
}

function cls(x) {
  if (x === null || x === undefined) return "";
  return x > 0 ? "pos" : x < 0 ? "neg" : "";
}

/* ================= TABLE (FULL DATA) ================= */

function renderTable(data) {
  let html = `
    <table>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Company</th>
          <th>Sector</th>

          <th>Price</th>
          <th>1D %</th>
          <th>1W %</th>
          <th>1M %</th>

          <th>P/E</th>
          <th>PEG</th>
          <th>EPS</th>
          <th>Div %</th>

          <th>52W High</th>
          <th>Δ from 52W</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach(s => {
    html += `
      <tr>
        <td><strong>${s.ticker}</strong></td>
        <td>${s.company || "—"}</td>
        <td>${s.sector || "—"}</td>

        <td>${fmt(s.price)}</td>
        <td class="${cls(s.dailyChangePct)}">${fmt(s.dailyChangePct)}%</td>
        <td class="${cls(s.weeklyChangePct)}">${fmt(s.weeklyChangePct)}%</td>
        <td class="${cls(s.monthlyChangePct)}">${fmt(s.monthlyChangePct)}%</td>

        <td>${fmt(s.pe)}</td>
        <td>${fmt(s.peg)}</td>
        <td>${fmt(s.eps)}</td>
        <td>${fmt(s.dividendYieldPct)}%</td>

        <td>${fmt(s.high52w)}</td>
        <td class="${cls(s.pctFrom52wHigh)}">${fmt(s.pctFrom52wHigh)}%</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  document.getElementById("table").innerHTML = html;
}

/* ================= INIT ================= */

window.addEventListener("load", () => {
  renderWatchlists();
  loadWatchlistView();
});
