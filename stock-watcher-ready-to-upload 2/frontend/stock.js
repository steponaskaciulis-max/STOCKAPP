const API = "https://stockapp-kym2.onrender.com";

/* ================= HELPERS ================= */

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function fmt(x, d = 2) {
  if (x === null || x === undefined || isNaN(x)) return "—";
  return Number(x).toFixed(d);
}

/* ================= SVG CHART ================= */

function drawChart(svg, data) {
  svg.innerHTML = "";

  const w = svg.clientWidth;
  const h = svg.clientHeight;
  const pad = 40;

  const prices = data.map(d => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  const x = i => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = v => h - pad - ((v - min) / (max - min)) * (h - pad * 2);

  let path = "";
  data.forEach((d, i) => {
    path += (i === 0 ? "M" : "L") + `${x(i)},${y(d.close)} `;
  });

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", path);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#3b82f6");
  line.setAttribute("stroke-width", "2");

  svg.appendChild(line);

  // Last price dot
  const last = data[data.length - 1];
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("cx", x(data.length - 1));
  dot.setAttribute("cy", y(last.close));
  dot.setAttribute("r", 4);
  dot.setAttribute("fill", "#22c55e");

  svg.appendChild(dot);
}

/* ================= LOAD STOCK ================= */

async function loadStock(tf = "1y") {
  const ticker = qs("ticker");
  if (!ticker) return;

  const r = await fetch(`${API}/history?ticker=${ticker}&period=${tf}`);
  const json = await r.json();

  document.getElementById("stockTitle").innerText = ticker;
  document.getElementById("stockSubtitle").innerText =
    `${json.meta.longName || ""} · ${json.meta.sector || ""}`;

  document.getElementById("mPrice").innerText = fmt(json.meta.price);
  document.getElementById("mPE").innerText = fmt(json.meta.pe);
  document.getElementById("mPEG").innerText = fmt(json.meta.peg);
  document.getElementById("mEPS").innerText = fmt(json.meta.eps);
  document.getElementById("mDIV").innerText = fmt(json.meta.div) + "%";
  document.getElementById("m52w").innerText = fmt(json.meta.high52w);
  document.getElementById("mDD").innerText = fmt(json.meta.dd) + "%";

  const svg = document.getElementById("priceChart");
  drawChart(svg, json.prices);
}

/* ================= TIMEFRAME ================= */

document.querySelectorAll(".timeframes button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".timeframes button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadStock(btn.dataset.tf);
  };
});

/* ================= INIT ================= */

loadStock("1y");

