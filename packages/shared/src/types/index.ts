/**
 * Shared types for Stock Research Agent
 * Zod schemas for runtime validation + TypeScript types
 */

import { z } from 'zod';

// === Enums ===

export const RiskLevel = z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const DirectionBias = z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']);
export type DirectionBias = z.infer<typeof DirectionBias>;

export const StrategyType = z.enum([
  'LONG_CALL',
  'LONG_PUT',
  'BULL_CALL_SPREAD',
  'BEAR_PUT_SPREAD',
  'PUT_CREDIT_SPREAD',
  'CALL_CREDIT_SPREAD',
  'CASH_SECURED_PUT',
]);
export type StrategyType = z.infer<typeof StrategyType>;

export const RiskTier = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type RiskTier = z.infer<typeof RiskTier>;

export const PlanStatus = z.enum(['PLANNED', 'OPEN', 'CLOSED']);
export type PlanStatus = z.infer<typeof PlanStatus>;

// === Scanner Schemas ===

export const TickerMovement = z.object({
  ticker: z.string(),
  price: z.number(),
  change_amount: z.number(),
  change_percent: z.number(),
  volume: z.number(),
});
export type TickerMovement = z.infer<typeof TickerMovement>;

export const MarketScanRequest = z.object({
  min_change_pct: z.number().default(5.0),
  max_results: z.number().default(20),
});
export type MarketScanRequest = z.infer<typeof MarketScanRequest>;

export const MarketScanResponse = z.object({
  scan_id: z.number(),
  scan_date: z.coerce.date(),
  top_gainers: z.array(TickerMovement),
  top_losers: z.array(TickerMovement),
  most_active: z.array(TickerMovement),
  dominant_theme: z.string(),
  ticker_count: z.number(),
});
export type MarketScanResponse = z.infer<typeof MarketScanResponse>;

export const ScanSummary = z.object({
  scan_id: z.number(),
  date: z.coerce.date(),
  dominant_theme: z.string().nullable(),
  ticker_count: z.number(),
});
export type ScanSummary = z.infer<typeof ScanSummary>;

// === Analysis Schemas ===

export const AnalyzeRequest = z.object({
  symbol: z.string(),
  scan_id: z.number().nullable().optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequest>;

export const SolvencyCheck = z.object({
  operating_cash_flow: z.number().nullable(),
  free_cash_flow: z.number().nullable(),
  is_solvent: z.boolean(),
  notes: z.string(),
});
export type SolvencyCheck = z.infer<typeof SolvencyCheck>;

export const VolatilityAssessment = z.object({
  volatility_20d: z.number(),
  volatility_annualized: z.number(),
  category: RiskLevel,
  recommended_strategies: z.array(z.string()),
});
export type VolatilityAssessment = z.infer<typeof VolatilityAssessment>;

export const AnalysisResponse = z.object({
  analysis_id: z.number(),
  symbol: z.string(),
  current_price: z.number(),
  solvency: SolvencyCheck,
  volatility: VolatilityAssessment,
  analyst_rating: z.string().nullable(),
  analyst_target_mean: z.number().nullable(),
  upside_potential_pct: z.number().nullable(),
  risk_level: RiskLevel,
  direction_bias: DirectionBias,
  is_safe_play: z.boolean(),
  recommendation_summary: z.string(),
});
export type AnalysisResponse = z.infer<typeof AnalysisResponse>;

// === Options Schemas ===

export const GreeksSnapshot = z.object({
  delta: z.number(),
  gamma: z.number(),
  theta: z.number(),
  vega: z.number(),
  rho: z.number().optional(),
});
export type GreeksSnapshot = z.infer<typeof GreeksSnapshot>;

export const StrategyRequest = z.object({
  symbol: z.string(),
  capital: z.number().min(100),
  analysis_id: z.number().nullable().optional(),
});
export type StrategyRequest = z.infer<typeof StrategyRequest>;

export const OptionLeg = z.object({
  action: z.enum(['BUY', 'SELL']),
  option_type: z.enum(['CALL', 'PUT']),
  strike: z.number(),
  expiration: z.coerce.date(),
  premium: z.number(),
  contracts: z.number(),
  greeks: GreeksSnapshot.nullable().optional(),
});
export type OptionLeg = z.infer<typeof OptionLeg>;

export const StrategyPlan = z.object({
  strategy_type: StrategyType,
  risk_tier: RiskTier,
  legs: z.array(OptionLeg),
  total_debit: z.number().nullable().optional(),
  total_credit: z.number().nullable().optional(),
  collateral_required: z.number().nullable().optional(),
  max_profit: z.number(),
  max_loss: z.number(),
  breakeven: z.number(),
  risk_reward_ratio: z.number(),
  win_probability: z.number(),
  profit_target_pct: z.number(),
  stop_loss_pct: z.number(),
  time_stop_days: z.number(),
  rationale: z.string(),
  warnings: z.array(z.string()).default([]),
});
export type StrategyPlan = z.infer<typeof StrategyPlan>;

export const StrategyResponse = z.object({
  symbol: z.string(),
  current_price: z.number(),
  capital: z.number(),
  strategies: z.array(StrategyPlan),
  recommendation: z.string(),
  capital_warnings: z.array(z.string()).default([]),
});
export type StrategyResponse = z.infer<typeof StrategyResponse>;

export const TradePlanSummary = z.object({
  id: z.number(),
  symbol: z.string(),
  strategy_type: z.string(),
  risk_tier: z.string(),
  status: z.string(),
  strike: z.number().nullable(),
  expiration: z.coerce.date().nullable(),
  max_profit: z.number().nullable(),
  max_loss: z.number().nullable(),
  win_probability: z.number().nullable(),
  created_at: z.coerce.date(),
});
export type TradePlanSummary = z.infer<typeof TradePlanSummary>;

// === Quote Schemas ===

export const QuoteResponse = z.object({
  symbol: z.string(),
  name: z.string().nullable(),
  price: z.number().nullable(),
  change: z.number().nullable(),
  change_percent: z.number().nullable(),
  volume: z.number().nullable(),
  avg_volume: z.number().nullable(),
  market_cap: z.number().nullable(),
  pe_ratio: z.number().nullable(),
  forward_pe: z.number().nullable(),
  fifty_two_week_high: z.number().nullable(),
  fifty_two_week_low: z.number().nullable(),
  fifty_day_ma: z.number().nullable(),
  two_hundred_day_ma: z.number().nullable(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  beta: z.number().nullable(),
  fetched_at: z.string(),
});
export type QuoteResponse = z.infer<typeof QuoteResponse>;

export const VolatilityResponse = z.object({
  symbol: z.string(),
  days: z.number(),
  daily_volatility: z.number(),
  annualized_volatility: z.number(),
  category: RiskLevel,
  recommended_strategies: z.array(z.string()),
  calculated_at: z.string(),
});
export type VolatilityResponse = z.infer<typeof VolatilityResponse>;
