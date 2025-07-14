import { describe, it, expect } from 'vitest';
import AgentRegistry from '../../src/agents/AgentRegistry';
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../../src/agents/types';
import { AgentDomains } from '../../src/agents/types';

class SlowAgent implements BaseAgent {
  name = 'SlowAgent';
  description = 'slow';
  version = '1.0';
  domain = AgentDomains.KNOWLEDGE;
  capabilities: string[] = [];
  async execute(_props: AgentExecuteProps): Promise<AgentExecuteResult> {
    await new Promise(r => setTimeout(r, 50));
    return { success: true, output: null };
  }
}

describe('AgentRegistry timeouts', () => {
  it('should timeout if agent execution exceeds limit', async () => {
    const registry: any = new (AgentRegistry as any)();
    registry.register(new SlowAgent());
    await expect(registry.execute('SlowAgent', { timeout: 10 })).rejects.toThrow('Agent timeout');
  });
});
