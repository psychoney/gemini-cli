/**
 * Strategy DSL Schema Definition
 *
 * Defines the structure for HFT strategy configuration using Zod for type safety
 * and runtime validation.
 */

import { z } from 'zod';

// Metadata Schema
export const MetadataSchema = z.object({
  name: z.string().describe('Strategy name'),
  description: z.string().describe('Strategy description'),
  author: z.string().default('ai'),
  created: z.string().datetime().describe('Creation timestamp'),
  generation: z.number().int().min(1).default(1).describe('Evolution generation'),
});

// Configuration Schema
export const ConfigSchema = z.object({
  instruments: z.array(z.string()).describe('Trading instruments (e.g., BTC/USDT)'),
  timeframes: z.array(z.string()).describe('Timeframes (e.g., 1s, 5s, 1m)'),
  maxPositionSize: z.number().positive().describe('Maximum position size'),
  maxDrawdown: z.number().positive().describe('Maximum allowed drawdown'),
});

// Signal Parameter Schema (flexible for different signal types)
export const SignalParamsSchema = z.record(z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number()])),
]));

// Signal Schema
export const SignalSchema = z.object({
  id: z.string().describe('Unique signal identifier'),
  type: z.enum([
    'order_flow_imbalance',
    'volume_profile',
    'market_microstructure',
    'order_book_imbalance',
    'spread_analysis',
    'price_action',
    'custom',
  ]).describe('Signal type'),
  params: SignalParamsSchema.describe('Signal-specific parameters'),
});

// Entry Condition Schema
export const EntryConditionSchema = z.object({
  signal: z.string().describe('Signal ID to reference'),
  operator: z.enum(['>', '<', '>=', '<=', '==', '!=']).describe('Comparison operator'),
  value: z.number().describe('Threshold value'),
  side: z.enum(['long', 'short', 'both']).describe('Trade side'),
});

// Execution Schema
export const ExecutionSchema = z.object({
  type: z.enum(['market', 'limit', 'stop', 'stop_limit']).describe('Order type'),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK', 'DAY']).describe('Time in force'),
  slippage: z.number().optional().describe('Maximum allowed slippage'),
});

// Entry Schema
export const EntrySchema = z.object({
  conditions: z.array(EntryConditionSchema).describe('Entry conditions'),
  logic: z.enum(['AND', 'OR']).default('AND').describe('Condition combination logic'),
  execution: ExecutionSchema.describe('Execution configuration'),
});

// Stop Loss Schema
export const StopLossSchema = z.object({
  type: z.enum(['fixed', 'trailing', 'dynamic']).describe('Stop loss type'),
  value: z.number().positive().describe('Stop loss value (in percentage or absolute)'),
  trailingDistance: z.number().positive().optional().describe('Trailing distance for trailing stops'),
});

// Take Profit Schema
export const TakeProfitSchema = z.object({
  type: z.enum(['fixed', 'dynamic', 'ladder']).describe('Take profit type'),
  value: z.number().positive().describe('Take profit value'),
  levels: z.array(z.object({
    price: z.number(),
    quantity: z.number(),
  })).optional().describe('Ladder levels for partial exits'),
});

// Exit Schema
export const ExitSchema = z.object({
  stopLoss: StopLossSchema.describe('Stop loss configuration'),
  takeProfit: TakeProfitSchema.describe('Take profit configuration'),
  maxHoldingTime: z.number().int().positive().optional().describe('Maximum holding time in seconds'),
  trailingStop: z.boolean().default(false).describe('Enable trailing stop'),
});

// Position Sizing Schema
export const PositionSizingSchema = z.object({
  type: z.enum(['fixed', 'kelly', 'risk_parity', 'dynamic']).describe('Position sizing method'),
  value: z.number().positive().describe('Size value (depends on type)'),
  maxRiskPerTrade: z.number().positive().optional().describe('Maximum risk per trade'),
});

// Risk Management Schema
export const RiskManagementSchema = z.object({
  maxPositions: z.number().int().positive().describe('Maximum concurrent positions'),
  positionSizing: PositionSizingSchema.describe('Position sizing configuration'),
  maxDailyLoss: z.number().positive().optional().describe('Maximum daily loss'),
  maxDrawdown: z.number().positive().optional().describe('Maximum drawdown'),
});

// Main Strategy Schema
export const StrategySchema = z.object({
  version: z.string().default('1.0').describe('DSL version'),
  metadata: MetadataSchema.describe('Strategy metadata'),
  config: ConfigSchema.describe('General configuration'),
  signals: z.array(SignalSchema).describe('Trading signals'),
  entry: EntrySchema.describe('Entry rules'),
  exit: ExitSchema.describe('Exit rules'),
  riskManagement: RiskManagementSchema.describe('Risk management'),
});

// Parameter Search Space Schema (for Optuna)
export const ParameterRangeSchema = z.object({
  type: z.enum(['int', 'float', 'categorical']).describe('Parameter type'),
  low: z.number().optional().describe('Lower bound (for int/float)'),
  high: z.number().optional().describe('Upper bound (for int/float)'),
  step: z.number().optional().describe('Step size (for int/float)'),
  log: z.boolean().optional().describe('Use log scale (for float)'),
  choices: z.array(z.union([z.string(), z.number()])).optional().describe('Choices (for categorical)'),
});

export const ObjectiveSchema = z.object({
  metric: z.enum([
    'sharpe_ratio',
    'sortino_ratio',
    'profit_factor',
    'total_return',
    'max_drawdown',
    'win_rate',
    'risk_adjusted_return',
  ]).describe('Optimization objective metric'),
  direction: z.enum(['maximize', 'minimize']).describe('Optimization direction'),
  constraints: z.record(z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  })).optional().describe('Constraint metrics'),
});

export const SearchSpaceSchema = z.object({
  searchSpace: z.record(ParameterRangeSchema).describe('Parameter search space'),
  objective: ObjectiveSchema.describe('Optimization objective'),
});

// Type Exports
export type Metadata = z.infer<typeof MetadataSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type Signal = z.infer<typeof SignalSchema>;
export type SignalParams = z.infer<typeof SignalParamsSchema>;
export type EntryCondition = z.infer<typeof EntryConditionSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type Execution = z.infer<typeof ExecutionSchema>;
export type StopLoss = z.infer<typeof StopLossSchema>;
export type TakeProfit = z.infer<typeof TakeProfitSchema>;
export type Exit = z.infer<typeof ExitSchema>;
export type PositionSizing = z.infer<typeof PositionSizingSchema>;
export type RiskManagement = z.infer<typeof RiskManagementSchema>;
export type Strategy = z.infer<typeof StrategySchema>;
export type ParameterRange = z.infer<typeof ParameterRangeSchema>;
export type Objective = z.infer<typeof ObjectiveSchema>;
export type SearchSpace = z.infer<typeof SearchSpaceSchema>;
