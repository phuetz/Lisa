import { describe, it, expect, vi } from 'vitest';
import { agentRegistry } from '../../src/features/agents/core/registry';
import type { AgentExecuteProps, AgentExecuteResult, BaseAgent } from '../../src/features/agents/core/types';
import { AgentDomains } from '../../src/features/agents/core/types';

/**
 * Create a mock agent with a unique name to avoid singleton registry conflicts
 */
function createMockAgent(name: string): BaseAgent {
  return {
    name,
    description: 'Agent for testing',
    version: '1.0.0',
    domain: AgentDomains.GENERAL,
    capabilities: ['test'],
    valid: true,
    async execute(_props: AgentExecuteProps): Promise<AgentExecuteResult> {
      return {
        success: true,
        output: { message: 'Test executed successfully' }
      };
    }
  };
}

describe('AgentRegistry', () => {
  it('should register and retrieve an agent', () => {
    const agent = createMockAgent('TestRegisterAgent');
    agentRegistry.register(agent);

    expect(agentRegistry.hasAgent('TestRegisterAgent')).toBe(true);

    const retrieved = agentRegistry.getAgent('TestRegisterAgent');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('TestRegisterAgent');
    expect(retrieved?.description).toBe('Agent for testing');
  });

  it('should execute an agent method', async () => {
    const agent = createMockAgent('TestExecuteAgent');
    agentRegistry.register(agent);

    const executeSpy = vi.spyOn(agent, 'execute');

    const result = await agentRegistry.execute('TestExecuteAgent', {
      intent: 'test',
      parameters: {}
    });

    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      output: { message: 'Test executed successfully' }
    });
  });

  it('should return error for non-existent agent', async () => {
    const result = await agentRegistry.execute('NonExistentAgent_' + Date.now(), {
      intent: 'test',
      parameters: {}
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
