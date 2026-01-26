"""
Stock Research Agent MCP Server

Exposes research workflow tools for Claude autonomous execution:
- Market scanning
- Deep dive analysis
- Options strategy generation
- Trade plan management

Uses FastMCP with stateless HTTP transport for Vercel serverless deployment.
"""

from typing import Optional
from sqlmodel import Session

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from backend.database import engine
from backend.models import TradePlan
from backend.services import market_scanner, analyzer, options_engine, yfinance_service
from backend.schemas.scanner import MarketScanRequest
from backend.schemas.analysis import AnalyzeRequest
from backend.schemas.options import StrategyRequest


# Configure security settings for Vercel deployment
security_settings = TransportSecuritySettings(
    enable_dns_rebinding_protection=True,
    allowed_hosts=[
        "localhost:8000",
        "127.0.0.1:8000",
        "stockresearcher.vercel.app",
        "stockresearcher.vercel.app:*",
        "*.vercel.app",
        "*.vercel.app:*",
    ],
    allowed_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "https://stockresearcher.vercel.app",
        "https://*.vercel.app",
    ]
)

# Initialize MCP server (stateless for serverless compatibility)
mcp = FastMCP(
    "Stock Research Agent",
    stateless_http=True,
    json_response=True,
    streamable_http_path="/",
    transport_security=security_settings
)


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
    request = MarketScanRequest(min_change_pct=min_change_pct, max_results=max_results)
    result = market_scanner.run_scan(request)
    return result.model_dump(mode="json")


@mcp.tool()
def get_scan(scan_id: int) -> dict:
    """
    Retrieve a market scan by ID.

    Args:
        scan_id: The ID of the scan to retrieve

    Returns:
        Full scan details including top_gainers, top_losers, most_active
    """
    result = market_scanner.get_scan(scan_id)
    if not result:
        return {"error": f"Scan {scan_id} not found"}
    return result.model_dump(mode="json")


@mcp.tool()
def list_scans(limit: int = 10) -> list:
    """
    List recent market scans.

    Args:
        limit: Maximum number of scans to return (default 10)

    Returns:
        List of scan summaries (scan_id, date, dominant_theme, ticker_count)
    """
    scans = market_scanner.get_recent_scans(limit)
    return [s.model_dump(mode="json") for s in scans]


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
    request = AnalyzeRequest(symbol=symbol, scan_id=scan_id)
    result = analyzer.analyze(request)
    return result.model_dump(mode="json")


@mcp.tool()
def get_quote(symbol: str) -> dict:
    """
    Get current stock quote and key metrics.

    Args:
        symbol: Stock ticker (e.g., "NVDA")

    Returns:
        price, change, volume, PE ratio, moving averages, sector
    """
    return yfinance_service.get_quote(symbol)


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
    return yfinance_service.calculate_volatility(symbol, days)


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
    request = StrategyRequest(symbol=symbol, capital=capital, analysis_id=analysis_id)
    result = options_engine.generate_strategies(request)
    return result.model_dump(mode="json")


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
    plans = options_engine.get_plans(symbol, status)
    return [p.model_dump(mode="json") for p in plans]


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
    valid_statuses = ["PLANNED", "OPEN", "CLOSED"]
    if new_status.upper() not in valid_statuses:
        return {"error": f"Invalid status. Use: {valid_statuses}"}

    with Session(engine) as session:
        plan = session.get(TradePlan, plan_id)
        if not plan:
            return {"error": f"Plan {plan_id} not found"}

        plan.status = new_status.upper()
        session.add(plan)
        session.commit()

        return {"id": plan_id, "status": plan.status, "message": "Status updated"}


# For standalone testing
if __name__ == "__main__":
    mcp.run(transport="streamable-http")
