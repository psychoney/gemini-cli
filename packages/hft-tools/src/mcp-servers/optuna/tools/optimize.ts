/**
 * Optuna Optimization Tool
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const optimizeTool: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'optuna_optimize',
  description: 'Run hyperparameter optimization using Optuna',
  inputSchema: {
    type: 'object',
    properties: {
      strategy: {
        type: 'object',
        description: 'Base strategy definition',
      },
      searchSpace: {
        type: 'object',
        description: 'Parameter search space definition',
      },
      nTrials: {
        type: 'number',
        description: 'Number of optimization trials',
        default: 100,
      },
      studyName: {
        type: 'string',
        description: 'Study name (for persistence)',
      },
      sampler: {
        type: 'string',
        enum: ['TPE', 'Random', 'Grid', 'CmaEs'],
        description: 'Sampling algorithm',
        default: 'TPE',
      },
      pruner: {
        type: 'string',
        enum: ['Hyperband', 'Median', 'None'],
        description: 'Pruning algorithm',
        default: 'Hyperband',
      },
      backtestConfig: {
        type: 'object',
        description: 'Backtest configuration for objective evaluation',
      },
    },
    required: ['strategy', 'searchSpace'],
  },

  async handler(args: any) {
    const {
      strategy,
      searchSpace,
      nTrials = 100,
      studyName,
      sampler = 'TPE',
      pruner = 'Hyperband',
      backtestConfig,
    } = args;

    try {
      const pythonPath = join(__dirname, '../../../../python/optuna_adapter/optimizer.py');
      const result = await runPythonScript(pythonPath, {
        strategy,
        searchSpace,
        nTrials,
        studyName,
        sampler,
        pruner,
        backtestConfig,
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
            text: `Optimization error: ${error}`,
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
