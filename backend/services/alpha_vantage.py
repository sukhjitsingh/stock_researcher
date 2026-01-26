"""
Alpha Vantage API Service

MCP-Ready Functions:
- get_top_gainers_losers(): Market scanning (1 API call)
- get_company_overview(): Fundamentals for solvency check
- get_cash_flow(): Operating cash flow for solvency

Rate Limit: 25 requests/day (free tier)
"""

import os
import requests
from typing import Optional
from datetime import datetime


ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"


def _get_api_key() -> str:
    """Get Alpha Vantage API key from environment."""
    api_key = os.getenv("ALPHAVANTAGE_API_KEY")
    if not api_key:
        raise ValueError("ALPHAVANTAGE_API_KEY not set in environment")
    return api_key


def get_top_gainers_losers() -> dict:
    """
    Fetch top gainers, losers, and most active from Alpha Vantage.

    MCP Tool: market_scan
    Cost: 1 API call

    Returns:
        dict with keys: top_gainers, top_losers, most_active
        Each contains list of {ticker, price, change_amount, change_percent, volume}
    """
    api_key = _get_api_key()
    params = {
        "function": "TOP_GAINERS_LOSERS",
        "apikey": api_key
    }

    response = requests.get(ALPHA_VANTAGE_BASE_URL, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    # Check for API error messages
    if "Information" in data or "Note" in data:
        error_msg = data.get("Information") or data.get("Note")
        raise ValueError(f"Alpha Vantage API error: {error_msg}")

    return {
        "top_gainers": _normalize_movers(data.get("top_gainers", [])),
        "top_losers": _normalize_movers(data.get("top_losers", [])),
        "most_active": _normalize_movers(data.get("most_actively_traded", [])),
        "fetched_at": datetime.utcnow().isoformat()
    }


def get_company_overview(symbol: str) -> dict:
    """
    Fetch company fundamentals for solvency analysis.

    MCP Tool: get_fundamentals
    Cost: 1 API call

    Returns:
        dict with financial metrics
    """
    api_key = _get_api_key()
    params = {
        "function": "OVERVIEW",
        "symbol": symbol.upper(),
        "apikey": api_key
    }

    response = requests.get(ALPHA_VANTAGE_BASE_URL, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    if not data or "Symbol" not in data:
        return {"error": f"No data found for {symbol}"}

    return data


def get_cash_flow(symbol: str) -> dict:
    """
    Fetch cash flow statement for detailed solvency check.

    MCP Tool: get_cash_flow
    Cost: 1 API call

    Returns:
        dict with annual and quarterly cash flow reports
    """
    api_key = _get_api_key()
    params = {
        "function": "CASH_FLOW",
        "symbol": symbol.upper(),
        "apikey": api_key
    }

    response = requests.get(ALPHA_VANTAGE_BASE_URL, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    if "annualReports" not in data:
        return {"error": f"No cash flow data for {symbol}"}

    return data


def _normalize_movers(movers: list) -> list:
    """Normalize Alpha Vantage mover data to standard format."""
    normalized = []
    for item in movers[:20]:  # Limit to 20
        try:
            change_pct_str = item.get("change_percentage", "0%")
            change_pct = float(change_pct_str.replace("%", ""))

            normalized.append({
                "ticker": item.get("ticker", ""),
                "price": float(item.get("price", 0)),
                "change_amount": float(item.get("change_amount", 0)),
                "change_percent": change_pct,
                "volume": int(item.get("volume", 0))
            })
        except (ValueError, TypeError):
            continue
    return normalized
