/**
 * Tests for PlannerAgent
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlannerAgent } from '../implementations/PlannerAgent';

// Mock dependencies using vi.hoisted
const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  callOpenAI: vi.fn(),
  executeWithRetry: vi.fn(),
  saveToStorage: vi.fn(),
  loadFromStorage: vi.fn(),
  runWorkflowPlan: vi.fn(),
  buildPlannerPrompt: vi.fn(),
  buildPlanExplanationPrompt: vi.fn(),
  revisePlan: vi.fn(),
  logEvent: vi.fn(),
  startTrace: vi.fn(),
  addStep: vi.fn(),
  endTrace: vi.fn(),
}));

// Mock agentRegistry
vi.mock('../core/registry', () => ({
  agentRegistry: {
    register: vi.fn(),
    execute: mocks.execute,
  },
}));

// Mock secureAI
vi.mock('../../../services/SecureAIService', () => ({
  secureAI: {
    callOpenAI: mocks.callOpenAI,
  },
}));

// Mock resilientExecutor
vi.mock('../../../utils/resilience/ResilientExecutor', () => ({
  resilientExecutor: {
    executeWithRetry: mocks.executeWithRetry,
  },
}));

// Mock storage
vi.mock('../../../utils/storage', () => ({
  saveToStorage: mocks.saveToStorage,
  loadFromStorage: mocks.loadFromStorage,
}));

// Mock runWorkflowPlan
vi.mock('../../../utils/runWorkflowPlan', () => ({
  runWorkflowPlan: mocks.runWorkflowPlan,
}));

// Mock buildPlannerPrompt
vi.mock('../../../utils/buildPlannerPrompt', () => ({
  buildPlannerPrompt: mocks.buildPlannerPrompt,
  buildPlanExplanationPrompt: mocks.buildPlanExplanationPrompt,
}));

// Mock revisePlan
vi.mock('../../../utils/revisePlan', () => ({
  revisePlan: mocks.revisePlan,
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logEvent: mocks.logEvent,
}));

// Mock planTracer
vi.mock('../../../utils/planTracer', () => ({
  planTracer: {
    startTrace: mocks.startTrace,
    addStep: mocks.addStep,
    endTrace: mocks.endTrace,
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

describe('PlannerAgent', () => {
  let agent: PlannerAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadFromStorage.mockReturnValue(null);
    mocks.startTrace.mockReturnValue('trace-123');
    agent = new PlannerAgent();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('PlannerAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('multi-step workflows');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('2.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe('planning');
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('planning');
      expect(agent.capabilities).toContain('orchestration');
      expect(agent.capabilities).toContain('workflow');
    });
  });

  describe('execute', () => {
    it('should generate and execute a plan successfully', async () => {
      const mockPlan = [
        { id: '1', action: 'step1', status: 'pending', dependencies: [], args: {} },
        { id: '2', action: 'step2', status: 'pending', dependencies: ['1'], args: {} },
      ];

      mocks.buildPlannerPrompt.mockReturnValue('Generate a plan');
      mocks.executeWithRetry.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockPlan) } }],
      });
      mocks.buildPlanExplanationPrompt.mockReturnValue('Explain the plan');
      mocks.runWorkflowPlan.mockResolvedValue({
        success: true,
        output: 'Plan executed successfully',
      });

      const result = await agent.execute({
        request: 'Do something complex',
      });

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(mocks.startTrace).toHaveBeenCalled();
      expect(mocks.endTrace).toHaveBeenCalled();
    });

    it('should handle plan generation failure', async () => {
      mocks.buildPlannerPrompt.mockReturnValue('Generate a plan');
      mocks.executeWithRetry.mockResolvedValue({
        choices: [{ message: { content: 'invalid json' } }],
      });

      const result = await agent.execute({
        request: 'Do something',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to generate workflow plan');
    });

    it('should handle execution errors gracefully', async () => {
      mocks.buildPlannerPrompt.mockReturnValue('Generate a plan');
      mocks.executeWithRetry.mockRejectedValue(new Error('LLM unavailable'));

      const result = await agent.execute({
        request: 'Do something',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('LLM unavailable');
    });

    it('should call onPlanUpdate callback when provided', async () => {
      const mockPlan = [
        { id: '1', action: 'step1', status: 'pending', dependencies: [], args: {} },
      ];
      const onPlanUpdate = vi.fn();

      mocks.buildPlannerPrompt.mockReturnValue('Generate a plan');
      mocks.executeWithRetry.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockPlan) } }],
      });
      mocks.runWorkflowPlan.mockResolvedValue({
        success: true,
        output: 'Done',
      });

      await agent.execute({
        request: 'Do something',
        onPlanUpdate,
      });

      expect(onPlanUpdate).toHaveBeenCalled();
    });

    it('should include traceId in result', async () => {
      const mockPlan = [{ id: '1', action: 'step1', status: 'pending', dependencies: [], args: {} }];

      mocks.buildPlannerPrompt.mockReturnValue('Generate a plan');
      mocks.executeWithRetry.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockPlan) } }],
      });
      mocks.runWorkflowPlan.mockResolvedValue({ success: true, output: 'Done' });

      const result = await agent.execute({ request: 'Test' });

      expect(result.traceId).toBe('trace-123');
    });
  });

  describe('plan revision', () => {
    it('should revise plan on failure up to MAX_REVISIONS', async () => {
      const mockPlan = [{ id: '1', action: 'step1', status: 'pending', dependencies: [], args: {} }];
      const revisedPlan = [{ id: '1', action: 'revised_step1', status: 'pending', dependencies: [], args: {} }];

      mocks.buildPlannerPrompt.mockReturnValue('Generate a plan');
      mocks.executeWithRetry.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockPlan) } }],
      });

      // First execution fails, revision succeeds
      mocks.runWorkflowPlan
        .mockResolvedValueOnce({ success: false, error: 'Step failed' })
        .mockResolvedValueOnce({ success: true, output: 'Done after revision' });

      mocks.revisePlan.mockResolvedValue({ plan: revisedPlan });

      const result = await agent.execute({ request: 'Do something' });

      expect(mocks.revisePlan).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('template management', () => {
    it('should save plan as template', () => {
      const plan = [{ id: '1', action: 'test', status: 'completed' as const, dependencies: [] }];

      agent.saveAsTemplate('my-template', plan);

      expect(mocks.saveToStorage).toHaveBeenCalledWith(
        'planner_templates',
        expect.any(Array)
      );
    });

    it('should load template by name', () => {
      const plan = [{ id: '1', action: 'test', status: 'pending' as const, dependencies: [] }];

      // Manually set the template
      agent.saveAsTemplate('my-template', plan);

      const loadedPlan = agent.loadTemplate('my-template');

      expect(loadedPlan).toEqual(plan);
    });

    it('should throw error for non-existent template', () => {
      expect(() => agent.loadTemplate('non-existent')).toThrow("Template 'non-existent' not found");
    });

    it('should get list of template names', () => {
      const plan = [{ id: '1', action: 'test', status: 'pending' as const, dependencies: [] }];

      agent.saveAsTemplate('template-1', plan);
      agent.saveAsTemplate('template-2', plan);

      const templates = agent.getTemplates();

      expect(templates).toContain('template-1');
      expect(templates).toContain('template-2');
    });
  });

  describe('checkpoint management', () => {
    it('should create checkpoint', () => {
      const plan = [{ id: '1', action: 'test', status: 'running' as const, dependencies: [] }];

      const checkpointId = agent.createCheckpoint(plan);

      expect(checkpointId).toBe('mock-uuid-1234');
      expect(mocks.saveToStorage).toHaveBeenCalledWith(
        'planner_checkpoints',
        expect.any(Array)
      );
    });

    it('should resume from checkpoint', () => {
      const plan = [{ id: '1', action: 'test', status: 'running' as const, dependencies: [] }];

      // Create a checkpoint first
      const checkpointId = agent.createCheckpoint(plan);

      const resumedPlan = agent.resumeFromCheckpoint(checkpointId);

      expect(resumedPlan).toEqual(plan);
    });

    it('should throw error for non-existent checkpoint', () => {
      expect(() => agent.resumeFromCheckpoint('non-existent')).toThrow("Checkpoint 'non-existent' not found");
    });

    it('should get list of checkpoint IDs', () => {
      const plan = [{ id: '1', action: 'test', status: 'pending' as const, dependencies: [] }];

      agent.createCheckpoint(plan);

      const checkpoints = agent.getCheckpoints();

      expect(checkpoints).toContain('mock-uuid-1234');
    });
  });

  describe('execute with template', () => {
    it('should load plan from template when specified', async () => {
      const templatePlan = [{ id: '1', action: 'template_step', status: 'pending' as const, dependencies: [], args: {} }];

      agent.saveAsTemplate('my-workflow', templatePlan);

      mocks.runWorkflowPlan.mockResolvedValue({ success: true, output: 'Done' });

      const result = await agent.execute({
        request: 'Run my workflow',
        loadFromTemplate: 'my-workflow',
      });

      expect(result.success).toBe(true);
      expect(mocks.buildPlannerPrompt).not.toHaveBeenCalled(); // Should not generate new plan
    });
  });

  describe('execute with checkpoint', () => {
    it('should resume from checkpoint when specified', async () => {
      const checkpointPlan = [{ id: '1', action: 'checkpoint_step', status: 'pending' as const, dependencies: [], args: {} }];

      const checkpointId = agent.createCheckpoint(checkpointPlan);

      mocks.runWorkflowPlan.mockResolvedValue({ success: true, output: 'Resumed' });

      const result = await agent.execute({
        request: 'Continue workflow',
        resumeFromCheckpointId: checkpointId,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('logging', () => {
    it('should log plan status updates', async () => {
      const mockPlan = [{ id: '1', action: 'step1', status: 'pending', dependencies: [], args: {} }];

      mocks.buildPlannerPrompt.mockReturnValue('Generate a plan');
      mocks.executeWithRetry.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockPlan) } }],
      });
      mocks.runWorkflowPlan.mockResolvedValue({ success: true, output: 'Done' });

      await agent.execute({ request: 'Test logging' });

      expect(mocks.logEvent).toHaveBeenCalled();
    });
  });
});
