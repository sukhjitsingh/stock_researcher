/**
 * Alpha Vantage API Service
 *
 * Primary data source for:
 * - Market scanning (TOP_GAINERS_LOSERS)
 * - Company fundamentals (OVERVIEW)
 * - Cash flow statements (CASH_FLOW)
 *
 * Rate Limit: 25 requests/day (free tier)
 */

import type { TickerMovement } from '@stock-researcher/shared';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

function getApiKey(): string {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHAVANTAGE_API_KEY not set in environment');
  }
  return apiKey;
}

interface AlphaVantageMover {
  ticker: string;
  price: string;
  change_amount: string;
  change_percentage: string;
  volume: string;
}

interface TopGainersLosersResponse {
  top_gainers?: AlphaVantageMover[];
  top_losers?: AlphaVantageMover[];
  most_actively_traded?: AlphaVantageMover[];
  Information?: string;
  Note?: string;
}

interface CashFlowReport {
  operatingCashflow?: string;
  capitalExpenditures?: string;
}

interface CashFlowResponse {
  annualReports?: CashFlowReport[];
  error?: string;
  Information?: string;
  Note?: string;
}

/**
 * Fetch top gainers, losers, and most active from Alpha Vantage.
 * Cost: 1 API call
 */
export async function getTopGainersLosers(): Promise<{
  top_gainers: TickerMovement[];
  top_losers: TickerMovement[];
  most_active: TickerMovement[];
  fetched_at: string;
}> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    function: 'TOP_GAINERS_LOSERS',
    apikey: apiKey,
  });

  const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${params}`, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json() as TopGainersLosersResponse;

  // Check for API error messages
  if (data.Information || data.Note) {
    throw new Error(`Alpha Vantage API error: ${data.Information || data.Note}`);
  }

  return {
    top_gainers: normalizeMovers(data.top_gainers || []),
    top_losers: normalizeMovers(data.top_losers || []),
    most_active: normalizeMovers(data.most_actively_traded || []),
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Fetch company fundamentals for solvency analysis.
 * Cost: 1 API call
 */
export async function getCompanyOverview(symbol: string): Promise<Record<string, unknown>> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    function: 'OVERVIEW',
    symbol: symbol.toUpperCase(),
    apikey: apiKey,
  });

  const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${params}`, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;

  if (!data || !data.Symbol) {
    return { error: `No data found for ${symbol}` };
  }

  return data;
}

/**
 * Fetch cash flow statement for detailed solvency check.
 * Cost: 1 API call
 */
export async function getCashFlow(symbol: string): Promise<{
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  error?: string;
}> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    function: 'CASH_FLOW',
    symbol: symbol.toUpperCase(),
    apikey: apiKey,
  });

  const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${params}`, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json() as CashFlowResponse;

  if (data.Information || data.Note) {
    return {
      operatingCashFlow: null,
      freeCashFlow: null,
      error: data.Information || data.Note,
    };
  }

  if (!data.annualReports || data.annualReports.length === 0) {
    return {
      operatingCashFlow: null,
      freeCashFlow: null,
      error: `No cash flow data for ${symbol}`,
    };
  }

  const latest = data.annualReports[0];
  const ocfStr = latest.operatingCashflow;
  const capexStr = latest.capitalExpenditures;

  const ocf = ocfStr && ocfStr !== 'None' ? parseFloat(ocfStr) : null;
  const capex = capexStr && capexStr !== 'None' ? parseFloat(capexStr) : 0;
  const fcf = ocf !== null ? ocf - Math.abs(capex) : null;

  return {
    operatingCashFlow: ocf,
    freeCashFlow: fcf,
  };
}

/**
 * Normalize Alpha Vantage mover data to standard format.
 */
function normalizeMovers(movers: AlphaVantageMover[]): TickerMovement[] {
  const normalized: TickerMovement[] = [];

  for (const item of movers.slice(0, 20)) {
    try {
      const changePctStr = item.change_percentage || '0%';
      const changePct = parseFloat(changePctStr.replace('%', ''));

      normalized.push({
        ticker: item.ticker || '',
        price: parseFloat(item.price) || 0,
        change_amount: parseFloat(item.change_amount) || 0,
        change_percent: changePct,
        volume: parseInt(item.volume) || 0,
      });
    } catch {
      // Skip invalid entries
      continue;
    }
  }

  return normalized;
}

// Export as module
export const alphaVantage = {
  getTopGainersLosers,
  getCompanyOverview,
  getCashFlow,
};
