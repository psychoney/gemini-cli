/**
 * Optuna Study Management Tool
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const studyTool: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'optuna_continue_study',
  description: 'Continue an existing Optuna study',
  inputSchema: {
    type: 'object',
    properties: {
      studyName: {
        type: 'string',
        description: 'Name of the study to continue',
      },
      nTrials: {
        type: 'number',
        description: 'Number of additional trials',
        default: 50,
      },
    },
    required: ['studyName'],
  },

  async handler(args: any) {
    const { studyName, nTrials = 50 } = args;

    try {
      const pythonPath = join(__dirname, '../../../../python/optuna_adapter/study.py');
      const result = await runPythonScript(pythonPath, {
        studyName,
        nTrials,
        action: 'continue',
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
            text: `Study error: ${error}`,
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
  });
}
