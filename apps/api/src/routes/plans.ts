/**
 * Trade Plans Routes
 *
 * GET /api/plans - List trade plans
 * PATCH /api/plans/:id/status - Update plan status
 */

import { Hono } from 'hono';
import { optionsEngine } from '../services/options-engine.js';
import { db, schema } from '@stock-researcher/db';
import { eq } from 'drizzle-orm';

export const plansRoutes = new Hono();

// List trade plans
plansRoutes.get('/plans', async (c) => {
  try {
    const symbol = c.req.query('symbol');
    const status = c.req.query('status');

    const plans = await optionsEngine.getPlans(symbol, status);
    return c.json(plans);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list plans';
    return c.json({ error: message }, 500);
  }
});

// Update plan status
plansRoutes.patch('/plans/:id/status', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid plan ID' }, 400);
    }

    const newStatus = c.req.query('new_status')?.toUpperCase();
    const validStatuses = ['PLANNED', 'OPEN', 'CLOSED'];

    if (!newStatus || !validStatuses.includes(newStatus)) {
      return c.json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` }, 400);
    }

    // Update in database
    const [updated] = await db
      .update(schema.tradePlans)
      .set({ status: newStatus })
      .where(eq(schema.tradePlans.id, id))
      .returning({ id: schema.tradePlans.id, status: schema.tradePlans.status });

    if (!updated) {
      return c.json({ error: 'Plan not found' }, 404);
    }

    return c.json({
      id: updated.id,
      status: updated.status,
      message: 'Status updated',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update status';
    return c.json({ error: message }, 500);
  }
});
