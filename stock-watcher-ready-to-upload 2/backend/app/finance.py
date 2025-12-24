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
    """
    Estimate annualized EPS growth (%) from historical yearly EPS.
    Returns None if data is missing or unreliable.
    """
    try:
        earnings = tk.earnings  # yearly EPS
        if earnings is None or earnings.empty:
            return None

        eps_values = earnings["Earnings"].values
        if len(eps_values) < 2:
            return None

        start = eps_values[0]
        end = eps_values[-1]

        # Avoid nonsense PEGs
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

    # ---------- Core info ----------
    price = info.get("regularMarketPrice") or info.get("currentPrice")
    sector = info.get("sector") or "Other"

    pe = info.get("trailingPE") or info.get("forwardPE")
    eps = info.get("trailingEps")

    high_52w = info.get("fiftyTwoWeekHigh")

    # ---------- Dividend yield (FIXED) ----------
    dividend_yield = info.get("dividendYield")
    dividend_pct = None
    if dividend_yield is not None:
        try:
            # Yahoo usually returns a fraction (0.0075 = 0.75%)
            dividend_pct = (
                dividend_yield * 100 if dividend_yield <= 1 else dividend_yield
            )
        except Exception:
            dividend_pct = None

    # ---------- Historical prices ----------
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

    # ---------- Sparkline (last ~30 closes) ----------
    spark = []
    if not hist_1m.empty:
        spark = [float(x) for x in hist_1m["Close"].tail(30)]

    # ---------- EPS growth & Derived PEG ----------
    eps_growth_pct = compute_eps_growth(tk)

    derived_peg = None
    if pe is not None and eps_growth_pct is not None and eps_growth_pct > 0:
        derived_peg = pe / eps_growth_pct

    return {
        "ticker": ticker,
        "sector": sector,
        "price": safe(price),

        "pe": safe(pe),
        "peg": safe(derived_peg),
        "eps": safe(eps),
        "epsGrowthPct": safe(eps_growth_pct),
        "dividendYieldPct": safe(dividend_pct),

        "high52w": safe(high_52w),
        "pctFrom52wHigh": safe(pct_change(high_52w, price)),
        "weeklyChangePct": safe(weekly),
        "monthlyChangePct": safe(monthly),

        "spark": spark,
    }
