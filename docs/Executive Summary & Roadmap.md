# Executive Summary & Roadmap

We are building a Serverless Algorithmic Trading Agent that automates the research workflow defined in `CLAUDE.md`. Instead of manual searches, Claude will act as an autonomous agent that wakes, scans the market, filters for "Safe Plays" vs "High Risk," and queues trades for human review/approval.

---

# Execution Phases

| Phase | Name | Status | Goal |
|---:|---|---:|---|
| 1 | Infrastructure Skeleton | ✅ Done | Vercel Project created, Postgres DB provisioned, API Keys linked. |
| 2 | Functionality (The "Limbs") | ✅ Done | Service layer built with market scanner, analyzer, options engine. REST API deployed. |
| 3 | Intelligence (The "Brain") | ✅ Done | MCP Tools built for Claude autonomous execution via remote HTTP server. |
| 4 | Automation (The "Habit") | ✅ Done | Vercel Cron Jobs configured for automated weekly market scans. |
| 5 | Interface (The "Face") | 🟡 Current | Build a Next.js Frontend to view the dashboard and approve trades visually. |

---

# Phase 2 — Completed Deliverables

## Deployed API Endpoints

**Base URL:** https://stockresearcher.vercel.app

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (version 4.0.0) |
| GET | `/api/quote/{symbol}` | Get stock quote via yfinance |
| GET | `/api/volatility/{symbol}` | Calculate 20-day annualized volatility |
| POST | `/api/scan` | Trigger market scan (Alpha Vantage TOP_GAINERS_LOSERS) |
| GET | `/api/scan/{id}` | Get scan results by ID |
| GET | `/api/scans` | List recent market scans |
| POST | `/api/analyze` | Deep dive analysis (solvency, volatility, risk) |
| POST | `/api/strategy` | Generate HIGH/MEDIUM/LOW risk options strategies |
| GET | `/api/plans` | List trade plans |
| PATCH | `/api/plans/{id}/status` | Update plan status (PLANNED → OPEN → CLOSED) |

## Service Layer Architecture

```
backend/
  services/
    alpha_vantage.py     # TOP_GAINERS_LOSERS, fundamentals, cash flow
    alpaca_client.py     # Real-time price validation
    yfinance_service.py  # Quotes, options chains, analyst ratings
    market_scanner.py    # Scan orchestration + theme detection
    analyzer.py          # Deep dive analysis + risk assessment
    options_engine.py    # Strategy generation (3 tiers)
    greeks.py            # Black-Scholes calculations
  schemas/
    scanner.py           # MarketScanRequest/Response
    analysis.py          # AnalyzeRequest/AnalysisResponse
    options.py           # StrategyRequest/StrategyResponse
```

## Database Schema (Neon PostgreSQL)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `marketscan` | Weekly scan results | top_gainers, top_losers, dominant_theme |
| `analysisresult` | Deep dive data | solvency, volatility, risk_level, direction_bias |
| `tradeplan` | Options strategies | strategy_type, greeks, max_profit, max_loss, status |

---

# Phase 3 — Intelligence (MCP Tools) ✅ Completed

## Goal
Enable Claude to autonomously execute the research workflow by exposing backend services as MCP (Model Context Protocol) tools.

## Implemented MCP Tools (9 total)

| Tool Name | Description |
|-----------|-------------|
| `market_scan` | Scan market for top movers (Alpha Vantage) |
| `get_scan` | Retrieve scan by ID |
| `list_scans` | List recent scans |
| `deep_dive` | Analyze ticker for solvency, volatility, risk |
| `get_quote` | Get current stock price |
| `calculate_volatility` | Calculate annualized volatility |
| `generate_strategies` | Create 3 options strategies (HIGH/MED/LOW) |
| `list_plans` | List trade plans |
| `update_plan_status` | Change plan status |

## Architecture

**Remote MCP Server** (deployed on Vercel):
- **Endpoint:** `https://stockresearcher.vercel.app/mcp/`
- **Transport:** Stateless HTTP (serverless compatible)
- **Protocol:** JSON-RPC 2.0 with MCP protocol

**Setup:**
```bash
# Add to Claude Code
claude mcp add stock-researcher --transport http https://stockresearcher.vercel.app/mcp/
```

## Key Implementation Details
- Uses `FastMCP` with `stateless_http=True` for serverless compatibility
- `TransportSecuritySettings` configured for Vercel domains
- CORS enabled for browser-based MCP clients
- All 9 tools call the underlying service layer directly

## Files
- `backend/mcp_server.py` — MCP server with tools and security config
- `mcp_local_server.py` — Alternative local server (for offline use)

## Autonomous Workflow
Claude can now execute the full research workflow:
1. `market_scan()` — Find top movers
2. `deep_dive(symbol)` — Analyze candidates
3. `generate_strategies(symbol, capital)` — Create options plans
4. `list_plans()` — Review generated strategies
5. `update_plan_status(id, status)` — Track execution

---

# Phase 4 — Automation (Vercel Cron Jobs) ✅ Completed

## Goal
Automate the weekly market scan workflow so the system runs independently without manual triggers.

## Cron Job Configuration

**Schedule:** Every Monday at 14:00 UTC (9:00 AM EST, market open)

**Cron Expression:** `0 14 * * 1`

## Implemented Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cron/weekly-scan` | Automated weekly market scan (called by Vercel Cron) |
| GET | `/api/cron/health` | Cron system health check |

## Security

- Vercel sends `Authorization: Bearer {CRON_SECRET}` header with cron requests
- Endpoint validates the secret before executing
- Add `CRON_SECRET` environment variable in Vercel Dashboard for production security

## Configuration (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-scan",
      "schedule": "0 14 * * 1"
    }
  ]
}
```

## How It Works

1. **Every Monday at 14:00 UTC**, Vercel triggers `/api/cron/weekly-scan`
2. Endpoint verifies the `CRON_SECRET` authorization header
3. Runs `market_scanner.run_scan()` with default parameters (5% threshold, 20 max results)
4. Results are persisted to the `marketscan` database table
5. Returns summary with scan_id, ticker counts, and dominant theme

## Monitoring

Check cron execution in:
- **Vercel Dashboard** → Project → Cron Jobs tab
- **API Response:** `/api/cron/health` shows active schedules
- **Database:** Query `marketscan` table for weekly results

## Files
- `api/index.py` — Cron endpoints with authentication
- `vercel.json` — Cron schedule configuration

---

# Phase 2 — Original PRD (Reference)

## 1. Overview
The Stock Research Agent (SRA) is a serverless backend that enables an AI agent (Claude) to perform institutional-grade market research, risk assessment, and trade planning via direct API ingestion and structured DB storage.

## 2. User Personas
- Primary: Claude (agent). Accesses via MCP (Model Context Protocol) to query the market and persist memory.
- Secondary: Human operator. Triggers high-level commands (e.g., "Run Weekly Scan") and reviews Trade Plans.

## 3. Core Functional Requirements

### 3.1 Market Scanning (The "Wide Net") ✅ Implemented
- Goal: Identify potential trade targets while minimizing API usage.
- Constraint: Alpha Vantage Free Tier = 25 requests/day.
- Solution: Use the `TOP_GAINERS_LOSERS` endpoint (1 API call) instead of iterating a large static watchlist.
- Output: 20 tickers with >5% movement, saved to `MarketScan` table.

### 3.2 Deep Dive Analysis (The "Filter") ✅ Implemented
- Goal: Reduce raw list to 3 viable candidates.
- Logic/Checks:
  - Solvency: Positive Operating Cash Flow (Alpha Vantage fundamentals).
  - Sentiment: News sentiment aligned with price direction (Price Up + Bullish).
  - Volatility: 20-day annualized volatility:
    - Low (< 20%): Income strategies
    - Medium (20-35%): Spread strategies
    - High (35-50%): Directional strategies
    - Extreme (> 50%): Small positions only

### 3.3 Options Strategy Engine (The "Math") ✅ Implemented
- Goal: Produce specific buy/sell orders using options data.
- For each target ticker generate three plans:
  - High Risk: Long Calls/Puts (Delta 0.30–0.40)
  - Medium Risk: Bull Call Spreads (Buy ATM / Sell OTM)
  - Low Risk: Put Credit Spreads (Sell OTM / Buy further OTM)
- Validation: Each strategy includes Greeks, max profit/loss, breakeven, win probability.

### 3.4 Execution & Memory ✅ Implemented
- Goal: Queue trades and persist past performance.
- Storage: Save approved plans to Vercel Postgres `TradePlan` table.
- Status flags: PLANNED → OPEN → CLOSED

## 4. Technical Architecture
- Runtime: Python 3.12 on Vercel Functions (serverless)
- Database: PostgreSQL (Neon via Vercel Integration)
- API Framework: FastAPI
- External APIs:
  - Alpha Vantage: TOP_GAINERS_LOSERS, fundamentals, cash flow
  - Alpaca: Real-time price validation
  - yfinance: Quotes, options chains, analyst ratings (primary data source)

## 5. Risks & Constraints

| Risk / Constraint | Impact | Mitigation |
|---|---|---|
| API Limits — Alpha Vantage (25 req/day) | Limits deep‑dive frequency | Use TOP_GAINERS_LOSERS (1 call); yfinance for most data |
| Serverless timeouts — Vercel (10s Hobby) | Long tasks may fail | Keep endpoints fast; defer heavy work |
| Package size — Vercel (250MB limit) | Large deps fail deploy | Removed scipy; use lightweight implementations |
| Data latency — free APIs ~15 min | Stale market signals | Use Alpaca for real-time validation before execution |
