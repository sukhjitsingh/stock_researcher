/**
 * Drizzle ORM Schema for Stock Research Agent
 *
 * Tables:
 * - marketscan: Weekly market scan results
 * - analysisresult: Deep dive analysis data
 * - tradeplan: Options strategy plans and execution tracking
 */

import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  real,
  boolean,
  json,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// === Market Scan Table ===

export const marketScans = pgTable('marketscan', {
  id: serial('id').primaryKey(),
  date: timestamp('date').defaultNow().notNull(),
  scanType: text('scan_type').default('TOP_GAINERS_LOSERS').notNull(),
  dominantTheme: text('dominant_theme').notNull(),
  topGainers: json('top_gainers').$type<TickerMovementJson[]>().default([]).notNull(),
  topLosers: json('top_losers').$type<TickerMovementJson[]>().default([]).notNull(),
  mostActive: json('most_active').$type<TickerMovementJson[]>().default([]).notNull(),
  tickerCount: integer('ticker_count').default(0).notNull(),
  notes: text('notes'),
});

export type MarketScan = InferSelectModel<typeof marketScans>;
export type NewMarketScan = InferInsertModel<typeof marketScans>;

// === Analysis Result Table ===

export const analysisResults = pgTable('analysisresult', {
  id: serial('id').primaryKey(),
  scanId: integer('scan_id').references(() => marketScans.id),
  symbol: text('symbol').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),

  // Price Data
  currentPrice: real('current_price').notNull(),
  priceChangePct: real('price_change_pct'),
  fiftyTwoWeekHigh: real('fifty_two_week_high'),
  fiftyTwoWeekLow: real('fifty_two_week_low'),

  // Solvency Check
  operatingCashFlow: real('operating_cash_flow'),
  isSolvent: boolean('is_solvent').default(false).notNull(),

  // Volatility
  volatility20d: real('volatility_20d'),
  volatilityCategory: text('volatility_category').default('MEDIUM').notNull(),

  // Sentiment & Ratings
  analystRating: text('analyst_rating'),
  analystTargetMean: real('analyst_target_mean'),
  upsidePotentialPct: real('upside_potential_pct'),
  sentimentScore: text('sentiment_score'),

  // Risk Assessment
  riskLevel: text('risk_level').default('MEDIUM').notNull(),
  directionBias: text('direction_bias').default('NEUTRAL').notNull(),
  isSafePlay: boolean('is_safe_play').default(false).notNull(),

  // Raw Data Cache
  rawFundamentals: json('raw_fundamentals').$type<Record<string, unknown>>(),
  rawTechnicals: json('raw_technicals').$type<Record<string, unknown>>(),
});

export type AnalysisResult = InferSelectModel<typeof analysisResults>;
export type NewAnalysisResult = InferInsertModel<typeof analysisResults>;

// === Trade Plan Table ===

export const tradePlans = pgTable('tradeplan', {
  id: serial('id').primaryKey(),
  analysisId: integer('analysis_id').references(() => analysisResults.id),
  symbol: text('symbol').notNull(),
  strategyType: text('strategy_type').notNull(),
  riskTier: text('risk_tier').default('MEDIUM').notNull(),
  status: text('status').default('PLANNED').notNull(),

  // Entry Details
  entryPrice: real('entry_price'),
  strikePrice: real('strike_price'),
  strikePrice2: real('strike_price_2'),
  expirationDate: timestamp('expiration_date'),
  contracts: integer('contracts').default(1).notNull(),
  premiumPaid: real('premium_paid'),
  premiumReceived: real('premium_received'),

  // Greeks at Entry
  delta: real('delta'),
  gamma: real('gamma'),
  theta: real('theta'),
  vega: real('vega'),
  impliedVolatility: real('implied_volatility'),

  // Risk/Reward
  maxProfit: real('max_profit'),
  maxLoss: real('max_loss'),
  breakevenPrice: real('breakeven_price'),
  riskRewardRatio: real('risk_reward_ratio'),
  winProbability: real('win_probability'),

  // Exit Conditions
  profitTargetPct: real('profit_target_pct'),
  stopLossPct: real('stop_loss_pct'),
  timeStopDays: integer('time_stop_days'),

  // Execution
  openedAt: timestamp('opened_at'),
  closedAt: timestamp('closed_at'),
  exitPrice: real('exit_price'),
  realizedPnl: real('realized_pnl'),
  exitReason: text('exit_reason'),

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  notes: text('notes'),
});

export type TradePlan = InferSelectModel<typeof tradePlans>;
export type NewTradePlan = InferInsertModel<typeof tradePlans>;

// === JSON Types ===

export interface TickerMovementJson {
  ticker: string;
  price: number;
  change_amount: number;
  change_percent: number;
  volume: number;
}
