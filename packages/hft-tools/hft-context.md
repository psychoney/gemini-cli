# HFT Strategy Development Context

You are assisting with High-Frequency Trading (HFT) strategy development using the gemini-cli HFT tools extension.

## Available Tools

### NautilusTrader Tools
- **nautilus_backtest**: Run strategy backtests with NautilusTrader engine
- **nautilus_validate_strategy**: Validate strategy DSL definitions
- **nautilus_get_data**: Fetch historical market data

### Optuna Tools
- **optuna_optimize**: Run hyperparameter optimization
- **optuna_continue_study**: Continue existing optimization studies
- **optuna_visualize**: Generate optimization visualizations

## Strategy DSL Format

Strategies are defined using a JSON DSL with the following structure:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "StrategyName",
    "description": "Strategy description",
    "generation": 1
  },
  "config": {
    "instruments": ["BTC/USDT"],
    "timeframes": ["1s", "5s"],
    "maxPositionSize": 1.0,
    "maxDrawdown": 0.02
  },
  "signals": [...],
  "entry": {...},
  "exit": {...},
  "riskManagement": {...}
}
```

See `/docs/hft-architecture.md` for complete DSL specification.

## Custom Commands

Use these slash commands for HFT operations:

- **/evolve [description]**: Create or evolve strategies using genetic algorithms
- **/backtest [strategy_path] --period=[period]**: Run comprehensive backtests
- **/tune [strategy_path] --trials=[N]**: Optimize strategy parameters

## Best Practices

### Strategy Development
1. Start with conservative parameters (tight stops, small positions)
2. Test on multiple time periods to avoid overfitting
3. Validate out-of-sample before live trading
4. Monitor execution quality (slippage, fill rates)

### Parameter Optimization
1. Define meaningful search spaces (use log scale for ratios)
2. Set realistic constraints (max drawdown, min trades)
3. Use Sharpe ratio as primary objective
4. Run sufficient trials (100+ for simple strategies)

### Evolution
1. Use moderate population sizes (10-20 individuals)
2. Limit generations to avoid overfitting (5-10 generations)
3. Apply elitism to preserve best strategies
4. Track lineage and generation improvements

### Risk Management
1. Always set stop losses and take profit levels
2. Limit position sizes relative to capital
3. Set maximum drawdown thresholds
4. Monitor consecutive losses

## Signal Types

Common HFT signal types supported:
- **order_flow_imbalance**: Detects buying/selling pressure from order flow
- **volume_profile**: Analyzes volume distribution
- **market_microstructure**: Monitors bid-ask spread and depth
- **order_book_imbalance**: Tracks order book imbalances
- **spread_analysis**: Monitors spread changes
- **price_action**: Traditional price-based signals

## Performance Metrics

Key metrics to optimize:
- **Sharpe Ratio**: Risk-adjusted returns (target: > 2.0)
- **Sortino Ratio**: Downside risk-adjusted returns
- **Max Drawdown**: Maximum peak-to-trough decline (target: < 5%)
- **Profit Factor**: Gross profit / gross loss (target: > 2.0)
- **Win Rate**: Percentage of winning trades
- **Average Holding Time**: Typical trade duration

## Common Workflows

### Creating a New Strategy
```
1. Use /evolve with description
2. AI generates initial DSL
3. Review and validate
4. Run initial backtest
5. Tune parameters if needed
```

### Optimizing Existing Strategy
```
1. Use /tune with strategy path
2. Define search space (or auto-generate)
3. Run optimization trials
4. Validate optimized strategy
5. Compare with original
```

### Evolution Cycle
```
1. Start with base strategy
2. Use /evolve for N generations
3. Evaluate best candidates
4. Select winner
5. Repeat or deploy
```

## File Organization

Recommended project structure:
```
strategies/
  ├── active/           # Production strategies
  ├── development/      # Work in progress
  ├── archive/          # Historical versions
  └── templates/        # Base templates

results/
  ├── backtests/        # Backtest results
  ├── optimizations/    # Optimization logs
  └── evolution/        # Evolution history

data/
  ├── historical/       # Historical data cache
  └── live/            # Live data feeds
```

## Warnings and Red Flags

Watch out for:
- **Too few trades**: < 100 trades may indicate overfitting
- **Unrealistic Sharpe**: > 4.0 is often too good to be true
- **High slippage**: May not be achievable in live trading
- **Regime dependency**: Works only in specific market conditions
- **Look-ahead bias**: Using future information
- **Survivorship bias**: Missing delisted instruments

## Getting Help

- View architecture: `cat docs/hft-architecture.md`
- View DSL schema: `cat packages/hft-tools/src/dsl/schema.ts`
- View templates: `ls packages/hft-tools/src/dsl/templates/`
- Check logs: MCP server errors appear in stderr

## Example Session

```
> /evolve "Create an order flow imbalance strategy for BTC/USDT with 1-5 second holding times"

AI generates strategy → Validates → Backtests → Optimizes → Returns evolved strategy

> /backtest strategies/ofi_v1.json --period=2024-01

Runs backtest for January 2024, displays metrics

> /tune strategies/ofi_v1.json --trials=200

Optimizes parameters over 200 trials, saves optimized version

> Compare ofi_v1 and ofi_v2 performance

AI loads both strategies, runs backtests, provides comparison
```

## Safety Reminders

⚠️ **Important**:
- These tools are for backtesting and research only
- Always validate strategies extensively before live trading
- Use paper trading to verify execution assumptions
- Monitor live performance continuously
- HFT requires sophisticated infrastructure - do not underestimate complexity
- Past performance does not guarantee future results

## Contributing

To extend HFT tools:
1. Add signal types in DSL schema
2. Implement corresponding calculations in Python adapters
3. Update validators
4. Add templates
5. Document in architecture.md
