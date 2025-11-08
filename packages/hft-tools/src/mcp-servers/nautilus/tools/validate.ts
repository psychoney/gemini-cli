/**
 * NautilusTrader Strategy Validation Tool
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { validateStrategy } from '../../../dsl/validator.js';

export const validateTool: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'nautilus_validate_strategy',
  description: 'Validate a strategy definition',
  inputSchema: {
    type: 'object',
    properties: {
      strategy: {
        type: 'object',
        description: 'Strategy definition in DSL format',
      },
    },
    required: ['strategy'],
  },

  async handler(args: any) {
    const { strategy } = args;

    try {
      const result = validateStrategy(strategy);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                valid: result.valid,
                errors: result.errors || [],
                warnings: result.warnings || [],
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation error: ${error}`,
          },
        ],
        isError: true,
      };
    }
  },
};
