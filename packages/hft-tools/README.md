# HFT Tools for Gemini CLI

High-Frequency Trading strategy auto-evolution tools - AI-powered strategy development, optimization, and backtesting.

## Overview

This extension adds HFT capabilities to gemini-cli, enabling:
- 🧬 **Genetic Algorithm Evolution**: Automatically evolve trading strategies
- 🎯 **Hyperparameter Optimization**: Optuna-powered parameter tuning
- 📊 **Professional Backtesting**: NautilusTrader integration
- 🤖 **AI-Assisted Development**: Natural language strategy creation

## Features

### Strategy DSL
- JSON-based strategy definition
- Supports multiple signal types (order flow, volume, microstructure)
- Flexible entry/exit rules
- Comprehensive risk management

### MCP Servers
- **NautilusTrader**: Institutional-grade backtesting engine
- **Optuna**: State-of-the-art hyperparameter optimization

### Agents
- **Tuner**: Optimize strategy parameters
- **Evaluator**: Comprehensive performance evaluation
- **Evolver**: Genetic algorithm-based evolution

### Custom Commands
- `/evolve`: Create or evolve strategies
- `/backtest`: Run backtests with detailed analysis
- `/tune`: Optimize parameters

## Installation

```bash
# From gemini-cli root
cd packages/hft-tools

# Install Node dependencies
npm install

# Install Python dependencies
cd python
pip install -r requirements.txt
cd ..

# Build
npm run build

# Install as extension
cd ../..
gemini extensions install ./packages/hft-tools
gemini extensions enable hft-tools
```

## Quick Start

### 1. Create a Strategy

```bash
gemini
> /evolve "Create an order flow imbalance strategy for BTC/USDT"
```

The AI will:
- Generate initial strategy DSL
- Run preliminary backtest
- Suggest optimizations
- Save strategy file

### 2. Backtest

```bash
> /backtest strategies/strategy_v1.json --period=2024-01
```

Get comprehensive metrics:
- Sharpe ratio, max drawdown, profit factor
- Trade statistics and distribution
- Risk analysis
- Execution quality

### 3. Optimize Parameters

```bash
> /tune strategies/strategy_v1.json --trials=200
```

Automatically:
- Define search space
- Run Optuna optimization
- Validate results
- Save optimized strategy

### 4. Evolve Further

```bash
> /evolve strategies/strategy_v1.json --generations=5
```

Genetic algorithm will:
- Create population variations
- Evaluate fitness
- Apply selection, crossover, mutation
- Return best evolved strategy

## Strategy DSL

Example strategy definition:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "OrderFlowImbalance_v1",
    "description": "HFT strategy based on order flow",
    "generation": 1
  },
  "config": {
    "instruments": ["BTC/USDT"],
    "timeframes": ["1s", "5s"],
    "maxPositionSize": 1.0
  },
  "signals": [
    {
      "id": "ofi_signal",
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
    "stopLoss": {"type": "fixed", "value": 0.001},
    "takeProfit": {"type": "fixed", "value": 0.002},
    "maxHoldingTime": 30
  },
  "riskManagement": {
    "maxPositions": 1,
    "positionSizing": {"type": "fixed", "value": 1.0}
  }
}
```

## Architecture

```
packages/hft-tools/
├── src/
│   ├── dsl/              # Strategy DSL definitions
│   ├── agents/           # Trading agents (tuner, evaluator, evolver)
│   ├── mcp-servers/      # MCP server implementations
│   │   ├── nautilus/     # NautilusTrader integration
│   │   └── optuna/       # Optuna integration
│   └── utils/            # Utilities
│
├── python/               # Python adapters
│   ├── nautilus_adapter/ # NautilusTrader adapter
│   └── optuna_adapter/   # Optuna adapter
│
└── templates/            # Strategy templates
```

## Development

### Adding New Signal Types

1. Update DSL schema in `src/dsl/schema.ts`
2. Implement signal calculation in Python adapter
3. Add template in `src/dsl/templates/`
4. Update documentation

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

## Documentation

- [Architecture](../../docs/hft-architecture.md): Detailed system architecture
- [Context](./hft-context.md): AI assistant context and best practices
- [DSL Schema](./src/dsl/schema.ts): Complete DSL specification

## Safety & Disclaimers

⚠️ **Important Warnings**:

- These tools are for research and backtesting only
- Past performance does not guarantee future results
- HFT requires sophisticated infrastructure
- Always validate strategies extensively before live trading
- Use paper trading first
- Start with small position sizes
- Monitor live performance continuously

## Requirements

- Node.js >= 20
- Python >= 3.9
- nautilus_trader >= 1.199.0
- optuna >= 4.1.0

## License

See main gemini-cli LICENSE

## Contributing

Contributions welcome! Please:
1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Submit PR with clear description

## Support

- Issues: GitHub Issues
- Documentation: `docs/` directory
- Examples: `src/dsl/templates/`

## Roadmap

- [ ] Live trading integration
- [ ] More signal types (machine learning, sentiment)
- [ ] Multi-asset portfolio optimization
- [ ] Real-time performance monitoring
- [ ] Strategy ensembles
- [ ] Walk-forward optimization
- [ ] Monte Carlo simulation
- [ ] Slippage modeling improvements

## Credits

Built on top of:
- [gemini-cli](https://github.com/google-gemini/gemini-cli)
- [NautilusTrader](https://github.com/nautechsystems/nautilus_trader)
- [Optuna](https://github.com/optuna/optuna)
- [Model Context Protocol](https://github.com/modelcontextprotocol)
