const API_BASE = "https://stockapp-kym2.onrender.com";

/* ================= UTILS ================= */

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function fmt(x, d = 2) {
  if (x === null || x === undefined || isNaN(x)) return "—";
  return Number(x).toFixed(d);
}

function cls(x) {
  if (x === null || x === undefined) return "";
  return x >= 0 ? "positive" : "negative";
}

/* ================= SVG CHART ================= */

function drawChart(container, data) {
  container.innerHTML = "";

  if (!data || data.length < 2) return;

  const w = container.clientWidth;
  const h = container.clientHeight;
  const pad = 40;

  const prices = data.map(d => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

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
  line.setAttribute("d", path);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#4f8cff");
  line.setAttribute("stroke-width", "2");

  svg.appendChild(line);

  // last price dot
  const last = data[data.length - 1];
  const dot = document.createElementNS(svg.namespaceURI, "circle");
  dot.setAttribute("cx", x(data.length - 1));
  dot.setAttribute("cy", y(last.close));
  dot.setAttribute("r", 4);
  dot.setAttribute("fill", last.close >= data[0].close ? "#22c55e" : "#ef4444");

  svg.appendChild(dot);

  container.appendChild(svg);
}

/* ================= LOAD STOCK ================= */

async function loadStock(period = "1y") {
  const ticker = qs("ticker");
  if (!ticker) return;

  const res = await fetch(
    `${API_BASE}/history?ticker=${ticker}&period=${period}`
  );
  const json = await res.json();

  if (!json.prices || json.prices.length === 0) return;

  /* ----- HEADER ----- */
  document.getElementById("ticker").textContent = ticker;
  document.getElementById("company").textContent =
    json.meta.longName || "—";
  document.getElementById("sector").textContent =
    json.meta.sector || "—";

  document.getElementById("price").textContent =
    fmt(json.meta.price);

  const change =
    json.prices[json.prices.length - 1].close -
    json.prices[json.prices.length - 2].close;

  const changePct =
    (change / json.prices[json.prices.length - 2].close) * 100;

  const changeEl = document.getElementById("change");
  changeEl.textContent =
    `${change >= 0 ? "+" : ""}${fmt(change)} (${fmt(changePct)}%)`;
  changeEl.className = `change ${cls(change)}`;

  /* ----- STATS GRID ----- */
  document.getElementById("prevClose").textContent =
    fmt(json.prices[json.prices.length - 2].close);

  document.getElementById("range52w").textContent =
    fmt(json.meta.high52w);

  document.getElementById("pe").textContent = fmt(json.meta.pe);
  document.getElementById("peg").textContent = fmt(json.meta.peg);
  document.getElementById("eps").textContent = fmt(json.meta.eps);
  document.getElementById("dividend").textContent =
    fmt(json.meta.div) + "%";

  /* ----- CHART ----- */
  const chartContainer = document.getElementById("chart");
  requestAnimationFrame(() => {
    drawChart(chartContainer, json.prices);
  });
}

/* ================= TIMEFRAME BUTTONS ================= */

document.querySelectorAll(".tf").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tf")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadStock(btn.dataset.range);
  });
});

/* ================= INIT ================= */

loadStock("1y");
