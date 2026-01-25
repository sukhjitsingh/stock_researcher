#!/usr/bin/env python3
"""
Stock Data Fetcher - Helper script for AI-assisted stock research
Uses yfinance (free, no API key required)

Usage:
    python fetch_data.py quote TICKER
    python fetch_data.py history TICKER [PERIOD]
    python fetch_data.py options TICKER
    python fetch_data.py analysis TICKER
    python fetch_data.py sector SECTOR_ETF
"""

import sys
import json
from datetime import datetime, timedelta

try:
    import yfinance as yf
except ImportError:
    print("Installing yfinance...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "yfinance", "-q"])
    import yfinance as yf

def get_quote(ticker: str) -> dict:
    """Get current quote and key metrics for a stock."""
    stock = yf.Ticker(ticker)
    info = stock.info
    
    return {
        "ticker": ticker,
        "name": info.get("longName", "N/A"),
        "price": info.get("currentPrice") or info.get("regularMarketPrice"),
        "change": info.get("regularMarketChange"),
        "change_percent": info.get("regularMarketChangePercent"),
        "volume": info.get("volume"),
        "avg_volume": info.get("averageVolume"),
        "market_cap": info.get("marketCap"),
        "pe_ratio": info.get("trailingPE"),
        "forward_pe": info.get("forwardPE"),
        "52_week_high": info.get("fiftyTwoWeekHigh"),
        "52_week_low": info.get("fiftyTwoWeekLow"),
        "50_day_ma": info.get("fiftyDayAverage"),
        "200_day_ma": info.get("twoHundredDayAverage"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
    }

def get_history(ticker: str, period: str = "1mo") -> dict:
    """Get historical price data."""
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)
    
    if hist.empty:
        return {"error": f"No data found for {ticker}"}
    
    # Calculate basic technicals
    closes = hist['Close']
    returns = closes.pct_change()
    
    return {
        "ticker": ticker,
        "period": period,
        "start_date": str(hist.index[0].date()),
        "end_date": str(hist.index[-1].date()),
        "start_price": round(closes.iloc[0], 2),
        "end_price": round(closes.iloc[-1], 2),
        "period_return": round((closes.iloc[-1] / closes.iloc[0] - 1) * 100, 2),
        "high": round(hist['High'].max(), 2),
        "low": round(hist['Low'].min(), 2),
        "avg_volume": int(hist['Volume'].mean()),
        "volatility": round(returns.std() * (252 ** 0.5) * 100, 2),  # Annualized
        "recent_prices": [
            {
                "date": str(idx.date()),
                "close": round(row['Close'], 2),
                "volume": int(row['Volume'])
            }
            for idx, row in hist.tail(5).iterrows()
        ]
    }

def get_options(ticker: str) -> dict:
    """Get options chain data."""
    stock = yf.Ticker(ticker)
    
    try:
        expirations = stock.options
        if not expirations:
            return {"error": f"No options data for {ticker}"}
        
        # Get the nearest expiration
        nearest_exp = expirations[0]
        chain = stock.option_chain(nearest_exp)
        
        # Get current price for context
        info = stock.info
        current_price = info.get("currentPrice") or info.get("regularMarketPrice")
        
        # Find ATM options
        calls = chain.calls
        puts = chain.puts
        
        # Get ATM strike (closest to current price)
        atm_strike = calls.iloc[(calls['strike'] - current_price).abs().argsort()[:1]]['strike'].values[0]
        
        atm_call = calls[calls['strike'] == atm_strike].iloc[0] if len(calls[calls['strike'] == atm_strike]) > 0 else None
        atm_put = puts[puts['strike'] == atm_strike].iloc[0] if len(puts[puts['strike'] == atm_strike]) > 0 else None
        
        return {
            "ticker": ticker,
            "current_price": current_price,
            "expirations": list(expirations[:5]),  # Next 5 expirations
            "nearest_expiration": nearest_exp,
            "atm_strike": atm_strike,
            "atm_call": {
                "strike": atm_strike,
                "last_price": round(atm_call['lastPrice'], 2) if atm_call is not None else None,
                "bid": round(atm_call['bid'], 2) if atm_call is not None else None,
                "ask": round(atm_call['ask'], 2) if atm_call is not None else None,
                "implied_volatility": round(atm_call['impliedVolatility'] * 100, 2) if atm_call is not None else None,
                "open_interest": int(atm_call['openInterest']) if atm_call is not None else None,
            },
            "atm_put": {
                "strike": atm_strike,
                "last_price": round(atm_put['lastPrice'], 2) if atm_put is not None else None,
                "bid": round(atm_put['bid'], 2) if atm_put is not None else None,
                "ask": round(atm_put['ask'], 2) if atm_put is not None else None,
                "implied_volatility": round(atm_put['impliedVolatility'] * 100, 2) if atm_put is not None else None,
                "open_interest": int(atm_put['openInterest']) if atm_put is not None else None,
            },
            "call_strikes": calls['strike'].tolist()[:10],
            "put_strikes": puts['strike'].tolist()[:10],
        }
    except Exception as e:
        return {"error": str(e)}

def get_analysis(ticker: str) -> dict:
    """Get analyst recommendations and targets."""
    stock = yf.Ticker(ticker)
    info = stock.info
    
    recommendations = None
    try:
        recs = stock.recommendations
        if recs is not None and len(recs) > 0:
            recent = recs.tail(10)
            recommendations = [
                {
                    "date": str(idx.date()) if hasattr(idx, 'date') else str(idx),
                    "firm": row.get('Firm', 'N/A'),
                    "to_grade": row.get('To Grade', 'N/A'),
                    "action": row.get('Action', 'N/A')
                }
                for idx, row in recent.iterrows()
            ]
    except:
        pass
    
    return {
        "ticker": ticker,
        "name": info.get("longName"),
        "recommendation_key": info.get("recommendationKey"),  # buy, hold, sell
        "recommendation_mean": info.get("recommendationMean"),  # 1=Strong Buy, 5=Sell
        "number_of_analysts": info.get("numberOfAnalystOpinions"),
        "target_high": info.get("targetHighPrice"),
        "target_low": info.get("targetLowPrice"),
        "target_mean": info.get("targetMeanPrice"),
        "target_median": info.get("targetMedianPrice"),
        "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
        "upside_potential": round(
            ((info.get("targetMeanPrice") or 0) / (info.get("currentPrice") or 1) - 1) * 100, 2
        ) if info.get("targetMeanPrice") and info.get("currentPrice") else None,
        "recent_recommendations": recommendations,
        "earnings_date": str(info.get("earningsTimestamp")) if info.get("earningsTimestamp") else None,
    }

def get_sector_performance(etf: str = "XLK") -> dict:
    """Get sector ETF performance for rotation analysis."""
    sector_etfs = {
        "XLK": "Technology",
        "XLF": "Financials", 
        "XLE": "Energy",
        "XLV": "Healthcare",
        "XLI": "Industrials",
        "XLB": "Materials",
        "XLC": "Communication Services",
        "XLRE": "Real Estate",
        "XLP": "Consumer Staples",
        "XLY": "Consumer Discretionary",
        "XLU": "Utilities",
        "GDX": "Gold Miners",
        "SLV": "Silver",
        "LIT": "Lithium & Battery",
        "URA": "Uranium",
    }
    
    results = []
    for symbol, name in sector_etfs.items():
        try:
            stock = yf.Ticker(symbol)
            hist = stock.history(period="3mo")
            if not hist.empty:
                week_return = (hist['Close'].iloc[-1] / hist['Close'].iloc[-5] - 1) * 100 if len(hist) >= 5 else 0
                month_return = (hist['Close'].iloc[-1] / hist['Close'].iloc[-21] - 1) * 100 if len(hist) >= 21 else 0
                three_month_return = (hist['Close'].iloc[-1] / hist['Close'].iloc[0] - 1) * 100
                
                results.append({
                    "symbol": symbol,
                    "sector": name,
                    "price": round(hist['Close'].iloc[-1], 2),
                    "1_week_return": round(week_return, 2),
                    "1_month_return": round(month_return, 2),
                    "3_month_return": round(three_month_return, 2),
                })
        except Exception as e:
            continue
    
    # Sort by 1-week performance
    results.sort(key=lambda x: x['1_week_return'], reverse=True)
    
    return {
        "date": str(datetime.now().date()),
        "sectors": results,
        "top_performers": results[:3],
        "bottom_performers": results[-3:],
    }

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    command = sys.argv[1].lower()
    
    if command == "quote" and len(sys.argv) >= 3:
        result = get_quote(sys.argv[2].upper())
    elif command == "history" and len(sys.argv) >= 3:
        period = sys.argv[3] if len(sys.argv) > 3 else "1mo"
        result = get_history(sys.argv[2].upper(), period)
    elif command == "options" and len(sys.argv) >= 3:
        result = get_options(sys.argv[2].upper())
    elif command == "analysis" and len(sys.argv) >= 3:
        result = get_analysis(sys.argv[2].upper())
    elif command == "sector":
        result = get_sector_performance()
    else:
        print(__doc__)
        return
    
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    main()
