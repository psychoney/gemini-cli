# HFT Development Guide for Gemini CLI

This guide explains how to develop, test, and deploy HFT strategies using the gemini-cli HFT tools extension.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Strategy Development](#strategy-development)
4. [Testing and Validation](#testing-and-validation)
5. [Optimization](#optimization)
6. [Evolution](#evolution)
7. [Deployment](#deployment)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

The HFT tools extension provides:
- **Strategy DSL**: JSON-based strategy definition language
- **MCP Servers**: NautilusTrader (backtesting) and Optuna (optimization)
- **Agents**: Tuner, Evaluator, and Evolver for automated strategy development
- **Custom Commands**: `/evolve`, `/backtest`, `/tune` for interactive development

## Setup

### 1. Install Extension

```bash
cd gemini-cli
npm install
npm run build

# Install HFT tools
gemini extensions install ./packages/hft-tools
gemini extensions enable hft-tools
```

### 2. Install Python Dependencies

```bash
cd packages/hft-tools/python
pip install -r requirements.txt
```

Requirements:
- Python >= 3.9
- nautilus_trader >= 1.199.0
- optuna >= 4.1.0

### 3. Verify Installation

```bash
gemini
> /help
# Should show /evolve, /backtest, /tune commands
```

## Strategy Development

### Creating Your First Strategy

#### Option 1: AI-Assisted Creation

```bash
gemini
> /evolve "Create an order flow imbalance strategy for BTC/USDT targeting 20-30 second trades"
```

The AI will:
1. Generate strategy DSL
2. Validate the definition
3. Run initial backtest
4. Suggest optimizations

#### Option 2: Manual Creation

Create a JSON file in `strategies/`:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "MyStrategy_v1",
    "description": "My HFT strategy",
    "generation": 1
  },
  "config": {
    "instruments": ["BTC/USDT"],
    "timeframes": ["1s"],
    "maxPositionSize": 1.0,
    "maxDrawdown": 0.02
  },
  "signals": [
    {
      "id": "main_signal",
      "type": "order_flow_imbalance",
      "params": {
        "windowSize": 10,
        "threshold": 0.3
      }
    }
  ],
  "entry": {
    "conditions": [
      {
        "signal": "main_signal",
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

### Strategy DSL Reference

See [docs/hft-architecture.md](../docs/hft-architecture.md) for complete DSL specification.

**Key Components:**
- **metadata**: Name, description, generation
- **config**: Trading instruments, timeframes, risk limits
- **signals**: Trading signals with parameters
- **entry**: Entry conditions and execution
- **exit**: Stop loss, take profit, holding time
- **riskManagement**: Position sizing, risk limits

## Testing and Validation

### Validate Strategy Definition

```bash
gemini
> Validate strategies/my_strategy.json
```

AI will check for:
- JSON syntax errors
- Required fields
- Parameter ranges
- Logical consistency

### Run Backtest

```bash
> /backtest strategies/my_strategy.json --period=2024-01
```

Results include:
- **Performance**: Sharpe, Sortino, max DD, profit factor
- **Trades**: Win rate, avg win/loss, holding times
- **Risk**: VaR, CVaR, consecutive losses
- **Execution**: Slippage, commissions, fill rates

### Multi-Period Validation

```bash
> /backtest strategies/my_strategy.json --period=2024-01 --validate-oos=true
```

Runs backtest across multiple periods to check for:
- Regime stability
- Performance consistency
- Overfitting

## Optimization

### Auto-Generate Search Space

```bash
> /tune strategies/my_strategy.json --trials=100
```

AI automatically creates search space based on strategy parameters.

### Manual Search Space

Create `strategies/my_strategy.search.json`:

```json
{
  "searchSpace": {
    "signals.main_signal.params.windowSize": {
      "type": "int",
      "low": 5,
      "high": 50,
      "step": 5
    },
    "signals.main_signal.params.threshold": {
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

Then run:

```bash
> /tune strategies/my_strategy.json --trials=200 --sampler=TPE
```

### Continue Optimization

```bash
> Continue optimization study "my_strategy_opt" for 100 more trials
```

### Optimization Best Practices

1. **Start with wide ranges**: Let Optuna explore
2. **Use log scale**: For ratio parameters (stop loss, take profit)
3. **Set constraints**: Max drawdown, min trades
4. **Run enough trials**: 100+ for simple strategies
5. **Validate results**: Always backtest on different period

## Evolution

### Genetic Algorithm Evolution

```bash
> /evolve strategies/my_strategy.json --generations=5 --population=10
```

**Evolution Parameters:**
- `--generations`: Number of generations (default: 5)
- `--population`: Population size (default: 10)
- `--selection`: Selection rate (default: 0.3)
- `--mutation`: Mutation rate (default: 0.3)

**Process:**
1. **Initialization**: Create population variations
2. **Evaluation**: Backtest each individual
3. **Selection**: Keep top performers
4. **Crossover**: Combine parent strategies
5. **Mutation**: Random parameter changes
6. **Repeat**: Until convergence or max generations

### Evolution Strategies

**Fast Evolution** (quick iterations):
```bash
--generations=3 --population=5 --mutation=0.4
```

**Thorough Evolution** (deep search):
```bash
--generations=10 --population=20 --mutation=0.2
```

**Conservative Evolution** (preserve performance):
```bash
--generations=5 --population=10 --elitism=2
```

## Deployment

### Pre-Deployment Checklist

- [ ] Strategy passes validation
- [ ] Backtested on multiple periods
- [ ] Out-of-sample validation performed
- [ ] Parameter optimization completed
- [ ] Risk limits verified
- [ ] Execution assumptions realistic
- [ ] Documentation updated

### Export for Production

```bash
> Export strategies/my_strategy_v5.json for production
```

AI will:
1. Validate strategy
2. Generate deployment config
3. Create monitoring dashboard config
4. Document strategy logic

### Paper Trading

Before live trading:
1. Deploy to paper trading environment
2. Monitor for 1-2 weeks
3. Compare with backtest expectations
4. Verify execution quality
5. Check risk limits

### Live Trading Considerations

⚠️ **Important**:
- Start with minimal position sizes
- Monitor continuously for first week
- Compare live vs backtest metrics
- Be ready to shut down if issues arise
- Have risk monitoring alerts

## Best Practices

### Strategy Development

1. **Start Simple**: Begin with single signal, basic logic
2. **Add Complexity Gradually**: Only if justified by performance
3. **Document Assumptions**: Market conditions, execution model
4. **Version Control**: Track strategy generations
5. **Test Extensively**: Multiple periods, instruments, conditions

### Parameter Selection

1. **Conservative Stops**: Tighter is often better for HFT
2. **Realistic Slippage**: Don't underestimate execution costs
3. **Position Sizing**: Start small, scale up gradually
4. **Max Drawdown**: Set hard limits, stick to them
5. **Holding Times**: Match to strategy logic

### Risk Management

1. **Multiple Layers**: Stop loss, take profit, max holding time, max DD
2. **Position Limits**: Prevent concentration risk
3. **Daily Loss Limits**: Circuit breakers
4. **Correlation**: Watch for correlated positions
5. **Monitoring**: Real-time alerts on violations

### Optimization Pitfalls

1. **Overfitting**: Too many parameters, too few trades
2. **Look-Ahead Bias**: Using future information
3. **Survivorship Bias**: Missing delisted instruments
4. **Data Snooping**: Over-optimizing on same dataset
5. **Regime Dependency**: Works only in specific conditions

## Troubleshooting

### Strategy Validation Fails

**Error**: "Required field missing"
- **Solution**: Check DSL schema in `packages/hft-tools/src/dsl/schema.ts`

**Error**: "Parameter out of range"
- **Solution**: Review warnings, adjust values

### Backtest Issues

**Problem**: "No trades executed"
- **Check**: Entry conditions too strict
- **Check**: Instrument/timeframe availability
- **Check**: Data quality

**Problem**: "Unrealistic Sharpe ratio (> 4.0)"
- **Check**: Slippage model
- **Check**: Commission rates
- **Check**: Look-ahead bias

### Optimization Issues

**Problem**: "Optimization not improving"
- **Solution**: Widen search space
- **Solution**: Increase trials
- **Solution**: Try different sampler (Grid, Random)

**Problem**: "Best parameters seem random"
- **Solution**: Strategy may be overfitting
- **Solution**: Reduce parameter space
- **Solution**: Add more constraints

### MCP Server Issues

**Error**: "Failed to connect to MCP server"
- **Check**: Python installation
- **Check**: Dependencies installed
- **Check**: Extension enabled

**Error**: "Python script timeout"
- **Solution**: Increase timeout in config
- **Solution**: Reduce backtest complexity
- **Solution**: Check Python logs

### Performance Issues

**Problem**: "Backtests too slow"
- **Solution**: Use shorter time periods for development
- **Solution**: Reduce population size for evolution
- **Solution**: Cache data locally

**Problem**: "Evolution takes too long"
- **Solution**: Reduce population and generations
- **Solution**: Use faster evaluation (fewer trials)
- **Solution**: Parallelize if possible

## Advanced Topics

### Custom Signal Types

To add new signal types:

1. Update DSL schema:
```typescript
// packages/hft-tools/src/dsl/schema.ts
export const SignalSchema = z.object({
  type: z.enum([
    // ... existing types
    'my_custom_signal',
  ]),
  // ...
});
```

2. Implement in Python:
```python
# packages/hft-tools/python/nautilus_adapter/signals.py
def calculate_my_custom_signal(data, params):
    # Implementation
    pass
```

3. Add template:
```json
// packages/hft-tools/src/dsl/templates/my-signal.json
```

### Multi-Asset Strategies

```json
{
  "config": {
    "instruments": ["BTC/USDT", "ETH/USDT"],
    "correlation_threshold": 0.7
  },
  "entry": {
    "conditions": [
      // Per-instrument conditions
    ]
  }
}
```

### Walk-Forward Optimization

```bash
> /tune strategies/my_strategy.json --walk-forward=true --train-period=3m --test-period=1m
```

### Ensemble Strategies

Create multiple variants and combine:
```bash
> Create ensemble from top 5 strategies in evolution
```

## Resources

- [Architecture](../docs/hft-architecture.md): System design
- [Context](../packages/hft-tools/hft-context.md): AI assistant guide
- [Templates](../packages/hft-tools/src/dsl/templates/): Example strategies
- [NautilusTrader Docs](https://nautilustrader.io/): Backtesting engine
- [Optuna Docs](https://optuna.org/): Optimization framework

## Getting Help

- **GitHub Issues**: Report bugs, request features
- **Documentation**: Check docs/ directory
- **Examples**: See templates/ for working examples
- **Community**: Join discussions

## Contributing

To contribute:
1. Fork repository
2. Create feature branch
3. Add tests
4. Update documentation
5. Submit pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.
