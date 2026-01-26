"""
Stock Research Agent API

FastAPI endpoints for market scanning, deep dive analysis,
and options strategy generation.

MCP Server available at /mcp for Claude autonomous execution.
"""

import contextlib
from fastapi import FastAPI, HTTPException, Depends
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
    version="3.1.0",
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
    return {"status": "online", "version": "3.1.0", "env": "vercel", "mcp": "/mcp"}


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
