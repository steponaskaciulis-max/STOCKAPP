const API_BASE = "https://stockapp-kym2.onrender.com";

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

function drawChart(container, data) {
  container.innerHTML = "";
  if (!data || data.length < 2) return;

  const w = container.clientWidth || 800;
  const h = container.clientHeight || 420;
  const pad = 40;

  const prices = data.map(d => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);

  const x = i => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = v => h - pad - ((v - min) / (max - min)) * (h - pad * 2);

  let path = "";
  data.forEach((d, i) => {
    path += (i === 0 ? "M" : "L") + `${x(i)},${y(d.close)} `;
  });

  const line = document.createElementNS(svg.namespaceURI, "path");
  line.setAttribute("d", path.trim());
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#4f8cff");
  line.setAttribute("stroke-width", "2");
  svg.appendChild(line);

  const first = data[0].close;
  const last = data[data.length - 1].close;

  const dot = document.createElementNS(svg.namespaceURI, "circle");
  dot.setAttribute("cx", x(data.length - 1));
  dot.setAttribute("cy", y(last));
  dot.setAttribute("r", 4);
  dot.setAttribute("fill", last >= first ? "#22c55e" : "#ef4444");
  svg.appendChild(dot);

  container.appendChild(svg);
}

async function loadStock(period = "1y") {
  const ticker = getTicker();
  if (!ticker) return;

  const res = await fetch(`${API_BASE}/history?ticker=${encodeURIComponent(ticker)}&period=${period}`);
  const json = await res.json();

  if (!json || !json.meta) return;

  document.getElementById("ticker").textContent = ticker.toUpperCase();
  document.getElementById("company").textContent = json.meta.longName || "—";
  document.getElementById("sector").textContent = json.meta.sector || "—";

  const priceVal = json.meta.price;
  document.getElementById("price").textContent =
    (priceVal === null || priceVal === undefined) ? "—" : `$${fmt(priceVal)}`;

  const prices = json.prices || [];
  if (prices.length >= 2) {
    const prev = prices[prices.length - 2].close;
    const last = prices[prices.length - 1].close;
    const delta = last - prev;
    const pct = (delta / prev) * 100;

    const changeEl = document.getElementById("change");
    changeEl.textContent = `${delta >= 0 ? "+" : ""}${fmt(delta)} (${fmt(pct)}%)`;
    changeEl.className = `change ${cls(delta)}`;

    document.getElementById("prevClose").textContent = fmt(prev);
  } else {
    document.getElementById("change").textContent = "—";
    document.getElementById("prevClose").textContent = "—";
  }

  document.getElementById("high52w").textContent = fmt(json.meta.high52w);
  document.getElementById("pe").textContent = fmt(json.meta.pe);
  document.getElementById("peg").textContent = fmt(json.meta.peg);
  document.getElementById("eps").textContent = fmt(json.meta.eps);

  const div = json.meta.dividendYieldPct;
  document.getElementById("dividend").textContent =
    (div === null || div === undefined) ? "—" : `${fmt(div)}%`;

  const chart = document.getElementById("chart");
  requestAnimationFrame(() => drawChart(chart, prices));
}

document.querySelectorAll(".tf").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tf").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadStock(btn.dataset.range);
  });
});

loadStock("1y");
