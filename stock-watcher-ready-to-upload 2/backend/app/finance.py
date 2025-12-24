import math
import yfinance as yf


def safe(x):
    if x is None:
        return None
    if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
        return None
    return x


def pct_change(start, end):
    if start in (None, 0) or end is None:
        return None
    return (end / start - 1) * 100


def one_ticker(ticker):
    tk = yf.Ticker(ticker)
    info = tk.info or {}

    # --- Core info ---
    price = info.get("regularMarketPrice") or info.get("currentPrice")
    sector = info.get("sector") or "Other"

    pe = info.get("trailingPE") or info.get("forwardPE")
    peg = info.get("pegRatio")

    eps = info.get("trailingEps")
    dividend_yield = info.get("dividendYield")  # fraction (e.g. 0.015)

    high_52w = info.get("fiftyTwoWeekHigh")

    # --- Historical data ---
    hist_1w = tk.history(period="7d", interval="1d")
    hist_1m = tk.history(period="1mo", interval="1d")
    hist_1y = tk.history(period="1y", interval="1d")

    weekly = (
        pct_change(hist_1w["Close"].iloc[0], hist_1w["Close"].iloc[-1])
        if len(hist_1w) >= 2
        else None
    )

    monthly = (
        pct_change(hist_1m["Close"].iloc[0], hist_1m["Close"].iloc[-1])
        if len(hist_1m) >= 2
        else None
    )

    if high_52w is None and not hist_1y.empty:
        high_52w = float(hist_1y["High"].max())

    # --- Sparkline (last ~30 closes) ---
    spark = []
    if not hist_1m.empty:
        spark = [float(x) for x in hist_1m["Close"].tail(30)]

    return {
        "ticker": ticker,
        "sector": sector,
        "price": safe(price),

        "pe": safe(pe),
        "peg": safe(peg),
        "eps": safe(eps),
        "dividendYieldPct": safe(dividend_yield * 100) if dividend_yield else None,

        "high52w": safe(high_52w),
        "pctFrom52wHigh": safe(pct_change(high_52w, price)),
        "weeklyChangePct": safe(weekly),
        "monthlyChangePct": safe(monthly),

        "spark": spark,
    }
