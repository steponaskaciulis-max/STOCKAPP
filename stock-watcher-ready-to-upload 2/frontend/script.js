const API = "https://stockapp-kym2.onrender.com";

function cls(x) {
  if (x === null || x === undefined) return "";
  return x > 0 ? "pos" : x < 0 ? "neg" : "";
}

function fmt(x, digits = 2) {
  if (x === null || x === undefined) return "—";
  return Number(x).toFixed(digits);
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

  let html = `
    <table>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Sector</th>
          <th>Price</th>
          <th>P/E</th>
          <th>52W High</th>
          <th>% from 52W</th>
          <th>1W %</th>
          <th>1M %</th>
        </tr>
      </thead>
      <tbody>
  `;

  j.data.forEach(s => {
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
