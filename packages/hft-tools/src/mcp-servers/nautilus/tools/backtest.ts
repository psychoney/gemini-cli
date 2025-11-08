/**
 * NautilusTrader Backtest Tool
 *
 * Runs backtests using NautilusTrader engine via Python adapter
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const backtestTool: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'nautilus_backtest',
  description: 'Run backtest for a strategy using NautilusTrader',
  inputSchema: {
    type: 'object',
    properties: {
      strategy: {
        type: 'object',
        description: 'Strategy definition in DSL format',
      },
      dataConfig: {
        type: 'object',
        description: 'Historical data configuration',
        properties: {
          source: {
            type: 'string',
            description: 'Data source (e.g., "binance", "csv")',
          },
          instruments: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of instruments to backtest',
          },
          startDate: {
            type: 'string',
            description: 'Start date (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'End date (ISO format)',
          },
        },
        required: ['source', 'instruments', 'startDate', 'endDate'],
      },
      config: {
        type: 'object',
        description: 'Backtest engine configuration',
        properties: {
          initialCapital: {
            type: 'number',
            description: 'Initial capital in USD',
            default: 100000,
          },
          commission: {
            type: 'number',
            description: 'Commission rate',
            default: 0.001,
          },
          slippage: {
            type: 'number',
            description: 'Slippage model parameter',
            default: 0.0001,
          },
        },
      },
    },
    required: ['strategy', 'dataConfig'],
  },

  async handler(args: any) {
    const { strategy, dataConfig, config = {} } = args;

    try {
      // Call Python adapter
      const pythonPath = join(__dirname, '../../../../python/nautilus_adapter/backtest.py');
      const result = await runPythonScript(pythonPath, {
        strategy,
        dataConfig,
        config,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Backtest error: ${error}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Run Python script and return parsed JSON result
 */
function runPythonScript(scriptPath: string, input: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [scriptPath]);
    let stdout = '';
    let stderr = '';

    python.stdin.write(JSON.stringify(input));
    python.stdin.end();

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error}\n${stdout}`));
        }
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error}`));
    });
  });
}
