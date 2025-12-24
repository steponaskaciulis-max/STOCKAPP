from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from .finance import one_ticker

app = FastAPI(title="Stock Watcher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/metrics")
def metrics(tickers: List[str] = Query(...)):
    return {"data": [one_ticker(t.upper()) for t in tickers]}

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Stock Watcher API is running",
        "endpoint": "/metrics"
    }
@app.get("/history")
def history(ticker: str, period: str = "1y"):
    tk = yf.Ticker(ticker)
    hist = tk.history(period=period, interval="1d")

    prices = [
        {"date": str(d.date()), "close": float(c)}
        for d, c in zip(hist.index, hist["Close"])
    ]

    info = tk.info or {}

    return {
        "meta": {
            "longName": info.get("longName"),
            "sector": info.get("sector"),
            "price": info.get("regularMarketPrice"),
            "pe": info.get("trailingPE"),
            "peg": info.get("pegRatio"),
            "eps": info.get("trailingEps"),
            "div": (info.get("dividendYield") or 0) * 100,
            "high52w": info.get("fiftyTwoWeekHigh"),
            "dd": None
        },
        "prices": prices
    }
