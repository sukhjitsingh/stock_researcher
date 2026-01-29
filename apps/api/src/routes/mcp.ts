/**
 * MCP Server Routes
 *
 * Exposes MCP tools via HTTP transport for Claude autonomous execution.
 */

import { Hono } from 'hono';
import { mcpServer } from '../mcp/server.js';

export const mcpRoutes = new Hono();

// MCP endpoint - handles all MCP protocol messages
mcpRoutes.all('/', async (c) => {
  return mcpServer.handleRequest(c);
});

// Also handle with trailing slash
mcpRoutes.all('/*', async (c) => {
  return mcpServer.handleRequest(c);
});
