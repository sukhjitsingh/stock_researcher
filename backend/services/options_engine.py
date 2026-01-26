"""
Options Strategy Engine - Generates trade plans

MCP-Ready Functions:
- generate_strategies(): Generate HIGH/MEDIUM/LOW risk strategies
- get_plans(): Retrieve trade plans from database

Each strategy includes Greeks, risk/reward, exit conditions.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from sqlmodel import Session, select

from backend.database import engine
from backend.models import TradePlan
from backend.services import yfinance_service
from backend.services import greeks as greeks_service
from backend.schemas.options import (
    StrategyRequest, StrategyResponse, StrategyPlan, OptionLeg,
    GreeksSnapshot, StrategyType, RiskTier, TradePlanSummary
)

# Current risk-free rate approximation
RISK_FREE_RATE = 0.045  # 4.5%


def generate_strategies(request: StrategyRequest) -> StrategyResponse:
    """
    Generate three options strategies (HIGH/MEDIUM/LOW risk).

    MCP Tool: generate_options_strategies

    Steps:
    1. Fetch options chain
    2. Generate HIGH risk strategy (directional)
    3. Generate MEDIUM risk strategy (spread)
    4. Generate LOW risk strategy (income)
    5. Check capital constraints
    6. Persist plans to database
    7. Return structured response
    """
    symbol = request.symbol.upper()
    capital = request.capital

    # Get current data
    quote = yfinance_service.get_quote(symbol)
    current_price = quote.get("price", 0)

    if not current_price:
        return StrategyResponse(
            symbol=symbol,
            current_price=0,
            capital=capital,
            strategies=[],
            recommendation=f"Unable to get price for {symbol}",
            capital_warnings=["No price data"]
        )

    chain = yfinance_service.get_options_chain(symbol, expiration_index=0)
    chain_monthly = yfinance_service.get_options_chain(symbol, expiration_index=2)

    if "error" in chain:
        return StrategyResponse(
            symbol=symbol,
            current_price=current_price,
            capital=capital,
            strategies=[],
            recommendation=f"Unable to fetch options data: {chain['error']}",
            capital_warnings=["No options data available"]
        )

    strategies = []
    capital_warnings = []

    # HIGH RISK: Weekly directional (nearest expiration)
    high_risk = _create_long_call_plan(symbol, current_price, capital, chain)
    if high_risk:
        strategies.append(high_risk)
        if high_risk.total_debit and high_risk.total_debit > capital:
            capital_warnings.append(f"HIGH RISK: Costs ${high_risk.total_debit:.2f}, exceeds ${capital:.2f} budget")

    # MEDIUM RISK: Bull call spread (~30 days)
    medium_risk = _create_bull_call_spread(symbol, current_price, capital, chain_monthly if "error" not in chain_monthly else chain)
    if medium_risk:
        strategies.append(medium_risk)
        if medium_risk.total_debit and medium_risk.total_debit > capital:
            capital_warnings.append(f"MEDIUM RISK: Costs ${medium_risk.total_debit:.2f}, exceeds ${capital:.2f} budget")

    # LOW RISK: Put credit spread (~30 days)
    low_risk = _create_put_credit_spread(symbol, current_price, capital, chain_monthly if "error" not in chain_monthly else chain)
    if low_risk:
        strategies.append(low_risk)
        if low_risk.collateral_required and low_risk.collateral_required > capital:
            capital_warnings.append(f"LOW RISK: Requires ${low_risk.collateral_required:.2f} collateral, exceeds ${capital:.2f} budget")

    # Build recommendation
    affordable = [s for s in strategies if (s.total_debit or 0) <= capital and (s.collateral_required or 0) <= capital]
    if affordable:
        best = affordable[0]
        recommendation = f"Recommended: {best.strategy_type.value} ({best.risk_tier.value} risk) - fits within ${capital:.2f} budget"
    elif strategies:
        recommendation = f"WARNING: No strategies fit within ${capital:.2f} budget. Consider higher capital or different stock."
    else:
        recommendation = "No strategies could be generated. Check options availability."

    # Persist plans
    with Session(engine) as session:
        for strategy in strategies:
            plan = TradePlan(
                analysis_id=request.analysis_id,
                symbol=symbol,
                strategy_type=strategy.strategy_type.value,
                risk_tier=strategy.risk_tier.value,
                status="PLANNED",
                entry_price=current_price,
                strike_price=strategy.legs[0].strike if strategy.legs else None,
                strike_price_2=strategy.legs[1].strike if len(strategy.legs) > 1 else None,
                expiration_date=strategy.legs[0].expiration if strategy.legs else None,
                contracts=strategy.legs[0].contracts if strategy.legs else 1,
                premium_paid=strategy.total_debit,
                premium_received=strategy.total_credit,
                delta=strategy.legs[0].greeks.delta if strategy.legs and strategy.legs[0].greeks else None,
                implied_volatility=chain.get("atm_call", {}).get("implied_volatility") if chain.get("atm_call") else None,
                max_profit=strategy.max_profit,
                max_loss=strategy.max_loss,
                breakeven_price=strategy.breakeven,
                risk_reward_ratio=strategy.risk_reward_ratio,
                win_probability=strategy.win_probability,
                profit_target_pct=strategy.profit_target_pct,
                stop_loss_pct=strategy.stop_loss_pct,
                time_stop_days=strategy.time_stop_days,
                notes=strategy.rationale
            )
            session.add(plan)
        session.commit()

    return StrategyResponse(
        symbol=symbol,
        current_price=current_price,
        capital=capital,
        strategies=strategies,
        recommendation=recommendation,
        capital_warnings=capital_warnings
    )


def get_plans(symbol: Optional[str] = None, status: Optional[str] = None) -> List[TradePlanSummary]:
    """
    Retrieve trade plans from database.

    MCP Tool: list_trade_plans
    """
    with Session(engine) as session:
        statement = select(TradePlan)

        if symbol:
            statement = statement.where(TradePlan.symbol == symbol.upper())
        if status:
            statement = statement.where(TradePlan.status == status.upper())

        statement = statement.order_by(TradePlan.created_at.desc())
        plans = session.exec(statement).all()

        return [
            TradePlanSummary(
                id=p.id,
                symbol=p.symbol,
                strategy_type=p.strategy_type,
                risk_tier=p.risk_tier,
                status=p.status,
                strike=p.strike_price,
                expiration=p.expiration_date,
                max_profit=p.max_profit,
                max_loss=p.max_loss,
                win_probability=p.win_probability,
                created_at=p.created_at
            )
            for p in plans
        ]


def _create_long_call_plan(
    symbol: str,
    spot: float,
    capital: float,
    chain: dict
) -> Optional[StrategyPlan]:
    """Create HIGH RISK long call strategy."""
    calls = chain.get("calls", [])
    expiration = chain.get("selected_expiration")

    if not calls or not expiration:
        return None

    # Find call ~5% OTM
    target_strike = spot * 1.05

    best_call = None
    for call in calls:
        if call["strike"] >= target_strike and call.get("ask") and call["ask"] > 0:
            best_call = call
            break

    if not best_call:
        # Fallback to ATM
        atm_call = chain.get("atm_call")
        if atm_call and atm_call.get("ask"):
            best_call = atm_call
        else:
            return None

    strike = best_call["strike"]
    premium = best_call.get("ask") or best_call.get("last_price", 0)
    iv = best_call.get("implied_volatility", 30) / 100

    try:
        exp_date = datetime.strptime(expiration, "%Y-%m-%d")
    except:
        exp_date = datetime.now() + timedelta(days=7)

    days_to_exp = max((exp_date - datetime.now()).days, 1)
    time_to_expiry = days_to_exp / 365

    greeks_result = greeks_service.calculate_greeks(
        spot=spot,
        strike=strike,
        time_to_expiry=time_to_expiry,
        volatility=iv,
        risk_free_rate=RISK_FREE_RATE,
        option_type="call"
    )

    total_cost = premium * 100
    max_loss = total_cost
    breakeven = strike + premium

    win_prob = greeks_service.estimate_win_probability(
        spot=spot,
        breakeven=breakeven,
        time_to_expiry=time_to_expiry,
        volatility=iv,
        option_type="call"
    )

    warnings = []
    move_needed = (breakeven - spot) / spot * 100
    if move_needed > 10:
        warnings.append(f"Needs +{move_needed:.1f}% move to breakeven")
    if iv > 0.5:
        warnings.append(f"IV is {iv*100:.0f}% - options are expensive")

    return StrategyPlan(
        strategy_type=StrategyType.LONG_CALL,
        risk_tier=RiskTier.HIGH,
        legs=[
            OptionLeg(
                action="BUY",
                option_type="CALL",
                strike=strike,
                expiration=exp_date,
                premium=premium,
                contracts=1,
                greeks=GreeksSnapshot(
                    delta=greeks_result.delta,
                    gamma=greeks_result.gamma,
                    theta=greeks_result.theta,
                    vega=greeks_result.vega
                )
            )
        ],
        total_debit=total_cost,
        max_profit=999999,
        max_loss=max_loss,
        breakeven=breakeven,
        risk_reward_ratio=0,
        win_probability=win_prob,
        profit_target_pct=50,
        stop_loss_pct=50,
        time_stop_days=max(1, days_to_exp - 1),
        rationale=f"Directional bullish bet. Delta {greeks_result.delta:.2f}. Needs {move_needed:.1f}% move.",
        warnings=warnings
    )


def _create_bull_call_spread(
    symbol: str,
    spot: float,
    capital: float,
    chain: dict
) -> Optional[StrategyPlan]:
    """Create MEDIUM RISK bull call spread."""
    calls = chain.get("calls", [])
    expiration = chain.get("selected_expiration")
    atm_strike = chain.get("atm_strike")

    if not calls or not expiration or not atm_strike:
        return None

    buy_call = None
    for call in calls:
        if call["strike"] == atm_strike and call.get("ask"):
            buy_call = call
            break

    if not buy_call:
        return None

    target_sell_strike = atm_strike * 1.05
    sell_call = None
    for call in calls:
        if call["strike"] >= target_sell_strike and call.get("bid") and call["bid"] > 0:
            sell_call = call
            break

    if not sell_call:
        return None

    buy_premium = buy_call.get("ask", 0)
    sell_premium = sell_call.get("bid", 0)
    net_debit = (buy_premium - sell_premium) * 100

    spread_width = sell_call["strike"] - buy_call["strike"]
    max_profit = (spread_width * 100) - net_debit
    max_loss = net_debit
    breakeven = buy_call["strike"] + (buy_premium - sell_premium)

    try:
        exp_date = datetime.strptime(expiration, "%Y-%m-%d")
    except:
        exp_date = datetime.now() + timedelta(days=30)

    days_to_exp = max((exp_date - datetime.now()).days, 1)
    time_to_expiry = days_to_exp / 365
    iv = buy_call.get("implied_volatility", 30) / 100

    buy_greeks = greeks_service.calculate_greeks(spot, buy_call["strike"], time_to_expiry, iv, RISK_FREE_RATE, "call")
    sell_greeks = greeks_service.calculate_greeks(spot, sell_call["strike"], time_to_expiry, iv, RISK_FREE_RATE, "call")

    spread_delta = buy_greeks.delta - sell_greeks.delta
    risk_reward = max_profit / max_loss if max_loss > 0 else 0

    win_prob = greeks_service.estimate_win_probability(spot, breakeven, time_to_expiry, iv, "call")

    warnings = []
    if net_debit > capital:
        warnings.append(f"Cost ${net_debit:.2f} exceeds budget")

    return StrategyPlan(
        strategy_type=StrategyType.BULL_CALL_SPREAD,
        risk_tier=RiskTier.MEDIUM,
        legs=[
            OptionLeg(
                action="BUY",
                option_type="CALL",
                strike=buy_call["strike"],
                expiration=exp_date,
                premium=buy_premium,
                contracts=1,
                greeks=GreeksSnapshot(
                    delta=buy_greeks.delta,
                    gamma=buy_greeks.gamma,
                    theta=buy_greeks.theta,
                    vega=buy_greeks.vega
                )
            ),
            OptionLeg(
                action="SELL",
                option_type="CALL",
                strike=sell_call["strike"],
                expiration=exp_date,
                premium=sell_premium,
                contracts=1,
                greeks=GreeksSnapshot(
                    delta=sell_greeks.delta,
                    gamma=sell_greeks.gamma,
                    theta=sell_greeks.theta,
                    vega=sell_greeks.vega
                )
            )
        ],
        total_debit=net_debit,
        max_profit=max_profit,
        max_loss=max_loss,
        breakeven=breakeven,
        risk_reward_ratio=round(risk_reward, 2),
        win_probability=win_prob,
        profit_target_pct=50,
        stop_loss_pct=40,
        time_stop_days=max(3, days_to_exp - 5),
        rationale=f"Defined risk spread. Net delta {spread_delta:.2f}. R:R {risk_reward:.1f}:1.",
        warnings=warnings
    )


def _create_put_credit_spread(
    symbol: str,
    spot: float,
    capital: float,
    chain: dict
) -> Optional[StrategyPlan]:
    """Create LOW RISK put credit spread (income strategy)."""
    puts = chain.get("puts", [])
    expiration = chain.get("selected_expiration")

    if not puts or not expiration:
        return None

    target_sell_strike = spot * 0.95
    sell_put = None
    for put in reversed(puts):
        if put["strike"] <= target_sell_strike and put.get("bid") and put["bid"] > 0:
            sell_put = put
            break

    if not sell_put:
        return None

    target_buy_strike = sell_put["strike"] * 0.95
    buy_put = None
    for put in reversed(puts):
        if put["strike"] <= target_buy_strike and put.get("ask"):
            buy_put = put
            break

    if not buy_put:
        return None

    sell_premium = sell_put.get("bid", 0)
    buy_premium = buy_put.get("ask", 0)
    net_credit = (sell_premium - buy_premium) * 100

    spread_width = sell_put["strike"] - buy_put["strike"]
    collateral = spread_width * 100
    max_profit = net_credit
    max_loss = collateral - net_credit
    breakeven = sell_put["strike"] - (sell_premium - buy_premium)

    try:
        exp_date = datetime.strptime(expiration, "%Y-%m-%d")
    except:
        exp_date = datetime.now() + timedelta(days=30)

    days_to_exp = max((exp_date - datetime.now()).days, 1)
    time_to_expiry = days_to_exp / 365
    iv = sell_put.get("implied_volatility", 30) / 100

    sell_greeks = greeks_service.calculate_greeks(spot, sell_put["strike"], time_to_expiry, iv, RISK_FREE_RATE, "put")

    risk_reward = max_profit / max_loss if max_loss > 0 else 0

    win_prob = 100 - greeks_service.estimate_win_probability(spot, sell_put["strike"], time_to_expiry, iv, "put")

    warnings = []
    if collateral > capital:
        warnings.append(f"Requires ${collateral:.2f} collateral - exceeds budget")

    cushion_pct = (spot - sell_put["strike"]) / spot * 100

    return StrategyPlan(
        strategy_type=StrategyType.PUT_CREDIT_SPREAD,
        risk_tier=RiskTier.LOW,
        legs=[
            OptionLeg(
                action="SELL",
                option_type="PUT",
                strike=sell_put["strike"],
                expiration=exp_date,
                premium=sell_premium,
                contracts=1,
                greeks=GreeksSnapshot(
                    delta=sell_greeks.delta,
                    gamma=sell_greeks.gamma,
                    theta=-sell_greeks.theta,
                    vega=-sell_greeks.vega
                )
            ),
            OptionLeg(
                action="BUY",
                option_type="PUT",
                strike=buy_put["strike"],
                expiration=exp_date,
                premium=buy_premium,
                contracts=1,
                greeks=None
            )
        ],
        total_credit=net_credit,
        collateral_required=collateral,
        max_profit=max_profit,
        max_loss=max_loss,
        breakeven=breakeven,
        risk_reward_ratio=round(risk_reward, 2),
        win_probability=win_prob,
        profit_target_pct=50,
        stop_loss_pct=100,
        time_stop_days=max(3, days_to_exp - 5),
        rationale=f"Income strategy. {cushion_pct:.1f}% cushion. Collect ${net_credit:.2f} credit.",
        warnings=warnings
    )
