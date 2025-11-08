/**
 * Tuner Agent
 *
 * Optimizes strategy parameters using Optuna
 */

import { BaseAgent, type AgentConfig, type AgentResult } from './base.js';
import type { Strategy, SearchSpace } from '../dsl/schema.js';

export interface TunerConfig extends AgentConfig {
  nTrials?: number;
  sampler?: 'TPE' | 'Random' | 'Grid' | 'CmaEs';
  pruner?: 'Hyperband' | 'Median' | 'None';
  studyName?: string;
}

export interface TunerInput {
  strategy: Strategy;
  searchSpace: SearchSpace;
  backtestConfig?: {
    source?: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface TunerOutput {
  optimizedStrategy: Strategy;
  bestParams: Record<string, any>;
  bestValue: number;
  optimizationHistory: Array<{
    trial: number;
    value: number;
    params: Record<string, any>;
  }>;
  paramImportances: Record<string, number>;
  statistics: {
    totalTrials: number;
    completeTrials: number;
    prunedTrials: number;
    bestTrialNumber: number;
  };
}

export class TunerAgent extends BaseAgent {
  private tunerConfig: TunerConfig;

  constructor(config: TunerConfig = {}) {
    super(config);
    this.tunerConfig = {
      nTrials: 100,
      sampler: 'TPE',
      pruner: 'Hyperband',
      ...config,
    };
  }

  protected validate(input: TunerInput): boolean {
    if (!input.strategy) {
      this.log('Strategy is required', 'error');
      return false;
    }
    if (!input.searchSpace) {
      this.log('Search space is required', 'error');
      return false;
    }
    return true;
  }

  async execute(input: TunerInput): Promise<AgentResult> {
    if (!this.validate(input)) {
      return {
        success: false,
        error: 'Validation failed',
      };
    }

    const startTime = Date.now();
    this.log('Starting parameter optimization');

    try {
      // Call Optuna optimization tool
      const result = await this.runOptimization(input);

      // Apply best parameters to strategy
      const optimizedStrategy = this.applyParameters(
        input.strategy,
        result.bestParams
      );

      // Update generation number
      optimizedStrategy.metadata.generation = (input.strategy.metadata.generation || 1) + 1;
      optimizedStrategy.metadata.created = new Date().toISOString();

      const duration = Date.now() - startTime;
      this.log(`Optimization completed in ${this.formatDuration(duration)}`);
      this.log(`Best value: ${result.bestValue.toFixed(4)}`);

      return {
        success: true,
        data: {
          optimizedStrategy,
          bestParams: result.bestParams,
          bestValue: result.bestValue,
          optimizationHistory: result.optimizationHistory,
          paramImportances: result.paramImportances,
          statistics: result.statistics,
        } as TunerOutput,
        metadata: {
          duration,
          trials: this.tunerConfig.nTrials,
        },
      };
    } catch (error) {
      this.log(`Optimization failed: ${error}`, 'error');
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Run Optuna optimization
   */
  private async runOptimization(input: TunerInput): Promise<any> {
    // This would call the Optuna MCP tool
    // For now, return a placeholder
    // In real implementation, this would use the MCP client:
    // const result = await mcpClient.callTool('optuna_optimize', {...});

    this.log(`Running ${this.tunerConfig.nTrials} optimization trials`);

    // Placeholder implementation
    return {
      bestParams: this.generatePlaceholderParams(input.searchSpace),
      bestValue: 2.15,
      optimizationHistory: this.generatePlaceholderHistory(this.tunerConfig.nTrials || 100),
      paramImportances: this.generatePlaceholderImportances(input.searchSpace),
      statistics: {
        totalTrials: this.tunerConfig.nTrials,
        completeTrials: this.tunerConfig.nTrials,
        prunedTrials: 0,
        bestTrialNumber: Math.floor((this.tunerConfig.nTrials || 100) * 0.7),
      },
    };
  }

  /**
   * Apply optimized parameters to strategy
   */
  private applyParameters(strategy: Strategy, params: Record<string, any>): Strategy {
    const optimized = this.deepClone(strategy);

    for (const [path, value] of Object.entries(params)) {
      this.setNestedValue(optimized, path, value);
    }

    return optimized;
  }

  /**
   * Generate placeholder parameters (for testing)
   */
  private generatePlaceholderParams(searchSpace: SearchSpace): Record<string, any> {
    const params: Record<string, any> = {};

    for (const [path, range] of Object.entries(searchSpace.searchSpace)) {
      if (range.type === 'int') {
        const mid = Math.floor(((range.low || 0) + (range.high || 100)) / 2);
        params[path] = mid;
      } else if (range.type === 'float') {
        const mid = ((range.low || 0) + (range.high || 1)) / 2;
        params[path] = mid;
      } else if (range.type === 'categorical' && range.choices) {
        params[path] = range.choices[0];
      }
    }

    return params;
  }

  /**
   * Generate placeholder optimization history
   */
  private generatePlaceholderHistory(nTrials: number): Array<any> {
    const history: Array<any> = [];
    let bestValue = 1.0;

    for (let i = 0; i < Math.min(nTrials, 10); i++) {
      const value = 1.0 + Math.random() * 1.5;
      if (value > bestValue) {
        bestValue = value;
      }
      history.push({
        trial: i,
        value,
        params: {},
      });
    }

    return history;
  }

  /**
   * Generate placeholder parameter importances
   */
  private generatePlaceholderImportances(searchSpace: SearchSpace): Record<string, number> {
    const importances: Record<string, number> = {};
    const paths = Object.keys(searchSpace.searchSpace);
    let remaining = 1.0;

    paths.forEach((path, idx) => {
      if (idx === paths.length - 1) {
        importances[path] = remaining;
      } else {
        const importance = remaining * (0.2 + Math.random() * 0.3);
        importances[path] = importance;
        remaining -= importance;
      }
    });

    return importances;
  }
}
