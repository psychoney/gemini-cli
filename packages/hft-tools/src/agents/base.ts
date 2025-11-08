/**
 * Base Agent Class
 *
 * Provides common functionality for HFT agents
 */

import type { Strategy, SearchSpace } from '../dsl/schema.js';

export interface AgentConfig {
  verbose?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export abstract class BaseAgent {
  protected config: AgentConfig;

  constructor(config: AgentConfig = {}) {
    this.config = {
      verbose: false,
      maxRetries: 3,
      timeout: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Execute the agent's main task
   */
  abstract execute(...args: any[]): Promise<AgentResult>;

  /**
   * Validate input before execution
   */
  protected abstract validate(...args: any[]): boolean;

  /**
   * Log message if verbose mode is enabled
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.config.verbose) {
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
      console.error(`${prefix} [${this.constructor.name}] ${message}`);
    }
  }

  /**
   * Execute with retry logic
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T> {
    const maxRetries = this.config.maxRetries || 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log(`${context} (attempt ${attempt}/${maxRetries})`);
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.log(`${context} failed: ${error}`, 'warn');

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          this.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`${context} failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Deep clone an object
   */
  protected deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Merge two objects deeply
   */
  protected deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(
          result[key] || ({} as any),
          source[key] as any
        );
      } else {
        result[key] = source[key] as any;
      }
    }

    return result;
  }

  /**
   * Get nested property value using path string
   */
  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested property value using path string
   */
  protected setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Format duration in human-readable format
   */
  protected formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Format percentage
   */
  protected formatPercent(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Calculate statistics for an array of numbers
   */
  protected calculateStats(values: number[]): {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, std: 0, min: 0, max: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    return {
      mean,
      median,
      std,
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }
}
