/**
 * Quote & Volatility Routes
 *
 * GET /api/quote/:symbol - Get current quote
 * GET /api/volatility/:symbol - Calculate volatility
 */

import { Hono } from 'hono';
import { yahooFinance } from '../services/yahoo-finance.js';

export const quoteRoutes = new Hono();

// Get current quote
quoteRoutes.get('/quote/:symbol', async (c) => {
  try {
    const symbol = c.req.param('symbol').toUpperCase();
    const quote = await yahooFinance.getQuote(symbol);
    return c.json(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get quote';
    return c.json({ error: message }, 500);
  }
});

// Calculate volatility
quoteRoutes.get('/volatility/:symbol', async (c) => {
  try {
    const symbol = c.req.param('symbol').toUpperCase();
    const days = parseInt(c.req.query('days') || '20');

    const volatility = await yahooFinance.calculateVolatility(symbol, days);
    return c.json(volatility);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate volatility';
    return c.json({ error: message }, 500);
  }
});
