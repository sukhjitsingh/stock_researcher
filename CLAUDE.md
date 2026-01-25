# AI-Assisted Stock Research Workflow

## Project Overview
This project replicates the Claude Cowork stock trading workflow for AI-assisted market research and options strategy generation. Based on the methodology from Dr. Josh C. Simmons that turned $500 into $10K.

**Plan:** Claude Pro (Sonnet 4.5)
**Focus Sectors:** Tech (semiconductors, AI), Mining (gold, silver, lithium, uranium), Financials (banks, fintech)
**Data Sources:** Free APIs only (yfinance, Finnhub, SEC EDGAR, FRED)

---

## Workflow Steps (Execute in Order)

### Step 1: Weekly Market Scan
**Command:** `/project:weekly-scan`
- Identify top 25 movers in each target sector
- Categorize as gainers, decliners, notable movers
- Note dominant market themes and catalysts

### Step 2: Deep Dive Analysis
**Command:** `/project:analyze-stock TICKER`
- Analyst ratings (buy/sell/hold consensus)
- Sentiment analysis from recent news
- Volatility risk assessment (Extreme/High/Medium/Low)
- Direction bias (Bullish/Bearish/Either-way)
- Key catalysts (earnings, product launches, macro events)

### Step 3: Stock Selection
**Command:** `/project:pick-stocks`
- From top gainers, identify 3 most likely to move next week
- Assign volatility risk and direction bias
- Recommend "safe plays" (solvent companies that won't go bust)
- Flag high-risk speculative plays

### Step 4: Options Strategy Generation
**Command:** `/project:options-strategy TICKER CAPITAL`
- Generate 3 strategies: HIGH, MEDIUM, LOW risk
- Include entry price, strike, expiration, contracts
- Calculate max profit, max loss, breakeven
- Set exit conditions (profit target, stop-loss, time stop)
- Estimate win probability

### Step 5: Output Generation
**Command:** `/project:generate-report`
- Create options dashboard (HTML/React)
- Generate stock picks PDF
- Save all analysis to dated files

---

## Sector-Specific Watchlists

### Tech Sector
**Semiconductors:** NVDA, TSM, AVGO, ASML, AMD, INTC, QCOM, MU, TXN, MRVL, ARM, AMAT, LRCX
**AI/Cloud:** MSFT, GOOGL, AMZN, META, PLTR, SMCI, DELL, CRM, NOW, SNOW
**Key Catalysts:** Earnings (especially TSMC, ASML), data center capex, AI chip demand, export restrictions

### Mining Sector
**Gold:** NEM, GOLD, AEM, FNV, WPM, KGC, AGI
**Silver:** AG, PAAS, HL, MAG
**Lithium:** ALB, SQM, LAC, LTHM
**Uranium:** CCJ, NXE, DNN, UUUU, UEC
**Key Catalysts:** Commodity prices, Fed rates, geopolitical events, EV demand, nuclear renaissance

### Financial Sector
**Banks:** JPM, BAC, WFC, C, GS, MS, USB, PNC, KEY, CFG
**Fintech:** PYPL, SQ, SOFI, AFRM, UPST, NU, COIN
**Insurance:** BRK.B, PGR, TRV, ALL, MET
**Key Catalysts:** Fed rate decisions, NIM trends, loan growth, credit quality, regulatory changes

---

## File Naming Conventions
- Daily scans: `analysis/daily/market_scan_YYYY-MM-DD.md`
- Stock analysis: `analysis/stocks/TICKER_analysis_YYYY-MM-DD.md`
- Options strategies: `analysis/options/TICKER_options_YYYY-MM-DD.md`
- Weekly reports: `reports/weekly_report_YYYY-MM-DD.md`
- Dashboards: `reports/dashboards/options_dashboard_YYYY-MM-DD.html`

---

## Data Fetching Commands

### Using yfinance (Python)
```python
import yfinance as yf

# Get stock data
ticker = yf.Ticker("MU")
hist = ticker.history(period="1mo")
info = ticker.info
options = ticker.option_chain(ticker.options[0])
recommendations = ticker.recommendations
```

### Key Metrics to Extract
- Current price, 52-week range
- P/E ratio, forward P/E
- Revenue growth, earnings growth
- Analyst recommendations (Strong Buy/Buy/Hold/Sell/Strong Sell)
- Options: IV, delta, theta, open interest
- Sector ETF correlation

---

## Important Reminders

### Market Calendar Awareness
- Check for market holidays (MLK Day, Presidents Day, etc.)
- Earnings dates affect options pricing significantly
- Fed meeting dates impact financial sector

### Risk Management Rules
- HIGH RISK: Max 50% of position as stop-loss
- MEDIUM RISK: Max 40-50% loss tolerance
- LOW RISK: Income strategies, 20-30% max loss
- Never risk more than you can afford to lose

### AI Limitations to Watch For
- Date/calendar math errors (verify manually)
- Real-time quotes may be delayed or estimated
- Always verify critical data before trading
- Options pricing from web research is approximate

---

## Quick Reference Prompts

### Market Scan
"What are the top 25 biggest movers over the past week in the [SECTOR] sector? Categorize them as gainers, decliners, and notable movers. Include percentage changes and brief reason for movement."

### Stock Deep Dive
"Analyze [TICKER] for potential investment. Include: current price, analyst ratings, recent news sentiment, volatility assessment, key upcoming catalysts, and whether this is a safe long-term hold or speculative play."

### Options Strategy
"Generate three options strategies for [TICKER] with $[AMOUNT] capital:
1. HIGH RISK - directional bet (weekly calls/puts)
2. MEDIUM RISK - spread strategy (bull call spread, bear put spread)
3. LOW RISK - income strategy (cash-secured put, put credit spread)

For each, provide: entry details, max profit, max loss, breakeven, exit conditions, and estimated win probability."
