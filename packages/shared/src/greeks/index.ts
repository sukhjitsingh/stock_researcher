/**
 * Options Greeks Calculator - Black-Scholes implementation
 *
 * Pure TypeScript implementation with no dependencies.
 * Uses Abramowitz and Stegun approximation for normal distribution.
 */

export interface GreeksResult {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  theoretical_price: number;
}

export type OptionType = 'call' | 'put';

/**
 * Approximation of the standard normal CDF.
 * Uses Abramowitz and Stegun approximation (error < 7.5e-8).
 */
function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard normal PDF.
 */
function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Calculate d1 for Black-Scholes formula.
 */
function calculateD1(
  spot: number,
  strike: number,
  timeToExpiry: number,
  volatility: number,
  riskFreeRate: number
): number {
  const numerator = Math.log(spot / strike) + (riskFreeRate + 0.5 * volatility ** 2) * timeToExpiry;
  const denominator = volatility * Math.sqrt(timeToExpiry);
  return numerator / denominator;
}

/**
 * Calculate Black-Scholes option price.
 */
export function blackScholesPrice(
  spot: number,
  strike: number,
  timeToExpiry: number,
  volatility: number,
  riskFreeRate: number,
  optionType: OptionType
): number {
  // Handle edge case of very short time to expiry
  const t = Math.max(timeToExpiry, 1 / 365);

  const d1 = calculateD1(spot, strike, t, volatility, riskFreeRate);
  const d2 = d1 - volatility * Math.sqrt(t);

  if (optionType === 'call') {
    return spot * normCdf(d1) - strike * Math.exp(-riskFreeRate * t) * normCdf(d2);
  } else {
    return strike * Math.exp(-riskFreeRate * t) * normCdf(-d2) - spot * normCdf(-d1);
  }
}

/**
 * Calculate all Greeks for an option using Black-Scholes.
 *
 * @param spot Current stock price
 * @param strike Option strike price
 * @param timeToExpiry Time to expiration in years (e.g., 30 days = 30/365)
 * @param volatility Implied volatility as decimal (0.30 = 30%)
 * @param riskFreeRate Risk-free rate as decimal (0.05 = 5%)
 * @param optionType "call" or "put"
 * @returns GreeksResult with all Greeks and theoretical price
 */
export function calculateGreeks(
  spot: number,
  strike: number,
  timeToExpiry: number,
  volatility: number,
  riskFreeRate: number,
  optionType: OptionType
): GreeksResult {
  // Handle edge case of very short time to expiry
  const t = Math.max(timeToExpiry, 1 / 365);

  const d1 = calculateD1(spot, strike, t, volatility, riskFreeRate);
  const d2 = d1 - volatility * Math.sqrt(t);

  // Calculate price
  const price = blackScholesPrice(spot, strike, t, volatility, riskFreeRate, optionType);

  // Calculate Delta
  let delta: number;
  if (optionType === 'call') {
    delta = normCdf(d1);
  } else {
    delta = normCdf(d1) - 1;
  }

  // Calculate Gamma
  const gamma = normPdf(d1) / (spot * volatility * Math.sqrt(t));

  // Calculate Theta (daily)
  const term1 = -(spot * normPdf(d1) * volatility) / (2 * Math.sqrt(t));
  let term2: number;
  if (optionType === 'call') {
    term2 = -riskFreeRate * strike * Math.exp(-riskFreeRate * t) * normCdf(d2);
  } else {
    term2 = riskFreeRate * strike * Math.exp(-riskFreeRate * t) * normCdf(-d2);
  }
  const theta = (term1 + term2) / 365;

  // Calculate Vega (per 1% change in volatility)
  const vega = (spot * Math.sqrt(t) * normPdf(d1)) / 100;

  // Calculate Rho (per 1% change in interest rates)
  let rho: number;
  if (optionType === 'call') {
    rho = (strike * t * Math.exp(-riskFreeRate * t) * normCdf(d2)) / 100;
  } else {
    rho = -(strike * t * Math.exp(-riskFreeRate * t) * normCdf(-d2)) / 100;
  }

  return {
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(6)),
    theta: Number(theta.toFixed(4)),
    vega: Number(vega.toFixed(4)),
    rho: Number(rho.toFixed(4)),
    theoretical_price: Number(price.toFixed(2)),
  };
}

/**
 * Estimate probability of profit at expiration.
 * Uses normal distribution assumption for stock price movement.
 */
export function estimateWinProbability(
  spot: number,
  breakeven: number,
  timeToExpiry: number,
  volatility: number,
  optionType: OptionType
): number {
  // Handle edge case
  const t = Math.max(timeToExpiry, 1 / 365);

  // Expected move = spot * vol * sqrt(time)
  const expectedMovePct = volatility * Math.sqrt(t);

  // Distance to breakeven as % of spot
  const distancePct = (breakeven - spot) / spot;

  // Z-score (how many standard deviations to breakeven)
  if (expectedMovePct === 0) {
    return 50.0;
  }

  const zScore = distancePct / expectedMovePct;

  let prob: number;
  if (optionType === 'call') {
    // Call profits if price > breakeven
    prob = 1 - normCdf(zScore);
  } else {
    // Put profits if price < breakeven
    prob = normCdf(zScore);
  }

  return Number((prob * 100).toFixed(1));
}
