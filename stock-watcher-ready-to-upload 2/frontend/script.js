const API = "https://stockapp-kym2.onrender.com";

/* ---------- storage ---------- */

function getStore() {
  return JSON.parse(localStorage.getItem("stockWatcher")) || { watchlists: {} };
}

function saveStore(store) {
  localStorage.setItem("stockWatcher", JSON.stringify(store));
}

/* ---------- watchlists dashboard ---------- */

function renderWatchlists() {
  const store = getStore();
  const el = document.getElementById("watchlists");
  if (!el) return;

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

/* ---------- single watchlist ---------- */

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

/* ---------- table rendering (unchanged logic) ---------- */

function renderTable(data) {
  let html = `
    <table>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Company</th>
          <th>Price</th>
          <th>1D %</th>
          <th>P/E</th>
          <th>PEG</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach(s => {
    html += `
      <tr>
        <td>${s.ticker}</td>
        <td>${s.company || "—"}</td>
        <td>${s.price?.toFixed(2) ?? "—"}</td>
        <td class="${s.dailyChangePct > 0 ? "pos" : "neg"}">
          ${s.dailyChangePct?.toFixed(2) ?? "—"}%
        </td>
        <td>${s.pe?.toFixed(2) ?? "—"}</td>
        <td>${s.peg?.toFixed(2) ?? "—"}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  document.getElementById("table").innerHTML = html;
}

/* ---------- init ---------- */

window.addEventListener("load", () => {
  renderWatchlists();
  loadWatchlistView();
});
