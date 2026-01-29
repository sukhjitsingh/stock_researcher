# 1. Project Context & Architecture

## AI-Assisted Stock Research Workflow

### Project Overview
This project replicates the Claude Cowork stock trading workflow for AI-assisted market research and options strategy generation. Based on the methodology from Dr. Josh C. Simmons that turned $500 into $10K.

**Stack:** Bun + Hono (API), Drizzle ORM (PostgreSQL), Next.js 16 (Frontend - Phase 5B)
**Architecture:** Turborepo monorepo with TypeScript throughout
**Focus Sectors:** Tech (semiconductors, AI), Mining (gold, silver, lithium, uranium), Financials (banks, fintech)
**Data Sources:** Alpha Vantage (primary), yahoo-finance2 (fallback + options)

---

### Live API Endpoints

**Base URL:** https://stockresearcher.vercel.app

#### Quick Data
```bash
# Get stock quote
curl https://stockresearcher.vercel.app/api/quote/NVDA

# Calculate volatility
curl https://stockresearcher.vercel.app/api/volatility/NVDA
```

#### Market Scanning
```bash
# Trigger market scan (uses Alpha Vantage TOP_GAINERS_LOSERS)
curl -X POST https://stockresearcher.vercel.app/api/scan

# Get scan results
curl https://stockresearcher.vercel.app/api/scan/1

# List recent scans
curl https://stockresearcher.vercel.app/api/scans
```

#### Deep Dive Analysis
```bash
# Analyze a ticker (solvency, volatility, risk assessment)
curl -X POST https://stockresearcher.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbol": "NVDA"}'
```

#### Options Strategy Generation
```bash
# Generate 3 strategies (HIGH/MEDIUM/LOW risk)
curl -X POST https://stockresearcher.vercel.app/api/strategy \
  -H "Content-Type: application/json" \
  -d '{"symbol": "NVDA", "capital": 500}'
```

#### Trade Plans
```bash
# List all plans
curl https://stockresearcher.vercel.app/api/plans

# Filter by symbol or status
curl "https://stockresearcher.vercel.app/api/plans?symbol=NVDA&status=PLANNED"

# Update plan status
curl -X PATCH "https://stockresearcher.vercel.app/api/plans/1/status?new_status=OPEN"
```

---

### Workflow Steps (Execute in Order)

#### Step 1: Weekly Market Scan
**API:** `POST /api/scan`
- Fetches top gainers, losers, and most active from Alpha Vantage (1 API call)
- Filters for stocks with >5% movement
- Identifies dominant market theme
- Persists to `marketscan` table

#### Step 2: Deep Dive Analysis
**API:** `POST /api/analyze`
- Checks solvency (Operating Cash Flow > 0)
- Calculates 20-day annualized volatility
- Assesses risk level (LOW/MEDIUM/HIGH/EXTREME)
- Determines direction bias (BULLISH/BEARISH/NEUTRAL)
- Flags "safe plays" vs speculative

#### Step 3: Stock Selection
From deep dive results, identify:
- 3 most likely to move next week
- Volatility risk and direction bias
- "Safe plays" (solvent + LOW/MEDIUM risk)
- High-risk speculative plays

#### Step 4: Options Strategy Generation
**API:** `POST /api/strategy`
- **HIGH RISK:** Long Call (Delta 0.30-0.40, ~7 DTE)
- **MEDIUM RISK:** Bull Call Spread (ATM/OTM, ~30 DTE)
- **LOW RISK:** Put Credit Spread (income strategy, ~30 DTE)

Each strategy includes:
- Entry price, strike, expiration, contracts
- Greeks (delta, gamma, theta, vega)
- Max profit, max loss, breakeven
- Win probability estimate
- Exit conditions (profit target, stop-loss, time stop)

#### Step 5: Review & Execute
**API:** `GET /api/plans` + `PATCH /api/plans/{id}/status`
- Review generated strategies
- Update status: PLANNED → OPEN → CLOSED
- Track realized P&L

---

### Sector-Specific Watchlists

#### Tech Sector
**Semiconductors:** NVDA, TSM, AVGO, ASML, AMD, INTC, QCOM, MU, TXN, MRVL, ARM, AMAT, LRCX
**AI/Cloud:** MSFT, GOOGL, AMZN, META, PLTR, SMCI, DELL, CRM, NOW, SNOW
**Key Catalysts:** Earnings (especially TSMC, ASML), data center capex, AI chip demand, export restrictions

#### Mining Sector
**Gold:** NEM, GOLD, AEM, FNV, WPM, KGC, AGI
**Silver:** AG, PAAS, HL, MAG
**Lithium:** ALB, SQM, LAC, LTHM
**Uranium:** CCJ, NXE, DNN, UUUU, UEC
**Key Catalysts:** Commodity prices, Fed rates, geopolitical events, EV demand, nuclear renaissance

#### Financial Sector
**Banks:** JPM, BAC, WFC, C, GS, MS, USB, PNC, KEY, CFG
**Fintech:** PYPL, SQ, SOFI, AFRM, UPST, NU, COIN
**Insurance:** BRK.B, PGR, TRV, ALL, MET
**Key Catalysts:** Fed rate decisions, NIM trends, loan growth, credit quality, regulatory changes

---

### Volatility Categories

| Category | Annualized Vol | Recommended Strategies |
|----------|---------------|------------------------|
| LOW | < 20% | Cash-secured puts, Put credit spreads, Covered calls |
| MEDIUM | 20-35% | Bull call spreads, Put credit spreads, Iron condors |
| HIGH | 35-50% | Long calls/puts, Vertical spreads, Straddles |
| EXTREME | > 50% | Small positions only, Wide spreads, Consider waiting |

---

### Risk Management Rules

| Risk Tier | Stop-Loss | Profit Target | Time Stop |
|-----------|-----------|---------------|-----------|
| HIGH | 50% | 50% | 1 day before expiry |
| MEDIUM | 40% | 50% | 5 days before expiry |
| LOW | 100% of credit | 50% | 5 days before expiry |

**Golden Rules:**
- Never risk more than you can afford to lose
- Verify all data before executing trades
- Options pricing from APIs is approximate
- Always check market hours and holidays

---

### File Naming Conventions
- Daily scans: `analysis/daily/market_scan_YYYY-MM-DD.md`
- Stock analysis: `analysis/stocks/TICKER_analysis_YYYY-MM-DD.md`
- Options strategies: `analysis/options/TICKER_options_YYYY-MM-DD.md`
- Weekly reports: `reports/weekly_report_YYYY-MM-DD.md`
- Dashboards: `reports/dashboards/options_dashboard_YYYY-MM-DD.html`

---

### Local Development

```bash
# Install dependencies (requires Bun)
bun install

# Start local API server
cd apps/api && bun run dev

# Test endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/quote/NVDA
curl -X POST http://localhost:3000/api/scan

# Deploy to Vercel
cd apps/api && vercel --prod
```

### Project Structure (v5.0 - TypeScript)

```
stock-researcher/
├── apps/
│   ├── api/                    # Bun + Hono Backend
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Business logic
│   │   │   ├── db/             # Drizzle schema + client
│   │   │   ├── mcp/            # MCP server
│   │   │   └── index.ts
│   │   ├── api/                # Vercel serverless entry
│   │   └── package.json
│   │
│   └── web/                    # Next.js 16 Frontend (Phase 5B)
│
├── packages/
│   └── shared/                 # Shared types & utilities
│       ├── src/
│       │   ├── types/          # Zod schemas
│       │   └── greeks/         # Black-Scholes calculator
│       └── package.json
│
├── turbo.json                  # Turborepo config
└── package.json                # Workspace root
```

---

### MCP Tools (Claude Autonomous Execution)

**MCP Server:** `https://stockresearcher.vercel.app/mcp/`

#### Setup
```bash
# Add remote MCP server to Claude Code
claude mcp add stock-researcher --transport http https://stockresearcher.vercel.app/mcp/
```

#### Available Tools (9 total)

| Tool | Parameters | Description |
|------|------------|-------------|
| `market_scan` | `min_change_pct=5.0, max_results=20` | Scan for top movers |
| `get_scan` | `scan_id: int` | Retrieve scan by ID |
| `list_scans` | `limit=10` | List recent scans |
| `deep_dive` | `symbol: str, scan_id?: int` | Full analysis |
| `get_quote` | `symbol: str` | Current price/metrics |
| `calculate_volatility` | `symbol: str, days=20` | Volatility assessment |
| `generate_strategies` | `symbol: str, capital: float` | Create 3 strategies |
| `list_plans` | `symbol?: str, status?: str` | List trade plans |
| `update_plan_status` | `plan_id: int, new_status: str` | Update status |

#### Test MCP Server
```bash
# Initialize connection
curl -X POST https://stockresearcher.vercel.app/mcp/ \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# List tools
curl -X POST https://stockresearcher.vercel.app/mcp/ \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

#### Autonomous Workflow Example
```
User: "Run the full research workflow with $500 capital"

Claude will:
1. market_scan() → Find top movers
2. deep_dive(top_gainer) → Analyze best candidates
3. generate_strategies(symbol, 500) → Create options plans
4. list_plans() → Show generated strategies
```

---

### Database Schema

#### marketscan
- `id`, `date`, `scan_type`, `dominant_theme`
- `top_gainers` (JSON), `top_losers` (JSON), `most_active` (JSON)
- `ticker_count`, `notes`

#### analysisresult
- `id`, `scan_id` (FK), `symbol`, `created_at`
- `current_price`, `operating_cash_flow`, `is_solvent`
- `volatility_20d`, `volatility_category`
- `analyst_rating`, `analyst_target_mean`, `upside_potential_pct`
- `risk_level`, `direction_bias`, `is_safe_play`

#### tradeplan
- `id`, `analysis_id` (FK), `symbol`, `strategy_type`, `risk_tier`
- `status` (PLANNED/OPEN/CLOSED)
- `strike_price`, `strike_price_2`, `expiration_date`, `contracts`
- `delta`, `gamma`, `theta`, `vega`, `implied_volatility`
- `max_profit`, `max_loss`, `breakeven_price`, `win_probability`
- `profit_target_pct`, `stop_loss_pct`, `time_stop_days`
- `realized_pnl`, `exit_reason`

---

### Quick Reference Prompts

#### Market Scan
"Run a market scan to find top movers. Use the /api/scan endpoint."

#### Stock Deep Dive
"Analyze [TICKER] using /api/analyze. Check solvency, volatility, and risk level."

#### Options Strategy
"Generate options strategies for [TICKER] with $[AMOUNT] capital using /api/strategy."

#### Full Workflow
"Execute the full research workflow:
1. POST /api/scan - Find top movers
2. POST /api/analyze - Deep dive top 3 candidates
3. POST /api/strategy - Generate options for safe plays
4. GET /api/plans - Review and approve strategies"

# 2. Master Agent Orchestration Protocol

## Master Agent & Project Protocols

🧠 **Role: Technical Program Manager**

SYSTEM ENFORCEMENT: You are the Lead Orchestrator. Your primary function is to plan workflows, coordinate specialized sub-agents, and verify results.

**Primary Directive:**
You DO NOT write code, read massive documentation, or debug complex logs directly in this main session.

**Cost Efficiency:**
You must aggressively conserve your context window by delegating token-heavy tasks to sub-agents.

---

### 🤖 Sub-Agent Delegation Matrix

You have access to a fleet of specialized global agents. You MUST delegate tasks according to this matrix:

| Intent | Target Agent | Trigger When... |
| :--- | :--- | :--- |
| **Research & Docs** | `librarian` | User asks about external APIs, libraries, or needs up-to-date documentation (via Context7). |
| **Write & Edit** | `implementer` | A plan is approved and files need creation, editing, or refactoring. |
| **QA & Security** | `reviewer` | Code changes need a second pair of eyes, security audit, or logic verification. |
| **Root Cause** | `debugger` | Builds fail, tests crash, error logs need analysis, or the user reports a runtime bug. |
| **Data & SQL** | `data-scientist` | Database schema inspection, SQL query generation, or data analysis is required. |

---

### 📝 Operational Workflow (Spec-Driven)

Follow this loop for non-trivial requests:

1.  **Analysis:** If the user request implies external knowledge, dispatch `librarian` to fetch docs/specs.
2.  **Planning:** Synthesize findings into a brief list of requirements or tasks.
3.  **Execution:** Dispatch `implementer` to execute the tasks. Do not do this yourself.
4.  **Verification:** Dispatch `reviewer` (or `debugger` if testing failed) to validate the work.

---

### 🛡️ Context Hygiene Rules

*   **The "Blind" Manager:** Do not read file contents in the main thread unless they are small configuration files (e.g., `package.json`). Trust your sub-agents to read the code.
*   **Summary Handoffs:** When a sub-agent returns, summarize their output in 1-2 sentences. Never repeat their full logs or file dumps in the main chat.
*   **One-Way Trip:** If a sub-agent fails, do not try to fix it yourself in the main thread. Analyze the error and spawn the `debugger` or retry the `implementer` with better instructions.