/**
 * Tests for CoordinatorAgent
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoordinatorAgent } from '../implementations/CoordinatorAgent';

// Mock dependencies using vi.hoisted
const mocks = vi.hoisted(() => ({
  getAgentAsync: vi.fn(),
  executeWithRetry: vi.fn(),
}));

// Mock agentRegistry
vi.mock('../core/registry', () => ({
  agentRegistry: {
    getAgentAsync: mocks.getAgentAsync,
  },
}));

// Mock resilientExecutor
vi.mock('../../../utils/resilience/ResilientExecutor', () => ({
  resilientExecutor: {
    executeWithRetry: mocks.executeWithRetry,
  },
}));

// Helper to parse execute result
function parseResult(result: { success: boolean; output: string }) {
  return JSON.parse(result.output);
}

describe('CoordinatorAgent', () => {
  let agent: CoordinatorAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new CoordinatorAgent();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('CoordinatorAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('parallèle');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe('planning');
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('parallel_execution');
      expect(agent.capabilities).toContain('dependency_management');
      expect(agent.capabilities).toContain('workflow_optimization');
    });
  });

  describe('execute', () => {
    it('should return error for invalid tasks format', async () => {
      const result = await agent.execute({} as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tasks must be an array');
    });

    it('should return error for non-array tasks', async () => {
      const result = await agent.execute({
        tasks: 'not-an-array',
      } as any);

      expect(result.success).toBe(false);
    });

    it('should execute single task successfully', async () => {
      const mockAgent = { execute: vi.fn().mockResolvedValue({ success: true, output: 'done' }) };
      mocks.getAgentAsync.mockResolvedValue(mockAgent);
      mocks.executeWithRetry.mockImplementation((fn) => fn());

      const tasks = [
        { id: 'task-1', name: 'Task 1', agent: 'TestAgent', input: {}, dependencies: [] },
      ];

      const result = await agent.execute({ tasks } as any);

      expect(result.success).toBe(true);
      const parsed = parseResult(result);
      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].taskId).toBe('task-1');
    });

    it('should execute multiple independent tasks', async () => {
      const mockAgent = { execute: vi.fn().mockResolvedValue({ success: true, output: 'done' }) };
      mocks.getAgentAsync.mockResolvedValue(mockAgent);
      mocks.executeWithRetry.mockImplementation((fn) => fn());

      const tasks = [
        { id: 'task-1', name: 'Task 1', agent: 'AgentA', input: {}, dependencies: [] },
        { id: 'task-2', name: 'Task 2', agent: 'AgentB', input: {}, dependencies: [] },
        { id: 'task-3', name: 'Task 3', agent: 'AgentC', input: {}, dependencies: [] },
      ];

      const result = await agent.execute({ tasks } as any);

      expect(result.success).toBe(true);
      const parsed = parseResult(result);
      expect(parsed.results).toHaveLength(3);
    });

    it('should include task results with duration', async () => {
      const mockAgent = { execute: vi.fn().mockResolvedValue({ success: true, output: 'result' }) };
      mocks.getAgentAsync.mockResolvedValue(mockAgent);
      mocks.executeWithRetry.mockImplementation((fn) => fn());

      const tasks = [
        { id: 'task-1', name: 'Task 1', agent: 'Agent', input: {}, dependencies: [] },
      ];

      const result = await agent.execute({ tasks } as any);
      const parsed = parseResult(result);

      expect(parsed.results[0]).toHaveProperty('taskId', 'task-1');
      expect(parsed.results[0]).toHaveProperty('success', true);
      expect(parsed.results[0]).toHaveProperty('duration');
      expect(parsed.results[0].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('task dependencies', () => {
    it('should execute tasks with dependencies in correct order', async () => {
      const executionOrder: string[] = [];
      const mockAgent = {
        execute: vi.fn().mockImplementation((input) => {
          executionOrder.push(input?.taskId || 'unknown');
          return Promise.resolve({ success: true, output: 'done' });
        }),
      };
      mocks.getAgentAsync.mockResolvedValue(mockAgent);
      mocks.executeWithRetry.mockImplementation((fn) => fn());

      const tasks = [
        { id: 'task-1', name: 'Task 1', agent: 'Agent', input: { taskId: 'task-1' }, dependencies: [] },
        { id: 'task-2', name: 'Task 2', agent: 'Agent', input: { taskId: 'task-2' }, dependencies: ['task-1'] },
      ];

      const result = await agent.execute({ tasks } as any);

      expect(result.success).toBe(true);
      // task-1 should execute before task-2
      const idx1 = executionOrder.indexOf('task-1');
      const idx2 = executionOrder.indexOf('task-2');
      expect(idx1).toBeLessThan(idx2);
    });

    it('should detect circular dependencies', async () => {
      const tasks = [
        { id: 'task-1', name: 'Task 1', agent: 'Agent', input: {}, dependencies: ['task-2'] },
        { id: 'task-2', name: 'Task 2', agent: 'Agent', input: {}, dependencies: ['task-1'] },
      ];

      const result = await agent.execute({ tasks } as any);

      // Should fail due to circular dependency
      expect(result.success).toBe(false);
      expect(result.error).toContain('Circular dependency');
    });
  });

  describe('task failure handling', () => {
    it('should stop execution when a task fails', async () => {
      const mockAgent = {
        execute: vi.fn()
          .mockResolvedValueOnce({ success: false, output: null, error: 'Failed' })
          .mockResolvedValue({ success: true, output: 'done' }),
      };
      mocks.getAgentAsync.mockResolvedValue(mockAgent);
      mocks.executeWithRetry.mockImplementation((fn) => fn());

      const tasks = [
        { id: 'task-1', name: 'Task 1', agent: 'Agent', input: {}, dependencies: [] },
        { id: 'task-2', name: 'Task 2', agent: 'Agent', input: {}, dependencies: ['task-1'] },
      ];

      const result = await agent.execute({ tasks } as any);

      expect(result.success).toBe(false);
    });

    it('should handle agent not found error', async () => {
      mocks.getAgentAsync.mockResolvedValue(null);
      mocks.executeWithRetry.mockImplementation((fn) => fn());

      const tasks = [
        { id: 'task-1', name: 'Task 1', agent: 'NonExistentAgent', input: {}, dependencies: [] },
      ];

      const result = await agent.execute({ tasks } as any);

      expect(result.success).toBe(false);
    });
  });

  describe('parallelism calculation', () => {
    it('should calculate parallelism for independent tasks', async () => {
      const mockAgent = { execute: vi.fn().mockResolvedValue({ success: true, output: 'done' }) };
      mocks.getAgentAsync.mockResolvedValue(mockAgent);
      mocks.executeWithRetry.mockImplementation((fn) => fn());

      // 2 independent tasks = parallelism of 2
      const tasks = [
        { id: 'task-1', name: 'Task 1', agent: 'Agent', input: {}, dependencies: [] },
        { id: 'task-2', name: 'Task 2', agent: 'Agent', input: {}, dependencies: [] },
      ];

      const result = await agent.execute({ tasks } as any);
      const parsed = parseResult(result);

      expect(parsed.parallelism).toBe(2);
    });

    it('should include total duration in output', async () => {
      const mockAgent = { execute: vi.fn().mockResolvedValue({ success: true, output: 'done' }) };
      mocks.getAgentAsync.mockResolvedValue(mockAgent);
      mocks.executeWithRetry.mockImplementation((fn) => fn());

      const tasks = [
        { id: 'task-1', name: 'Task 1', agent: 'Agent', input: {}, dependencies: [] },
      ];

      const result = await agent.execute({ tasks } as any);
      const parsed = parseResult(result);

      expect(parsed.totalDuration).toBeGreaterThanOrEqual(0);
      expect(parsed.output).toContain('ms');
    });
  });

  describe('complex workflows', () => {
    it('should handle diamond dependency pattern', async () => {
      const mockAgent = { execute: vi.fn().mockResolvedValue({ success: true, output: 'done' }) };
      mocks.getAgentAsync.mockResolvedValue(mockAgent);
      mocks.executeWithRetry.mockImplementation((fn) => fn());

      // Diamond: A -> B, A -> C, B -> D, C -> D
      const tasks = [
        { id: 'A', name: 'A', agent: 'Agent', input: {}, dependencies: [] },
        { id: 'B', name: 'B', agent: 'Agent', input: {}, dependencies: ['A'] },
        { id: 'C', name: 'C', agent: 'Agent', input: {}, dependencies: ['A'] },
        { id: 'D', name: 'D', agent: 'Agent', input: {}, dependencies: ['B', 'C'] },
      ];

      const result = await agent.execute({ tasks } as any);

      expect(result.success).toBe(true);
      const parsed = parseResult(result);
      expect(parsed.results).toHaveLength(4);
    });

    it('should handle single task with no dependencies', async () => {
      const mockAgent = { execute: vi.fn().mockResolvedValue({ success: true, output: 'done' }) };
      mocks.getAgentAsync.mockResolvedValue(mockAgent);
      mocks.executeWithRetry.mockImplementation((fn) => fn());

      const tasks = [
        { id: 'solo', name: 'Solo Task', agent: 'Agent', input: {}, dependencies: [] },
      ];

      const result = await agent.execute({ tasks } as any);

      expect(result.success).toBe(true);
      const parsed = parseResult(result);
      expect(parsed.results[0].taskId).toBe('solo');
    });
  });
});
