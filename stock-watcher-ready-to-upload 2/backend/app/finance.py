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


def pct_from_high(price, high):
    if price is None or high is None or high == 0:
        return None
    return (price / high - 1) * 100


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


def one_ticker(ticker: str):
    tk = yf.Ticker(ticker)
    info = tk.info or {}

    company = info.get("longName") or info.get("shortName") or ticker
    sector = info.get("sector") or "Other"

    price = info.get("regularMarketPrice") or info.get("currentPrice")
    pe = info.get("trailingPE") or info.get("forwardPE")
    eps = info.get("trailingEps")

    # Dividend yield: Yahoo is inconsistent. Normalize to percent.
    dividend_yield = info.get("dividendYield")
    dividend_pct = None
    if dividend_yield is not None:
        try:
            dividend_pct = dividend_yield * 100 if dividend_yield < 0.1 else dividend_yield
        except Exception:
            dividend_pct = None

    # Price history
    hist_5d = tk.history(period="5d", interval="1d")
    hist_1m = tk.history(period="1mo", interval="1d")
    hist_1y = tk.history(period="1y", interval="1d")

    daily = (
        pct_change(hist_5d["Close"].iloc[-2], hist_5d["Close"].iloc[-1])
        if hist_5d is not None and len(hist_5d) >= 2
        else None
    )

    weekly = (
        pct_change(hist_1m["Close"].iloc[-6], hist_1m["Close"].iloc[-1])
        if hist_1m is not None and len(hist_1m) >= 6
        else None
    )

    monthly = (
        pct_change(hist_1m["Close"].iloc[0], hist_1m["Close"].iloc[-1])
        if hist_1m is not None and len(hist_1m) >= 2
        else None
    )

    # 52W high (try info first, else compute)
    high_52w = info.get("fiftyTwoWeekHigh")
    if high_52w is None and hist_1y is not None and not hist_1y.empty:
        try:
            high_52w = float(hist_1y["High"].max())
        except Exception:
            high_52w = None

    pct_from_52w = pct_from_high(price, high_52w)

    # Sparkline data (last ~30 closes)
    spark = []
    if hist_1m is not None and not hist_1m.empty:
        try:
            spark = [float(x) for x in hist_1m["Close"].tail(30)]
        except Exception:
            spark = []

    # Derived PEG from historical EPS growth
    eps_growth_pct = compute_eps_growth(tk)
    derived_peg = None
    if pe is not None and eps_growth_pct is not None and eps_growth_pct > 0:
        derived_peg = pe / eps_growth_pct

    return {
        "ticker": ticker,
        "company": company,
        "sector": sector,

        "price": safe(price),
        "dailyChangePct": safe(daily),
        "weeklyChangePct": safe(weekly),
        "monthlyChangePct": safe(monthly),

        "pe": safe(pe),
        "peg": safe(derived_peg),
        "eps": safe(eps),
        "epsGrowthPct": safe(eps_growth_pct),
        "dividendYieldPct": safe(dividend_pct),

        "high52w": safe(high_52w),
        "pctFrom52wHigh": safe(pct_from_52w),

        "spark": spark,
    }
