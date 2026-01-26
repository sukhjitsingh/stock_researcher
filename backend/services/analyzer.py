"""
Deep Dive Analyzer Service - Fundamental and technical analysis

MCP-Ready Functions:
- analyze(): Full deep dive analysis
- check_solvency(): Operating cash flow check
- assess_volatility(): Volatility categorization
- assess_risk(): Overall risk level determination

Filters raw scan results to 3 viable candidates.
"""

from datetime import datetime
from typing import Optional, Tuple
from sqlmodel import Session

from backend.database import engine
from backend.models import AnalysisResult
from backend.services import yfinance_service, alpha_vantage
from backend.schemas.analysis import (
    AnalyzeRequest, AnalysisResponse,
    SolvencyCheck, VolatilityAssessment,
    RiskLevel, DirectionBias
)


def analyze(request: AnalyzeRequest) -> AnalysisResponse:
    """
    Perform full deep dive analysis on a ticker.

    MCP Tool: deep_dive_analysis

    Steps:
    1. Get current quote and price data
    2. Check solvency (Operating Cash Flow)
    3. Calculate 20-day volatility
    4. Get analyst ratings
    5. Assess risk level and direction bias
    6. Persist to database
    7. Return structured response
    """
    symbol = request.symbol.upper()

    # Step 1: Get quote
    quote = yfinance_service.get_quote(symbol)
    current_price = quote.get("price", 0)

    if not current_price:
        raise ValueError(f"Could not get price for {symbol}")

    # Step 2: Solvency check
    solvency = check_solvency(symbol)

    # Step 3: Volatility
    volatility = assess_volatility(symbol)

    # Step 4: Analyst ratings
    ratings = yfinance_service.get_analyst_ratings(symbol)

    # Step 5: Risk assessment
    risk_level, direction_bias, is_safe = assess_risk(
        volatility=volatility,
        solvency=solvency,
        price_vs_target=(ratings.get("upside_potential_pct") or 0),
        quote=quote
    )

    # Build recommendation
    recommendation = _build_recommendation(
        symbol, risk_level, direction_bias, is_safe, volatility, solvency
    )

    # Step 6: Persist
    with Session(engine) as session:
        analysis = AnalysisResult(
            scan_id=request.scan_id,
            symbol=symbol,
            current_price=current_price,
            price_change_pct=quote.get("change_percent"),
            fifty_two_week_high=quote.get("fifty_two_week_high"),
            fifty_two_week_low=quote.get("fifty_two_week_low"),
            operating_cash_flow=solvency.operating_cash_flow,
            is_solvent=solvency.is_solvent,
            volatility_20d=volatility.volatility_annualized,
            volatility_category=volatility.category.value,
            analyst_rating=ratings.get("recommendation_key"),
            analyst_target_mean=ratings.get("target_mean"),
            upside_potential_pct=ratings.get("upside_potential_pct"),
            risk_level=risk_level.value,
            direction_bias=direction_bias.value,
            is_safe_play=is_safe,
            raw_fundamentals=ratings,
            raw_technicals=quote
        )
        session.add(analysis)
        session.commit()
        session.refresh(analysis)
        analysis_id = analysis.id

    # Step 7: Return response
    return AnalysisResponse(
        analysis_id=analysis_id,
        symbol=symbol,
        current_price=current_price,
        solvency=solvency,
        volatility=volatility,
        analyst_rating=ratings.get("recommendation_key"),
        analyst_target_mean=ratings.get("target_mean"),
        upside_potential_pct=ratings.get("upside_potential_pct"),
        risk_level=risk_level,
        direction_bias=direction_bias,
        is_safe_play=is_safe,
        recommendation_summary=recommendation
    )


def check_solvency(symbol: str) -> SolvencyCheck:
    """
    Check solvency via Operating Cash Flow.

    MCP Tool: check_solvency

    Uses Alpha Vantage CASH_FLOW endpoint.
    Positive OCF = solvent.
    """
    try:
        cf_data = alpha_vantage.get_cash_flow(symbol)

        if "error" in cf_data:
            return SolvencyCheck(
                operating_cash_flow=None,
                free_cash_flow=None,
                is_solvent=True,
                notes="Unable to verify OCF - assuming solvent (verify manually)"
            )

        annual_reports = cf_data.get("annualReports", [])

        if annual_reports:
            latest = annual_reports[0]
            ocf_str = latest.get("operatingCashflow", "0")
            capex_str = latest.get("capitalExpenditures", "0")

            ocf = float(ocf_str) if ocf_str and ocf_str != "None" else 0
            capex = float(capex_str) if capex_str and capex_str != "None" else 0
            fcf = ocf - abs(capex)

            return SolvencyCheck(
                operating_cash_flow=ocf,
                free_cash_flow=fcf,
                is_solvent=ocf > 0,
                notes="Positive OCF indicates operational solvency" if ocf > 0 else "Negative OCF - cash burn"
            )
    except Exception as e:
        pass

    return SolvencyCheck(
        operating_cash_flow=None,
        free_cash_flow=None,
        is_solvent=True,
        notes="Unable to verify OCF - assuming solvent (verify manually)"
    )


def assess_volatility(symbol: str) -> VolatilityAssessment:
    """
    Calculate and categorize 20-day volatility.

    MCP Tool: assess_volatility
    """
    vol_data = yfinance_service.calculate_volatility(symbol, days=20)

    if "error" in vol_data:
        return VolatilityAssessment(
            volatility_20d=30.0,
            volatility_annualized=30.0,
            category=RiskLevel.MEDIUM,
            recommended_strategies=["Unable to calculate - use caution"]
        )

    category = RiskLevel(vol_data["category"])

    return VolatilityAssessment(
        volatility_20d=vol_data["daily_volatility"],
        volatility_annualized=vol_data["annualized_volatility"],
        category=category,
        recommended_strategies=vol_data["recommended_strategies"]
    )


def assess_risk(
    volatility: VolatilityAssessment,
    solvency: SolvencyCheck,
    price_vs_target: float,
    quote: dict
) -> Tuple[RiskLevel, DirectionBias, bool]:
    """
    Determine overall risk level and direction bias.

    MCP Tool: assess_risk

    Returns: (risk_level, direction_bias, is_safe_play)
    """
    # Start with volatility as base risk
    risk_score = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "EXTREME": 4}[volatility.category.value]

    # Adjust for solvency
    if not solvency.is_solvent:
        risk_score += 1

    # Check price extension
    fifty_day_ma = quote.get("fifty_day_ma")
    current_price = quote.get("price")
    if fifty_day_ma and current_price and fifty_day_ma > 0:
        extension = (current_price - fifty_day_ma) / fifty_day_ma * 100
        if abs(extension) > 30:
            risk_score += 1

    # Determine direction bias
    if price_vs_target > 10:
        direction_bias = DirectionBias.BULLISH
    elif price_vs_target < -10:
        direction_bias = DirectionBias.BEARISH
    else:
        direction_bias = DirectionBias.NEUTRAL

    # Determine risk level
    if risk_score <= 1:
        risk_level = RiskLevel.LOW
    elif risk_score <= 2:
        risk_level = RiskLevel.MEDIUM
    elif risk_score <= 3:
        risk_level = RiskLevel.HIGH
    else:
        risk_level = RiskLevel.EXTREME

    # Safe play = solvent + not extreme risk
    is_safe = solvency.is_solvent and risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM]

    return risk_level, direction_bias, is_safe


def _build_recommendation(
    symbol: str,
    risk_level: RiskLevel,
    direction_bias: DirectionBias,
    is_safe: bool,
    volatility: VolatilityAssessment,
    solvency: SolvencyCheck
) -> str:
    """Build human-readable recommendation summary."""
    parts = [f"{symbol}:"]

    if is_safe:
        parts.append("SAFE PLAY -")
    else:
        parts.append("SPECULATIVE -")

    parts.append(f"{risk_level.value} risk,")
    parts.append(f"{direction_bias.value} bias.")

    if volatility.category in [RiskLevel.HIGH, RiskLevel.EXTREME]:
        parts.append(f"High volatility ({volatility.volatility_annualized:.0f}%) favors directional strategies.")
    else:
        parts.append(f"Moderate volatility ({volatility.volatility_annualized:.0f}%) allows income strategies.")

    if not solvency.is_solvent:
        parts.append("WARNING: Negative operating cash flow.")

    return " ".join(parts)
