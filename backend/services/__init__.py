"""
Stock Research Agent - Service Layer

MCP-Ready Services:
- alpha_vantage: Market scanning via TOP_GAINERS_LOSERS
- alpaca_client: Real-time price validation
- yfinance_service: Quotes, options, analyst data
- market_scanner: Scan orchestration
- analyzer: Deep dive analysis
- options_engine: Strategy generation
- greeks: Black-Scholes calculations

All services are stateless and return JSON-serializable Pydantic models.
"""

from . import alpha_vantage
from . import alpaca_client
from . import yfinance_service
from . import market_scanner
from . import analyzer
from . import options_engine
from . import greeks

__all__ = [
    "alpha_vantage",
    "alpaca_client",
    "yfinance_service",
    "market_scanner",
    "analyzer",
    "options_engine",
    "greeks"
]
