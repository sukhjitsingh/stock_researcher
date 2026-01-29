/**
 * Deep Dive Analysis Routes
 *
 * POST /api/analyze - Perform deep dive analysis on a ticker
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AnalyzeRequest } from '@stock-researcher/shared';
import { analyzer } from '../services/analyzer.js';

export const analyzeRoutes = new Hono();

// Perform deep dive analysis
analyzeRoutes.post('/analyze', zValidator('json', AnalyzeRequest), async (c) => {
  try {
    const body = c.req.valid('json');
    const result = await analyzer.analyze({
      symbol: body.symbol,
      scan_id: body.scan_id ?? null,
    });
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return c.json({ error: message }, 500);
  }
});
