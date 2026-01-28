"""
Stock Research Agent API

FastAPI endpoints for market scanning, deep dive analysis,
and options strategy generation.

MCP Server available at /mcp for Claude autonomous execution.
"""

import contextlib
import os
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from sqlmodel import Session

from backend.database import init_db, get_session, engine
from backend.models import MarketScan, AnalysisResult, TradePlan
from backend.services import market_scanner, analyzer, options_engine
from backend.schemas.scanner import MarketScanRequest, MarketScanResponse, ScanSummary
from backend.schemas.analysis import AnalyzeRequest, AnalysisResponse
from backend.schemas.options import StrategyRequest, StrategyResponse, TradePlanSummary

# Import MCP server
from backend.mcp_server import mcp


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage FastAPI and MCP server lifecycle."""
    # Initialize database
    try:
        from backend.models import MarketScan, AnalysisResult, TradePlan
        init_db()
    except Exception as e:
        print(f"DB Init skipped: {e}")

    # Start MCP session manager (stateless mode still needs this for request handling)
    async with mcp.session_manager.run():
        yield


app = FastAPI(
    title="Stock Research Agent API",
    description="AI-assisted stock research and options strategy generation",
    version="4.0.0",
    lifespan=lifespan
)

# Add CORS middleware for MCP browser clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Mcp-Session-Id"]
)

# Mount MCP server at /mcp endpoint (stateless HTTP for serverless)
app.mount("/mcp", mcp.streamable_http_app())


# === Health Check ===

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "online", "version": "4.0.0", "env": "vercel", "mcp": "/mcp", "cron": "/api/cron/weekly-scan"}


# === Market Scanning ===

@app.post("/api/scan", response_model=MarketScanResponse)
def trigger_scan(request: MarketScanRequest = MarketScanRequest()):
    """
    Trigger market scan using Alpha Vantage TOP_GAINERS_LOSERS.

    Returns top movers filtered by threshold, persisted to database.
    Uses 1 Alpha Vantage API call.
    """
    try:
        return market_scanner.run_scan(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")


@app.get("/api/scan/{scan_id}", response_model=MarketScanResponse)
def get_scan(scan_id: int):
    """Retrieve a market scan by ID."""
    result = market_scanner.get_scan(scan_id)
    if not result:
        raise HTTPException(status_code=404, detail="Scan not found")
    return result


@app.get("/api/scans", response_model=List[ScanSummary])
def list_scans(limit: int = 10):
    """List recent market scans."""
    return market_scanner.get_recent_scans(limit)


# === Deep Dive Analysis ===

@app.post("/api/analyze", response_model=AnalysisResponse)
def analyze_stock(request: AnalyzeRequest):
    """
    Perform deep dive analysis on a ticker.

    Checks solvency, calculates volatility, assesses risk level.
    May use 1-2 Alpha Vantage API calls for fundamentals.
    """
    try:
        return analyzer.analyze(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# === Options Strategies ===

@app.post("/api/strategy", response_model=StrategyResponse)
def generate_strategies(request: StrategyRequest):
    """
    Generate options strategies for a ticker.

    Returns HIGH/MEDIUM/LOW risk strategies with Greeks and exit conditions.
    Uses yfinance for options data (no API key needed).
    """
    try:
        return options_engine.generate_strategies(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Strategy generation failed: {str(e)}")


# === Trade Plans ===

@app.get("/api/plans", response_model=List[TradePlanSummary])
def list_plans(symbol: Optional[str] = None, status: Optional[str] = None):
    """
    List trade plans with optional filtering.

    Filters: symbol (e.g., NVDA), status (PLANNED/OPEN/CLOSED)
    """
    return options_engine.get_plans(symbol, status)


@app.patch("/api/plans/{plan_id}/status")
def update_plan_status(plan_id: int, new_status: str):
    """Update trade plan status (PLANNED -> OPEN -> CLOSED)."""
    valid_statuses = ["PLANNED", "OPEN", "CLOSED"]
    if new_status.upper() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {valid_statuses}")

    with Session(engine) as session:
        plan = session.get(TradePlan, plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")

        plan.status = new_status.upper()
        session.add(plan)
        session.commit()

        return {"id": plan_id, "status": plan.status, "message": "Status updated"}


# === Quick Data Endpoints ===

@app.get("/api/quote/{symbol}")
def get_quote(symbol: str):
    """Get current quote for a symbol (uses yfinance)."""
    from backend.services import yfinance_service
    try:
        return yfinance_service.get_quote(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/volatility/{symbol}")
def get_volatility(symbol: str, days: int = 20):
    """Calculate volatility for a symbol."""
    from backend.services import yfinance_service
    try:
        return yfinance_service.calculate_volatility(symbol, days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === Cron Jobs (Vercel Scheduled Tasks) ===

def verify_cron_secret(request: Request) -> bool:
    """Verify the request is from Vercel Cron using CRON_SECRET."""
    cron_secret = os.environ.get("CRON_SECRET")
    if not cron_secret:
        # If no secret configured, allow in development
        return True
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header == f"Bearer {cron_secret}":
        return True
    return False


@app.get("/api/cron/weekly-scan")
def cron_weekly_scan(request: Request):
    """
    Automated weekly market scan triggered by Vercel Cron.

    Schedule: Every Monday at 14:00 UTC (9 AM EST, market open)
    Security: Vercel sends Authorization header with CRON_SECRET

    This endpoint:
    1. Runs market scan using Alpha Vantage TOP_GAINERS_LOSERS
    2. Persists results to database
    3. Returns scan summary for logging
    """
    # Verify request is from Vercel Cron
    if not verify_cron_secret(request):
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid CRON_SECRET")

    try:
        # Run the weekly market scan with default parameters
        scan_request = MarketScanRequest(min_change_pct=5.0, max_results=20)
        result = market_scanner.run_scan(scan_request)

        return {
            "status": "success",
            "message": "Weekly scan completed",
            "scan_id": result.scan_id,
            "scan_date": result.scan_date,
            "ticker_count": result.ticker_count,
            "dominant_theme": result.dominant_theme,
            "top_gainers_count": len(result.top_gainers),
            "top_losers_count": len(result.top_losers)
        }
    except Exception as e:
        # Log error but return 200 to prevent Vercel from retrying
        return {
            "status": "error",
            "message": f"Weekly scan failed: {str(e)}",
            "scan_id": None
        }


@app.get("/api/cron/health")
def cron_health():
    """Health check for cron system."""
    return {
        "status": "online",
        "cron_enabled": True,
        "schedules": {
            "weekly_scan": "0 14 * * 1 (Monday 14:00 UTC)"
        }
    }
