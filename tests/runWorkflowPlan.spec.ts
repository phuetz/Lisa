import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
let mockAgent: MockAgent;
vi.mock('../src/agents/registry', () => ({ agentRegistry: { register: vi.fn(), getAgent: (name: string) => (name === 'MockAgent' ? mockAgent : undefined) } }));
import { runWorkflowPlan } from '../src/utils/runWorkflowPlan';
import type { WorkflowStep } from '../src/types/Planner';
import type { AgentExecuteProps, AgentExecuteResult, BaseAgent } from '../src/agents/types';
import { AgentDomains } from '../src/agents/types';

class MockAgent implements BaseAgent {
  name = 'MockAgent';
  description = 'mock';
  version = '1.0';
  domain = AgentDomains.KNOWLEDGE;
  capabilities = ['test'];
  async execute(_p: AgentExecuteProps): Promise<AgentExecuteResult> {
    return { success: true, output: null };
  }
}

describe('runWorkflowPlan', () => {
  mockAgent = new MockAgent();

  it('detects dead-lock', async () => {
    const plan: WorkflowStep[] = [
      { id: 1, description: 'a', agent: 'Unknown', command: 'run', args: {}, dependencies: [], status: 'pending' },
      { id: 2, description: 'b', agent: 'Unknown', command: 'run', args: {}, dependencies: [1], status: 'pending' }
    ];
    const result = await runWorkflowPlan(plan);
    expect(result.success).toBe(false);
    const message = (result.error as any).message || String(result.error);
    expect(message).toContain('Dead-lock detected');
  });

  it('completes single step', async () => {
    const plan: WorkflowStep[] = [
      { id: 1, description: 'a', agent: 'MockAgent', command: 'run', args: {}, dependencies: [], status: 'pending' }
    ];
    const result = await runWorkflowPlan(plan);
    expect(result.plan[0].status).toBe('completed');
    expect(result.plan[0].duration).toBeGreaterThanOrEqual(0);
  });
});
