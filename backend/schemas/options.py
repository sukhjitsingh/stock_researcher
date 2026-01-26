"""Options schemas - Strategy generation input/output models."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class StrategyType(str, Enum):
    LONG_CALL = "LONG_CALL"
    LONG_PUT = "LONG_PUT"
    BULL_CALL_SPREAD = "BULL_CALL_SPREAD"
    BEAR_PUT_SPREAD = "BEAR_PUT_SPREAD"
    PUT_CREDIT_SPREAD = "PUT_CREDIT_SPREAD"
    CALL_CREDIT_SPREAD = "CALL_CREDIT_SPREAD"
    CASH_SECURED_PUT = "CASH_SECURED_PUT"


class RiskTier(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class GreeksSnapshot(BaseModel):
    """Options Greeks at a point in time."""
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: Optional[float] = None


class StrategyRequest(BaseModel):
    """Request for options strategy generation - MCP tool input."""
    symbol: str
    capital: float = Field(..., ge=100, description="Available capital in USD")
    analysis_id: Optional[int] = Field(None, description="Link to analysis")
    risk_preference: Optional[RiskTier] = Field(None, description="Filter to specific tier")


class OptionLeg(BaseModel):
    """Single option leg details."""
    action: str  # BUY or SELL
    option_type: str  # CALL or PUT
    strike: float
    expiration: datetime
    premium: float
    contracts: int
    greeks: Optional[GreeksSnapshot] = None


class StrategyPlan(BaseModel):
    """Single options strategy plan."""
    strategy_type: StrategyType
    risk_tier: RiskTier
    legs: List[OptionLeg]

    # Cost/Credit
    total_debit: Optional[float] = None
    total_credit: Optional[float] = None
    collateral_required: Optional[float] = None

    # Risk/Reward
    max_profit: float
    max_loss: float
    breakeven: float
    risk_reward_ratio: float
    win_probability: float

    # Exit Conditions
    profit_target_pct: float
    stop_loss_pct: float
    time_stop_days: int

    # Rationale
    rationale: str
    warnings: List[str] = []


class StrategyResponse(BaseModel):
    """Options strategy generation result - MCP tool output."""
    symbol: str
    current_price: float
    capital: float
    strategies: List[StrategyPlan]
    recommendation: str
    capital_warnings: List[str] = []


class TradePlanSummary(BaseModel):
    """Summary of a trade plan for list views."""
    id: int
    symbol: str
    strategy_type: str
    risk_tier: str
    status: str
    strike: Optional[float]
    expiration: Optional[datetime]
    max_profit: Optional[float]
    max_loss: Optional[float]
    win_probability: Optional[float]
    created_at: datetime
