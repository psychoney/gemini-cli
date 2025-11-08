#!/usr/bin/env node
/**
 * NautilusTrader MCP Server
 *
 * Provides tools for backtesting, validation, and data fetching using NautilusTrader
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { backtestTool } from './tools/backtest.js';
import { validateTool } from './tools/validate.js';
import { getDataTool } from './tools/data.js';

const server = new Server(
  {
    name: 'nautilus-trader',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
const tools: Tool[] = [
  backtestTool,
  validateTool,
  getDataTool,
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'nautilus_backtest':
      return await backtestTool.handler(args);
    case 'nautilus_validate_strategy':
      return await validateTool.handler(args);
    case 'nautilus_get_data':
      return await getDataTool.handler(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('NautilusTrader MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
