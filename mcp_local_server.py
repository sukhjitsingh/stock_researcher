#!/usr/bin/env python3
"""
Stock Research Agent - Local MCP Server

This local MCP server connects to the deployed REST API at stockresearcher.vercel.app
and exposes the functionality as MCP tools for Claude Code.

Usage:
  claude mcp add stock-researcher -- python3 /path/to/mcp_local_server.py

Requires: mcp, httpx (pip install mcp httpx)
"""

import asyncio
import httpx
from typing import Optional
from mcp.server.fastmcp import FastMCP

# API base URL
API_BASE = "https://stockresearcher.vercel.app"

# Initialize MCP server
mcp = FastMCP("Stock Research Agent")

# HTTP client for API calls
client = httpx.Client(timeout=60.0)


def api_get(endpoint: str, params: dict = None) -> dict:
    """Make GET request to API."""
    try:
        response = client.get(f"{API_BASE}{endpoint}", params=params)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def api_post(endpoint: str, json_data: dict = None) -> dict:
    """Make POST request to API."""
    try:
        response = client.post(f"{API_BASE}{endpoint}", json=json_data or {})
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def api_patch(endpoint: str, params: dict = None) -> dict:
    """Make PATCH request to API."""
    try:
        response = client.patch(f"{API_BASE}{endpoint}", params=params)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}


# === Market Scanning Tools ===

@mcp.tool()
def market_scan(min_change_pct: float = 5.0, max_results: int = 20) -> dict:
    """
    Scan market for top gainers, losers, and most active stocks.
    Uses Alpha Vantage TOP_GAINERS_LOSERS (1 API call).

    Args:
        min_change_pct: Minimum % change to include (default 5.0)
        max_results: Max tickers per category (default 20)

    Returns:
        scan_id, scan_date, top_gainers, top_losers, most_active, dominant_theme
    """
    return api_post("/api/scan", {
        "min_change_pct": min_change_pct,
        "max_results": max_results
    })


@mcp.tool()
def get_scan(scan_id: int) -> dict:
    """
    Retrieve a market scan by ID.

    Args:
        scan_id: The ID of the scan to retrieve

    Returns:
        Full scan details including top_gainers, top_losers, most_active
    """
    return api_get(f"/api/scan/{scan_id}")


@mcp.tool()
def list_scans(limit: int = 10) -> list:
    """
    List recent market scans.

    Args:
        limit: Maximum number of scans to return (default 10)

    Returns:
        List of scan summaries (scan_id, date, dominant_theme, ticker_count)
    """
    return api_get("/api/scans", {"limit": limit})


# === Deep Dive Analysis Tools ===

@mcp.tool()
def deep_dive(symbol: str, scan_id: Optional[int] = None) -> dict:
    """
    Perform deep dive analysis on a stock ticker.
    Checks solvency (OCF > 0), calculates volatility, assesses risk level.

    Args:
        symbol: Stock ticker (e.g., "NVDA")
        scan_id: Optional link to originating market scan

    Returns:
        analysis_id, solvency check, volatility assessment, risk_level,
        direction_bias, is_safe_play, recommendation_summary
    """
    payload = {"symbol": symbol}
    if scan_id:
        payload["scan_id"] = scan_id
    return api_post("/api/analyze", payload)


@mcp.tool()
def get_quote(symbol: str) -> dict:
    """
    Get current stock quote and key metrics.

    Args:
        symbol: Stock ticker (e.g., "NVDA")

    Returns:
        price, change, volume, PE ratio, moving averages, sector
    """
    return api_get(f"/api/quote/{symbol}")


@mcp.tool()
def calculate_volatility(symbol: str, days: int = 20) -> dict:
    """
    Calculate N-day annualized volatility for a stock.

    Args:
        symbol: Stock ticker (e.g., "NVDA")
        days: Number of days for volatility calculation (default 20)

    Returns:
        daily_volatility, annualized_volatility, category (LOW/MEDIUM/HIGH/EXTREME),
        recommended_strategies
    """
    return api_get(f"/api/volatility/{symbol}", {"days": days})


# === Options Strategy Tools ===

@mcp.tool()
def generate_strategies(symbol: str, capital: float, analysis_id: Optional[int] = None) -> dict:
    """
    Generate three options strategies for different risk tolerances.

    Args:
        symbol: Stock ticker (e.g., "NVDA")
        capital: Available capital in USD (minimum $100)
        analysis_id: Optional link to deep dive analysis

    Returns:
        HIGH RISK: Long Call (weekly, directional)
        MEDIUM RISK: Bull Call Spread (~30 DTE)
        LOW RISK: Put Credit Spread (income strategy)

        Each includes: legs, Greeks, max profit/loss, breakeven, win probability
    """
    payload = {"symbol": symbol, "capital": capital}
    if analysis_id:
        payload["analysis_id"] = analysis_id
    return api_post("/api/strategy", payload)


@mcp.tool()
def list_plans(symbol: Optional[str] = None, status: Optional[str] = None) -> list:
    """
    List trade plans from database.

    Args:
        symbol: Filter by stock ticker (optional)
        status: Filter by status - PLANNED, OPEN, or CLOSED (optional)

    Returns:
        List of trade plan summaries with strategy details
    """
    params = {}
    if symbol:
        params["symbol"] = symbol
    if status:
        params["status"] = status
    return api_get("/api/plans", params if params else None)


@mcp.tool()
def update_plan_status(plan_id: int, new_status: str) -> dict:
    """
    Update trade plan status.

    Args:
        plan_id: ID of the trade plan to update
        new_status: New status (PLANNED, OPEN, or CLOSED)

    Returns:
        Updated plan ID and status
    """
    return api_patch(f"/api/plans/{plan_id}/status", {"new_status": new_status})


# Run server with stdio transport (for Claude Code)
if __name__ == "__main__":
    mcp.run()
