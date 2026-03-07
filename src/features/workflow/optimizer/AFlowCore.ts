/**
 * @file AFlow Core — Monte Carlo Tree Search (MCTS) workflow optimizer
 * with MCTSr Q-value formula from arXiv 2406.07394.
 *
 * Supports:
 *  - MCTSr Q-value: Q(a) = 0.5 * (min(R) + mean(R))
 *  - Parallelism analysis for independent workflow nodes
 *  - Timeout suggestions based on historical execution data (p95 * 2)
 *  - Configurable optimization via OptimizationConfig
 *  - Advanced optimization returning detailed OptimizationResult
 *  - Full backward compatibility with the original run() API
 */

import type { WorkflowJSON, OptimizationObjective, WorkflowStep } from '../../agents/implementations/AFlowOptimizerAgent';

// ============================================================================
// Types
// ============================================================================

/** Configuration for the MCTS optimization process. */
export interface OptimizationConfig {
  /** Number of MCTS iterations (default: 50) */
  iterations: number;
  /** Exploration constant for UCB1 (default: 1.414) */
  explorationConstant: number;
  /** Maximum number of parallel step groups to consider (default: 4) */
  maxParallelism: number;
  /** Available model identifiers for AI-driven steps */
  availableModels: string[];
}

/** Result returned by the advanced optimization. */
export interface AFlowOptimizationResult {
  /** The best workflow state found */
  bestState: WorkflowJSON;
  /** The sequence of steps leading to the best state */
  bestSteps: WorkflowStep[];
  /** The MCTSr Q-value score of the best configuration */
  score: number;
  /** Total iterations executed */
  iterations: number;
  /** Log of score improvements during the search */
  improvements: string[];
  /** Top-ranked configurations found (up to 5) */
  allConfigs: Array<{ state: WorkflowJSON; steps: WorkflowStep[]; score: number }>;
}

/** Historical execution result for a single workflow step. */
export interface StepExecutionRecord {
  /** The node ID of the executed step */
  nodeId: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Whether the step succeeded */
  success: boolean;
}

/** Parallelism opportunity identified in the workflow. */
export interface ParallelGroup {
  /** IDs of nodes that can run in parallel */
  group: string[];
  /** Human-readable reason */
  reason: string;
}

const DEFAULT_CONFIG: OptimizationConfig = {
  iterations: 50,
  explorationConstant: 1.414,
  maxParallelism: 4,
  availableModels: [],
};

// ============================================================================
// MCTS Node with MCTSr Q-value tracking
// ============================================================================

/**
 * Represents a node in the MCTS search tree.
 * Each node corresponds to a specific state of the workflow.
 * Tracks reward statistics for the MCTSr Q-value formula.
 */
class MCTSNode {
  state: WorkflowJSON;
  parent: MCTSNode | null;
  children: MCTSNode[] = [];
  visits = 0;
  value = 0;
  action: WorkflowStep | null;

  /** Minimum reward observed across all rollouts through this node (for MCTSr) */
  minReward = Infinity;
  /** Cumulative sum of rewards (for mean calculation) */
  rewardSum = 0;
  /** Number of rewards recorded */
  rewardCount = 0;

  constructor(state: WorkflowJSON, parent: MCTSNode | null = null, action: WorkflowStep | null = null) {
    this.state = state;
    this.parent = parent;
    this.action = action;
  }

  /**
   * Computes the MCTSr Q-value: Q(a) = 0.5 * (min(R) + mean(R))
   * Returns 0 if no rewards have been recorded yet.
   */
  qValue(): number {
    if (this.rewardCount === 0) return 0;
    const meanReward = this.rewardSum / this.rewardCount;
    return 0.5 * (this.minReward + meanReward);
  }

  /**
   * Selects the most promising child node using UCB1 with MCTSr Q-value.
   * Falls back to simple value/visits when no MCTSr data is available.
   */
  selectBestChild(explorationParam = 1.414): MCTSNode | null {
    let bestScore = -Infinity;
    let bestChild: MCTSNode | null = null;

    for (const child of this.children) {
      if (child.visits === 0) return child; // prioritize unexplored

      // Use MCTSr Q-value when reward data is available, otherwise fall back
      const exploitation = child.rewardCount > 0
        ? child.qValue()
        : child.value / child.visits;

      const exploration = explorationParam * Math.sqrt(Math.log(this.visits) / child.visits);
      const ucb = exploitation + exploration;

      if (ucb > bestScore) {
        bestScore = ucb;
        bestChild = child;
      }
    }
    return bestChild;
  }
}

// ============================================================================
// AFlowCore — the main optimizer class
// ============================================================================

/**
 * The core MCTS engine for optimizing workflows.
 *
 * Backward-compatible: the original `run(iterations)` API is preserved.
 * New consumers can use `runAdvanced(config?)` for richer results, or
 * call `analyzeParallelism()` / `suggestTimeouts()` independently.
 */
export class AFlowCore {
  private root: MCTSNode;
  private objective: OptimizationObjective;
  private availableOperators: string[];
  private config: OptimizationConfig;

  constructor(
    initialState: WorkflowJSON,
    objective: OptimizationObjective,
    availableOperators: string[],
    config?: Partial<OptimizationConfig>,
  ) {
    this.root = new MCTSNode(initialState);
    this.objective = objective;
    this.availableOperators = availableOperators;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Original API (backward-compatible)
  // --------------------------------------------------------------------------

  /**
   * Runs the MCTS algorithm for a specified number of iterations.
   * @param iterations - The number of simulations to run.
   * @returns The best sequence of steps found to optimize the workflow.
   */
  run(iterations: number): WorkflowStep[] {
    for (let i = 0; i < iterations; i++) {
      // 1. Selection
      let node = this.select(this.root);

      // 2. Expansion
      if (!this.isTerminal(node)) {
        node = this.expand(node);
      }

      // 3. Simulation
      const reward = this.simulate(node.state);

      // 4. Backpropagation (now tracks MCTSr statistics)
      this.backpropagate(node, reward);
    }

    return this.getBestPath(this.root);
  }

  // --------------------------------------------------------------------------
  // Advanced API
  // --------------------------------------------------------------------------

  /**
   * Runs an advanced MCTS optimization, returning a detailed result object
   * including the best configuration, score improvements, and top alternatives.
   *
   * @param configOverride - Optional overrides for the optimization config.
   * @returns A detailed optimization result.
   */
  runAdvanced(configOverride?: Partial<OptimizationConfig>): AFlowOptimizationResult {
    const cfg = { ...this.config, ...configOverride };
    const iterations = cfg.iterations;

    // Reset root for a fresh run
    this.root = new MCTSNode(this.root.state);
    this.config = cfg;

    const improvements: string[] = [];
    let bestScore = -Infinity;
    let bestNode = this.root;

    for (let i = 0; i < iterations; i++) {
      let node = this.select(this.root);

      if (!this.isTerminal(node)) {
        node = this.expand(node);
      }

      const reward = this.simulate(node.state);
      this.backpropagate(node, reward);

      if (reward > bestScore) {
        bestScore = reward;
        bestNode = node;
        improvements.push(
          `Iteration ${i + 1}: score ${reward.toFixed(3)}`
        );
      }
    }

    // Collect and rank all leaf configs by MCTSr Q-value
    const allConfigs = this.collectLeafConfigs(this.root)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      bestState: bestNode.state,
      bestSteps: this.getBestPath(this.root),
      score: bestScore,
      iterations,
      improvements,
      allConfigs,
    };
  }

  /**
   * Analyzes the workflow to identify parallelism opportunities.
   * Finds pairs of nodes with no direct or transitive dependency.
   */
  analyzeParallelism(): ParallelGroup[] {
    const state = this.root.state;
    const groups: ParallelGroup[] = [];

    // Build adjacency (dependsOn) from edges: target depends on source
    const dependsOn = new Map<string, Set<string>>();
    for (const node of state.nodes) {
      dependsOn.set(node.id, new Set());
    }
    for (const edge of state.edges) {
      const deps = dependsOn.get(edge.target);
      if (deps) {
        deps.add(edge.source);
      }
    }

    // Check all pairs
    for (let i = 0; i < state.nodes.length; i++) {
      for (let j = i + 1; j < state.nodes.length; j++) {
        const a = state.nodes[i];
        const b = state.nodes[j];

        const aDepsOnB = this.hasTransitiveDep(a.id, b.id, dependsOn);
        const bDepsOnA = this.hasTransitiveDep(b.id, a.id, dependsOn);

        if (!aDepsOnB && !bDepsOnA) {
          groups.push({
            group: [a.id, b.id],
            reason: `Nodes "${a.id}" and "${b.id}" have no dependency relationship`,
          });
        }
      }
    }

    // Respect maxParallelism by trimming
    return groups.slice(0, this.config.maxParallelism);
  }

  /**
   * Suggests timeout values for each workflow node based on historical results.
   * Uses p95 latency * 2 with a minimum of 5000ms.
   *
   * @param historicalResults - Array of past execution records per step.
   * @returns A map of node ID to suggested timeout in milliseconds.
   */
  suggestTimeouts(historicalResults: StepExecutionRecord[]): Map<string, number> {
    const suggestions = new Map<string, number>();
    const durationsByNode = new Map<string, number[]>();

    // Group durations by node
    for (const record of historicalResults) {
      const durations = durationsByNode.get(record.nodeId) || [];
      durations.push(record.duration);
      durationsByNode.set(record.nodeId, durations);
    }

    // Suggest timeout = p95 * 2 (min 5000ms)
    for (const node of this.root.state.nodes) {
      const durations = durationsByNode.get(node.id);
      if (durations && durations.length >= 3) {
        const sorted = [...durations].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        const p95 = sorted[Math.min(p95Index, sorted.length - 1)];
        const suggested = Math.max(5000, Math.ceil(p95 * 2));
        suggestions.set(node.id, suggested);
      } else {
        // Not enough data — use 30s default
        suggestions.set(node.id, 30_000);
      }
    }

    return suggestions;
  }

  // --------------------------------------------------------------------------
  // MCTS internals
  // --------------------------------------------------------------------------

  private select(node: MCTSNode): MCTSNode {
    while (node.children.length > 0 && !this.isTerminal(node)) {
      node = node.selectBestChild(this.config.explorationConstant)!;
    }
    return node;
  }

  private expand(node: MCTSNode): MCTSNode {
    // Generate a child for each available operator that hasn't been tried yet
    const existingOperators = new Set(node.children.map(c => c.action?.operator));
    const operatorToTry = this.availableOperators.find(
      op => !existingOperators.has(op as WorkflowStep['operator'])
    ) || this.availableOperators[0];

    const action: WorkflowStep = {
      operator: 'add',
      node: { id: `new-node-${node.children.length}`, type: operatorToTry },
    };
    const newState = this.applyAction(node.state, action);
    const childNode = new MCTSNode(newState, node, action);
    node.children.push(childNode);
    return childNode;
  }

  private simulate(state: WorkflowJSON): number {
    // Heuristic evaluation based on the optimization objective
    let score = 0;
    if (this.objective.passRate) {
      score += state.nodes.length * 0.1 * this.objective.passRate;
    }
    if (this.objective.tokenCost) {
      score -= state.nodes.length * 0.05 * this.objective.tokenCost;
    }
    return score;
  }

  /**
   * Backpropagates reward, updating MCTSr statistics at each ancestor.
   */
  private backpropagate(node: MCTSNode | null, reward: number): void {
    while (node) {
      node.visits++;
      node.value += reward;
      node.rewardSum += reward;
      node.rewardCount++;
      node.minReward = Math.min(node.minReward, reward);
      node = node.parent;
    }
  }

  private isTerminal(node: MCTSNode): boolean {
    return node.children.length >= this.availableOperators.length;
  }

  private applyAction(state: WorkflowJSON, action: WorkflowStep): WorkflowJSON {
    const newState: WorkflowJSON = JSON.parse(JSON.stringify(state));
    if (action.operator === 'add' && action.node) {
      newState.nodes.push(action.node);
    }
    return newState;
  }

  private getBestPath(root: MCTSNode): WorkflowStep[] {
    const path: WorkflowStep[] = [];
    let currentNode = root;
    while (currentNode.children.length > 0) {
      let bestChild: MCTSNode | null = null;
      let maxVisits = -1;
      for (const child of currentNode.children) {
        if (child.visits > maxVisits) {
          maxVisits = child.visits;
          bestChild = child;
        }
      }
      if (bestChild && bestChild.action) {
        path.push(bestChild.action);
        currentNode = bestChild;
      } else {
        break;
      }
    }
    return path;
  }

  /**
   * Collects all leaf-node configs with their MCTSr Q-value score.
   */
  private collectLeafConfigs(root: MCTSNode): Array<{ state: WorkflowJSON; steps: WorkflowStep[]; score: number }> {
    const results: Array<{ state: WorkflowJSON; steps: WorkflowStep[]; score: number }> = [];
    const stack: Array<{ node: MCTSNode; path: WorkflowStep[] }> = [{ node: root, path: [] }];

    while (stack.length > 0) {
      const { node, path } = stack.pop()!;
      const currentPath = node.action ? [...path, node.action] : path;

      if (node.children.length === 0 && node.visits > 0) {
        results.push({
          state: node.state,
          steps: currentPath,
          score: node.qValue(),
        });
      }

      for (const child of node.children) {
        stack.push({ node: child, path: currentPath });
      }
    }

    return results;
  }

  /**
   * Checks for transitive dependency: does `fromId` transitively depend on `toId`?
   */
  private hasTransitiveDep(
    fromId: string,
    toId: string,
    dependsOn: Map<string, Set<string>>,
  ): boolean {
    const visited = new Set<string>();
    const queue = [fromId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const deps = dependsOn.get(current);
      if (deps) {
        for (const dep of deps) {
          if (dep === toId) return true;
          queue.push(dep);
        }
      }
    }

    return false;
  }
}
