"""
Stock Research Agent - Database Models

SQLModel definitions for Neon PostgreSQL tables:
- MarketScan: Weekly market scan results
- AnalysisResult: Deep dive analysis data
- TradePlan: Options strategy plans and execution tracking
"""

from typing import Optional, List
from sqlmodel import SQLModel, Field, JSON, Column
from datetime import datetime


class MarketScan(SQLModel, table=True):
    """Store weekly market scan results from Alpha Vantage TOP_GAINERS_LOSERS."""

    id: Optional[int] = Field(default=None, primary_key=True)
    date: datetime = Field(default_factory=datetime.utcnow)
    scan_type: str = Field(default="TOP_GAINERS_LOSERS")
    dominant_theme: str
    top_gainers: List[dict] = Field(default=[], sa_column=Column(JSON))
    top_losers: List[dict] = Field(default=[], sa_column=Column(JSON))
    most_active: List[dict] = Field(default=[], sa_column=Column(JSON))
    ticker_count: int = Field(default=0)
    notes: Optional[str] = None


class AnalysisResult(SQLModel, table=True):
    """Store deep dive analysis results for individual tickers."""

    id: Optional[int] = Field(default=None, primary_key=True)
    scan_id: Optional[int] = Field(default=None, foreign_key="marketscan.id")
    symbol: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Price Data
    current_price: float
    price_change_pct: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None

    # Solvency Check
    operating_cash_flow: Optional[float] = None
    is_solvent: bool = Field(default=False)

    # Volatility
    volatility_20d: Optional[float] = None
    volatility_category: str = Field(default="MEDIUM")  # LOW/MEDIUM/HIGH/EXTREME

    # Sentiment & Ratings
    analyst_rating: Optional[str] = None  # BUY/HOLD/SELL
    analyst_target_mean: Optional[float] = None
    upside_potential_pct: Optional[float] = None
    sentiment_score: Optional[str] = None  # BULLISH/BEARISH/NEUTRAL

    # Risk Assessment
    risk_level: str = Field(default="MEDIUM")  # LOW/MEDIUM/HIGH/EXTREME
    direction_bias: str = Field(default="NEUTRAL")  # BULLISH/BEARISH/NEUTRAL
    is_safe_play: bool = Field(default=False)

    # Raw Data Cache
    raw_fundamentals: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    raw_technicals: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class TradePlan(SQLModel, table=True):
    """Store generated options strategies and track execution lifecycle."""

    id: Optional[int] = Field(default=None, primary_key=True)
    analysis_id: Optional[int] = Field(default=None, foreign_key="analysisresult.id")
    symbol: str = Field(index=True)
    strategy_type: str  # LONG_CALL, BULL_CALL_SPREAD, PUT_CREDIT_SPREAD, etc.
    risk_tier: str = Field(default="MEDIUM")  # HIGH/MEDIUM/LOW
    status: str = Field(default="PLANNED")  # PLANNED/OPEN/CLOSED

    # Entry Details
    entry_price: Optional[float] = None
    strike_price: Optional[float] = None
    strike_price_2: Optional[float] = None  # For spreads
    expiration_date: Optional[datetime] = None
    contracts: int = Field(default=1)
    premium_paid: Optional[float] = None  # Debit paid
    premium_received: Optional[float] = None  # Credit received

    # Greeks at Entry
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None
    implied_volatility: Optional[float] = None

    # Risk/Reward
    max_profit: Optional[float] = None
    max_loss: Optional[float] = None
    breakeven_price: Optional[float] = None
    risk_reward_ratio: Optional[float] = None
    win_probability: Optional[float] = None

    # Exit Conditions
    profit_target_pct: Optional[float] = None
    stop_loss_pct: Optional[float] = None
    time_stop_days: Optional[int] = None

    # Execution
    opened_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    exit_price: Optional[float] = None
    realized_pnl: Optional[float] = None
    exit_reason: Optional[str] = None  # PROFIT_TARGET/STOP_LOSS/TIME_STOP/MANUAL

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
