/**
 * Stock Research Agent API
 *
 * Bun + Hono backend for market scanning, deep dive analysis,
 * and options strategy generation.
 *
 * MCP Server available at /mcp for Claude autonomous execution.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';

// Import routes
import { analyzeRoutes } from './routes/analyze.js';
import { cronRoutes } from './routes/cron.js';
import { healthRoutes } from './routes/health.js';
import { mcpRoutes } from './routes/mcp.js';
import { plansRoutes } from './routes/plans.js';
import { quoteRoutes } from './routes/quote.js';
import { scanRoutes } from './routes/scan.js';
import { strategyRoutes } from './routes/strategy.js';

// Create Hono app
const app = new Hono();

// === Error Handling ===

// Global error handler
app.onError((err, c) => {
  console.error('Error:', err);

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  return c.json({ error: 'Internal Server Error' }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// === Middleware ===

// Logger for development
app.use('*', logger());

// CORS for frontend + MCP clients
app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (!origin) return '';
      if (origin.endsWith('.vercel.app')) return origin;
      if (origin === 'http://localhost:3000') return origin;
      if (origin === 'http://localhost:8000') return origin;
      return '';
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Mcp-Session-Id'],
    credentials: true,
  })
);

// MCP needs open CORS for various clients
app.use(
  '/mcp/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id'],
    exposeHeaders: ['Mcp-Session-Id'],
  })
);

// === Mount Routes ===

app.route('/api', healthRoutes);
app.route('/api', scanRoutes);
app.route('/api', analyzeRoutes);
app.route('/api', strategyRoutes);
app.route('/api', plansRoutes);
app.route('/api', quoteRoutes);
app.route('/api/cron', cronRoutes);
app.route('/mcp', mcpRoutes);

// === Root redirect ===

app.get('/', (c) => {
  return c.json({
    message: 'Stock Research Agent API v5.0.0',
    docs: '/api/health',
    mcp: '/mcp',
  });
});

// === Export for Vercel ===

export default app;
