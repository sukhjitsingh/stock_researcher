/**
 * Cron Job Routes
 *
 * GET /api/cron/weekly-scan - Automated weekly market scan
 * GET /api/cron/health - Cron system health check
 */

import { Hono } from 'hono';
import { marketScanner } from '../services/market-scanner.js';

export const cronRoutes = new Hono();

// Verify cron secret from Vercel
function verifyCronSecret(authHeader: string | undefined): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Allow in development if no secret configured
    return true;
  }
  return authHeader === `Bearer ${cronSecret}`;
}

// Weekly market scan - triggered by Vercel Cron
cronRoutes.get('/weekly-scan', async (c) => {
  // Verify request is from Vercel Cron
  const authHeader = c.req.header('Authorization');
  if (!verifyCronSecret(authHeader)) {
    return c.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, 401);
  }

  try {
    // Run the weekly market scan with default parameters
    const result = await marketScanner.runScan({
      min_change_pct: 5.0,
      max_results: 20,
    });

    return c.json({
      status: 'success',
      message: 'Weekly scan completed',
      scan_id: result.scan_id,
      scan_date: result.scan_date,
      ticker_count: result.ticker_count,
      dominant_theme: result.dominant_theme,
      top_gainers_count: result.top_gainers.length,
      top_losers_count: result.top_losers.length,
    });
  } catch (error) {
    // Log error but return 200 to prevent Vercel from retrying
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({
      status: 'error',
      message: `Weekly scan failed: ${message}`,
      scan_id: null,
    });
  }
});

// Cron health check
cronRoutes.get('/health', (c) => {
  return c.json({
    status: 'online',
    cron_enabled: true,
    schedules: {
      weekly_scan: '0 14 * * 1 (Monday 14:00 UTC)',
    },
  });
});
