"""
yfinance Service - Primary data source for quotes, options, analysis

MCP-Ready Functions:
- get_quote(): Current price and key metrics
- get_historical(): Price history and returns
- get_options_chain(): Options data with IV
- get_analyst_ratings(): Analyst consensus and targets
- calculate_volatility(): 20-day annualized volatility

No API key required. Rate limits are lenient.
"""

import yfinance as yf
from typing import Optional, List
from datetime import datetime
import numpy as np


def get_quote(symbol: str) -> dict:
    """
    Get current quote and key metrics for a stock.

    MCP Tool: stock_quote

    Returns:
        dict with price, change, volume, PE, moving averages, sector
    """
    stock = yf.Ticker(symbol.upper())
    info = stock.info

    return {
        "symbol": symbol.upper(),
        "name": info.get("longName", "N/A"),
        "price": info.get("currentPrice") or info.get("regularMarketPrice"),
        "change": info.get("regularMarketChange"),
        "change_percent": info.get("regularMarketChangePercent"),
        "volume": info.get("volume"),
        "avg_volume": info.get("averageVolume"),
        "market_cap": info.get("marketCap"),
        "pe_ratio": info.get("trailingPE"),
        "forward_pe": info.get("forwardPE"),
        "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
        "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
        "fifty_day_ma": info.get("fiftyDayAverage"),
        "two_hundred_day_ma": info.get("twoHundredDayAverage"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "beta": info.get("beta"),
        "fetched_at": datetime.utcnow().isoformat()
    }


def get_historical(symbol: str, period: str = "1mo") -> dict:
    """
    Get historical price data with calculated returns.

    MCP Tool: stock_history

    Returns:
        dict with price range, returns, volatility, recent prices
    """
    stock = yf.Ticker(symbol.upper())
    hist = stock.history(period=period)

    if hist.empty:
        return {"error": f"No data found for {symbol}"}

    closes = hist['Close']
    returns = closes.pct_change().dropna()

    return {
        "symbol": symbol.upper(),
        "period": period,
        "start_date": str(hist.index[0].date()),
        "end_date": str(hist.index[-1].date()),
        "start_price": round(closes.iloc[0], 2),
        "end_price": round(closes.iloc[-1], 2),
        "period_return_pct": round((closes.iloc[-1] / closes.iloc[0] - 1) * 100, 2),
        "high": round(hist['High'].max(), 2),
        "low": round(hist['Low'].min(), 2),
        "avg_volume": int(hist['Volume'].mean()),
        "volatility_annualized": round(returns.std() * np.sqrt(252) * 100, 2),
        "daily_returns": returns.tolist()[-20:],
        "fetched_at": datetime.utcnow().isoformat()
    }


def get_options_chain(symbol: str, expiration_index: int = 0) -> dict:
    """
    Get options chain with current prices and IV.

    MCP Tool: options_chain

    Returns:
        dict with calls/puts, ATM options, expirations, IV
    """
    stock = yf.Ticker(symbol.upper())

    try:
        expirations = stock.options
        if not expirations:
            return {"error": f"No options data for {symbol}"}

        exp_date = expirations[min(expiration_index, len(expirations) - 1)]
        chain = stock.option_chain(exp_date)

        info = stock.info
        current_price = info.get("currentPrice") or info.get("regularMarketPrice")

        if current_price is None:
            return {"error": f"Could not get current price for {symbol}"}

        calls = chain.calls
        puts = chain.puts

        # Find ATM strike
        atm_strike = calls.iloc[(calls['strike'] - current_price).abs().argsort()[:1]]['strike'].values[0]

        # Get ATM options
        atm_call_df = calls[calls['strike'] == atm_strike]
        atm_put_df = puts[puts['strike'] == atm_strike]

        atm_call = atm_call_df.iloc[0].to_dict() if len(atm_call_df) > 0 else None
        atm_put = atm_put_df.iloc[0].to_dict() if len(atm_put_df) > 0 else None

        return {
            "symbol": symbol.upper(),
            "current_price": current_price,
            "expirations": list(expirations[:8]),
            "selected_expiration": exp_date,
            "atm_strike": atm_strike,
            "atm_call": _format_option(atm_call) if atm_call else None,
            "atm_put": _format_option(atm_put) if atm_put else None,
            "calls": [_format_option(row.to_dict()) for _, row in calls.iterrows()],
            "puts": [_format_option(row.to_dict()) for _, row in puts.iterrows()],
            "fetched_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {"error": str(e)}


def get_analyst_ratings(symbol: str) -> dict:
    """
    Get analyst recommendations and price targets.

    MCP Tool: analyst_ratings

    Returns:
        dict with consensus, targets, upside potential, recent ratings
    """
    stock = yf.Ticker(symbol.upper())
    info = stock.info

    current_price = info.get("currentPrice") or info.get("regularMarketPrice")
    target_mean = info.get("targetMeanPrice")

    upside = None
    if target_mean and current_price:
        upside = round((target_mean / current_price - 1) * 100, 2)

    recommendations = []
    try:
        recs = stock.recommendations
        if recs is not None and len(recs) > 0:
            for idx, row in recs.tail(10).iterrows():
                recommendations.append({
                    "date": str(idx.date()) if hasattr(idx, 'date') else str(idx),
                    "firm": row.get('Firm', 'N/A'),
                    "grade": row.get('To Grade', 'N/A'),
                    "action": row.get('Action', 'N/A')
                })
    except Exception:
        pass

    return {
        "symbol": symbol.upper(),
        "name": info.get("longName"),
        "current_price": current_price,
        "recommendation_key": info.get("recommendationKey"),
        "recommendation_mean": info.get("recommendationMean"),
        "number_of_analysts": info.get("numberOfAnalystOpinions"),
        "target_high": info.get("targetHighPrice"),
        "target_low": info.get("targetLowPrice"),
        "target_mean": target_mean,
        "target_median": info.get("targetMedianPrice"),
        "upside_potential_pct": upside,
        "recent_recommendations": recommendations,
        "fetched_at": datetime.utcnow().isoformat()
    }


def calculate_volatility(symbol: str, days: int = 20) -> dict:
    """
    Calculate N-day annualized volatility.

    MCP Tool: calculate_volatility

    Returns:
        dict with daily vol, annualized vol, category
    """
    stock = yf.Ticker(symbol.upper())
    # Fetch extra days for buffer
    hist = stock.history(period=f"{days + 10}d")

    if len(hist) < days:
        return {"error": f"Insufficient data for {days}-day volatility"}

    closes = hist['Close'].tail(days + 1)
    returns = closes.pct_change().dropna()

    daily_vol = returns.std()
    annualized_vol = daily_vol * np.sqrt(252) * 100

    # Categorize volatility
    if annualized_vol < 20:
        category = "LOW"
        strategies = ["Cash-secured puts", "Put credit spreads", "Covered calls"]
    elif annualized_vol < 35:
        category = "MEDIUM"
        strategies = ["Bull call spreads", "Put credit spreads", "Iron condors"]
    elif annualized_vol < 50:
        category = "HIGH"
        strategies = ["Long calls/puts", "Vertical spreads", "Straddles"]
    else:
        category = "EXTREME"
        strategies = ["Small positions only", "Wide spreads", "Consider waiting"]

    return {
        "symbol": symbol.upper(),
        "days": days,
        "daily_volatility": round(daily_vol * 100, 4),
        "annualized_volatility": round(annualized_vol, 2),
        "category": category,
        "recommended_strategies": strategies,
        "calculated_at": datetime.utcnow().isoformat()
    }


def _format_option(opt: dict) -> dict:
    """Format option data for consistent output."""
    return {
        "contract_symbol": opt.get("contractSymbol"),
        "strike": opt.get("strike"),
        "last_price": opt.get("lastPrice"),
        "bid": opt.get("bid"),
        "ask": opt.get("ask"),
        "volume": opt.get("volume"),
        "open_interest": opt.get("openInterest"),
        "implied_volatility": round(opt.get("impliedVolatility", 0) * 100, 2),
        "in_the_money": opt.get("inTheMoney", False)
    }
