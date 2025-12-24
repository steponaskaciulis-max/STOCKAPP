from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import yfinance as yf

from .finance import one_ticker, safe, compute_eps_growth

app = FastAPI(title="Valyxis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "Valyxis API is running"}

@app.get("/metrics")
def metrics(tickers: List[str] = Query(...)):
    return {"data": [one_ticker(t.strip().upper()) for t in tickers if t.strip()]}

# Map UI timeframe -> (yfinance period, interval)
PERIOD_MAP = {
    "1d": ("1d", "5m"),
    "5d": ("5d", "30m"),
    "1m": ("1mo", "1d"),
    "3m": ("3mo", "1d"),
    "6m": ("6mo", "1d"),
    "1y": ("1y", "1d"),
    "max": ("max", "1wk"),
}

@app.get("/history")
def history(ticker: str, period: str = "1y"):
    t = ticker.strip().upper()
    p = (period or "1y").lower()

    yf_period, yf_interval = PERIOD_MAP.get(p, ("1y", "1d"))

    tk = yf.Ticker(t)
    info = tk.info or {}

    # --- history fetch (robust) ---
    hist = tk.history(period=yf_period, interval=yf_interval)

    # Fallback: if yahoo returns empty, try daily data
    if hist is None or hist.empty:
        hist = tk.history(period=yf_period, interval="1d")

    prices = []
    if hist is not None and not hist.empty:
        # ensure sorted
        hist = hist.sort_index()
        for idx, row in hist.iterrows():
            close = row.get("Close")
            if close is None:
                continue
            prices.append({
                "t": idx.isoformat(),
                "close": float(close),
            })

    # --- meta fields (match frontend expectations) ---
    price = info.get("regularMarketPrice") or info.get("currentPrice")
    long_name = info.get("longName") or info.get("shortName") or t
    sector = info.get("sector") or "—"
    pe = info.get("trailingPE") or info.get("forwardPE")
    eps = info.get("trailingEps")

    # 52w high
    high_52w = info.get("fiftyTwoWeekHigh")
    if high_52w is None:
        hist_1y = tk.history(period="1y", interval="1d")
        if hist_1y is not None and not hist_1y.empty:
            high_52w = float(hist_1y["High"].max())

    # dividend (as percent)
    div_yield = info.get("dividendYield")
    dividend_pct = None
    if div_yield is not None:
        try:
            dividend_pct = div_yield * 100 if div_yield <= 1 else div_yield
        except Exception:
            dividend_pct = None

    # PEG: try yahoo first, else derive from EPS growth
    peg = info.get("pegRatio")
    if peg is None:
        try:
            eps_growth_pct = compute_eps_growth(tk)  # % per year
            if pe is not None and eps_growth_pct is not None and eps_growth_pct > 0:
                peg = pe / eps_growth_pct
        except Exception:
            peg = None

    return {
        "ticker": t,
        "meta": {
            "price": safe(price),
            "longName": long_name,
            "sector": sector,
            "pe": safe(pe),
            "peg": safe(peg),
            "eps": safe(eps),
            "dividendYieldPct": safe(dividend_pct),
            "high52w": safe(high_52w),
        },
        "prices": prices,
    }
