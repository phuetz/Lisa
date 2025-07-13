import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
vi.mock('../src/agents/registry', () => ({ agentRegistry: { register: vi.fn() } }));
import { PlannerAgent } from '../src/agents/PlannerAgent';
import { useAppStore } from '../src/store/appStore';

describe('PlannerAgent', () => {
  it('stores plan explanation via finalizePlan', () => {
    const agent = new PlannerAgent();
    (agent as any).finalizePlan({ success: true, summary: 'ok' }, [], {}, null, 'hello', 't1');
    expect(useAppStore.getState().lastPlanExplanation).toBe('hello');
  });
});
