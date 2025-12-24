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


def compute_eps_growth(tk):
    try:
        earnings = tk.earnings
        if earnings is None or earnings.empty:
            return None

        eps_values = earnings["Earnings"].values
        if len(eps_values) < 2:
            return None

        start = eps_values[0]
        end = eps_values[-1]

        if start <= 0 or end <= 0:
            return None

        years = len(eps_values) - 1
        growth = (end / start) ** (1 / years) - 1
        return growth * 100
    except Exception:
        return None


def one_ticker(ticker):
    tk = yf.Ticker(ticker)
    info = tk.info or {}

    # ---------- Identity ----------
    company = (
        info.get("longName")
        or info.get("shortName")
        or ticker
    )

    sector = info.get("sector") or "Other"
    price = info.get("regularMarketPrice") or info.get("currentPrice")

    pe = info.get("trailingPE") or info.get("forwardPE")
    eps = info.get("trailingEps")
    high_52w = info.get("fiftyTwoWeekHigh")

    # ---------- Dividend yield ----------
    dividend_yield = info.get("dividendYield")
    dividend_pct = None
    if dividend_yield is not None:
        dividend_pct = dividend_yield * 100 if dividend_yield < 0.1 else dividend_yield

    # ---------- Historical prices ----------
    hist_5d = tk.history(period="5d", interval="1d")
    hist_1m = tk.history(period="1mo", interval="1d")
    hist_1y = tk.history(period="1y", interval="1d")

    daily = (
        pct_change(hist_5d["Close"].iloc[-2], hist_5d["Close"].iloc[-1])
        if len(hist_5d) >= 2
        else None
    )

    weekly = (
        pct_change(hist_1m["Close"].iloc[-6], hist_1m["Close"].iloc[-1])
        if len(hist_1m) >= 6
        else None
    )

    monthly = (
        pct_change(hist_1m["Close"].iloc[0], hist_1m["Close"].iloc[-1])
        if len(hist_1m) >= 2
        else None
    )

    if high_52w is None and not hist_1y.empty:
        high_52w = float(hist_1y["High"].max())

    spark = []
    if not hist_1m.empty:
        spark = [float(x) for x in hist_1m["Close"].tail(30)]

    eps_growth_pct = compute_eps_growth(tk)
    derived_peg = (
        pe / eps_growth_pct
        if pe and eps_growth_pct and eps_growth_pct > 0
        else None
    )

    return {
        "ticker": ticker,
        "company": company,
        "sector": sector,

        "price": safe(price),
        "dailyChangePct": safe(daily),

        "pe": safe(pe),
        "peg": safe(derived_peg),
        "eps": safe(eps),
        "epsGrowthPct": safe(eps_growth_pct),
        "dividendYieldPct": safe(dividend_pct),

        "weeklyChangePct": safe(weekly),
        "monthlyChangePct": safe(monthly),

        "spark": spark,
    }
