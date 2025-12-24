const API = "https://stockapp-kym2.onrender.com";

/* ================= STORAGE ================= */

const STORE_KEY = "valyxis";

function getStore() {
  return JSON.parse(localStorage.getItem(STORE_KEY)) || { watchlists: {} };
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

/* ================= DASHBOARD ================= */

function renderWatchlists() {
  const el = document.getElementById("watchlists");
  if (!el) return;

  const store = getStore();
  const names = Object.keys(store.watchlists);

  if (names.length === 0) {
    el.innerHTML = "<p style='color:#888'>No watchlists yet.</p>";
    return;
  }

  el.innerHTML = names
    .map(
      (name) => `
      <div class="watchlist-card" onclick="openWatchlist('${name.replace(/'/g, "\\'")}')">
        <h3>${name}</h3>
        <p>${store.watchlists[name].length} stocks</p>
      </div>
    `
    )
    .join("");
}

function createWatchlist() {
  const name = prompt("New watchlist name:");
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

  const titleEl = document.getElementById("watchlistTitle");
  if (titleEl) titleEl.innerText = name;

  const input = document.getElementById("tickers");
  if (input) input.value = tickers.join(" ");

  const tableEl = document.getElementById("table");

  if (tickers.length === 0) {
    tableEl.innerHTML =
      "<p style='color:#888'>No tickers yet. Add some above and click 💾 Save.</p>";
    return;
  }

  const qs = tickers.map((t) => `tickers=${encodeURIComponent(t)}`).join("&");
  const r = await fetch(`${API}/metrics?${qs}`);
  const json = await r.json();

  renderTable(json.data || []);

  const updated = document.getElementById("updated");
  if (updated) updated.innerText = "Updated: " + new Date().toLocaleTimeString();
}

function updateWatchlist() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");
  if (!name) return;

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
  const n = Number(x);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function cls(x) {
  if (x === null || x === undefined) return "";
  return x > 0 ? "pos" : x < 0 ? "neg" : "";
}

/* ================= SPARKLINES ================= */

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

  const up = values[values.length - 1] >= values[0];
  const color = up ? "#3ddc84" : "#ff6b6b";

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline fill="none" stroke="${color}" stroke-width="1.5" points="${pts}" />
    </svg>
  `;
}

/* ================= TABLE ================= */

function renderTable(data) {
  let html = `
    <table>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Company</th>
          <th>Spark</th>
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

  data.forEach((s) => {
    html += `
      <tr>
        <td><strong>${s.ticker}</strong></td>
        <td>${s.company || "—"}</td>
        <td>${sparkline(s.spark)}</td>
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

  const saveBtn = document.getElementById("saveWatchlist");
  if (saveBtn) saveBtn.onclick = updateWatchlist;

  const createBtn = document.getElementById("createWatchlist");
  if (createBtn) createBtn.onclick = createWatchlist;
});
