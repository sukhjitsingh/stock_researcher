/**
 * Deep Dive Analyzer Service - Fundamental and technical analysis
 *
 * Checks solvency, calculates volatility, assesses risk level.
 */

import { db, schema } from '@stock-researcher/db';
import { yahooFinance } from './yahoo-finance.js';
import { alphaVantage } from './alpha-vantage.js';
import type {
  AnalysisResponse,
  SolvencyCheck,
  VolatilityAssessment,
  RiskLevel,
  DirectionBias,
} from '@stock-researcher/shared';

interface AnalyzeRequest {
  symbol: string;
  scan_id: number | null;
}

/**
 * Perform full deep dive analysis on a ticker.
 */
async function analyze(request: AnalyzeRequest): Promise<AnalysisResponse> {
  const symbol = request.symbol.toUpperCase();

  // Step 1: Get quote
  const quote = await yahooFinance.getQuote(symbol);
  const currentPrice = quote.price;

  if (!currentPrice) {
    throw new Error(`Could not get price for ${symbol}`);
  }

  // Step 2: Solvency check
  const solvency = await checkSolvency(symbol);

  // Step 3: Volatility
  const volatility = await assessVolatility(symbol);

  // Step 4: Analyst ratings
  const ratings = await yahooFinance.getAnalystRatings(symbol);

  // Step 5: Risk assessment
  const { riskLevel, directionBias, isSafe } = assessRisk(
    volatility,
    solvency,
    ratings.upside_potential_pct ?? 0,
    quote
  );

  // Build recommendation
  const recommendation = buildRecommendation(symbol, riskLevel, directionBias, isSafe, volatility, solvency);

  // Step 6: Persist
  const [analysis] = await db
    .insert(schema.analysisResults)
    .values({
      scanId: request.scan_id,
      symbol,
      createdAt: new Date(),
      currentPrice,
      priceChangePct: quote.change_percent,
      fiftyTwoWeekHigh: quote.fifty_two_week_high,
      fiftyTwoWeekLow: quote.fifty_two_week_low,
      operatingCashFlow: solvency.operating_cash_flow,
      isSolvent: solvency.is_solvent,
      volatility20d: volatility.volatility_annualized,
      volatilityCategory: volatility.category,
      analystRating: ratings.recommendation_key,
      analystTargetMean: ratings.target_mean,
      upsidePotentialPct: ratings.upside_potential_pct,
      riskLevel,
      directionBias,
      isSafePlay: isSafe,
      rawFundamentals: ratings as unknown as Record<string, unknown>,
      rawTechnicals: quote as unknown as Record<string, unknown>,
    })
    .returning();

  // Step 7: Return response
  return {
    analysis_id: analysis.id,
    symbol,
    current_price: currentPrice,
    solvency,
    volatility,
    analyst_rating: ratings.recommendation_key,
    analyst_target_mean: ratings.target_mean,
    upside_potential_pct: ratings.upside_potential_pct,
    risk_level: riskLevel,
    direction_bias: directionBias,
    is_safe_play: isSafe,
    recommendation_summary: recommendation,
  };
}

/**
 * Check solvency via Operating Cash Flow.
 * Uses Alpha Vantage CASH_FLOW endpoint.
 */
async function checkSolvency(symbol: string): Promise<SolvencyCheck> {
  try {
    const cfData = await alphaVantage.getCashFlow(symbol);

    if (cfData.error) {
      return {
        operating_cash_flow: null,
        free_cash_flow: null,
        is_solvent: true,
        notes: 'Unable to verify OCF - assuming solvent (verify manually)',
      };
    }

    const ocf = cfData.operatingCashFlow;
    const fcf = cfData.freeCashFlow;

    return {
      operating_cash_flow: ocf,
      free_cash_flow: fcf,
      is_solvent: ocf !== null && ocf > 0,
      notes: ocf !== null && ocf > 0 ? 'Positive OCF indicates operational solvency' : 'Negative OCF - cash burn',
    };
  } catch {
    return {
      operating_cash_flow: null,
      free_cash_flow: null,
      is_solvent: true,
      notes: 'Unable to verify OCF - assuming solvent (verify manually)',
    };
  }
}

/**
 * Calculate and categorize 20-day volatility.
 */
async function assessVolatility(symbol: string): Promise<VolatilityAssessment> {
  try {
    const volData = await yahooFinance.calculateVolatility(symbol, 20);

    return {
      volatility_20d: volData.daily_volatility,
      volatility_annualized: volData.annualized_volatility,
      category: volData.category,
      recommended_strategies: volData.recommended_strategies,
    };
  } catch {
    return {
      volatility_20d: 1.5,
      volatility_annualized: 30.0,
      category: 'MEDIUM',
      recommended_strategies: ['Unable to calculate - use caution'],
    };
  }
}

/**
 * Determine overall risk level and direction bias.
 */
function assessRisk(
  volatility: VolatilityAssessment,
  solvency: SolvencyCheck,
  priceVsTarget: number,
  quote: { fifty_day_ma: number | null; price: number | null }
): { riskLevel: RiskLevel; directionBias: DirectionBias; isSafe: boolean } {
  // Start with volatility as base risk
  const riskScoreMap: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, EXTREME: 4 };
  let riskScore = riskScoreMap[volatility.category];

  // Adjust for solvency
  if (!solvency.is_solvent) {
    riskScore += 1;
  }

  // Check price extension
  const fiftyDayMa = quote.fifty_day_ma;
  const currentPrice = quote.price;
  if (fiftyDayMa && currentPrice && fiftyDayMa > 0) {
    const extension = ((currentPrice - fiftyDayMa) / fiftyDayMa) * 100;
    if (Math.abs(extension) > 30) {
      riskScore += 1;
    }
  }

  // Determine direction bias
  let directionBias: DirectionBias;
  if (priceVsTarget > 10) {
    directionBias = 'BULLISH';
  } else if (priceVsTarget < -10) {
    directionBias = 'BEARISH';
  } else {
    directionBias = 'NEUTRAL';
  }

  // Determine risk level
  let riskLevel: RiskLevel;
  if (riskScore <= 1) {
    riskLevel = 'LOW';
  } else if (riskScore <= 2) {
    riskLevel = 'MEDIUM';
  } else if (riskScore <= 3) {
    riskLevel = 'HIGH';
  } else {
    riskLevel = 'EXTREME';
  }

  // Safe play = solvent + not extreme risk
  const isSafe = solvency.is_solvent && (riskLevel === 'LOW' || riskLevel === 'MEDIUM');

  return { riskLevel, directionBias, isSafe };
}

/**
 * Build human-readable recommendation summary.
 */
function buildRecommendation(
  symbol: string,
  riskLevel: RiskLevel,
  directionBias: DirectionBias,
  isSafe: boolean,
  volatility: VolatilityAssessment,
  solvency: SolvencyCheck
): string {
  const parts: string[] = [`${symbol}:`];

  if (isSafe) {
    parts.push('SAFE PLAY -');
  } else {
    parts.push('SPECULATIVE -');
  }

  parts.push(`${riskLevel} risk,`);
  parts.push(`${directionBias} bias.`);

  if (volatility.category === 'HIGH' || volatility.category === 'EXTREME') {
    parts.push(`High volatility (${volatility.volatility_annualized.toFixed(0)}%) favors directional strategies.`);
  } else {
    parts.push(`Moderate volatility (${volatility.volatility_annualized.toFixed(0)}%) allows income strategies.`);
  }

  if (!solvency.is_solvent) {
    parts.push('WARNING: Negative operating cash flow.');
  }

  return parts.join(' ');
}

// Export as module
export const analyzer = {
  analyze,
  checkSolvency,
  assessVolatility,
};
