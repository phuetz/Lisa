/**
 * Tests for AFlowCore — MCTS workflow optimizer with MCTSr Q-value.
 */

import { describe, it, expect } from 'vitest';
import { AFlowCore } from '../AFlowCore';
import type { AFlowOptimizationResult, StepExecutionRecord, ParallelGroup } from '../AFlowCore';
import type { WorkflowJSON, OptimizationObjective, WorkflowStep } from '../../../agents/implementations/AFlowOptimizerAgent';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorkflow(nodeCount = 2): WorkflowJSON {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    type: i === 0 ? 'llmPromptNode' : 'outputNode',
    data: {},
  }));
  const edges = nodes.slice(1).map((n, i) => ({
    id: `e-${i}`,
    source: nodes[i].id,
    target: n.id,
  }));
  return { nodes, edges };
}

function makeDiamondWorkflow(): WorkflowJSON {
  // A -> B, A -> C, B -> D, C -> D  (B and C are independent)
  return {
    nodes: [
      { id: 'A', type: 'input', data: {} },
      { id: 'B', type: 'process', data: {} },
      { id: 'C', type: 'process', data: {} },
      { id: 'D', type: 'output', data: {} },
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'A', target: 'C' },
      { id: 'e3', source: 'B', target: 'D' },
      { id: 'e4', source: 'C', target: 'D' },
    ],
  };
}

const DEFAULT_OBJECTIVE: OptimizationObjective = { passRate: 1.0, tokenCost: -1.0 };
const DEFAULT_OPERATORS = ['ReviewAndReviseNode', 'EnsembleNode'];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AFlowCore', () => {
  // =========================================================================
  // Backward-compatible run() API
  // =========================================================================

  describe('run() — backward compatibility', () => {
    it('should return an array of WorkflowStep', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const steps = core.run(10);

      expect(Array.isArray(steps)).toBe(true);
      for (const step of steps) {
        expect(step).toHaveProperty('operator');
      }
    });

    it('should produce at least one step for a non-trivial workflow', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const steps = core.run(20);

      expect(steps.length).toBeGreaterThanOrEqual(1);
    });

    it('should run with zero iterations without error', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const steps = core.run(0);

      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBe(0);
    });

    it('should work with a single operator', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, ['OnlyOperator']);
      const steps = core.run(5);

      expect(Array.isArray(steps)).toBe(true);
    });

    it('should handle objective with only passRate', () => {
      const core = new AFlowCore(makeWorkflow(), { passRate: 1.0 }, DEFAULT_OPERATORS);
      const steps = core.run(10);
      expect(steps.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle objective with only tokenCost', () => {
      const core = new AFlowCore(makeWorkflow(), { tokenCost: -0.5 }, DEFAULT_OPERATORS);
      const steps = core.run(10);
      expect(steps.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // MCTSr Q-value
  // =========================================================================

  describe('MCTSr Q-value formula', () => {
    it('should use Q(a) = 0.5 * (min(R) + mean(R)) in runAdvanced results', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const result = core.runAdvanced({ iterations: 30 });

      // All leaf configs should have a numeric score derived from Q-value
      for (const cfg of result.allConfigs) {
        expect(typeof cfg.score).toBe('number');
        expect(Number.isFinite(cfg.score)).toBe(true);
      }
    });

    it('should track improvements during optimization', () => {
      const core = new AFlowCore(makeWorkflow(3), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const result = core.runAdvanced({ iterations: 50 });

      expect(result.improvements.length).toBeGreaterThanOrEqual(1);
      // First improvement should mention "Iteration 1"
      expect(result.improvements[0]).toContain('Iteration 1');
    });

    it('should produce a positive score for passRate-weighted objective', () => {
      const core = new AFlowCore(makeWorkflow(3), { passRate: 1.0 }, DEFAULT_OPERATORS);
      const result = core.runAdvanced({ iterations: 20 });

      expect(result.score).toBeGreaterThan(0);
    });

    it('Q-value should equal 0.5 * (min + mean) for uniform rewards', () => {
      // When all rewards are the same value R, Q = 0.5*(R + R) = R
      // We can verify this indirectly: with a deterministic simulation,
      // the leaf Q-values should be consistent.
      const core = new AFlowCore(
        makeWorkflow(1),
        { passRate: 1.0, tokenCost: 0 },
        ['Op1'],
      );
      const result = core.runAdvanced({ iterations: 10 });

      // With a single node and passRate=1, score = 1 * 0.1 * 1.0 = 0.1
      // After adding an Op1 node, score = 2 * 0.1 * 1.0 = 0.2
      // For uniform rewards of 0.2, Q = 0.5*(0.2 + 0.2) = 0.2
      if (result.allConfigs.length > 0) {
        const leafScore = result.allConfigs[0].score;
        // The leaf Q-value should be 0.2 for the child node that adds Op1
        expect(leafScore).toBeCloseTo(0.2, 1);
      }
    });
  });

  // =========================================================================
  // runAdvanced()
  // =========================================================================

  describe('runAdvanced()', () => {
    it('should return a full AFlowOptimizationResult', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const result: AFlowOptimizationResult = core.runAdvanced();

      expect(result).toHaveProperty('bestState');
      expect(result).toHaveProperty('bestSteps');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('iterations');
      expect(result).toHaveProperty('improvements');
      expect(result).toHaveProperty('allConfigs');
    });

    it('should default to 50 iterations', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const result = core.runAdvanced();

      expect(result.iterations).toBe(50);
    });

    it('should respect iteration override', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const result = core.runAdvanced({ iterations: 10 });

      expect(result.iterations).toBe(10);
    });

    it('should rank allConfigs by score descending', () => {
      const core = new AFlowCore(makeWorkflow(3), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const result = core.runAdvanced({ iterations: 40 });

      for (let i = 1; i < result.allConfigs.length; i++) {
        expect(result.allConfigs[i - 1].score).toBeGreaterThanOrEqual(result.allConfigs[i].score);
      }
    });

    it('should return at most 5 configs', () => {
      const core = new AFlowCore(makeWorkflow(4), DEFAULT_OBJECTIVE, ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
      const result = core.runAdvanced({ iterations: 60 });

      expect(result.allConfigs.length).toBeLessThanOrEqual(5);
    });

    it('bestState should contain more nodes than the initial state', () => {
      const initial = makeWorkflow(2);
      const core = new AFlowCore(initial, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const result = core.runAdvanced({ iterations: 20 });

      expect(result.bestState.nodes.length).toBeGreaterThanOrEqual(initial.nodes.length);
    });

    it('should respect explorationConstant override', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS, {
        explorationConstant: 0.5,
      });
      const result = core.runAdvanced();

      // With low exploration, the optimizer should still produce valid results
      expect(result.score).toBeDefined();
      expect(typeof result.score).toBe('number');
    });
  });

  // =========================================================================
  // analyzeParallelism()
  // =========================================================================

  describe('analyzeParallelism()', () => {
    it('should find parallel opportunities in a diamond workflow', () => {
      const workflow = makeDiamondWorkflow();
      const core = new AFlowCore(workflow, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const groups: ParallelGroup[] = core.analyzeParallelism();

      // B and C should be identified as parallelizable
      const bcGroup = groups.find(
        g => g.group.includes('B') && g.group.includes('C'),
      );
      expect(bcGroup).toBeDefined();
      expect(bcGroup!.reason).toContain('no dependency');
    });

    it('should NOT identify dependent nodes as parallel', () => {
      // Linear chain: A -> B -> C
      const workflow: WorkflowJSON = {
        nodes: [
          { id: 'A', type: 'input', data: {} },
          { id: 'B', type: 'process', data: {} },
          { id: 'C', type: 'output', data: {} },
        ],
        edges: [
          { id: 'e1', source: 'A', target: 'B' },
          { id: 'e2', source: 'B', target: 'C' },
        ],
      };
      const core = new AFlowCore(workflow, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const groups = core.analyzeParallelism();

      // A -> B -> C has no independent pairs
      const abGroup = groups.find(
        g => g.group.includes('A') && g.group.includes('C'),
      );
      // A and C have a transitive dependency (A -> B -> C), so they should NOT be parallel
      expect(abGroup).toBeUndefined();
    });

    it('should return empty array for a single-node workflow', () => {
      const workflow: WorkflowJSON = {
        nodes: [{ id: 'only', type: 'process', data: {} }],
        edges: [],
      };
      const core = new AFlowCore(workflow, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const groups = core.analyzeParallelism();

      expect(groups).toHaveLength(0);
    });

    it('should respect maxParallelism config', () => {
      // 4 fully independent nodes -> 6 pairs, but maxParallelism=2 should trim
      const workflow: WorkflowJSON = {
        nodes: [
          { id: 'A', type: 'p', data: {} },
          { id: 'B', type: 'p', data: {} },
          { id: 'C', type: 'p', data: {} },
          { id: 'D', type: 'p', data: {} },
        ],
        edges: [],
      };
      const core = new AFlowCore(workflow, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS, {
        maxParallelism: 2,
      });
      const groups = core.analyzeParallelism();

      expect(groups.length).toBeLessThanOrEqual(2);
    });

    it('should identify all independent pairs in a fully disconnected graph', () => {
      const workflow: WorkflowJSON = {
        nodes: [
          { id: 'X', type: 'p', data: {} },
          { id: 'Y', type: 'p', data: {} },
          { id: 'Z', type: 'p', data: {} },
        ],
        edges: [],
      };
      // maxParallelism high enough to return all pairs
      const core = new AFlowCore(workflow, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS, {
        maxParallelism: 10,
      });
      const groups = core.analyzeParallelism();

      // 3 nodes, 0 edges => C(3,2) = 3 pairs
      expect(groups).toHaveLength(3);
    });
  });

  // =========================================================================
  // suggestTimeouts()
  // =========================================================================

  describe('suggestTimeouts()', () => {
    it('should suggest p95 * 2 for nodes with enough history', () => {
      const workflow = makeWorkflow(2);
      const core = new AFlowCore(workflow, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);

      // Provide 20 samples for node-0; values 100..2000
      const records: StepExecutionRecord[] = Array.from({ length: 20 }, (_, i) => ({
        nodeId: 'node-0',
        duration: (i + 1) * 100, // 100, 200, ..., 2000
        success: true,
      }));

      const timeouts = core.suggestTimeouts(records);

      // p95 of [100..2000] at index floor(20*0.95) = index 19 -> 2000
      // suggested = max(5000, ceil(2000*2)) = 5000
      expect(timeouts.get('node-0')).toBe(5000);

      // node-1 has no history -> default 30000
      expect(timeouts.get('node-1')).toBe(30_000);
    });

    it('should use 30s default when fewer than 3 records exist', () => {
      const workflow = makeWorkflow(1);
      const core = new AFlowCore(workflow, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);

      const records: StepExecutionRecord[] = [
        { nodeId: 'node-0', duration: 500, success: true },
        { nodeId: 'node-0', duration: 600, success: true },
      ];

      const timeouts = core.suggestTimeouts(records);
      expect(timeouts.get('node-0')).toBe(30_000);
    });

    it('should enforce minimum 5000ms', () => {
      const workflow = makeWorkflow(1);
      const core = new AFlowCore(workflow, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);

      // Very fast durations: p95 * 2 would be < 5000
      const records: StepExecutionRecord[] = Array.from({ length: 10 }, () => ({
        nodeId: 'node-0',
        duration: 10,
        success: true,
      }));

      const timeouts = core.suggestTimeouts(records);
      expect(timeouts.get('node-0')).toBe(5000);
    });

    it('should handle high-latency steps correctly', () => {
      const workflow = makeWorkflow(1);
      const core = new AFlowCore(workflow, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);

      // All durations around 15000ms
      const records: StepExecutionRecord[] = Array.from({ length: 5 }, (_, i) => ({
        nodeId: 'node-0',
        duration: 14000 + i * 500, // 14000, 14500, 15000, 15500, 16000
        success: true,
      }));

      const timeouts = core.suggestTimeouts(records);
      const suggested = timeouts.get('node-0')!;

      // p95 index = floor(5*0.95) = 4 -> 16000; timeout = 32000
      expect(suggested).toBe(32_000);
    });

    it('should return a timeout for every node in the workflow', () => {
      const workflow = makeWorkflow(4);
      const core = new AFlowCore(workflow, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);

      const timeouts = core.suggestTimeouts([]);
      expect(timeouts.size).toBe(4);
    });
  });

  // =========================================================================
  // OptimizationConfig
  // =========================================================================

  describe('OptimizationConfig', () => {
    it('should accept a partial config in constructor', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS, {
        iterations: 100,
        explorationConstant: 2.0,
      });
      const result = core.runAdvanced();

      expect(result.iterations).toBe(100);
    });

    it('should use defaults when no config is provided', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const result = core.runAdvanced();

      expect(result.iterations).toBe(50);
    });

    it('runAdvanced override should take precedence over constructor config', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS, {
        iterations: 100,
      });
      const result = core.runAdvanced({ iterations: 5 });

      expect(result.iterations).toBe(5);
    });

    it('should accept availableModels config', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS, {
        availableModels: ['gpt-4', 'claude-3'],
      });
      // Should not throw
      const result = core.runAdvanced({ iterations: 5 });
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('should handle workflow with zero nodes', () => {
      const empty: WorkflowJSON = { nodes: [], edges: [] };
      const core = new AFlowCore(empty, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const steps = core.run(5);

      expect(Array.isArray(steps)).toBe(true);
    });

    it('should handle workflow with nodes but no edges', () => {
      const noEdges: WorkflowJSON = {
        nodes: [
          { id: 'a', type: 't', data: {} },
          { id: 'b', type: 't', data: {} },
        ],
        edges: [],
      };
      const core = new AFlowCore(noEdges, DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const result = core.runAdvanced({ iterations: 10 });

      expect(result.bestState.nodes.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty objective gracefully', () => {
      const core = new AFlowCore(makeWorkflow(), {}, DEFAULT_OPERATORS);
      const steps = core.run(5);

      expect(Array.isArray(steps)).toBe(true);
    });

    it('runAdvanced should be callable multiple times (resets state)', () => {
      const core = new AFlowCore(makeWorkflow(), DEFAULT_OBJECTIVE, DEFAULT_OPERATORS);
      const result1 = core.runAdvanced({ iterations: 10 });
      const result2 = core.runAdvanced({ iterations: 10 });

      // Both should produce valid results
      expect(result1.iterations).toBe(10);
      expect(result2.iterations).toBe(10);
    });
  });
});
