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
