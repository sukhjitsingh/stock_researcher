/**
 * Options Strategy Routes
 *
 * POST /api/strategy - Generate options strategies
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { StrategyRequest } from '@stock-researcher/shared';
import { optionsEngine } from '../services/options-engine.js';

export const strategyRoutes = new Hono();

// Generate options strategies
strategyRoutes.post('/strategy', zValidator('json', StrategyRequest), async (c) => {
  try {
    const body = c.req.valid('json');
    const result = await optionsEngine.generateStrategies({
      symbol: body.symbol,
      capital: body.capital,
      analysis_id: body.analysis_id ?? null,
    });
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Strategy generation failed';
    return c.json({ error: message }, 500);
  }
});
