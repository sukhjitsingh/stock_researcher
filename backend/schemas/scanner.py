"""Scanner schemas - Market scanning input/output models."""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class TickerMovement(BaseModel):
    """Single ticker movement data from market scan."""
    ticker: str
    price: float
    change_amount: float
    change_percent: float
    volume: int


class MarketScanRequest(BaseModel):
    """Request to trigger a market scan - MCP tool input."""
    min_change_pct: float = Field(default=5.0, description="Minimum % change threshold")
    max_results: int = Field(default=20, description="Max tickers per category")


class MarketScanResponse(BaseModel):
    """Response from market scan - MCP tool output."""
    scan_id: int
    scan_date: datetime
    top_gainers: List[TickerMovement]
    top_losers: List[TickerMovement]
    most_active: List[TickerMovement]
    dominant_theme: str
    ticker_count: int


class ScanSummary(BaseModel):
    """Summary of a market scan for list views."""
    scan_id: int
    date: datetime
    dominant_theme: str
    ticker_count: int
