/**
 * Options Strategy Engine - Generates trade plans
 *
 * Generates HIGH/MEDIUM/LOW risk strategies with Greeks and exit conditions.
 */

import { eq, desc, and } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { yahooFinance } from './yahoo-finance.js';
import { calculateGreeks, estimateWinProbability } from '@stock-researcher/shared';
import type {
  StrategyResponse,
  StrategyPlan,
  OptionLeg,
  GreeksSnapshot,
  TradePlanSummary,
} from '@stock-researcher/shared';

// Current risk-free rate approximation
const RISK_FREE_RATE = 0.045; // 4.5%

interface StrategyRequest {
  symbol: string;
  capital: number;
  analysis_id: number | null;
}

interface OptionsChain {
  current_price: number;
  selected_expiration: string;
  atm_strike: number;
  atm_call: FormattedOption | null;
  calls: FormattedOption[];
  puts: FormattedOption[];
  error?: string;
}

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

/**
 * Generate three options strategies (HIGH/MEDIUM/LOW risk).
 */
async function generateStrategies(request: StrategyRequest): Promise<StrategyResponse> {
  const symbol = request.symbol.toUpperCase();
  const capital = request.capital;

  // Get current data
  const quote = await yahooFinance.getQuote(symbol);
  const currentPrice = quote.price;

  if (!currentPrice) {
    return {
      symbol,
      current_price: 0,
      capital,
      strategies: [],
      recommendation: `Unable to get price for ${symbol}`,
      capital_warnings: ['No price data'],
    };
  }

  const chain = await yahooFinance.getOptionsChain(symbol, 0);
  const chainMonthly = await yahooFinance.getOptionsChain(symbol, 2);

  if (chain.error) {
    return {
      symbol,
      current_price: currentPrice,
      capital,
      strategies: [],
      recommendation: `Unable to fetch options data: ${chain.error}`,
      capital_warnings: ['No options data available'],
    };
  }

  const strategies: StrategyPlan[] = [];
  const capitalWarnings: string[] = [];

  // HIGH RISK: Weekly directional (nearest expiration)
  const highRisk = createLongCallPlan(symbol, currentPrice, capital, chain);
  if (highRisk) {
    strategies.push(highRisk);
    if (highRisk.total_debit && highRisk.total_debit > capital) {
      capitalWarnings.push(`HIGH RISK: Costs $${highRisk.total_debit.toFixed(2)}, exceeds $${capital.toFixed(2)} budget`);
    }
  }

  // MEDIUM RISK: Bull call spread (~30 days)
  const mediumChain = chainMonthly.error ? chain : chainMonthly;
  const mediumRisk = createBullCallSpread(symbol, currentPrice, capital, mediumChain);
  if (mediumRisk) {
    strategies.push(mediumRisk);
    if (mediumRisk.total_debit && mediumRisk.total_debit > capital) {
      capitalWarnings.push(`MEDIUM RISK: Costs $${mediumRisk.total_debit.toFixed(2)}, exceeds $${capital.toFixed(2)} budget`);
    }
  }

  // LOW RISK: Put credit spread (~30 days)
  const lowRisk = createPutCreditSpread(symbol, currentPrice, capital, mediumChain);
  if (lowRisk) {
    strategies.push(lowRisk);
    if (lowRisk.collateral_required && lowRisk.collateral_required > capital) {
      capitalWarnings.push(`LOW RISK: Requires $${lowRisk.collateral_required.toFixed(2)} collateral, exceeds $${capital.toFixed(2)} budget`);
    }
  }

  // Build recommendation
  const affordable = strategies.filter(
    (s) => (s.total_debit || 0) <= capital && (s.collateral_required || 0) <= capital
  );

  let recommendation: string;
  if (affordable.length > 0) {
    const best = affordable[0];
    recommendation = `Recommended: ${best.strategy_type} (${best.risk_tier} risk) - fits within $${capital.toFixed(2)} budget`;
  } else if (strategies.length > 0) {
    recommendation = `WARNING: No strategies fit within $${capital.toFixed(2)} budget. Consider higher capital or different stock.`;
  } else {
    recommendation = 'No strategies could be generated. Check options availability.';
  }

  // Persist plans
  for (const strategy of strategies) {
    await db.insert(schema.tradePlans).values({
      analysisId: request.analysis_id,
      symbol,
      createdAt: new Date(),
      strategyType: strategy.strategy_type,
      riskTier: strategy.risk_tier,
      status: 'PLANNED',
      entryPrice: currentPrice,
      strikePrice: strategy.legs[0]?.strike ?? null,
      strikePrice2: strategy.legs[1]?.strike ?? null,
      expirationDate: strategy.legs[0]?.expiration ?? null,
      contracts: strategy.legs[0]?.contracts ?? 1,
      premiumPaid: strategy.total_debit ?? null,
      premiumReceived: strategy.total_credit ?? null,
      delta: strategy.legs[0]?.greeks?.delta ?? null,
      impliedVolatility: chain.atm_call?.implied_volatility ?? null,
      maxProfit: strategy.max_profit,
      maxLoss: strategy.max_loss,
      breakevenPrice: strategy.breakeven,
      riskRewardRatio: strategy.risk_reward_ratio,
      winProbability: strategy.win_probability,
      profitTargetPct: strategy.profit_target_pct,
      stopLossPct: strategy.stop_loss_pct,
      timeStopDays: strategy.time_stop_days,
      notes: strategy.rationale,
    });
  }

  return {
    symbol,
    current_price: currentPrice,
    capital,
    strategies,
    recommendation,
    capital_warnings: capitalWarnings,
  };
}

/**
 * Retrieve trade plans from database.
 */
async function getPlans(symbol?: string | null, status?: string | null): Promise<TradePlanSummary[]> {
  const conditions = [];
  if (symbol) {
    conditions.push(eq(schema.tradePlans.symbol, symbol.toUpperCase()));
  }
  if (status) {
    conditions.push(eq(schema.tradePlans.status, status.toUpperCase()));
  }

  const plans = await db.query.tradePlans.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(schema.tradePlans.createdAt)],
  });

  return plans.map((p) => ({
    id: p.id,
    symbol: p.symbol,
    strategy_type: p.strategyType,
    risk_tier: p.riskTier,
    status: p.status,
    strike: p.strikePrice,
    expiration: p.expirationDate,
    max_profit: p.maxProfit,
    max_loss: p.maxLoss,
    win_probability: p.winProbability,
    created_at: p.createdAt,
  }));
}

/**
 * Create HIGH RISK long call strategy.
 */
function createLongCallPlan(
  symbol: string,
  spot: number,
  capital: number,
  chain: OptionsChain
): StrategyPlan | null {
  const calls = chain.calls;
  const expiration = chain.selected_expiration;

  if (!calls.length || !expiration) {
    return null;
  }

  // Find call ~5% OTM
  const targetStrike = spot * 1.05;

  let bestCall: FormattedOption | null = null;
  for (const call of calls) {
    if (call.strike >= targetStrike && call.ask && call.ask > 0) {
      bestCall = call;
      break;
    }
  }

  if (!bestCall) {
    // Fallback to ATM
    bestCall = chain.atm_call;
    if (!bestCall || !bestCall.ask) {
      return null;
    }
  }

  const strike = bestCall.strike;
  const premium = bestCall.ask || bestCall.last_price || 0;
  const iv = (bestCall.implied_volatility || 30) / 100;

  const expDate = new Date(expiration);
  const daysToExp = Math.max(Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 1);
  const timeToExpiry = daysToExp / 365;

  const greeksResult = calculateGreeks(spot, strike, timeToExpiry, iv, RISK_FREE_RATE, 'call');

  const totalCost = premium * 100;
  const maxLoss = totalCost;
  const breakeven = strike + premium;

  const winProb = estimateWinProbability(spot, breakeven, timeToExpiry, iv, 'call');

  const warnings: string[] = [];
  const moveNeeded = ((breakeven - spot) / spot) * 100;
  if (moveNeeded > 10) {
    warnings.push(`Needs +${moveNeeded.toFixed(1)}% move to breakeven`);
  }
  if (iv > 0.5) {
    warnings.push(`IV is ${(iv * 100).toFixed(0)}% - options are expensive`);
  }

  const greeks: GreeksSnapshot = {
    delta: greeksResult.delta,
    gamma: greeksResult.gamma,
    theta: greeksResult.theta,
    vega: greeksResult.vega,
  };

  const leg: OptionLeg = {
    action: 'BUY',
    option_type: 'CALL',
    strike,
    expiration: expDate,
    premium,
    contracts: 1,
    greeks,
  };

  return {
    strategy_type: 'LONG_CALL',
    risk_tier: 'HIGH',
    legs: [leg],
    total_debit: totalCost,
    max_profit: 999999,
    max_loss: maxLoss,
    breakeven,
    risk_reward_ratio: 0,
    win_probability: winProb,
    profit_target_pct: 50,
    stop_loss_pct: 50,
    time_stop_days: Math.max(1, daysToExp - 1),
    rationale: `Directional bullish bet. Delta ${greeksResult.delta.toFixed(2)}. Needs ${moveNeeded.toFixed(1)}% move.`,
    warnings,
  };
}

/**
 * Create MEDIUM RISK bull call spread.
 */
function createBullCallSpread(
  symbol: string,
  spot: number,
  capital: number,
  chain: OptionsChain
): StrategyPlan | null {
  const calls = chain.calls;
  const expiration = chain.selected_expiration;
  const atmStrike = chain.atm_strike;

  if (!calls.length || !expiration || !atmStrike) {
    return null;
  }

  // Find buy call at ATM
  let buyCall: FormattedOption | null = null;
  for (const call of calls) {
    if (call.strike === atmStrike && call.ask) {
      buyCall = call;
      break;
    }
  }

  if (!buyCall) {
    return null;
  }

  // Find sell call ~5% OTM
  const targetSellStrike = atmStrike * 1.05;
  let sellCall: FormattedOption | null = null;
  for (const call of calls) {
    if (call.strike >= targetSellStrike && call.bid && call.bid > 0) {
      sellCall = call;
      break;
    }
  }

  if (!sellCall) {
    return null;
  }

  const buyPremium = buyCall.ask || 0;
  const sellPremium = sellCall.bid || 0;
  const netDebit = (buyPremium - sellPremium) * 100;

  const spreadWidth = sellCall.strike - buyCall.strike;
  const maxProfit = spreadWidth * 100 - netDebit;
  const maxLoss = netDebit;
  const breakeven = buyCall.strike + (buyPremium - sellPremium);

  const expDate = new Date(expiration);
  const daysToExp = Math.max(Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 1);
  const timeToExpiry = daysToExp / 365;
  const iv = (buyCall.implied_volatility || 30) / 100;

  const buyGreeks = calculateGreeks(spot, buyCall.strike, timeToExpiry, iv, RISK_FREE_RATE, 'call');
  const sellGreeks = calculateGreeks(spot, sellCall.strike, timeToExpiry, iv, RISK_FREE_RATE, 'call');

  const spreadDelta = buyGreeks.delta - sellGreeks.delta;
  const riskReward = maxLoss > 0 ? maxProfit / maxLoss : 0;

  const winProb = estimateWinProbability(spot, breakeven, timeToExpiry, iv, 'call');

  const warnings: string[] = [];
  if (netDebit > capital) {
    warnings.push(`Cost $${netDebit.toFixed(2)} exceeds budget`);
  }

  const buyLeg: OptionLeg = {
    action: 'BUY',
    option_type: 'CALL',
    strike: buyCall.strike,
    expiration: expDate,
    premium: buyPremium,
    contracts: 1,
    greeks: {
      delta: buyGreeks.delta,
      gamma: buyGreeks.gamma,
      theta: buyGreeks.theta,
      vega: buyGreeks.vega,
    },
  };

  const sellLeg: OptionLeg = {
    action: 'SELL',
    option_type: 'CALL',
    strike: sellCall.strike,
    expiration: expDate,
    premium: sellPremium,
    contracts: 1,
    greeks: {
      delta: sellGreeks.delta,
      gamma: sellGreeks.gamma,
      theta: sellGreeks.theta,
      vega: sellGreeks.vega,
    },
  };

  return {
    strategy_type: 'BULL_CALL_SPREAD',
    risk_tier: 'MEDIUM',
    legs: [buyLeg, sellLeg],
    total_debit: netDebit,
    max_profit: maxProfit,
    max_loss: maxLoss,
    breakeven,
    risk_reward_ratio: Number(riskReward.toFixed(2)),
    win_probability: winProb,
    profit_target_pct: 50,
    stop_loss_pct: 40,
    time_stop_days: Math.max(3, daysToExp - 5),
    rationale: `Defined risk spread. Net delta ${spreadDelta.toFixed(2)}. R:R ${riskReward.toFixed(1)}:1.`,
    warnings,
  };
}

/**
 * Create LOW RISK put credit spread (income strategy).
 */
function createPutCreditSpread(
  symbol: string,
  spot: number,
  capital: number,
  chain: OptionsChain
): StrategyPlan | null {
  const puts = chain.puts;
  const expiration = chain.selected_expiration;

  if (!puts.length || !expiration) {
    return null;
  }

  // Find sell put ~5% OTM
  const targetSellStrike = spot * 0.95;
  let sellPut: FormattedOption | null = null;
  for (let i = puts.length - 1; i >= 0; i--) {
    const put = puts[i];
    if (put.strike <= targetSellStrike && put.bid && put.bid > 0) {
      sellPut = put;
      break;
    }
  }

  if (!sellPut) {
    return null;
  }

  // Find buy put ~5% below sell strike
  const targetBuyStrike = sellPut.strike * 0.95;
  let buyPut: FormattedOption | null = null;
  for (let i = puts.length - 1; i >= 0; i--) {
    const put = puts[i];
    if (put.strike <= targetBuyStrike && put.ask) {
      buyPut = put;
      break;
    }
  }

  if (!buyPut) {
    return null;
  }

  const sellPremium = sellPut.bid || 0;
  const buyPremium = buyPut.ask || 0;
  const netCredit = (sellPremium - buyPremium) * 100;

  const spreadWidth = sellPut.strike - buyPut.strike;
  const collateral = spreadWidth * 100;
  const maxProfit = netCredit;
  const maxLoss = collateral - netCredit;
  const breakeven = sellPut.strike - (sellPremium - buyPremium);

  const expDate = new Date(expiration);
  const daysToExp = Math.max(Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 1);
  const timeToExpiry = daysToExp / 365;
  const iv = (sellPut.implied_volatility || 30) / 100;

  const sellGreeks = calculateGreeks(spot, sellPut.strike, timeToExpiry, iv, RISK_FREE_RATE, 'put');

  const riskReward = maxLoss > 0 ? maxProfit / maxLoss : 0;

  // Win probability for credit spread = probability stock stays above breakeven
  const winProb = 100 - estimateWinProbability(spot, sellPut.strike, timeToExpiry, iv, 'put');

  const warnings: string[] = [];
  if (collateral > capital) {
    warnings.push(`Requires $${collateral.toFixed(2)} collateral - exceeds budget`);
  }

  const cushionPct = ((spot - sellPut.strike) / spot) * 100;

  const sellLeg: OptionLeg = {
    action: 'SELL',
    option_type: 'PUT',
    strike: sellPut.strike,
    expiration: expDate,
    premium: sellPremium,
    contracts: 1,
    greeks: {
      delta: sellGreeks.delta,
      gamma: sellGreeks.gamma,
      theta: -sellGreeks.theta,
      vega: -sellGreeks.vega,
    },
  };

  const buyLeg: OptionLeg = {
    action: 'BUY',
    option_type: 'PUT',
    strike: buyPut.strike,
    expiration: expDate,
    premium: buyPremium,
    contracts: 1,
    greeks: null,
  };

  return {
    strategy_type: 'PUT_CREDIT_SPREAD',
    risk_tier: 'LOW',
    legs: [sellLeg, buyLeg],
    total_credit: netCredit,
    collateral_required: collateral,
    max_profit: maxProfit,
    max_loss: maxLoss,
    breakeven,
    risk_reward_ratio: Number(riskReward.toFixed(2)),
    win_probability: winProb,
    profit_target_pct: 50,
    stop_loss_pct: 100,
    time_stop_days: Math.max(3, daysToExp - 5),
    rationale: `Income strategy. ${cushionPct.toFixed(1)}% cushion. Collect $${netCredit.toFixed(2)} credit.`,
    warnings,
  };
}

// Export as module
export const optionsEngine = {
  generateStrategies,
  getPlans,
};
