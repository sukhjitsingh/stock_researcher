"""
Options Greeks Calculator - Black-Scholes implementation

MCP-Ready Functions:
- calculate_greeks(): Full Greeks calculation for an option
- black_scholes_price(): Option theoretical price
- estimate_win_probability(): Probability of profit

All functions are pure/stateless for easy testing and MCP integration.
Uses lightweight approximation for normal distribution (no scipy).
"""

import math
from typing import Literal
from dataclasses import dataclass


def _norm_cdf(x: float) -> float:
    """
    Approximation of the standard normal CDF.
    Uses Abramowitz and Stegun approximation (error < 7.5e-8).
    """
    a1 = 0.254829592
    a2 = -0.284496736
    a3 = 1.421413741
    a4 = -1.453152027
    a5 = 1.061405429
    p = 0.3275911

    sign = 1 if x >= 0 else -1
    x = abs(x) / math.sqrt(2)

    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)

    return 0.5 * (1.0 + sign * y)


def _norm_pdf(x: float) -> float:
    """Standard normal PDF."""
    return math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)


@dataclass
class GreeksResult:
    """Greeks calculation result."""
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float
    theoretical_price: float


def calculate_greeks(
    spot: float,
    strike: float,
    time_to_expiry: float,  # In years
    volatility: float,       # As decimal (0.30 = 30%)
    risk_free_rate: float,   # As decimal (0.05 = 5%)
    option_type: Literal["call", "put"]
) -> GreeksResult:
    """
    Calculate all Greeks for an option using Black-Scholes.

    MCP Tool: calculate_option_greeks

    Args:
        spot: Current stock price
        strike: Option strike price
        time_to_expiry: Time to expiration in years (e.g., 30 days = 30/365)
        volatility: Implied volatility as decimal
        risk_free_rate: Risk-free rate as decimal
        option_type: "call" or "put"

    Returns:
        GreeksResult with all Greeks and theoretical price
    """
    # Handle edge case of very short time to expiry
    if time_to_expiry <= 0:
        time_to_expiry = 1/365  # 1 day minimum

    d1 = _calculate_d1(spot, strike, time_to_expiry, volatility, risk_free_rate)
    d2 = d1 - volatility * math.sqrt(time_to_expiry)

    # Calculate price
    price = black_scholes_price(spot, strike, time_to_expiry, volatility, risk_free_rate, option_type)

    # Calculate Greeks
    delta = _calculate_delta(d1, option_type)
    gamma = _calculate_gamma(spot, d1, time_to_expiry, volatility)
    theta = _calculate_theta(spot, strike, d1, d2, time_to_expiry, volatility, risk_free_rate, option_type)
    vega = _calculate_vega(spot, d1, time_to_expiry)
    rho = _calculate_rho(strike, d2, time_to_expiry, risk_free_rate, option_type)

    return GreeksResult(
        delta=round(delta, 4),
        gamma=round(gamma, 6),
        theta=round(theta, 4),
        vega=round(vega, 4),
        rho=round(rho, 4),
        theoretical_price=round(price, 2)
    )


def black_scholes_price(
    spot: float,
    strike: float,
    time_to_expiry: float,
    volatility: float,
    risk_free_rate: float,
    option_type: Literal["call", "put"]
) -> float:
    """
    Calculate Black-Scholes option price.

    MCP Tool: option_price
    """
    if time_to_expiry <= 0:
        time_to_expiry = 1/365

    d1 = _calculate_d1(spot, strike, time_to_expiry, volatility, risk_free_rate)
    d2 = d1 - volatility * math.sqrt(time_to_expiry)

    if option_type == "call":
        price = spot * _norm_cdf(d1) - strike * math.exp(-risk_free_rate * time_to_expiry) * _norm_cdf(d2)
    else:
        price = strike * math.exp(-risk_free_rate * time_to_expiry) * _norm_cdf(-d2) - spot * _norm_cdf(-d1)

    return price


def estimate_win_probability(
    spot: float,
    breakeven: float,
    time_to_expiry: float,
    volatility: float,
    option_type: Literal["call", "put"]
) -> float:
    """
    Estimate probability of profit at expiration.

    MCP Tool: estimate_win_probability

    Uses normal distribution assumption for stock price movement.
    """
    if time_to_expiry <= 0:
        time_to_expiry = 1/365

    # Expected move = spot * vol * sqrt(time)
    expected_move_pct = volatility * math.sqrt(time_to_expiry)

    # Distance to breakeven as % of spot
    distance_pct = (breakeven - spot) / spot

    # Z-score (how many standard deviations to breakeven)
    if expected_move_pct == 0:
        return 50.0

    z_score = distance_pct / expected_move_pct

    if option_type == "call":
        # Call profits if price > breakeven
        prob = 1 - _norm_cdf(z_score)
    else:
        # Put profits if price < breakeven
        prob = _norm_cdf(z_score)

    return round(prob * 100, 1)


def _calculate_d1(
    spot: float,
    strike: float,
    time_to_expiry: float,
    volatility: float,
    risk_free_rate: float
) -> float:
    """Calculate d1 for Black-Scholes formula."""
    numerator = math.log(spot / strike) + (risk_free_rate + 0.5 * volatility ** 2) * time_to_expiry
    denominator = volatility * math.sqrt(time_to_expiry)
    return numerator / denominator


def _calculate_delta(d1: float, option_type: Literal["call", "put"]) -> float:
    """Calculate Delta - rate of change of option price vs stock price."""
    if option_type == "call":
        return _norm_cdf(d1)
    else:
        return _norm_cdf(d1) - 1


def _calculate_gamma(spot: float, d1: float, time_to_expiry: float, volatility: float) -> float:
    """Calculate Gamma - rate of change of Delta vs stock price."""
    return _norm_pdf(d1) / (spot * volatility * math.sqrt(time_to_expiry))


def _calculate_theta(
    spot: float,
    strike: float,
    d1: float,
    d2: float,
    time_to_expiry: float,
    volatility: float,
    risk_free_rate: float,
    option_type: Literal["call", "put"]
) -> float:
    """Calculate Theta - time decay per day (negative for long options)."""
    term1 = -(spot * _norm_pdf(d1) * volatility) / (2 * math.sqrt(time_to_expiry))

    if option_type == "call":
        term2 = -risk_free_rate * strike * math.exp(-risk_free_rate * time_to_expiry) * _norm_cdf(d2)
    else:
        term2 = risk_free_rate * strike * math.exp(-risk_free_rate * time_to_expiry) * _norm_cdf(-d2)

    # Convert to daily theta (divide by 365)
    return (term1 + term2) / 365


def _calculate_vega(spot: float, d1: float, time_to_expiry: float) -> float:
    """Calculate Vega - sensitivity to volatility (per 1% change)."""
    return (spot * math.sqrt(time_to_expiry) * _norm_pdf(d1)) / 100


def _calculate_rho(
    strike: float,
    d2: float,
    time_to_expiry: float,
    risk_free_rate: float,
    option_type: Literal["call", "put"]
) -> float:
    """Calculate Rho - sensitivity to interest rates (per 1% change)."""
    if option_type == "call":
        return (strike * time_to_expiry * math.exp(-risk_free_rate * time_to_expiry) * _norm_cdf(d2)) / 100
    else:
        return -(strike * time_to_expiry * math.exp(-risk_free_rate * time_to_expiry) * _norm_cdf(-d2)) / 100
