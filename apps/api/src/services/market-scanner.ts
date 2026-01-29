/**
 * Market Scanner Service - Orchestrates market scanning workflow
 *
 * Workflow: Alpha Vantage TOP_GAINERS_LOSERS -> Filter -> Persist -> Return
 */

import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { alphaVantage } from './alpha-vantage.js';
import type { TickerMovement, MarketScanResponse, ScanSummary } from '@stock-researcher/shared';

// Sector mappings for theme detection
const SECTOR_KEYWORDS: Record<string, string[]> = {
  Tech: ['NVDA', 'AMD', 'INTC', 'AVGO', 'QCOM', 'MU', 'TSM', 'ASML', 'ARM', 'SMCI'],
  AI: ['NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'PLTR', 'SMCI'],
  Mining: ['NEM', 'GOLD', 'AG', 'HL', 'PAAS', 'ALB', 'SQM', 'CCJ', 'UUUU'],
  Banks: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C'],
  Fintech: ['PYPL', 'SQ', 'SOFI', 'COIN', 'AFRM', 'UPST'],
};

interface ScanRequest {
  min_change_pct: number;
  max_results: number;
}

/**
 * Execute market scan using Alpha Vantage TOP_GAINERS_LOSERS.
 */
async function runScan(request: ScanRequest): Promise<MarketScanResponse> {
  // Step 1: Fetch from Alpha Vantage
  const rawData = await alphaVantage.getTopGainersLosers();

  // Step 2: Filter by threshold
  const gainers = rawData.top_gainers
    .filter((t) => Math.abs(t.change_percent) >= request.min_change_pct)
    .slice(0, request.max_results);

  const losers = rawData.top_losers
    .filter((t) => Math.abs(t.change_percent) >= request.min_change_pct)
    .slice(0, request.max_results);

  const mostActive = rawData.most_active.slice(0, request.max_results);

  // Step 3: Identify theme
  const theme = identifyDominantTheme(gainers, losers);

  // Step 4: Persist
  const [scan] = await db
    .insert(schema.marketScans)
    .values({
      date: new Date(),
      scanType: 'TOP_GAINERS_LOSERS',
      dominantTheme: theme,
      topGainers: gainers,
      topLosers: losers,
      mostActive: mostActive,
      tickerCount: gainers.length + losers.length,
    })
    .returning();

  // Step 5: Return response
  return {
    scan_id: scan.id,
    scan_date: scan.date,
    top_gainers: gainers,
    top_losers: losers,
    most_active: mostActive,
    dominant_theme: theme,
    ticker_count: gainers.length + losers.length,
  };
}

/**
 * Retrieve a scan by ID.
 */
async function getScan(scanId: number): Promise<MarketScanResponse | null> {
  const scan = await db.query.marketScans.findFirst({
    where: eq(schema.marketScans.id, scanId),
  });

  if (!scan) {
    return null;
  }

  return {
    scan_id: scan.id,
    scan_date: scan.date,
    top_gainers: scan.topGainers as TickerMovement[],
    top_losers: scan.topLosers as TickerMovement[],
    most_active: scan.mostActive as TickerMovement[],
    dominant_theme: scan.dominantTheme,
    ticker_count: scan.tickerCount,
  };
}

/**
 * Get recent scans summary.
 */
async function getRecentScans(limit: number = 10): Promise<ScanSummary[]> {
  const scans = await db.query.marketScans.findMany({
    orderBy: [desc(schema.marketScans.date)],
    limit,
  });

  return scans.map((s) => ({
    scan_id: s.id,
    date: s.date,
    dominant_theme: s.dominantTheme,
    ticker_count: s.tickerCount,
  }));
}

/**
 * Identify dominant sector theme from movers.
 */
function identifyDominantTheme(gainers: TickerMovement[], losers: TickerMovement[]): string {
  const gainerTickers = new Set(gainers.map((g) => g.ticker));
  const loserTickers = new Set(losers.map((l) => l.ticker));

  const sectorScores: Record<string, number> = {};

  for (const [sector, tickers] of Object.entries(SECTOR_KEYWORDS)) {
    const tickerSet = new Set(tickers);
    let gainersInSector = 0;
    let losersInSector = 0;

    for (const ticker of tickerSet) {
      if (gainerTickers.has(ticker)) gainersInSector++;
      if (loserTickers.has(ticker)) losersInSector++;
    }

    sectorScores[sector] = gainersInSector - losersInSector;
  }

  const entries = Object.entries(sectorScores);
  if (entries.length === 0) {
    return 'Mixed Market';
  }

  const [topSector, topScore] = entries.reduce((max, curr) => (curr[1] > max[1] ? curr : max));

  if (topScore > 2) {
    return `${topSector} Sector Strength`;
  } else if (topScore < -2) {
    return `${topSector} Sector Weakness`;
  } else {
    return 'Broad Market Movement';
  }
}

// Export as module
export const marketScanner = {
  runScan,
  getScan,
  getRecentScans,
};
