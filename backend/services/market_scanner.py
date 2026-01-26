"""
Market Scanner Service - Orchestrates market scanning workflow

MCP-Ready Functions:
- run_scan(): Execute full market scan and persist results
- get_scan(): Retrieve scan by ID
- get_recent_scans(): List recent scans

Workflow: Alpha Vantage TOP_GAINERS_LOSERS -> Filter -> Persist -> Return
"""

from datetime import datetime
from typing import Optional, List
from sqlmodel import Session, select

from backend.database import engine
from backend.models import MarketScan
from backend.services import alpha_vantage
from backend.schemas.scanner import (
    MarketScanRequest, MarketScanResponse, TickerMovement, ScanSummary
)

# Sector mappings for theme detection
SECTOR_KEYWORDS = {
    "Tech": ["NVDA", "AMD", "INTC", "AVGO", "QCOM", "MU", "TSM", "ASML", "ARM", "SMCI"],
    "AI": ["NVDA", "MSFT", "GOOGL", "META", "AMZN", "PLTR", "SMCI"],
    "Mining": ["NEM", "GOLD", "AG", "HL", "PAAS", "ALB", "SQM", "CCJ", "UUUU"],
    "Banks": ["JPM", "BAC", "WFC", "GS", "MS", "C"],
    "Fintech": ["PYPL", "SQ", "SOFI", "COIN", "AFRM", "UPST"],
}


def run_scan(request: MarketScanRequest) -> MarketScanResponse:
    """
    Execute market scan using Alpha Vantage TOP_GAINERS_LOSERS.

    MCP Tool: market_scan

    Steps:
    1. Fetch top movers from Alpha Vantage (1 API call)
    2. Filter by minimum change percentage
    3. Identify dominant theme
    4. Persist to database
    5. Return structured response
    """
    # Step 1: Fetch from Alpha Vantage
    raw_data = alpha_vantage.get_top_gainers_losers()

    # Step 2: Filter by threshold
    gainers = [
        TickerMovement(**t) for t in raw_data["top_gainers"]
        if abs(t["change_percent"]) >= request.min_change_pct
    ][:request.max_results]

    losers = [
        TickerMovement(**t) for t in raw_data["top_losers"]
        if abs(t["change_percent"]) >= request.min_change_pct
    ][:request.max_results]

    most_active = [
        TickerMovement(**t) for t in raw_data["most_active"]
    ][:request.max_results]

    # Step 3: Identify theme
    theme = _identify_dominant_theme(gainers, losers)

    # Step 4: Persist
    with Session(engine) as session:
        scan = MarketScan(
            scan_type="TOP_GAINERS_LOSERS",
            dominant_theme=theme,
            top_gainers=[g.model_dump() for g in gainers],
            top_losers=[l.model_dump() for l in losers],
            most_active=[m.model_dump() for m in most_active],
            ticker_count=len(gainers) + len(losers)
        )
        session.add(scan)
        session.commit()
        session.refresh(scan)
        scan_id = scan.id
        scan_date = scan.date

    # Step 5: Return response
    return MarketScanResponse(
        scan_id=scan_id,
        scan_date=scan_date,
        top_gainers=gainers,
        top_losers=losers,
        most_active=most_active,
        dominant_theme=theme,
        ticker_count=len(gainers) + len(losers)
    )


def get_scan(scan_id: int) -> Optional[MarketScanResponse]:
    """
    Retrieve a scan by ID.

    MCP Tool: get_scan_results
    """
    with Session(engine) as session:
        scan = session.get(MarketScan, scan_id)
        if not scan:
            return None

        return MarketScanResponse(
            scan_id=scan.id,
            scan_date=scan.date,
            top_gainers=[TickerMovement(**g) for g in scan.top_gainers],
            top_losers=[TickerMovement(**l) for l in scan.top_losers],
            most_active=[TickerMovement(**m) for m in scan.most_active],
            dominant_theme=scan.dominant_theme,
            ticker_count=scan.ticker_count
        )


def get_recent_scans(limit: int = 10) -> List[ScanSummary]:
    """
    Get recent scans summary.

    MCP Tool: list_scans
    """
    with Session(engine) as session:
        statement = select(MarketScan).order_by(MarketScan.date.desc()).limit(limit)
        scans = session.exec(statement).all()

        return [
            ScanSummary(
                scan_id=s.id,
                date=s.date,
                dominant_theme=s.dominant_theme,
                ticker_count=s.ticker_count
            )
            for s in scans
        ]


def _identify_dominant_theme(
    gainers: List[TickerMovement],
    losers: List[TickerMovement]
) -> str:
    """Identify dominant sector theme from movers."""
    gainer_tickers = {g.ticker for g in gainers}
    loser_tickers = {l.ticker for l in losers}

    sector_scores = {}
    for sector, tickers in SECTOR_KEYWORDS.items():
        ticker_set = set(tickers)
        gainers_in_sector = len(gainer_tickers & ticker_set)
        losers_in_sector = len(loser_tickers & ticker_set)
        sector_scores[sector] = gainers_in_sector - losers_in_sector

    if not sector_scores:
        return "Mixed Market"

    top_sector = max(sector_scores, key=sector_scores.get)
    top_score = sector_scores[top_sector]

    if top_score > 2:
        return f"{top_sector} Sector Strength"
    elif top_score < -2:
        return f"{top_sector} Sector Weakness"
    else:
        return "Broad Market Movement"
