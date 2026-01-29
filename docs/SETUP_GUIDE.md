# AI-Assisted Stock Research Workflow
## Complete Setup & Usage Guide for Claude Code

This guide replicates the Claude Cowork workflow from Dr. Josh C. Simmons' video "Claude Cowork turned $500 into $10K" using Claude Code with Claude Pro plan.

---

## 📋 Prerequisites

- **Claude Pro subscription** ($20/month) - gives you Claude Code access
- **Python 3.8+** installed on your system
- **Terminal/Command Line** familiarity
- Basic understanding of stocks and options (helpful but not required)

---

## 🚀 Quick Start (5 minutes)

### Step 1: Install Claude Code

```bash
# macOS/Linux
curl -fsSL https://claude.ai/install.sh | bash

# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex
```

### Step 2: Create Your Isolated Workspace

⚠️ **IMPORTANT:** Create a dedicated folder to prevent Claude from accessing sensitive files.

```bash
# Create the workspace
mkdir -p ~/stock-research
cd ~/stock-research

# Initialize the project structure
mkdir -p analysis/daily analysis/stocks analysis/options
mkdir -p reports/dashboards reports/weekly
mkdir -p scripts data/cache
mkdir -p .claude/commands
```

### Step 3: Copy Project Files

Copy all the files from this package into your `~/stock-research` folder:
- `CLAUDE.md` → `~/stock-research/CLAUDE.md`
- `.claude/commands/*` → `~/stock-research/.claude/commands/`
- `scripts/fetch_data.py` → `~/stock-research/scripts/fetch_data.py`

### Step 4: Install Python Dependencies

```bash
pip install yfinance pandas numpy
```

### Step 5: Start Claude Code

```bash
cd ~/stock-research
claude
```

---

## 📈 The Workflow (Step by Step)

This mirrors exactly what was shown in the video:

### Phase 1: Weekly Market Scan

**When:** Sunday evening or Monday morning before market open

**Command:**
```
/project:weekly-scan
```

Or use this prompt directly:
```
What are the top 25 biggest movers over the past week in:
1. Tech sector (semiconductors, AI/cloud companies)
2. Mining sector (gold, silver, lithium, uranium stocks)
3. Financial sector (banks, fintech)

For each, categorize as:
- Top Gainers (>3% up)
- Top Decliners (>3% down)
- Notable Movers (significant news)

Include percentage changes and brief reasons for the moves.
What's the dominant market theme this week?
```

**Expected Output:**
- List of movers by sector
- Market themes and catalysts
- Sector rotation analysis

---

### Phase 2: Deep Dive Analysis

**When:** After identifying interesting stocks from the scan

**Command:**
```
/project:analyze-stock MU
```

Or prompt:
```
Analyze MU (Micron) for potential investment:
1. Current price and recent price action
2. Analyst ratings and price targets
3. Recent news and sentiment
4. Upcoming catalysts (earnings, events)
5. Volatility risk assessment (Extreme/High/Medium/Low)
6. Direction bias (Bullish/Bearish/Neutral)
7. Is this a "safe play" (won't go bust if held 2-3 years)?
```

---

### Phase 3: Stock Selection

**When:** After analyzing multiple candidates

**Command:**
```
/project:pick-stocks
```

Or prompt:
```
Out of the top gainers from our scan, which 3 stocks are most likely 
to have big movement next week?

For each pick:
- Assign volatility risk (Extreme/High/Medium/Low)
- Assign direction bias (Bullish/Bearish/Either-way)
- Categorize as Safe Play, Momentum Play, or Speculative
- List key catalysts for next week
```

**What to Look For (from the video):**
- Stocks "already part of the hype cycle"
- Companies that are "very solvent" 
- Stocks where "even if it tanks, we're going to hold for 2-3 years and be fine"
- Avoid "extreme volatility, either-way direction bias" unless you want speculation

---

### Phase 4: Options Strategy Generation

**When:** After selecting your target stock

**Command:**
```
/project:options-strategy MU 10000
```

Or prompt:
```
Generate 3 options strategies for MU with $10,000 capital:

STRATEGY 1 - HIGH RISK (Red):
- Weekly calls, directional bet
- ~10 day DTE
- Target 50-100% gain
- Stop loss at 50%

STRATEGY 2 - MEDIUM RISK (Yellow):
- Bull call spread
- ~30 day DTE
- Defined risk/reward
- Stop loss if spread drops 50%

STRATEGY 3 - LOW RISK (Green):
- Cash-secured put OR put credit spread
- ~30-45 day DTE
- Income generation
- Willing to own shares at lower price

For each, provide:
- Exact entry (strike, expiration, estimated premium)
- Number of contracts
- Max profit and max loss
- Breakeven price
- Exit conditions (profit target, stop loss, time stop)
- Estimated win probability
```

---

### Phase 5: Generate Reports

**When:** After completing analysis

**Command:**
```
/project:generate-report
```

This creates:
1. **Options Dashboard** (HTML) - Visual display of all 3 strategies
2. **Stock Picks PDF** (Markdown) - Weekly picks summary
3. **Weekly Report** - Comprehensive analysis document

---

## 💡 Pro Tips from the Video

### 1. Let Claude Do the Work
> "I'm not going to qualify this... I'm just going to let it go and we'll pop into the thoughts to see if it's doing that for us."

Don't micromanage. Give Claude a simple query and let it automatically analyze analyst ratings and sentiment.

### 2. Check Claude's Work
> "It's crazy that these models can do so much for us but it can't even do simple math a lot of the time."

Always verify:
- Market holidays (MLK Day, etc.)
- Date calculations
- Options pricing (Claude estimates, not real-time)

### 3. Use the "Safe Play" Filter
> "Micron seems like the safest play... they are very solvent right now and even if the AI bubble pops, Micron is still going to be doing fine."

Ask yourself: If this trade goes against me, can I hold for 2-3 years?

### 4. Risk Management
> "I started trading with $500... that is a $500 initial investment and we're going to keep deferring completely to AI for that entire amount of winnings."

Only risk money you can afford to lose. The video creator treats this as "house money."

---

## 🔧 Data Fetching with Python

Use the included `fetch_data.py` script for real data:

```bash
# Get current quote
python scripts/fetch_data.py quote MU

# Get historical prices
python scripts/fetch_data.py history MU 1mo

# Get options chain
python scripts/fetch_data.py options MU

# Get analyst recommendations
python scripts/fetch_data.py analysis MU

# Get sector rotation data
python scripts/fetch_data.py sector
```

Within Claude Code, you can ask Claude to run these scripts:
```
Run python scripts/fetch_data.py options MU and analyze the results
```

---

## 📅 Weekly Schedule

| Day | Task | Command |
|-----|------|---------|
| Sunday PM | Weekly market scan | `/project:weekly-scan` |
| Monday AM | Review scan, pick candidates | `/project:pick-stocks` |
| Monday | Deep dive top picks | `/project:analyze-stock TICKER` |
| Monday-Tuesday | Generate options strategies | `/project:options-strategy TICKER CAPITAL` |
| Tuesday | Review and execute trades | Manual in your broker |
| Wednesday-Friday | Monitor positions | Check exit conditions |
| Friday | Generate weekly report | `/project:generate-report` |

---

## ⚠️ Important Disclaimers

1. **This is not financial advice.** This workflow is for educational purposes.

2. **Options are risky.** You can lose 100% of your investment in options trades.

3. **Verify all data.** Claude's estimates are approximate. Always check real-time quotes in your broker.

4. **Paper trade first.** Practice with simulated trades before using real money.

5. **The $500→$10K claim is anecdotal.** Past performance doesn't guarantee future results.

---

## 🆘 Troubleshooting

### "Claude Code not found"
Make sure you've installed it and restarted your terminal:
```bash
source ~/.bashrc  # or ~/.zshrc on Mac
```

### "yfinance not working"
```bash
pip install --upgrade yfinance
```

### "No options data"
Some stocks don't have options. Try major tickers like AAPL, NVDA, SPY.

### "Commands not found"
Make sure you're in the `~/stock-research` directory and the `.claude/commands/` folder exists with the command files.

---

## 📚 Additional Resources

- **yfinance documentation:** https://github.com/ranaroussi/yfinance
- **Options education:** https://www.investopedia.com/options-basics-tutorial-4583012
- **Claude Code docs:** https://docs.anthropic.com/claude-code

---

Good luck with your research! Remember: the goal is to make informed decisions, not gamble blindly. Use AI as a research assistant, but always apply your own judgment.
