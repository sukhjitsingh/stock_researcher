# Turborepo Monorepo Structure - Phase 5A

## Overview
Successfully migrated to TypeScript/Bun monorepo architecture using Turborepo.

## Directory Structure

```
stock-researcher/
├── apps/
│   └── api/                           # Bun + Hono Backend
│       ├── api/
│       │   └── index.ts              # Vercel serverless entry
│       ├── src/
│       │   ├── routes/               # API endpoints
│       │   │   ├── health.ts
│       │   │   ├── scan.ts
│       │   │   ├── analyze.ts
│       │   │   ├── strategy.ts
│       │   │   ├── plans.ts
│       │   │   ├── quote.ts
│       │   │   ├── cron.ts
│       │   │   └── mcp.ts
│       │   ├── services/             # Business logic
│       │   │   ├── market-scanner.ts
│       │   │   ├── analyzer.ts
│       │   │   ├── options-engine.ts
│       │   │   ├── alpha-vantage.ts
│       │   │   └── yahoo-finance.ts
│       │   ├── db/                   # Drizzle ORM
│       │   │   ├── schema.ts
│       │   │   ├── client.ts
│       │   │   └── index.ts
│       │   ├── mcp/                  # MCP Server
│       │   │   └── server.ts
│       │   └── index.ts              # Hono app
│       ├── package.json
│       ├── tsconfig.json
│       ├── vercel.json
│       └── drizzle.config.ts
│
├── packages/
│   └── shared/                       # Shared types & utilities
│       ├── src/
│       │   ├── types/
│       │   │   └── index.ts          # Zod schemas + TypeScript types
│       │   ├── greeks/
│       │   │   └── index.ts          # Black-Scholes calculator
│       │   └── index.ts              # Package exports
│       ├── package.json
│       └── tsconfig.json
│
├── turbo.json                        # Turborepo config
├── package.json                      # Workspace root
├── bun.lock
└── CLAUDE.md                         # Project instructions

## Old Structure (Preserved)
├── backend/                          # Python backend (deprecated)
├── api/                              # Old API (deprecated)
└── scripts/                          # Utility scripts
```

## Key Files

### Root Configuration

#### package.json
```json
{
  "name": "stock-researcher",
  "version": "5.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "bun@1.1.0"
}
```

#### turbo.json
- Configures build pipeline
- Global dependencies: `**/.env.*local`
- Global environment variables: `DATABASE_URL`, `ALPHAVANTAGE_API_KEY`, etc.
- Tasks: `build`, `dev`, `lint`, `type-check`

### Apps/API

#### package.json
- Name: `@stock-researcher/api`
- Runtime: Bun
- Framework: Hono
- Dependencies:
  - `hono` - Web framework
  - `drizzle-orm` - Database ORM
  - `@neondatabase/serverless` - PostgreSQL client
  - `yahoo-finance2` - Market data
  - `@modelcontextprotocol/sdk` - MCP implementation
  - `@stock-researcher/shared` - Workspace package

#### Scripts
- `dev` - Run development server with hot reload
- `build` - Build for production
- `start` - Run production build
- `type-check` - TypeScript validation
- `db:generate` - Generate Drizzle migrations
- `db:push` - Push schema to database
- `db:studio` - Open Drizzle Studio

### Packages/Shared

#### Exports
- `.` - Main export (types + greeks)
- `./types` - Zod schemas and TypeScript types
- `./greeks` - Black-Scholes calculator

#### Key Types
- **Enums:** `RiskLevel`, `DirectionBias`, `StrategyType`, `RiskTier`, `PlanStatus`
- **Schemas:** `MarketScanRequest`, `AnalysisResponse`, `StrategyResponse`, `QuoteResponse`
- **Functions:** `calculateGreeks()`, `blackScholesPrice()`, `estimateWinProbability()`

## Verification

### Install Dependencies
```bash
~/.bun/bin/bun install
```

### Type Check
```bash
~/.bun/bin/bun run type-check
# Output: No errors
```

### Start Dev Server
```bash
cd apps/api
~/.bun/bin/bun run dev
```

### Build for Production
```bash
~/.bun/bin/bun run build
```

## Deployment

### Vercel Configuration
- Entry point: `apps/api/api/index.ts`
- Build command: `bun run build`
- Install command: `bun install`
- Framework: `null` (custom Hono)
- Rewrites: `/(.*) → /api`

### Environment Variables
Required in Vercel dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `ALPHAVANTAGE_API_KEY` - Alpha Vantage API key
- `CRON_SECRET` - Secret for cron authentication

### Cron Jobs
- Weekly scan: Monday at 2 PM UTC (`0 14 * * 1`)
- Endpoint: `/api/cron/weekly-scan`

## Next Steps

### Phase 5B: Next.js Frontend
- Create `apps/web/` with Next.js 16
- App Router with Server Components
- Connect to API via `NEXT_PUBLIC_API_URL`
- Dashboard for market scans, analysis, and trade plans

### Phase 5C: Integration
- MCP server testing
- End-to-end workflow validation
- Performance optimization
- Documentation updates

## Notes

- Bun executable: `~/.bun/bin/bun` (not in PATH)
- Python backend preserved in `/backend` directory
- Old API files in `/api` directory
- All new TypeScript code uses ESM modules (`.js` imports)
- Type checking enforced in CI/CD via Turborepo tasks
