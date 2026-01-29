/**
 * MCP Server for Stock Research Agent
 *
 * Exposes research workflow tools for Claude autonomous execution.
 * Uses stateless HTTP transport for Vercel serverless deployment.
 */

import type { Context } from 'hono';
import { marketScanner } from '../services/market-scanner.js';
import { analyzer } from '../services/analyzer.js';
import { optionsEngine } from '../services/options-engine.js';
import { yahooFinance } from '../services/yahoo-finance.js';
import { db, schema } from '@stock-researcher/db';
import { eq } from 'drizzle-orm';

// MCP Protocol types
interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Tool definitions
const TOOLS = [
  {
    name: 'market_scan',
    description: 'Scan market for top gainers, losers, and most active stocks. Uses Alpha Vantage TOP_GAINERS_LOSERS (1 API call).',
    inputSchema: {
      type: 'object',
      properties: {
        min_change_pct: { type: 'number', default: 5.0, description: 'Minimum % change to include' },
        max_results: { type: 'integer', default: 20, description: 'Max tickers per category' },
      },
    },
  },
  {
    name: 'get_scan',
    description: 'Retrieve a market scan by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        scan_id: { type: 'integer', description: 'The ID of the scan to retrieve' },
      },
      required: ['scan_id'],
    },
  },
  {
    name: 'list_scans',
    description: 'List recent market scans.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', default: 10, description: 'Maximum number of scans to return' },
      },
    },
  },
  {
    name: 'deep_dive',
    description: 'Perform deep dive analysis on a stock ticker. Checks solvency (OCF > 0), calculates volatility, assesses risk level.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Stock ticker (e.g., "NVDA")' },
        scan_id: { type: 'integer', description: 'Optional link to originating market scan' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_quote',
    description: 'Get current stock quote and key metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Stock ticker (e.g., "NVDA")' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'calculate_volatility',
    description: 'Calculate N-day annualized volatility for a stock.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Stock ticker (e.g., "NVDA")' },
        days: { type: 'integer', default: 20, description: 'Number of days for volatility calculation' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'generate_strategies',
    description: 'Generate three options strategies for different risk tolerances. HIGH RISK: Long Call, MEDIUM RISK: Bull Call Spread, LOW RISK: Put Credit Spread.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Stock ticker (e.g., "NVDA")' },
        capital: { type: 'number', description: 'Available capital in USD (minimum $100)' },
        analysis_id: { type: 'integer', description: 'Optional link to deep dive analysis' },
      },
      required: ['symbol', 'capital'],
    },
  },
  {
    name: 'list_plans',
    description: 'List trade plans from database.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Filter by stock ticker (optional)' },
        status: { type: 'string', description: 'Filter by status - PLANNED, OPEN, or CLOSED (optional)' },
      },
    },
  },
  {
    name: 'update_plan_status',
    description: 'Update trade plan status.',
    inputSchema: {
      type: 'object',
      properties: {
        plan_id: { type: 'integer', description: 'ID of the trade plan to update' },
        new_status: { type: 'string', description: 'New status (PLANNED, OPEN, or CLOSED)' },
      },
      required: ['plan_id', 'new_status'],
    },
  },
];

// Server info
const SERVER_INFO = {
  name: 'stock-researcher',
  version: '5.0.0',
  protocolVersion: '2024-11-05',
};

/**
 * Handle MCP protocol requests
 */
async function handleRequest(c: Context): Promise<Response> {
  // Handle preflight
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  // Parse request
  let request: McpRequest;
  try {
    request = await c.req.json();
  } catch {
    return c.json(createErrorResponse(null, -32700, 'Parse error'));
  }

  // Validate JSON-RPC format
  if (request.jsonrpc !== '2.0' || !request.method) {
    return c.json(createErrorResponse(request.id || null, -32600, 'Invalid Request'));
  }

  // Route to method handler
  try {
    const result = await routeMethod(request.method, request.params || {});
    return c.json(createSuccessResponse(request.id, result));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return c.json(createErrorResponse(request.id, -32603, message));
  }
}

/**
 * Route to appropriate method handler
 */
async function routeMethod(method: string, params: Record<string, unknown>): Promise<unknown> {
  switch (method) {
    case 'initialize':
      return handleInitialize();

    case 'tools/list':
      return handleToolsList();

    case 'tools/call':
      return handleToolsCall(params);

    case 'ping':
      return {};

    default:
      throw new Error(`Method not found: ${method}`);
  }
}

/**
 * Handle initialize request
 */
function handleInitialize() {
  return {
    protocolVersion: SERVER_INFO.protocolVersion,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
    },
  };
}

/**
 * Handle tools/list request
 */
function handleToolsList() {
  return { tools: TOOLS };
}

/**
 * Handle tools/call request
 */
async function handleToolsCall(params: Record<string, unknown>): Promise<unknown> {
  const toolName = params.name as string;
  const args = (params.arguments as Record<string, unknown>) || {};

  let result: unknown;

  switch (toolName) {
    case 'market_scan':
      result = await marketScanner.runScan({
        min_change_pct: (args.min_change_pct as number) ?? 5.0,
        max_results: (args.max_results as number) ?? 20,
      });
      break;

    case 'get_scan':
      result = await marketScanner.getScan(args.scan_id as number);
      if (!result) {
        result = { error: `Scan ${args.scan_id} not found` };
      }
      break;

    case 'list_scans':
      result = await marketScanner.getRecentScans((args.limit as number) ?? 10);
      break;

    case 'deep_dive':
      result = await analyzer.analyze({
        symbol: args.symbol as string,
        scan_id: (args.scan_id as number) ?? null,
      });
      break;

    case 'get_quote':
      result = await yahooFinance.getQuote(args.symbol as string);
      break;

    case 'calculate_volatility':
      result = await yahooFinance.calculateVolatility(
        args.symbol as string,
        (args.days as number) ?? 20
      );
      break;

    case 'generate_strategies':
      result = await optionsEngine.generateStrategies({
        symbol: args.symbol as string,
        capital: args.capital as number,
        analysis_id: (args.analysis_id as number) ?? null,
      });
      break;

    case 'list_plans':
      result = await optionsEngine.getPlans(
        args.symbol as string | undefined,
        args.status as string | undefined
      );
      break;

    case 'update_plan_status': {
      const validStatuses = ['PLANNED', 'OPEN', 'CLOSED'];
      const newStatus = (args.new_status as string).toUpperCase();

      if (!validStatuses.includes(newStatus)) {
        result = { error: `Invalid status. Use: ${validStatuses.join(', ')}` };
        break;
      }

      const [updated] = await db
        .update(schema.tradePlans)
        .set({ status: newStatus })
        .where(eq(schema.tradePlans.id, args.plan_id as number))
        .returning({ id: schema.tradePlans.id, status: schema.tradePlans.status });

      if (!updated) {
        result = { error: `Plan ${args.plan_id} not found` };
      } else {
        result = { id: updated.id, status: updated.status, message: 'Status updated' };
      }
      break;
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

/**
 * Create success response
 */
function createSuccessResponse(id: string | number | null, result: unknown): McpResponse {
  return {
    jsonrpc: '2.0',
    id: id || 0,
    result,
  };
}

/**
 * Create error response
 */
function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string
): McpResponse {
  return {
    jsonrpc: '2.0',
    id: id || 0,
    error: { code, message },
  };
}

// Export MCP server
export const mcpServer = {
  handleRequest,
};
