const API = "https://stockapp-kym2.onrender.com";

function qs(id) {
  return document.getElementById(id);
}

function getTicker() {
  return new URLSearchParams(window.location.search).get("ticker");
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
  container.innerHTML = "";

  if (!prices || prices.length < 2) {
    console.warn("No price data");
    return;
  }

  // 🔑 FORCE dimensions
  const w = container.offsetWidth || 900;
  const h = container.offsetHeight || 420;
  const pad = 40;

  const values = prices.map(p => p.close);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

  const x = i => pad + (i / (prices.length - 1)) * (w - pad * 2);
  const y = v => h - pad - ((v - min) / (max - min)) * (h - pad * 2);

  let path = "";
  prices.forEach((p, i) => {
    path += (i === 0 ? "M" : "L") + `${x(i)},${y(p.close)} `;
  });

  const line = document.createElementNS(svg.namespaceURI, "path");
  line.setAttribute("d", path);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#4f8cff");
  line.setAttribute("stroke-width", "2");

  svg.appendChild(line);
  container.appendChild(svg);
}


/* ================= LOAD ================= */

async function loadStock(range = "1y") {
  const ticker = getTicker();
  if (!ticker) return;

  const res = await fetch(`${API}/history?ticker=${ticker}&period=${range}`);
  const data = await res.json();

  if (!data.meta || !data.prices) return;

  qs("ticker").textContent = ticker;
  qs("company").textContent = data.meta.longName || "—";
  qs("sector").textContent = data.meta.sector || "—";

  qs("price").textContent = data.meta.price ? `$${fmt(data.meta.price)}` : "—";

  if (data.prices.length >= 2) {
    const last = data.prices.at(-1).close;
    const prev = data.prices.at(-2).close;
    const delta = last - prev;
    const pct = (delta / prev) * 100;
    qs("change").textContent = `${fmt(delta)} (${fmt(pct)}%)`;
    qs("change").className = cls(delta);
    qs("prevClose").textContent = fmt(prev);
  }

  qs("high52w").textContent = fmt(data.meta.high52w);
  qs("pe").textContent = fmt(data.meta.pe);
  qs("eps").textContent = fmt(data.meta.eps);
  qs("dividend").textContent = data.meta.dividendYieldPct
    ? fmt(data.meta.dividendYieldPct) + "%"
    : "—";

  setTimeout(() => {
  drawChart(qs("chart"), data.prices);
}, 50);

  });
}

/* ================= CONTROLS ================= */

document.querySelectorAll(".tf").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tf").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadStock(btn.dataset.range);
  };
});

loadStock("1y");
