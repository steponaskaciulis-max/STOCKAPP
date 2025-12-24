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
from fastapi import FastAPI, Query
import yfinance as yf

@app.get("/history")
def history(
    ticker: str = Query(...),
    period: str = Query("1y")
):
    try:
        tk = yf.Ticker(ticker)

        hist = tk.history(period=period, interval="1d")
        if hist is None or hist.empty:
            return {
                "meta": {},
                "prices": []
            }

        prices = []
        for idx, row in hist.iterrows():
            prices.append({
                "date": idx.strftime("%Y-%m-%d"),
                "close": float(row["Close"])
            })

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

    except Exception as e:
        # THIS is what prevents 500 crashes
        return {
            "error": str(e),
            "meta": {},
            "prices": []
        }
