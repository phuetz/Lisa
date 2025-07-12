import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlannerAgent } from '../PlannerAgent';
import { agentRegistry } from '../registry';
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../types';

// Mock dependencies
vi.mock('../registry');
vi.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('PlannerAgent (Templates & Checkpoints)', () => {
  let planner: PlannerAgent;
  let mockCallLLM: any;
  const mockSearchAgent: BaseAgent = {
    name: 'WebSearchAgent',
    description: 'Test search agent',
    execute: vi.fn(async (_props: AgentExecuteProps): Promise<AgentExecuteResult> => {
      return { success: true, output: 'mocked success' };
    })
  };

  beforeEach(() => {
    planner = new PlannerAgent();
    mockCallLLM = vi.spyOn(planner as any, 'callLLM');
    vi.spyOn(planner as any, 'logPlanStatus').mockImplementation(() => {}); // Suppress logs
    vi.mocked(agentRegistry.getAgent).mockReturnValue(mockSearchAgent);
    vi.mocked(mockSearchAgent.execute).mockClear();
    mockCallLLM.mockClear();
  });

  // --- Template Tests ---
  it('should save a successful plan as a template', async () => {
    const plan = JSON.stringify([{ 
      id: 1, 
      agent: 'WebSearchAgent', 
      command: 'search', 
      args: {}, 
      dependencies: [], 
      description: 'Test step' 
    }]);
    mockCallLLM.mockResolvedValueOnce(plan);
    vi.mocked(mockSearchAgent.execute).mockResolvedValue({ success: true, output: 'Success' });

    await planner.execute({ request: 'test', saveAsTemplate: 'my-template' });

    // Now, load from the template and ensure LLM is not called again
    await planner.execute({ request: 'test', loadFromTemplate: 'my-template' });

    expect(mockCallLLM).toHaveBeenCalledOnce(); // Should only be called for the initial planning
    expect(mockSearchAgent.execute).toHaveBeenCalledTimes(2);
  });

  it('should throw an error when loading a non-existent template', async () => {
    const result = await planner.execute({ request: 'test', loadFromTemplate: 'bad-template' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Template \'bad-template\' not found');
  });

  // --- Checkpoint & Resume Tests ---
  it('should create a checkpoint and resume from it', async () => {
    const planSteps = [
      { 
        id: 1, 
        description: 'first step', 
        agent: 'WebSearchAgent', 
        command: 'search', 
        args: { q: 'first' }, 
        dependencies: [] 
      },
      { 
        id: 2, 
        description: 'second step', 
        agent: 'WebSearchAgent', 
        command: 'search', 
        args: { q: 'second' }, 
        dependencies: [1] 
      },
    ];
    mockCallLLM.mockResolvedValueOnce(JSON.stringify(planSteps));

    // Mock the first step to succeed, then we'll 'crash' and resume
    vi.mocked(mockSearchAgent.execute).mockImplementationOnce(async (props) => {
      if (props.q === 'first') {
        // Simulate a partial run where a checkpoint is created
        const checkpointId = planner.createCheckpoint([
          { 
            ...planSteps[0], 
            status: 'completed', 
            result: { success: true, output: 'first done' } 
          } as any,
          { 
            ...planSteps[1], 
            status: 'pending' 
          } as any,
        ]);
        // This throw simulates a crash after the first step's group is done
        throw new Error(`CRASH_AFTER_CHECKPOINT:${checkpointId}`);
      }
      return { success: false, error: 'Should not be called', output: null };
    });

    // First run, expected to 'crash'
    const firstRunResult = await planner.execute({ request: 'test' });
    expect(firstRunResult.success).toBe(false);
    expect(firstRunResult.error).toContain('CRASH_AFTER_CHECKPOINT:');
    const checkpointId = firstRunResult.error?.split(':')[1] ?? '';

    // Now, mock the second step's execution for the resume
    vi.mocked(mockSearchAgent.execute).mockImplementation(async (props: AgentExecuteProps) => {
        if (props.q === 'second') return { success: true, output: 'second done' };
        return { success: false, error: 'Wrong step executed', output: '' };
    });

    // Second run, resuming from the checkpoint
    const resumeResult = await planner.execute({ request: 'test', resumeFromCheckpointId: checkpointId });

    expect(resumeResult.success).toBe(true);
    expect(resumeResult.output).toContain('first done, second done');
    // LLM is called once on first run, but not on resume
    expect(mockCallLLM).toHaveBeenCalledOnce();
    // Search agent is called once on first run, and once on the second
    expect(mockSearchAgent.execute).toHaveBeenCalledTimes(2);
  });

  it('should throw an error when resuming from a non-existent checkpoint', async () => {
    const result = await planner.execute({ request: 'test', resumeFromCheckpointId: 'bad-checkpoint' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Checkpoint \'bad-checkpoint\' not found');
  });
});
