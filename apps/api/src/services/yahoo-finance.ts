/**
 * Yahoo Finance Service
 *
 * Fallback data source + options chains (only source for options data).
 * Uses yahoo-finance2 package.
 *
 * No API key required. Rate limits are lenient.
 */

import YahooFinance from 'yahoo-finance2';
import type { RiskLevel, QuoteResponse, VolatilityResponse } from '@stock-researcher/shared';

// Create yahoo-finance2 v3 instance with suppressed notices
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/**
 * Get current quote and key metrics for a stock.
 */
export async function getQuote(symbol: string): Promise<QuoteResponse> {
  const quote = await yf.quote(symbol.toUpperCase());

  return {
    symbol: symbol.toUpperCase(),
    name: quote.longName ?? quote.shortName ?? null,
    price: quote.regularMarketPrice ?? null,
    change: quote.regularMarketChange ?? null,
    change_percent: quote.regularMarketChangePercent ?? null,
    volume: quote.regularMarketVolume ?? null,
    avg_volume: quote.averageDailyVolume10Day ?? null,
    market_cap: quote.marketCap ?? null,
    pe_ratio: quote.trailingPE ?? null,
    forward_pe: quote.forwardPE ?? null,
    fifty_two_week_high: quote.fiftyTwoWeekHigh ?? null,
    fifty_two_week_low: quote.fiftyTwoWeekLow ?? null,
    fifty_day_ma: quote.fiftyDayAverage ?? null,
    two_hundred_day_ma: quote.twoHundredDayAverage ?? null,
    sector: null, // Not available in quote, would need quoteSummary
    industry: null,
    beta: null,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Get historical price data with calculated returns.
 */
export async function getHistorical(
  symbol: string,
  period: string = '1mo'
): Promise<{
  symbol: string;
  period: string;
  start_date: string;
  end_date: string;
  start_price: number;
  end_price: number;
  period_return_pct: number;
  high: number;
  low: number;
  avg_volume: number;
  volatility_annualized: number;
  daily_returns: number[];
  fetched_at: string;
}> {
  // Map period string to yahoo-finance2 format
  const periodMap: Record<string, { period1: Date; period2: Date }> = {
    '1mo': {
      period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      period2: new Date(),
    },
    '3mo': {
      period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      period2: new Date(),
    },
    '6mo': {
      period1: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      period2: new Date(),
    },
    '1y': {
      period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      period2: new Date(),
    },
  };

  const dates = periodMap[period] || periodMap['1mo'];

  const history = await yf.chart(symbol.toUpperCase(), {
    period1: dates.period1,
    period2: dates.period2,
    interval: '1d',
  });

  const quotes = history.quotes;
  if (!quotes || quotes.length === 0) {
    throw new Error(`No data found for ${symbol}`);
  }

  const closes = quotes.map((q) => q.close).filter((c): c is number => c !== null);
  const highs = quotes.map((q) => q.high).filter((h): h is number => h !== null);
  const lows = quotes.map((q) => q.low).filter((l): l is number => l !== null);
  const volumes = quotes.map((q) => q.volume).filter((v): v is number => v !== null);

  // Calculate daily returns
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }

  // Calculate standard deviation
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  const annualizedVol = dailyVol * Math.sqrt(252) * 100;

  return {
    symbol: symbol.toUpperCase(),
    period,
    start_date: quotes[0].date?.toISOString().split('T')[0] || '',
    end_date: quotes[quotes.length - 1].date?.toISOString().split('T')[0] || '',
    start_price: Number(closes[0].toFixed(2)),
    end_price: Number(closes[closes.length - 1].toFixed(2)),
    period_return_pct: Number(((closes[closes.length - 1] / closes[0] - 1) * 100).toFixed(2)),
    high: Number(Math.max(...highs).toFixed(2)),
    low: Number(Math.min(...lows).toFixed(2)),
    avg_volume: Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length),
    volatility_annualized: Number(annualizedVol.toFixed(2)),
    daily_returns: returns.slice(-20),
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Calculate N-day annualized volatility.
 */
export async function calculateVolatility(symbol: string, days: number = 20): Promise<VolatilityResponse> {
  // Fetch extra days for buffer
  const period1 = new Date(Date.now() - (days + 15) * 24 * 60 * 60 * 1000);
  const period2 = new Date();

  const history = await yf.chart(symbol.toUpperCase(), {
    period1,
    period2,
    interval: '1d',
  });

  const quotes = history.quotes;
  const closes = quotes
    .map((q) => q.close)
    .filter((c): c is number => c !== null)
    .slice(-(days + 1));

  if (closes.length < days) {
    throw new Error(`Insufficient data for ${days}-day volatility`);
  }

  // Calculate daily returns
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }

  // Calculate standard deviation
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  const annualizedVol = dailyVol * Math.sqrt(252) * 100;

  // Categorize volatility
  let category: RiskLevel;
  let strategies: string[];

  if (annualizedVol < 20) {
    category = 'LOW';
    strategies = ['Cash-secured puts', 'Put credit spreads', 'Covered calls'];
  } else if (annualizedVol < 35) {
    category = 'MEDIUM';
    strategies = ['Bull call spreads', 'Put credit spreads', 'Iron condors'];
  } else if (annualizedVol < 50) {
    category = 'HIGH';
    strategies = ['Long calls/puts', 'Vertical spreads', 'Straddles'];
  } else {
    category = 'EXTREME';
    strategies = ['Small positions only', 'Wide spreads', 'Consider waiting'];
  }

  return {
    symbol: symbol.toUpperCase(),
    days,
    daily_volatility: Number((dailyVol * 100).toFixed(4)),
    annualized_volatility: Number(annualizedVol.toFixed(2)),
    category,
    recommended_strategies: strategies,
    calculated_at: new Date().toISOString(),
  };
}

/**
 * Get options chain with current prices and IV.
 */
export async function getOptionsChain(
  symbol: string,
  expirationIndex: number = 0
): Promise<{
  symbol: string;
  current_price: number;
  expirations: string[];
  selected_expiration: string;
  atm_strike: number;
  atm_call: FormattedOption | null;
  atm_put: FormattedOption | null;
  calls: FormattedOption[];
  puts: FormattedOption[];
  fetched_at: string;
  error?: string;
}> {
  try {
    // Get quote for current price
    const quote = await yf.quote(symbol.toUpperCase());
    const currentPrice = quote.regularMarketPrice;

    if (!currentPrice) {
      return {
        symbol: symbol.toUpperCase(),
        current_price: 0,
        expirations: [],
        selected_expiration: '',
        atm_strike: 0,
        atm_call: null,
        atm_put: null,
        calls: [],
        puts: [],
        fetched_at: new Date().toISOString(),
        error: `Could not get current price for ${symbol}`,
      };
    }

    // Get options data
    const options = await yf.options(symbol.toUpperCase());

    if (!options.expirationDates || options.expirationDates.length === 0) {
      return {
        symbol: symbol.toUpperCase(),
        current_price: currentPrice,
        expirations: [],
        selected_expiration: '',
        atm_strike: 0,
        atm_call: null,
        atm_put: null,
        calls: [],
        puts: [],
        fetched_at: new Date().toISOString(),
        error: `No options data for ${symbol}`,
      };
    }

    const expirations = options.expirationDates.map((d) => d.toISOString().split('T')[0]);
    const selectedExpiration = expirations[Math.min(expirationIndex, expirations.length - 1)];

    // Get specific expiration if needed
    let calls = options.options?.[0]?.calls || [];
    let puts = options.options?.[0]?.puts || [];

    // Find ATM strike
    const strikes = calls.map((c) => c.strike).filter((s): s is number => s !== undefined);
    let atmStrike = currentPrice;
    if (strikes.length > 0) {
      atmStrike = strikes.reduce((prev, curr) =>
        Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice) ? curr : prev
      );
    }

    // Format options
    const formattedCalls = calls.map(formatOption);
    const formattedPuts = puts.map(formatOption);

    // Find ATM options
    const atmCall = formattedCalls.find((c) => c.strike === atmStrike) || null;
    const atmPut = formattedPuts.find((p) => p.strike === atmStrike) || null;

    return {
      symbol: symbol.toUpperCase(),
      current_price: currentPrice,
      expirations: expirations.slice(0, 8),
      selected_expiration: selectedExpiration,
      atm_strike: atmStrike,
      atm_call: atmCall,
      atm_put: atmPut,
      calls: formattedCalls,
      puts: formattedPuts,
      fetched_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      symbol: symbol.toUpperCase(),
      current_price: 0,
      expirations: [],
      selected_expiration: '',
      atm_strike: 0,
      atm_call: null,
      atm_put: null,
      calls: [],
      puts: [],
      fetched_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get analyst ratings and price targets.
 */
export async function getAnalystRatings(symbol: string): Promise<{
  symbol: string;
  name: string | null;
  current_price: number | null;
  recommendation_key: string | null;
  recommendation_mean: number | null;
  number_of_analysts: number | null;
  target_high: number | null;
  target_low: number | null;
  target_mean: number | null;
  target_median: number | null;
  upside_potential_pct: number | null;
  fetched_at: string;
}> {
  const quote = await yf.quote(symbol.toUpperCase());

  const currentPrice = quote.regularMarketPrice ?? null;
  const targetMean = quote.targetMeanPrice ?? null;

  let upside: number | null = null;
  if (targetMean && currentPrice) {
    upside = Number(((targetMean / currentPrice - 1) * 100).toFixed(2));
  }

  return {
    symbol: symbol.toUpperCase(),
    name: quote.longName ?? null,
    current_price: currentPrice,
    recommendation_key: quote.recommendationKey ?? null,
    recommendation_mean: quote.recommendationMean ?? null,
    number_of_analysts: quote.numberOfAnalystOpinions ?? null,
    target_high: quote.targetHighPrice ?? null,
    target_low: quote.targetLowPrice ?? null,
    target_mean: targetMean,
    target_median: quote.targetMedianPrice ?? null,
    upside_potential_pct: upside,
    fetched_at: new Date().toISOString(),
  };
}

// === Types ===

interface FormattedOption {
  contract_symbol: string | null;
  strike: number;
  last_price: number | null;
  bid: number | null;
  ask: number | null;
  volume: number | null;
  open_interest: number | null;
  implied_volatility: number;
  in_the_money: boolean;
}

function formatOption(opt: Record<string, unknown>): FormattedOption {
  const iv = typeof opt.impliedVolatility === 'number' ? opt.impliedVolatility * 100 : 0;

  return {
    contract_symbol: (opt.contractSymbol as string) || null,
    strike: (opt.strike as number) || 0,
    last_price: (opt.lastPrice as number) ?? null,
    bid: (opt.bid as number) ?? null,
    ask: (opt.ask as number) ?? null,
    volume: (opt.volume as number) ?? null,
    open_interest: (opt.openInterest as number) ?? null,
    implied_volatility: Number(iv.toFixed(2)),
    in_the_money: (opt.inTheMoney as boolean) || false,
  };
}

// Export as module
export const yahooFinance = {
  getQuote,
  getHistorical,
  calculateVolatility,
  getOptionsChain,
  getAnalystRatings,
};
