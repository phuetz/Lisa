import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlannerAgent } from '../agents/PlannerAgent';
import { agentRegistry } from '../agents/registry';
import type { WorkflowStep } from '../types/Planner';
import { saveToStorage, loadFromStorage } from '../utils/storage';

// Mock all dependencies
vi.mock('../agents/registry', () => ({
  agentRegistry: {
    register: vi.fn(),
    getAgent: vi.fn(),
    getAllAgents: vi.fn().mockReturnValue([])
  }
}));

vi.mock('../utils/storage', () => ({
  saveToStorage: vi.fn(),
  loadFromStorage: vi.fn().mockReturnValue(null)
}));

vi.mock('../utils/buildPlannerPrompt', () => ({
  buildPlannerPrompt: vi.fn().mockReturnValue('mock prompt')
}));

vi.mock('../utils/runWorkflowPlan', () => ({
  runWorkflowPlan: vi.fn().mockImplementation((plan) => {
    return Promise.resolve({
      success: true,
      plan: plan.map(step => ({ ...step, status: 'completed' })),
      summary: 'Mock workflow executed successfully',
      totalDuration: 1000
    });
  })
}));

vi.mock('../utils/logger', () => ({
  logEvent: vi.fn()
}));

// Mock fetch for LLM calls
global.fetch = vi.fn();

describe('PlannerAgent', () => {
  let plannerAgent: PlannerAgent;
  let mockResponse: Response;
  let mockPlan: WorkflowStep[];
  
  beforeEach(() => {
    // Setup environment variable
    vi.stubEnv('VITE_OPENAI_API_KEY', 'mock-api-key');
    
    // Create agent instance
    plannerAgent = new PlannerAgent();
    
    // Setup mock plan
    mockPlan = [
      {
        id: 1,
        description: 'Test step',
        agent: 'TestAgent',
        command: 'testCommand',
        args: { param: 'value' },
        dependencies: [],
        status: 'pending'
      }
    ];
    
    // Setup mock fetch response
    mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockPlan)
            }
          }
        ]
      })
    } as unknown as Response;
    
    (global.fetch as vi.Mock).mockResolvedValue(mockResponse);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });
  
  it('should initialize with templates and checkpoints from storage', () => {
    // Setup mock storage data
    const mockTemplates = [['template1', mockPlan]];
    const mockCheckpoints = [['checkpoint1', mockPlan]];
    
    (loadFromStorage as vi.Mock)
      .mockReturnValueOnce(mockTemplates)
      .mockReturnValueOnce(mockCheckpoints);
    
    const agent = new PlannerAgent();
    
    // Verify templates and checkpoints were loaded
    expect(agent.getTemplates()).toEqual(['template1']);
    expect(agent.getCheckpoints()).toEqual(['checkpoint1']);
  });
  
  it('should generate and execute a new plan', async () => {
    const result = await plannerAgent.execute({
      request: 'Test request'
    });
    
    // Verify successful execution
    expect(result.success).toBe(true);
    expect(result.output).toContain('Mock workflow executed successfully');
    
    // Verify LLM was called
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-api-key'
        })
      })
    );
  });
  
  it('should save and load templates', () => {
    // Save template
    plannerAgent.saveAsTemplate('test-template', mockPlan);
    
    // Verify storage was called
    expect(saveToStorage).toHaveBeenCalledWith(
      'planner_templates',
      expect.anything()
    );
    
    // Mock the template retrieval
    (plannerAgent as any).workflowTemplates = new Map([
      ['test-template', mockPlan]
    ]);
    
    // Load template
    const loadedPlan = plannerAgent.loadTemplate('test-template');
    
    // Verify deep copy was returned
    expect(loadedPlan).toEqual(mockPlan);
    expect(loadedPlan).not.toBe(mockPlan); // Different reference
  });
  
  it('should create and resume from checkpoints', () => {
    // Create checkpoint
    const checkpointId = plannerAgent.createCheckpoint(mockPlan);
    
    // Verify storage was called
    expect(saveToStorage).toHaveBeenCalledWith(
      'planner_checkpoints',
      expect.anything()
    );
    
    // Mock the checkpoint retrieval
    (plannerAgent as any).workflowCheckpoints = new Map([
      [checkpointId, mockPlan]
    ]);
    
    // Resume from checkpoint
    const resumedPlan = plannerAgent.resumeFromCheckpoint(checkpointId);
    
    // Verify deep copy was returned
    expect(resumedPlan).toEqual(mockPlan);
    expect(resumedPlan).not.toBe(mockPlan); // Different reference
  });
  
  it('should handle API key configuration errors', async () => {
    // Remove API key
    vi.unstubAllEnvs();
    
    const result = await plannerAgent.execute({
      request: 'Test request'
    });
    
    // Verify error was returned
    expect(result.success).toBe(false);
    expect(result.error).toContain('OpenAI API key is not configured');
  });
  
  it('should handle template not found errors', () => {
    expect(() => plannerAgent.loadTemplate('non-existent')).toThrow(/not found/);
  });
  
  it('should handle checkpoint not found errors', () => {
    expect(() => plannerAgent.resumeFromCheckpoint('non-existent')).toThrow(/not found/);
  });
});
