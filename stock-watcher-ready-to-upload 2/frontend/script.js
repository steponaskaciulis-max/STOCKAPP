const API = "https://stockapp-kym2.onrender.com";

function cls(x) {
  return x > 0 ? "pos" : x < 0 ? "neg" : "";
}

async function load() {
  const t = document
    .getElementById("tickers")
    .value.trim()
    .split(/\s+/);

  const qs = t.map(x => `tickers=${x}`).join("&");
  const r = await fetch(`${API}/metrics?${qs}`);
  const j = await r.json();

  let html = "";

  j.data.forEach(s => {
    const val =
      s.weeklyChangePct === null || s.weeklyChangePct === undefined
        ? "--"
        : s.weeklyChangePct.toFixed(2);

    html += `<div>
      ${s.ticker}
      <span class="${cls(s.weeklyChangePct)}">${val}%</span>
    </div>`;
  });

  document.getElementById("table").innerHTML = html;
}
