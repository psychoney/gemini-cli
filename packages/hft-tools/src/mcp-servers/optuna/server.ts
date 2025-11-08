#!/usr/bin/env node
/**
 * Optuna MCP Server
 *
 * Provides tools for hyperparameter optimization using Optuna
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { optimizeTool } from './tools/optimize.js';
import { studyTool } from './tools/study.js';
import { visualizeTool } from './tools/visualize.js';

const server = new Server(
  {
    name: 'optuna',
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
  optimizeTool,
  studyTool,
  visualizeTool,
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'optuna_optimize':
      return await optimizeTool.handler(args);
    case 'optuna_continue_study':
      return await studyTool.handler(args);
    case 'optuna_visualize':
      return await visualizeTool.handler(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Optuna MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
