"""
Alpaca API Service

MCP-Ready Functions:
- get_latest_quote(): Real-time price check before execution
- get_bars(): Historical bars for volatility calculation
- validate_quote_freshness(): Validate price before trade

Used for: Real-time validation, not primary data source
"""

import os
from typing import List
from datetime import datetime, timedelta


def _get_credentials() -> tuple:
    """Get Alpaca credentials from environment."""
    api_key = os.getenv("ALPACA_API_KEY")
    api_secret = os.getenv("ALPACA_API_SECRET")

    if not api_key or not api_secret:
        raise ValueError("ALPACA_API_KEY or ALPACA_API_SECRET not set")

    return api_key, api_secret


def get_latest_quote(symbol: str) -> dict:
    """
    Get real-time quote for price validation.

    MCP Tool: validate_price

    Returns:
        dict with bid, ask, mid price, timestamp
    """
    try:
        from alpaca.data import StockHistoricalDataClient
        from alpaca.data.requests import StockLatestQuoteRequest

        api_key, api_secret = _get_credentials()
        client = StockHistoricalDataClient(api_key, api_secret)
        request = StockLatestQuoteRequest(symbol_or_symbols=symbol.upper())
        quote = client.get_stock_latest_quote(request)[symbol.upper()]

        return {
            "symbol": symbol.upper(),
            "bid": float(quote.bid_price),
            "ask": float(quote.ask_price),
            "mid": (float(quote.bid_price) + float(quote.ask_price)) / 2,
            "bid_size": quote.bid_size,
            "ask_size": quote.ask_size,
            "timestamp": quote.timestamp.isoformat()
        }
    except ImportError:
        return {"error": "alpaca-py not installed"}
    except Exception as e:
        return {"error": str(e)}


def get_bars(symbol: str, days: int = 30) -> List[dict]:
    """
    Get historical bars for volatility calculation.

    MCP Tool: get_historical_bars

    Returns:
        List of daily OHLCV bars
    """
    try:
        from alpaca.data import StockHistoricalDataClient
        from alpaca.data.requests import StockBarsRequest
        from alpaca.data.timeframe import TimeFrame

        api_key, api_secret = _get_credentials()
        client = StockHistoricalDataClient(api_key, api_secret)

        end = datetime.now()
        start = end - timedelta(days=days)

        request = StockBarsRequest(
            symbol_or_symbols=symbol.upper(),
            timeframe=TimeFrame.Day,
            start=start,
            end=end
        )

        bars = client.get_stock_bars(request)[symbol.upper()]

        return [
            {
                "date": bar.timestamp.date().isoformat(),
                "open": float(bar.open),
                "high": float(bar.high),
                "low": float(bar.low),
                "close": float(bar.close),
                "volume": int(bar.volume)
            }
            for bar in bars
        ]
    except ImportError:
        return [{"error": "alpaca-py not installed"}]
    except Exception as e:
        return [{"error": str(e)}]


def validate_quote_freshness(
    symbol: str,
    expected_price: float,
    tolerance_pct: float = 2.0
) -> dict:
    """
    Validate that expected price is within tolerance of real-time quote.

    MCP Tool: validate_execution_price

    Returns:
        dict with is_valid, current_price, deviation_pct
    """
    quote = get_latest_quote(symbol)

    if "error" in quote:
        return {
            "symbol": symbol,
            "is_valid": False,
            "error": quote["error"]
        }

    mid_price = quote["mid"]
    deviation = abs(expected_price - mid_price) / mid_price * 100

    return {
        "symbol": symbol,
        "expected_price": expected_price,
        "current_price": mid_price,
        "deviation_pct": round(deviation, 2),
        "is_valid": deviation <= tolerance_pct,
        "checked_at": datetime.utcnow().isoformat()
    }
