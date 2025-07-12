import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runWorkflowPlan } from '../utils/runWorkflowPlan';
import { agentRegistry } from '../agents/registry';
import { logEvent } from '../utils/logger';
import type { WorkflowStep } from '../types/Planner';

// Mock dependencies
vi.mock('../agents/registry', () => ({
  agentRegistry: {
    getAgent: vi.fn()
  }
}));

vi.mock('../utils/logger', () => ({
  logEvent: vi.fn().mockReturnValue({})
}));

describe('runWorkflowPlan', () => {
  let mockPlan: WorkflowStep[];
  let mockOnPlanUpdate: vi.Mock;
  let successfulAgentMock: any;
  let failingAgentMock: any;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup mock plan
    mockPlan = [
      {
        id: 1,
        description: 'First step',
        agent: 'SuccessAgent',
        command: 'doSomething',
        args: { param1: 'value1' },
        dependencies: [],
        status: 'pending'
      },
      {
        id: 2,
        description: 'Second step',
        agent: 'SuccessAgent',
        command: 'doSomethingElse',
        args: { param2: 'value2' },
        dependencies: [1], // Depends on first step
        status: 'pending'
      },
      {
        id: 3,
        description: 'Failing step',
        agent: 'FailingAgent',
        command: 'failingCommand',
        args: {},
        dependencies: [2], // Depends on second step
        status: 'pending'
      }
    ];
    
    // Setup mock agents
    successfulAgentMock = {
      execute: vi.fn().mockImplementation(() => Promise.resolve({ 
        success: true, 
        output: 'Success result' 
      }))
    };
    
    failingAgentMock = {
      execute: vi.fn().mockImplementation(() => Promise.reject(new Error('Agent execution failed')))
    };
    
    // Setup registry mock to return different agents
    (agentRegistry.getAgent as vi.Mock).mockImplementation((name: string) => {
      if (name === 'SuccessAgent') return successfulAgentMock;
      if (name === 'FailingAgent') return failingAgentMock;
      return null;
    });
    
    // Setup plan update callback
    mockOnPlanUpdate = vi.fn();
  });
  
  it('should execute a simple workflow successfully', async () => {
    // Use only the first two steps (successful ones)
    const simplePlan = mockPlan.slice(0, 2);
    
    const result = await runWorkflowPlan(simplePlan, mockOnPlanUpdate);
    
    // Verify the result
    expect(result.success).toBe(true);
    expect(result.plan).toHaveLength(2);
    expect(result.plan[0].status).toBe('completed');
    expect(result.plan[1].status).toBe('completed');
    expect(result.summary).toContain('Workflow completed successfully');
    
    // Verify agents were called correctly
    expect(successfulAgentMock.execute).toHaveBeenCalledTimes(2);
    expect(successfulAgentMock.execute).toHaveBeenCalledWith({
      request: 'doSomething',
      param1: 'value1'
    });
    
    // Verify events were logged
    expect(logEvent).toHaveBeenCalledWith(
      'plan_generated',
      expect.anything(),
      expect.stringContaining('Starting execution of workflow')
    );
    
    expect(logEvent).toHaveBeenCalledWith(
      'plan_completed',
      expect.anything(),
      expect.stringContaining('Workflow completed successfully')
    );
    
    // Verify the callback was called with plan updates
    expect(mockOnPlanUpdate).toHaveBeenCalled();
  });
  
  it('should respect dependencies during execution', async () => {
    // Create a new plan with reversed order but same dependencies
    const reversedPlan: WorkflowStep[] = [
      { ...mockPlan[1] }, // Step 2 (depends on step 1)
      { ...mockPlan[0] }  // Step 1 (no dependencies)
    ];
    
    const result = await runWorkflowPlan(reversedPlan, mockOnPlanUpdate);
    
    // Verify the execution order was correct (despite the array order)
    const executionOrder = (successfulAgentMock.execute as vi.Mock).mock.calls.map(
      call => call[0].request
    );
    
    expect(executionOrder[0]).toBe('doSomething'); // First step executed first
    expect(executionOrder[1]).toBe('doSomethingElse'); // Second step executed second
    expect(result.success).toBe(true);
  });
  
  it('should handle failing steps correctly', async () => {
    const result = await runWorkflowPlan(mockPlan, mockOnPlanUpdate);
    
    // Verify the result indicates failure
    expect(result.success).toBe(false);
    
    // First two steps should be completed
    expect(result.plan[0].status).toBe('completed');
    expect(result.plan[1].status).toBe('completed');
    
    // Third step should be failed
    expect(result.plan[2].status).toBe('failed');
    
    // Verify the error handling
    expect(logEvent).toHaveBeenCalledWith(
      'step_failed',
      expect.anything(),
      expect.stringContaining('Failed step')
    );
    
    expect(logEvent).toHaveBeenCalledWith(
      'plan_failed',
      expect.anything(),
      expect.stringContaining('Workflow execution failed')
    );
  });
  
  it('should handle missing agents correctly', async () => {
    // Modify a step to use non-existent agent
    const badPlan = [...mockPlan];
    badPlan[0].agent = 'NonExistentAgent';
    
    (agentRegistry.getAgent as vi.Mock).mockReturnValue(null);
    
    const result = await runWorkflowPlan(badPlan, mockOnPlanUpdate);
    
    // Verify the result indicates failure
    expect(result.success).toBe(false);
    expect(result.plan[0].status).toBe('failed');
    expect(result.summary).toContain('Workflow execution failed');
  });
  
  it('should detect deadlocks in plan execution', async () => {
    // Create a plan with circular dependencies
    const deadlockedPlan: WorkflowStep[] = [
      {
        id: 1,
        description: 'First step',
        agent: 'SuccessAgent',
        command: 'doSomething',
        args: {},
        dependencies: [2], // Depends on step 2
        status: 'pending'
      },
      {
        id: 2,
        description: 'Second step',
        agent: 'SuccessAgent',
        command: 'doSomethingElse',
        args: {},
        dependencies: [1], // Depends on step 1 - circular!
        status: 'pending'
      }
    ];
    
    const result = await runWorkflowPlan(deadlockedPlan, mockOnPlanUpdate);
    
    // Verify deadlock detection
    expect(result.success).toBe(false);
    expect(result.summary).toContain('deadlock');
  });
});
