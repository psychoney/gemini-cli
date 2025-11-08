/**
 * Strategy DSL Validator
 *
 * Provides validation functions for strategy definitions
 */

import { ZodError } from 'zod';
import { StrategySchema, SearchSpaceSchema, type Strategy, type SearchSpace } from './schema.js';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Validate a strategy definition
 */
export function validateStrategy(strategy: unknown): ValidationResult {
  try {
    StrategySchema.parse(strategy);
    return {
      valid: true,
      warnings: generateWarnings(strategy as Strategy),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error'],
    };
  }
}

/**
 * Validate a search space definition
 */
export function validateSearchSpace(searchSpace: unknown): ValidationResult {
  try {
    SearchSpaceSchema.parse(searchSpace);
    return { valid: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error'],
    };
  }
}

/**
 * Generate warnings for potentially problematic strategy configurations
 */
function generateWarnings(strategy: Strategy): string[] {
  const warnings: string[] = [];

  // Check for aggressive stop losses
  if (strategy.exit.stopLoss.value < 0.001) {
    warnings.push('Stop loss is very tight (< 0.1%), may result in frequent stops');
  }

  // Check for aggressive position sizing
  if (strategy.config.maxPositionSize > 10) {
    warnings.push('Large position size may increase risk significantly');
  }

  // Check for max holding time vs timeframe
  const minTimeframe = Math.min(
    ...strategy.config.timeframes.map((tf) => parseTimeframe(tf))
  );
  const maxHoldingTime = strategy.exit.maxHoldingTime || Infinity;
  if (maxHoldingTime < minTimeframe * 2) {
    warnings.push('Max holding time is very short relative to timeframe');
  }

  // Check for signal references
  const signalIds = new Set(strategy.signals.map((s) => s.id));
  strategy.entry.conditions.forEach((condition) => {
    if (!signalIds.has(condition.signal)) {
      warnings.push(`Entry condition references unknown signal: ${condition.signal}`);
    }
  });

  // Check risk management
  if (strategy.riskManagement.maxPositions > 5) {
    warnings.push('High number of concurrent positions may increase risk');
  }

  return warnings;
}

/**
 * Parse timeframe string to seconds
 */
function parseTimeframe(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([smhd])$/);
  if (!match) return 60; // default 1 minute

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * (multipliers[unit] || 60);
}

/**
 * Safe parse strategy from JSON string
 */
export function parseStrategy(json: string): { data?: Strategy; error?: string } {
  try {
    const data = JSON.parse(json);
    const result = StrategySchema.safeParse(data);
    if (result.success) {
      return { data: result.data };
    }
    return { error: result.error.errors.map((e) => e.message).join(', ') };
  } catch (error) {
    return { error: `JSON parse error: ${error}` };
  }
}

/**
 * Safe parse search space from JSON string
 */
export function parseSearchSpace(json: string): { data?: SearchSpace; error?: string } {
  try {
    const data = JSON.parse(json);
    const result = SearchSpaceSchema.safeParse(data);
    if (result.success) {
      return { data: result.data };
    }
    return { error: result.error.errors.map((e) => e.message).join(', ') };
  } catch (error) {
    return { error: `JSON parse error: ${error}` };
  }
}
