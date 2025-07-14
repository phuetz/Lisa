import { describe, it, expect } from 'vitest';
import AgentRegistry from '../../src/agents/AgentRegistry';
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../../src/agents/types';
import { AgentDomains } from '../../src/agents/types';

class DummyAgent implements BaseAgent {
  constructor(public name: string) {}
  description = 'dummy';
  version = '1.0';
  domain = AgentDomains.KNOWLEDGE;
  capabilities: string[] = [];
  async execute(_props: AgentExecuteProps): Promise<AgentExecuteResult> {
    return { success: true, output: null };
  }
}

describe('AgentRegistry memory management', () => {
  it('limits number of agents and cleans old ones', () => {
    const registry: any = new (AgentRegistry as any)();
    for (let i = 0; i < 55; i++) {
      registry.register(new DummyAgent('A' + i));
    }
    expect(registry.getAllAgents().length).toBeLessThanOrEqual(50);
  });

  it('updates last access on retrieval', async () => {
    const registry: any = new (AgentRegistry as any)();
    const agent = new DummyAgent('One');
    registry.register(agent);
    const first = registry.lastAccess.get('One');
    await new Promise(r => setTimeout(r, 5));
    registry.getAgent('One');
    const second = registry.lastAccess.get('One');
    expect(second).toBeGreaterThan(first);
  });
});
