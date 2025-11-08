/**
 * NautilusTrader Data Fetching Tool
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getDataTool: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'nautilus_get_data',
  description: 'Fetch historical market data for backtesting',
  inputSchema: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description: 'Data source (e.g., "binance", "csv")',
      },
      instrument: {
        type: 'string',
        description: 'Trading instrument (e.g., "BTC/USDT")',
      },
      dataType: {
        type: 'string',
        enum: ['trades', 'orderbook', 'quotes', 'bars'],
        description: 'Type of market data',
      },
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
      outputPath: {
        type: 'string',
        description: 'Path to save the data (optional)',
      },
    },
    required: ['source', 'instrument', 'dataType', 'startDate', 'endDate'],
  },

  async handler(args: any) {
    const { source, instrument, dataType, startDate, endDate, outputPath } = args;

    try {
      const pythonPath = join(__dirname, '../../../../python/nautilus_adapter/data.py');
      const result = await runPythonScript(pythonPath, {
        source,
        instrument,
        dataType,
        startDate,
        endDate,
        outputPath,
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
            text: `Data fetch error: ${error}`,
          },
        ],
        isError: true,
      };
    }
  },
};

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
