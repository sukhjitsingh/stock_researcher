/**
 * Health check routes
 */

import { Hono } from 'hono';

export const healthRoutes = new Hono();

healthRoutes.get('/health', (c) => {
  return c.json({
    status: 'online',
    version: '5.0.0',
    runtime: typeof globalThis.Bun !== 'undefined' ? 'bun' : 'node',
    env: 'vercel',
    mcp: '/mcp',
    cron: '/api/cron/weekly-scan',
    timestamp: new Date().toISOString(),
  });
});
