/**
 * Market Scanning Routes
 *
 * POST /api/scan - Trigger market scan
 * GET /api/scan/:id - Get scan by ID
 * GET /api/scans - List recent scans
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { MarketScanRequest } from '@stock-researcher/shared';
import { marketScanner } from '../services/market-scanner.js';

export const scanRoutes = new Hono();

// Trigger market scan
scanRoutes.post('/scan', zValidator('json', MarketScanRequest.partial().optional()), async (c) => {
  try {
    const body = c.req.valid('json') || {};
    const request = {
      min_change_pct: (body as any).min_change_pct ?? 5.0,
      max_results: (body as any).max_results ?? 20,
    };

    const result = await marketScanner.runScan(request);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scan failed';
    return c.json({ error: message }, 500);
  }
});

// Get scan by ID
scanRoutes.get('/scan/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid scan ID' }, 400);
    }

    const result = await marketScanner.getScan(id);
    if (!result) {
      return c.json({ error: 'Scan not found' }, 404);
    }

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get scan';
    return c.json({ error: message }, 500);
  }
});

// List recent scans
scanRoutes.get('/scans', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const scans = await marketScanner.getRecentScans(limit);
    return c.json(scans);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list scans';
    return c.json({ error: message }, 500);
  }
});
