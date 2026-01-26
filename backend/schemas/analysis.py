"""Analysis schemas - Deep dive analysis input/output models."""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    EXTREME = "EXTREME"


class DirectionBias(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"


class AnalyzeRequest(BaseModel):
    """Request for deep dive analysis - MCP tool input."""
    symbol: str = Field(..., description="Stock ticker symbol")
    scan_id: Optional[int] = Field(None, description="Link to originating scan")


class SolvencyCheck(BaseModel):
    """Solvency assessment result."""
    operating_cash_flow: Optional[float]
    free_cash_flow: Optional[float]
    is_solvent: bool
    notes: str


class VolatilityAssessment(BaseModel):
    """Volatility calculation result."""
    volatility_20d: float
    volatility_annualized: float
    category: RiskLevel
    recommended_strategies: List[str]


class AnalysisResponse(BaseModel):
    """Deep dive analysis result - MCP tool output."""
    analysis_id: int
    symbol: str
    current_price: float

    # Solvency
    solvency: SolvencyCheck

    # Volatility
    volatility: VolatilityAssessment

    # Ratings
    analyst_rating: Optional[str]
    analyst_target_mean: Optional[float]
    upside_potential_pct: Optional[float]

    # Assessment
    risk_level: RiskLevel
    direction_bias: DirectionBias
    is_safe_play: bool

    # Recommendation
    recommendation_summary: str
