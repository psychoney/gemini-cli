# HFT Auto-Evolution Architecture

## Overview

This document describes the architecture for extending gemini-cli with High-Frequency Trading (HFT) auto-evolution capabilities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ gemini-cli (User Interface)                                 │
│ └─ Custom Commands: /evolve, /backtest, /tune              │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│ packages/hft-tools (HFT Extension)                          │
│ ├─ dsl/              # Strategy DSL                         │
│ │  ├─ schema.ts      # DSL type definitions                │
│ │  ├─ validator.ts   # DSL validation                      │
│ │  └─ templates/     # Strategy templates                  │
│ │                                                           │
│ ├─ agents/           # HFT Agents                          │
│ │  ├─ tuner.ts       # Strategy parameter tuning           │
│ │  ├─ evaluator.ts   # Strategy evaluation                 │
│ │  └─ evolver.ts     # Evolutionary algorithm              │
│ │                                                           │
│ └─ mcp-servers/      # MCP Servers                         │
│    ├─ nautilus/      # NautilusTrader integration          │
│    └─ optuna/        # Optuna integration                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   ┌──────────┐  ┌─────────┐  ┌──────────┐
   │Nautilus  │  │Optuna   │  │Market    │
   │Trader    │  │(HPO)    │  │Data API  │
   │(Backtest)│  │         │  │          │
   └──────────┘  └─────────┘  └──────────┘
```

## DSL Design

### Strategy DSL Format (JSON)

```json
{
  "version": "1.0",
  "metadata": {
    "name": "OrderFlowImbalance_v1",
    "description": "Order flow imbalance strategy",
    "author": "ai",
    "created": "2025-11-07T00:00:00Z",
    "generation": 1
  },
  "config": {
    "instruments": ["BTC/USDT"],
    "timeframes": ["1s", "5s"],
    "maxPositionSize": 1.0,
    "maxDrawdown": 0.02
  },
  "signals": [
    {
      "id": "ofi_signal",
      "type": "order_flow_imbalance",
      "params": {
        "windowSize": 10,
        "threshold": 0.3,
        "minVolume": 1000
      }
    }
  ],
  "entry": {
    "conditions": [
      {
        "signal": "ofi_signal",
        "operator": ">",
        "value": 0.3,
        "side": "long"
      }
    ],
    "execution": {
      "type": "market",
      "timeInForce": "IOC"
    }
  },
  "exit": {
    "stopLoss": {
      "type": "fixed",
      "value": 0.001
    },
    "takeProfit": {
      "type": "fixed",
      "value": 0.002
    },
    "maxHoldingTime": 30
  },
  "riskManagement": {
    "maxPositions": 1,
    "positionSizing": {
      "type": "fixed",
      "value": 1.0
    }
  }
}
```

### Parameter Search Space (for Optuna)

```json
{
  "searchSpace": {
    "signals.ofi_signal.params.windowSize": {
      "type": "int",
      "low": 5,
      "high": 50,
      "step": 5
    },
    "signals.ofi_signal.params.threshold": {
      "type": "float",
      "low": 0.1,
      "high": 0.9,
      "step": 0.05
    },
    "exit.stopLoss.value": {
      "type": "float",
      "low": 0.0005,
      "high": 0.005,
      "log": true
    },
    "exit.takeProfit.value": {
      "type": "float",
      "low": 0.001,
      "high": 0.01,
      "log": true
    }
  },
  "objective": {
    "metric": "sharpe_ratio",
    "direction": "maximize",
    "constraints": {
      "maxDrawdown": {"max": 0.05},
      "minTrades": {"min": 100}
    }
  }
}
```

## MCP Server Interfaces

### NautilusTrader MCP Server

**Tools:**
1. `nautilus_backtest` - Run backtest with strategy
   - Input: strategy DSL, historical data config, time period
   - Output: performance metrics, trade log

2. `nautilus_validate_strategy` - Validate strategy definition
   - Input: strategy DSL
   - Output: validation result, warnings

3. `nautilus_get_data` - Fetch historical market data
   - Input: instrument, timeframe, date range
   - Output: OHLCV + orderbook/trade data

### Optuna MCP Server

**Tools:**
1. `optuna_optimize` - Run hyperparameter optimization
   - Input: strategy DSL, search space, n_trials
   - Output: best parameters, optimization history

2. `optuna_continue_study` - Continue existing study
   - Input: study_name, n_trials
   - Output: updated best parameters

3. `optuna_visualize` - Generate optimization visualizations
   - Input: study_name, plot_type
   - Output: plot data/URL

## Agents

### 1. Tuner Agent
**Purpose**: Optimize strategy parameters using Optuna

**Workflow**:
1. Accept strategy DSL + search space
2. Define objective function (calls Nautilus backtest)
3. Run Optuna study
4. Return optimized strategy

### 2. Evaluator Agent
**Purpose**: Evaluate strategy performance comprehensively

**Workflow**:
1. Run backtest on multiple time periods
2. Calculate metrics: Sharpe, max DD, win rate, profit factor
3. Analyze trade distribution, holding times
4. Generate performance report

### 3. Evolver Agent
**Purpose**: Evolutionary strategy generation

**Workflow**:
1. Initialize population of strategies
2. Evaluate each strategy (via Evaluator)
3. Select top performers
4. Apply mutations/crossover
5. Repeat for N generations

**Mutation Operations**:
- Adjust parameter values
- Add/remove signals
- Modify entry/exit logic
- Change risk management rules

## Custom Commands

### `/evolve`
```toml
description = "Evolve HFT strategy using genetic algorithm"
prompt = """
You are an HFT strategy evolution expert. The user wants to create/evolve a strategy: {{args}}

1. If this is a new strategy:
   - Analyze the requirements
   - Generate initial strategy DSL
   - Create parameter search space

2. If evolving existing strategy:
   - Load current strategy
   - Identify improvement areas

3. Run evolution:
   - Use evolver agent with {{generations}} generations
   - Population size: {{population}}
   - Selection pressure: {{selection}}

4. Return:
   - Best strategy found
   - Performance comparison
   - Evolution history

Use tools:
- !{nautilus_backtest} for evaluation
- !{optuna_optimize} for parameter tuning
"""
```

### `/backtest`
```toml
description = "Backtest HFT strategy"
prompt = """
Backtest the strategy: {{strategy_path}}
Period: {{period}}

1. Load strategy from {{strategy_path}}
2. Validate strategy definition
3. Run backtest using !{nautilus_backtest}
4. Display results:
   - Key metrics table
   - Trade log summary
   - Performance charts (if available)

5. Identify potential issues:
   - Overfitting signs
   - Market regime changes
   - Risk violations
"""
```

### `/tune`
```toml
description = "Tune strategy parameters"
prompt = """
Tune parameters for strategy: {{strategy_path}}

1. Load strategy and search space
2. Run optimization using !{optuna_optimize}
   - Trials: {{trials:100}}
   - Sampler: {{sampler:TPE}}
   - Pruner: {{pruner:Hyperband}}

3. Display:
   - Best parameters found
   - Optimization history
   - Parameter importance

4. Save optimized strategy to {{output_path}}
"""
```

## Package Structure

```
packages/hft-tools/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Main exports
│   │
│   ├── dsl/
│   │   ├── schema.ts               # Strategy DSL types
│   │   ├── validator.ts            # DSL validation
│   │   ├── generator.ts            # AI-assisted DSL generation
│   │   └── templates/
│   │       ├── order-flow.json     # Order flow strategy template
│   │       ├── market-making.json  # Market making template
│   │       └── arbitrage.json      # Arbitrage template
│   │
│   ├── agents/
│   │   ├── base.ts                 # Base agent class
│   │   ├── tuner.ts                # Parameter tuning agent
│   │   ├── evaluator.ts            # Strategy evaluation agent
│   │   └── evolver.ts              # Evolution agent
│   │
│   ├── mcp-servers/
│   │   ├── nautilus/
│   │   │   ├── server.ts           # MCP server entry
│   │   │   ├── tools/
│   │   │   │   ├── backtest.ts     # Backtest tool
│   │   │   │   ├── validate.ts     # Validation tool
│   │   │   │   └── data.ts         # Data fetching tool
│   │   │   ├── adapters/
│   │   │   │   └── strategy.py     # Python adapter for Nautilus
│   │   │   └── utils.ts
│   │   │
│   │   └── optuna/
│   │       ├── server.ts           # MCP server entry
│   │       ├── tools/
│   │       │   ├── optimize.ts     # Optimization tool
│   │       │   ├── study.ts        # Study management
│   │       │   └── visualize.ts    # Visualization tool
│   │       ├── adapters/
│   │       │   └── optimizer.py    # Python adapter for Optuna
│   │       └── utils.ts
│   │
│   └── utils/
│       ├── metrics.ts              # Performance metrics
│       ├── validation.ts           # Strategy validation
│       └── conversion.ts           # DSL <-> Nautilus conversion
│
├── python/                         # Python backend
│   ├── requirements.txt
│   ├── nautilus_adapter/
│   │   ├── __init__.py
│   │   ├── strategy.py             # Strategy runner
│   │   ├── backtest.py             # Backtesting engine
│   │   └── data.py                 # Data handling
│   │
│   └── optuna_adapter/
│       ├── __init__.py
│       ├── optimizer.py            # Optimization logic
│       └── study.py                # Study management
│
└── dist/                           # Compiled output
```

## Extension Configuration

```json
{
  "name": "hft-tools",
  "version": "1.0.0",
  "description": "HFT strategy auto-evolution tools",
  "mcpServers": {
    "nautilus": {
      "command": "node",
      "args": ["${extensionPath}/dist/mcp-servers/nautilus/server.js"],
      "env": {
        "PYTHON_PATH": "${extensionPath}/python"
      }
    },
    "optuna": {
      "command": "node",
      "args": ["${extensionPath}/dist/mcp-servers/optuna/server.js"],
      "env": {
        "PYTHON_PATH": "${extensionPath}/python"
      }
    }
  },
  "contextFileName": ["hft-context.md"],
  "commands": {
    "evolve": ".gemini/commands/evolve.toml",
    "backtest": ".gemini/commands/backtest.toml",
    "tune": ".gemini/commands/tune.toml"
  }
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create package structure
- [ ] Define DSL schema and validator
- [ ] Create strategy templates
- [ ] Setup Python environment

### Phase 2: MCP Servers (Week 2)
- [ ] Implement Nautilus MCP server
  - [ ] Backtest tool
  - [ ] Validation tool
  - [ ] Data tool
- [ ] Implement Optuna MCP server
  - [ ] Optimize tool
  - [ ] Study management
  - [ ] Visualization

### Phase 3: Agents (Week 3)
- [ ] Implement Evaluator agent
- [ ] Implement Tuner agent
- [ ] Implement Evolver agent
- [ ] Integration testing

### Phase 4: Custom Commands (Week 4)
- [ ] Create /evolve command
- [ ] Create /backtest command
- [ ] Create /tune command
- [ ] Documentation and examples

## Example Usage Flow

```bash
# Initialize new HFT project
gemini extensions install ./packages/hft-tools
gemini extensions enable hft-tools

# Evolve a new strategy
gemini
> /evolve "Create an order flow imbalance strategy for BTC/USDT"

# AI generates strategy DSL → Optuna tunes → Nautilus backtests → Evolution

# Backtest specific strategy
> /backtest strategies/ofi_v5.json --period=2024-01

# Tune existing strategy
> /tune strategies/ofi_v5.json --trials=200 --output=strategies/ofi_v6.json

# Interactive analysis
> Why did the Sharpe ratio drop in February?
# AI analyzes backtest results, market conditions, etc.
```

## Key Technical Decisions

1. **TypeScript for orchestration**: Leverages gemini-cli infrastructure
2. **Python for execution**: NautilusTrader and Optuna are Python-native
3. **MCP for integration**: Clean separation of concerns
4. **JSON DSL**: Human-readable, AI-friendly, easy to version control
5. **Optuna for HPO**: Industry-standard, flexible, visualization support
6. **NautilusTrader**: Professional-grade backtesting, institutional quality

## Next Steps

1. Review and approve architecture
2. Setup development environment
3. Begin Phase 1 implementation
4. Create example strategies and test cases
