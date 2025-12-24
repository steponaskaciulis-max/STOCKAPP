const API = "https://stock-watcher-backend.onrender.com";

function cls(x){return x>0?"pos":x<0?"neg":"";}

async function load(){
  const t=document.getElementById("tickers").value.trim().split(/\s+/);
  const qs=t.map(x=>`tickers=${x}`).join("&");
  const r=await fetch(`${API}/metrics?${qs}`);
  const j=await r.json();

  let html="";
  j.data.forEach(s=>{
    html+=`<div>${s.ticker} <span class="${cls(s.weeklyChangePct)}">${s.weeklyChangePct?.toFixed(2)||"—"}%</span></div>`;
  });
  document.getElementById("table").innerHTML=html;
}
