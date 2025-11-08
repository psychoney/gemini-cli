/**
 * Evolver Agent
 *
 * Implements genetic algorithm for strategy evolution
 */

import { BaseAgent, type AgentConfig, type AgentResult } from './base.js';
import { EvaluatorAgent, type PerformanceMetrics } from './evaluator.js';
import { TunerAgent } from './tuner.js';
import type { Strategy, SearchSpace } from '../dsl/schema.js';

export interface EvolverConfig extends AgentConfig {
  populationSize?: number;
  generations?: number;
  selectionRate?: number;
  mutationRate?: number;
  crossoverRate?: number;
  elitism?: number;
}

export interface EvolverInput {
  baseStrategy: Strategy;
  searchSpace?: SearchSpace;
  fitnessMetric?: 'sharpeRatio' | 'sortinoRatio' | 'profitFactor';
  dataConfig?: any;
}

export interface Individual {
  strategy: Strategy;
  fitness?: number;
  metrics?: PerformanceMetrics;
  generation: number;
}

export interface GenerationResult {
  generation: number;
  population: Individual[];
  bestFitness: number;
  avgFitness: number;
  bestIndividual: Individual;
}

export interface EvolverOutput {
  bestStrategy: Strategy;
  bestFitness: number;
  bestMetrics: PerformanceMetrics;
  evolutionHistory: GenerationResult[];
  finalPopulation: Individual[];
  statistics: {
    totalGenerations: number;
    totalEvaluations: number;
    improvementRate: number;
    convergenceGeneration?: number;
  };
}

export class EvolverAgent extends BaseAgent {
  private evolverConfig: EvolverConfig;
  private evaluator: EvaluatorAgent;
  private tuner: TunerAgent;

  constructor(config: EvolverConfig = {}) {
    super(config);
    this.evolverConfig = {
      populationSize: 10,
      generations: 5,
      selectionRate: 0.3,
      mutationRate: 0.3,
      crossoverRate: 0.5,
      elitism: 1,
      ...config,
    };
    this.evaluator = new EvaluatorAgent({ verbose: config.verbose });
    this.tuner = new TunerAgent({ verbose: config.verbose });
  }

  protected validate(input: EvolverInput): boolean {
    if (!input.baseStrategy) {
      this.log('Base strategy is required', 'error');
      return false;
    }
    return true;
  }

  async execute(input: EvolverInput): Promise<AgentResult> {
    if (!this.validate(input)) {
      return {
        success: false,
        error: 'Validation failed',
      };
    }

    const startTime = Date.now();
    const fitnessMetric = input.fitnessMetric || 'sharpeRatio';

    this.log(`Starting evolution with ${this.evolverConfig.generations} generations`);
    this.log(`Population size: ${this.evolverConfig.populationSize}`);

    try {
      // Initialize population
      let population = await this.initializePopulation(input);
      const evolutionHistory: GenerationResult[] = [];

      // Evolve over generations
      for (let gen = 1; gen <= (this.evolverConfig.generations || 5); gen++) {
        this.log(`\n=== Generation ${gen} ===`);

        // Evaluate fitness
        population = await this.evaluatePopulation(population, fitnessMetric, input.dataConfig);

        // Sort by fitness
        population.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));

        // Record generation results
        const genResult = this.recordGeneration(gen, population);
        evolutionHistory.push(genResult);

        this.log(`Best fitness: ${genResult.bestFitness.toFixed(4)}`);
        this.log(`Avg fitness: ${genResult.avgFitness.toFixed(4)}`);

        // Check for convergence
        if (this.hasConverged(evolutionHistory)) {
          this.log('Population has converged');
          break;
        }

        // Generate next generation
        if (gen < (this.evolverConfig.generations || 5)) {
          population = await this.generateNextGeneration(population, gen + 1);
        }
      }

      const bestIndividual = evolutionHistory[evolutionHistory.length - 1].bestIndividual;
      const duration = Date.now() - startTime;

      this.log(`\nEvolution completed in ${this.formatDuration(duration)}`);
      this.log(`Best fitness achieved: ${bestIndividual.fitness?.toFixed(4)}`);

      return {
        success: true,
        data: {
          bestStrategy: bestIndividual.strategy,
          bestFitness: bestIndividual.fitness,
          bestMetrics: bestIndividual.metrics,
          evolutionHistory,
          finalPopulation: population,
          statistics: this.calculateStatistics(evolutionHistory),
        } as EvolverOutput,
        metadata: {
          duration,
          generations: evolutionHistory.length,
        },
      };
    } catch (error) {
      this.log(`Evolution failed: ${error}`, 'error');
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Initialize population with diverse strategies
   */
  private async initializePopulation(input: EvolverInput): Promise<Individual[]> {
    this.log('Initializing population');

    const population: Individual[] = [];
    const baseStrategy = input.baseStrategy;

    // Add base strategy as first individual
    population.push({
      strategy: this.deepClone(baseStrategy),
      generation: 1,
    });

    // Generate variations
    for (let i = 1; i < (this.evolverConfig.populationSize || 10); i++) {
      const variant = this.createVariant(baseStrategy, i);
      population.push({
        strategy: variant,
        generation: 1,
      });
    }

    return population;
  }

  /**
   * Create a variant of the base strategy
   */
  private createVariant(baseStrategy: Strategy, seed: number): Strategy {
    const variant = this.deepClone(baseStrategy);
    variant.metadata.name = `${baseStrategy.metadata.name}_var${seed}`;

    // Apply random mutations to parameters
    if (variant.signals && variant.signals.length > 0) {
      const signal = variant.signals[0];
      if (signal.params) {
        for (const [key, value] of Object.entries(signal.params)) {
          if (typeof value === 'number') {
            // Mutate number by ±20%
            const mutation = 0.8 + Math.random() * 0.4;
            signal.params[key] = value * mutation;
          }
        }
      }
    }

    // Mutate exit parameters
    if (variant.exit) {
      const slMutation = 0.8 + Math.random() * 0.4;
      const tpMutation = 0.8 + Math.random() * 0.4;
      variant.exit.stopLoss.value *= slMutation;
      variant.exit.takeProfit.value *= tpMutation;
    }

    return variant;
  }

  /**
   * Evaluate fitness for all individuals
   */
  private async evaluatePopulation(
    population: Individual[],
    fitnessMetric: string,
    dataConfig: any
  ): Promise<Individual[]> {
    this.log(`Evaluating ${population.length} individuals`);

    for (let i = 0; i < population.length; i++) {
      if (population[i].fitness !== undefined) {
        continue; // Already evaluated
      }

      const result = await this.evaluator.execute({
        strategy: population[i].strategy,
        dataConfig,
      });

      if (result.success && result.data) {
        const metrics = result.data.performance;
        population[i].metrics = metrics;
        population[i].fitness = (metrics as any)[fitnessMetric] || 0;

        this.log(`Individual ${i + 1}: fitness = ${population[i].fitness?.toFixed(4)}`);
      } else {
        this.log(`Individual ${i + 1}: evaluation failed`, 'warn');
        population[i].fitness = 0;
      }
    }

    return population;
  }

  /**
   * Record generation results
   */
  private recordGeneration(gen: number, population: Individual[]): GenerationResult {
    const fitnesses = population.map((ind) => ind.fitness || 0);
    const bestFitness = Math.max(...fitnesses);
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const bestIndividual = population[0]; // Already sorted

    return {
      generation: gen,
      population: this.deepClone(population),
      bestFitness,
      avgFitness,
      bestIndividual: this.deepClone(bestIndividual),
    };
  }

  /**
   * Check if population has converged
   */
  private hasConverged(history: GenerationResult[]): boolean {
    if (history.length < 3) return false;

    const recent = history.slice(-3);
    const fitnessValues = recent.map((r) => r.bestFitness);
    const variance = this.calculateVariance(fitnessValues);

    return variance < 0.01; // Fitness not improving
  }

  /**
   * Generate next generation using selection, crossover, and mutation
   */
  private async generateNextGeneration(
    currentPopulation: Individual[],
    nextGen: number
  ): Promise<Individual[]> {
    this.log('Generating next generation');

    const nextPopulation: Individual[] = [];
    const selectionSize = Math.floor(
      (this.evolverConfig.populationSize || 10) * (this.evolverConfig.selectionRate || 0.3)
    );

    // Elitism: Keep top performers
    const eliteCount = this.evolverConfig.elitism || 1;
    for (let i = 0; i < eliteCount; i++) {
      const elite = this.deepClone(currentPopulation[i]);
      elite.generation = nextGen;
      nextPopulation.push(elite);
    }

    // Selection pool (top performers)
    const selectionPool = currentPopulation.slice(0, selectionSize);

    // Generate offspring
    while (nextPopulation.length < (this.evolverConfig.populationSize || 10)) {
      if (Math.random() < (this.evolverConfig.crossoverRate || 0.5) && selectionPool.length >= 2) {
        // Crossover
        const parent1 = this.selectParent(selectionPool);
        const parent2 = this.selectParent(selectionPool);
        const offspring = this.crossover(parent1, parent2);
        offspring.generation = nextGen;
        nextPopulation.push(offspring);
      } else {
        // Mutation
        const parent = this.selectParent(selectionPool);
        const mutant = this.mutate(parent);
        mutant.generation = nextGen;
        nextPopulation.push(mutant);
      }
    }

    return nextPopulation;
  }

  /**
   * Select parent using tournament selection
   */
  private selectParent(pool: Individual[]): Individual {
    const tournamentSize = 3;
    const tournament = [];

    for (let i = 0; i < tournamentSize && i < pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      tournament.push(pool[idx]);
    }

    tournament.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
    return tournament[0];
  }

  /**
   * Crossover two parent strategies
   */
  private crossover(parent1: Individual, parent2: Individual): Individual {
    const offspring = this.deepClone(parent1);
    offspring.strategy.metadata.name = `${parent1.strategy.metadata.name}_x_${parent2.strategy.metadata.name}`;
    offspring.fitness = undefined; // Needs re-evaluation

    // Crossover signal parameters
    if (offspring.strategy.signals && parent2.strategy.signals) {
      offspring.strategy.signals.forEach((signal, idx) => {
        if (parent2.strategy.signals[idx] && signal.params && parent2.strategy.signals[idx].params) {
          for (const key in signal.params) {
            if (Math.random() < 0.5 && parent2.strategy.signals[idx].params[key] !== undefined) {
              signal.params[key] = parent2.strategy.signals[idx].params[key];
            }
          }
        }
      });
    }

    // Crossover exit parameters
    if (Math.random() < 0.5 && parent2.strategy.exit) {
      offspring.strategy.exit.stopLoss = this.deepClone(parent2.strategy.exit.stopLoss);
    }
    if (Math.random() < 0.5 && parent2.strategy.exit) {
      offspring.strategy.exit.takeProfit = this.deepClone(parent2.strategy.exit.takeProfit);
    }

    return offspring;
  }

  /**
   * Mutate a strategy
   */
  private mutate(parent: Individual): Individual {
    const mutant = this.deepClone(parent);
    mutant.strategy.metadata.name = `${parent.strategy.metadata.name}_mut`;
    mutant.fitness = undefined; // Needs re-evaluation

    const mutationRate = this.evolverConfig.mutationRate || 0.3;

    // Mutate signal parameters
    if (mutant.strategy.signals) {
      mutant.strategy.signals.forEach((signal) => {
        if (signal.params) {
          for (const [key, value] of Object.entries(signal.params)) {
            if (Math.random() < mutationRate && typeof value === 'number') {
              const mutation = 0.9 + Math.random() * 0.2; // ±10%
              signal.params[key] = value * mutation;
            }
          }
        }
      });
    }

    // Mutate exit parameters
    if (Math.random() < mutationRate && mutant.strategy.exit) {
      const slMutation = 0.9 + Math.random() * 0.2;
      mutant.strategy.exit.stopLoss.value *= slMutation;
    }
    if (Math.random() < mutationRate && mutant.strategy.exit) {
      const tpMutation = 0.9 + Math.random() * 0.2;
      mutant.strategy.exit.takeProfit.value *= tpMutation;
    }

    return mutant;
  }

  /**
   * Calculate evolution statistics
   */
  private calculateStatistics(history: GenerationResult[]): EvolverOutput['statistics'] {
    const initialFitness = history[0].bestFitness;
    const finalFitness = history[history.length - 1].bestFitness;
    const improvementRate = ((finalFitness - initialFitness) / initialFitness) * 100;

    // Find convergence generation
    let convergenceGeneration: number | undefined;
    for (let i = history.length - 1; i >= 2; i--) {
      const recent = history.slice(i - 2, i + 1);
      const fitnessValues = recent.map((r) => r.bestFitness);
      const variance = this.calculateVariance(fitnessValues);

      if (variance >= 0.01) {
        convergenceGeneration = i + 1;
        break;
      }
    }

    return {
      totalGenerations: history.length,
      totalEvaluations: history.reduce((sum, gen) => sum + gen.population.length, 0),
      improvementRate,
      convergenceGeneration,
    };
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return variance;
  }
}
