/**
 * Evaluator Agent
 *
 * Evaluates strategy performance through comprehensive backtesting
 */

import { BaseAgent, type AgentConfig, type AgentResult } from './base.js';
import type { Strategy } from '../dsl/schema.js';

export interface EvaluatorConfig extends AgentConfig {
  periods?: Array<{ start: string; end: string }>;
  validateOutOfSample?: boolean;
}

export interface EvaluatorInput {
  strategy: Strategy;
  dataConfig?: {
    source?: string;
    instruments?: string[];
    startDate?: string;
    endDate?: string;
  };
}

export interface PerformanceMetrics {
  totalReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
}

export interface RiskMetrics {
  var95: number;
  cvar95: number;
  maxConsecutiveLosses: number;
  maxConsecutiveWins: number;
  recoveryTime?: number;
}

export interface EvaluatorOutput {
  strategy: Strategy;
  performance: PerformanceMetrics;
  risk: RiskMetrics;
  execution: {
    avgSlippage: number;
    totalCommission: number;
    fillRate: number;
  };
  tradeAnalysis: {
    avgHoldingTime: number;
    tradeDistribution: Record<string, number>;
  };
  warnings: string[];
  periodBreakdown?: Array<{
    period: { start: string; end: string };
    metrics: PerformanceMetrics;
  }>;
}

export class EvaluatorAgent extends BaseAgent {
  private evaluatorConfig: EvaluatorConfig;

  constructor(config: EvaluatorConfig = {}) {
    super(config);
    this.evaluatorConfig = config;
  }

  protected validate(input: EvaluatorInput): boolean {
    if (!input.strategy) {
      this.log('Strategy is required', 'error');
      return false;
    }
    return true;
  }

  async execute(input: EvaluatorInput): Promise<AgentResult> {
    if (!this.validate(input)) {
      return {
        success: false,
        error: 'Validation failed',
      };
    }

    const startTime = Date.now();
    this.log('Starting strategy evaluation');

    try {
      // Run main backtest
      const backtestResult = await this.runBacktest(input);

      // Analyze results
      const warnings = this.analyzeForWarnings(backtestResult);

      // Run out-of-sample validation if configured
      let periodBreakdown: EvaluatorOutput['periodBreakdown'];
      if (this.evaluatorConfig.validateOutOfSample) {
        periodBreakdown = await this.runMultiPeriodEvaluation(input);
      }

      const duration = Date.now() - startTime;
      this.log(`Evaluation completed in ${this.formatDuration(duration)}`);
      this.log(`Sharpe Ratio: ${backtestResult.performance.sharpeRatio.toFixed(2)}`);
      this.log(`Max Drawdown: ${this.formatPercent(backtestResult.performance.maxDrawdown)}`);

      if (warnings.length > 0) {
        this.log(`⚠️  ${warnings.length} warnings detected`, 'warn');
      }

      return {
        success: true,
        data: {
          strategy: input.strategy,
          performance: backtestResult.performance,
          risk: backtestResult.risk,
          execution: backtestResult.execution,
          tradeAnalysis: backtestResult.tradeAnalysis,
          warnings,
          periodBreakdown,
        } as EvaluatorOutput,
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.log(`Evaluation failed: ${error}`, 'error');
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Run backtest using NautilusTrader MCP tool
   */
  private async runBacktest(input: EvaluatorInput): Promise<any> {
    this.log('Running backtest');

    // This would call the Nautilus MCP tool
    // For now, return placeholder data
    // In real implementation:
    // const result = await mcpClient.callTool('nautilus_backtest', {...});

    return {
      performance: {
        totalReturn: 0.15,
        sharpeRatio: 1.8,
        sortinoRatio: 2.1,
        maxDrawdown: 0.05,
        profitFactor: 2.3,
        winRate: 0.62,
        totalTrades: 245,
        winningTrades: 152,
        losingTrades: 93,
        averageWin: 150.5,
        averageLoss: -85.3,
        largestWin: 580.0,
        largestLoss: -320.0,
      } as PerformanceMetrics,
      risk: {
        var95: 0.025,
        cvar95: 0.032,
        maxConsecutiveLosses: 5,
        maxConsecutiveWins: 8,
        recoveryTime: 3,
      } as RiskMetrics,
      execution: {
        avgSlippage: 0.00015,
        totalCommission: 245.5,
        fillRate: 0.98,
      },
      tradeAnalysis: {
        avgHoldingTime: 25,
        tradeDistribution: {
          '<10s': 0.15,
          '10-30s': 0.45,
          '30-60s': 0.25,
          '>60s': 0.15,
        },
      },
    };
  }

  /**
   * Analyze backtest results for warnings
   */
  private analyzeForWarnings(result: any): string[] {
    const warnings: string[] = [];
    const perf = result.performance;

    // Check for too few trades
    if (perf.totalTrades < 100) {
      warnings.push(`Low number of trades (${perf.totalTrades}) - potential overfitting risk`);
    }

    // Check for suspiciously high Sharpe
    if (perf.sharpeRatio > 3.0) {
      warnings.push(`Unusually high Sharpe ratio (${perf.sharpeRatio.toFixed(2)}) - verify results`);
    }

    // Check for high drawdown
    if (perf.maxDrawdown > 0.1) {
      warnings.push(`High max drawdown (${this.formatPercent(perf.maxDrawdown)}) - risk management review needed`);
    }

    // Check for low win rate with high profit factor
    if (perf.winRate < 0.4 && perf.profitFactor > 2.5) {
      warnings.push('Low win rate with high profit factor - verify large wins are realistic');
    }

    // Check execution quality
    if (result.execution.avgSlippage > 0.001) {
      warnings.push(`High average slippage (${this.formatPercent(result.execution.avgSlippage)}) - execution costs may be underestimated`);
    }

    // Check risk metrics
    if (result.risk.maxConsecutiveLosses > 10) {
      warnings.push(`High consecutive losses (${result.risk.maxConsecutiveLosses}) - psychological stress risk`);
    }

    return warnings;
  }

  /**
   * Run evaluation across multiple time periods
   */
  private async runMultiPeriodEvaluation(
    input: EvaluatorInput
  ): Promise<EvaluatorOutput['periodBreakdown']> {
    this.log('Running multi-period evaluation');

    const periods = this.evaluatorConfig.periods || this.generatePeriods();
    const results: EvaluatorOutput['periodBreakdown'] = [];

    for (const period of periods) {
      this.log(`Evaluating period: ${period.start} to ${period.end}`);

      const periodInput = {
        ...input,
        dataConfig: {
          ...input.dataConfig,
          startDate: period.start,
          endDate: period.end,
        },
      };

      const result = await this.runBacktest(periodInput);
      results.push({
        period,
        metrics: result.performance,
      });
    }

    return results;
  }

  /**
   * Generate default evaluation periods (e.g., rolling windows)
   */
  private generatePeriods(): Array<{ start: string; end: string }> {
    // Generate last 6 months in monthly chunks
    const periods: Array<{ start: string; end: string }> = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const end = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);

      periods.push({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      });
    }

    return periods;
  }

  /**
   * Compare two strategies
   */
  async compareStrategies(
    strategy1: Strategy,
    strategy2: Strategy,
    dataConfig?: any
  ): Promise<{
    strategy1Results: EvaluatorOutput;
    strategy2Results: EvaluatorOutput;
    comparison: {
      winner: 'strategy1' | 'strategy2' | 'tie';
      metric: string;
      improvement: number;
    };
  }> {
    this.log('Comparing two strategies');

    const result1 = await this.execute({ strategy: strategy1, dataConfig });
    const result2 = await this.execute({ strategy: strategy2, dataConfig });

    if (!result1.success || !result2.success) {
      throw new Error('Failed to evaluate one or both strategies');
    }

    const perf1 = (result1.data as EvaluatorOutput).performance;
    const perf2 = (result2.data as EvaluatorOutput).performance;

    // Compare by Sharpe ratio
    const sharpe1 = perf1.sharpeRatio;
    const sharpe2 = perf2.sharpeRatio;
    const improvement = ((sharpe2 - sharpe1) / sharpe1) * 100;

    return {
      strategy1Results: result1.data as EvaluatorOutput,
      strategy2Results: result2.data as EvaluatorOutput,
      comparison: {
        winner: sharpe2 > sharpe1 ? 'strategy2' : sharpe1 > sharpe2 ? 'strategy1' : 'tie',
        metric: 'sharpeRatio',
        improvement,
      },
    };
  }
}
