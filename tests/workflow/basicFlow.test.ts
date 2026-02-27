import { describe, it, expect } from 'vitest';
import { WorkflowExecutor } from '../../src/features/workflow/executor/WorkflowExecutor';
import type { ExecutionNode } from '../../src/features/workflow/executor/WorkflowExecutor';

describe('WorkflowExecutor - Basic Flow', () => {
  it('should execute a simple two-node workflow', async () => {
    const nodes: ExecutionNode[] = [
      {
        id: 'node-1',
        type: 'input',
        config: { defaultValue: { message: 'hello' } },
      },
      {
        id: 'node-2',
        type: 'output',
        dependencies: ['node-1'],
      },
    ];

    const edges = [
      { source: 'node-1', target: 'node-2' },
    ];

    const executor = new WorkflowExecutor({ nodes, edges });
    const result = await executor.execute();

    expect(result.success).toBe(true);
    expect(result.nodeResults).toHaveProperty('node-1');
    expect(result.nodeResults).toHaveProperty('node-2');
    expect(result.executionPath).toContain('node-1');
    expect(result.executionPath).toContain('node-2');
  });

  it('should execute nodes in dependency order', async () => {
    const executionOrder: string[] = [];

    const nodes: ExecutionNode[] = [
      { id: 'A', type: 'input', config: { defaultValue: 1 } },
      { id: 'B', type: 'data-transform', config: { transformType: 'map' }, dependencies: ['A'] },
      { id: 'C', type: 'output', dependencies: ['B'] },
    ];

    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
    ];

    const executor = new WorkflowExecutor({
      nodes,
      edges,
      onNodeExecution: (nodeId, status) => {
        if (status === 'completed') executionOrder.push(nodeId);
      },
    });

    const result = await executor.execute();

    expect(result.success).toBe(true);
    expect(executionOrder).toEqual(['A', 'B', 'C']);
  });
});
