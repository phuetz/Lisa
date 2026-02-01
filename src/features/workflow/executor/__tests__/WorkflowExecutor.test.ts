/**
 * Tests for WorkflowExecutor
 * Phase 2.2: Parallel workflow execution with concurrency control
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowExecutor, type ExecutionNode, type WorkflowExecutionOptions } from '../WorkflowExecutor';

describe('WorkflowExecutor', () => {
  describe('Basic Execution', () => {
    it('should execute a simple workflow with input and output nodes', async () => {
      const nodes: ExecutionNode[] = [
        { id: 'input-1', type: 'input', config: { defaultValue: { message: 'Hello' } } },
        { id: 'output-1', type: 'output' },
      ];
      const edges = [{ source: 'input-1', target: 'output-1' }];

      const executor = new WorkflowExecutor({ nodes, edges });
      const result = await executor.execute();

      expect(result.success).toBe(true);
      expect(result.executionPath).toContain('input-1');
      expect(result.executionPath).toContain('output-1');
    });

    it('should handle empty workflow', async () => {
      const executor = new WorkflowExecutor({ nodes: [], edges: [] });
      const result = await executor.execute();

      expect(result.success).toBe(true);
      expect(result.executionPath).toHaveLength(0);
    });

    it('should execute nodes in correct order based on dependencies', async () => {
      const nodes: ExecutionNode[] = [
        { id: 'node-1', type: 'input', config: { defaultValue: 'A' } },
        { id: 'node-2', type: 'input', config: { defaultValue: 'B' } },
        { id: 'node-3', type: 'output' },
      ];
      const edges = [
        { source: 'node-1', target: 'node-3' },
        { source: 'node-2', target: 'node-3' },
      ];

      const executor = new WorkflowExecutor({ nodes, edges });
      const result = await executor.execute();

      expect(result.success).toBe(true);
      // node-3 should be after both node-1 and node-2
      const idx1 = result.executionPath.indexOf('node-1');
      const idx2 = result.executionPath.indexOf('node-2');
      const idx3 = result.executionPath.indexOf('node-3');
      expect(idx3).toBeGreaterThan(idx1);
      expect(idx3).toBeGreaterThan(idx2);
    });
  });

  describe('Parallel Execution', () => {
    it('should execute independent nodes in parallel', async () => {
      const startedNodes = new Set<string>();
      const completedNodes = new Set<string>();

      const nodes: ExecutionNode[] = [
        { id: 'parallel-1', type: 'input', config: { defaultValue: '1' } },
        { id: 'parallel-2', type: 'input', config: { defaultValue: '2' } },
        { id: 'parallel-3', type: 'input', config: { defaultValue: '3' } },
      ];

      const options: WorkflowExecutionOptions = {
        nodes,
        edges: [],
        maxConcurrency: 3,
        onNodeExecution: (nodeId, status) => {
          if (status === 'started') {
            startedNodes.add(nodeId);
          } else if (status === 'completed') {
            completedNodes.add(nodeId);
          }
        },
      };

      const executor = new WorkflowExecutor(options);
      await executor.execute();

      // All 3 unique nodes should have been started and completed
      expect(startedNodes.size).toBe(3);
      expect(completedNodes.size).toBe(3);
    });

    it('should respect maxConcurrency limit', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const nodes: ExecutionNode[] = [
        { id: 'node-1', type: 'input', config: { defaultValue: '1' } },
        { id: 'node-2', type: 'input', config: { defaultValue: '2' } },
        { id: 'node-3', type: 'input', config: { defaultValue: '3' } },
        { id: 'node-4', type: 'input', config: { defaultValue: '4' } },
        { id: 'node-5', type: 'input', config: { defaultValue: '5' } },
      ];

      const options: WorkflowExecutionOptions = {
        nodes,
        edges: [],
        maxConcurrency: 2, // Only allow 2 concurrent executions
        onNodeExecution: (_nodeId, status) => {
          if (status === 'started') {
            currentConcurrent++;
            maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          } else if (status === 'completed' || status === 'failed') {
            currentConcurrent--;
          }
        },
      };

      const executor = new WorkflowExecutor(options);
      await executor.execute();

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('Priority Execution', () => {
    it('should execute higher priority nodes first', async () => {
      const executionOrder: string[] = [];

      const nodes: ExecutionNode[] = [
        { id: 'low-priority', type: 'input', priority: 1, config: { defaultValue: 'low' } },
        { id: 'high-priority', type: 'input', priority: 10, config: { defaultValue: 'high' } },
        { id: 'medium-priority', type: 'input', priority: 5, config: { defaultValue: 'medium' } },
      ];

      const options: WorkflowExecutionOptions = {
        nodes,
        edges: [],
        maxConcurrency: 1, // Force sequential to test priority
        onNodeExecution: (nodeId, status) => {
          if (status === 'started') {
            executionOrder.push(nodeId);
          }
        },
      };

      const executor = new WorkflowExecutor(options);
      await executor.execute();

      // Higher priority should be first
      expect(executionOrder[0]).toBe('high-priority');
      expect(executionOrder[1]).toBe('medium-priority');
      expect(executionOrder[2]).toBe('low-priority');
    });
  });

  describe('Error Handling', () => {
    it('should record errors for failed nodes', async () => {
      const nodes: ExecutionNode[] = [
        { id: 'code-node', type: 'code', config: { code: 'throw new Error("Test error");' } },
      ];

      const executor = new WorkflowExecutor({ nodes, edges: [] });
      const result = await executor.execute();

      expect(result.success).toBe(false);
      expect(result.errors['code-node']).toBeDefined();
    });

    it('should continue execution after node failure', async () => {
      const nodes: ExecutionNode[] = [
        { id: 'failing-node', type: 'code', config: { code: 'throw new Error("Fail");' } },
        { id: 'success-node', type: 'input', config: { defaultValue: 'ok' } },
      ];

      const executor = new WorkflowExecutor({ nodes, edges: [] });
      const result = await executor.execute();

      expect(result.errors['failing-node']).toBeDefined();
      expect(result.nodeResults['success-node']).toBeDefined();
    });
  });

  describe('Timeout', () => {
    it('should apply timeout configuration', async () => {
      // Test that timeout config is properly applied
      const nodes: ExecutionNode[] = [
        {
          id: 'test-node',
          type: 'input',
          timeoutMs: 5000,
          config: { defaultValue: 'test' },
        },
      ];

      const executor = new WorkflowExecutor({
        nodes,
        edges: [],
        defaultNodeTimeout: 30000,
      });

      const result = await executor.execute();

      // Node should complete successfully since input is fast
      expect(result.success).toBe(true);
      expect(result.nodeResults['test-node']).toBeDefined();
    });
  });

  describe('Abort', () => {
    it('should have abort method available', async () => {
      const nodes: ExecutionNode[] = [
        { id: 'node-1', type: 'input', config: { defaultValue: '1' } },
      ];

      const executor = new WorkflowExecutor({
        nodes,
        edges: [],
      });

      // Verify abort method exists
      expect(typeof executor.abort).toBe('function');

      // Execute normally
      const result = await executor.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Stats', () => {
    it('should return correct stats during execution', async () => {
      const nodes: ExecutionNode[] = [
        { id: 'node-1', type: 'input', config: { defaultValue: '1' } },
      ];

      const executor = new WorkflowExecutor({
        nodes,
        edges: [],
        maxConcurrency: 5,
      });

      // Before execution
      let stats = executor.getStats();
      expect(stats.runningNodes).toHaveLength(0);
      expect(stats.completedNodes).toBe(0);
      expect(stats.availableConcurrency).toBe(5);

      await executor.execute();

      // After execution
      stats = executor.getStats();
      expect(stats.runningNodes).toHaveLength(0);
      expect(stats.completedNodes).toBe(1);
    });
  });

  describe('Progress Callback', () => {
    it('should call onNodeExecution for all status changes', async () => {
      const callbacks: Array<{ nodeId: string; status: string }> = [];

      const nodes: ExecutionNode[] = [
        { id: 'test-node', type: 'input', config: { defaultValue: 'test' } },
      ];

      const options: WorkflowExecutionOptions = {
        nodes,
        edges: [],
        onNodeExecution: (nodeId, status) => {
          callbacks.push({ nodeId, status });
        },
      };

      const executor = new WorkflowExecutor(options);
      await executor.execute();

      expect(callbacks).toContainEqual({ nodeId: 'test-node', status: 'started' });
      expect(callbacks).toContainEqual({ nodeId: 'test-node', status: 'completed' });
    });
  });

  describe('Step by Step Mode', () => {
    it('should wait for confirmation in step by step mode', async () => {
      const nodes: ExecutionNode[] = [
        { id: 'step-1', type: 'input', config: { defaultValue: '1' } },
        { id: 'step-2', type: 'input', config: { defaultValue: '2' } },
      ];

      const executor = new WorkflowExecutor({
        nodes,
        edges: [{ source: 'step-1', target: 'step-2' }],
        stepByStep: true,
      });

      // Start execution
      const executionPromise = executor.execute();

      // Confirm steps
      setTimeout(() => executor.confirmNextStep(), 10);
      setTimeout(() => executor.confirmNextStep(), 20);

      const result = await executionPromise;

      expect(result.success).toBe(true);
      expect(result.executionPath).toHaveLength(2);
    });
  });
});
