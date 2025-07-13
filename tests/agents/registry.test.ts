import { describe, it, expect, beforeEach, vi } from 'vitest';
import { agentRegistry } from '../../src/agents/AgentRegistry';
import type { AgentExecuteProps, AgentExecuteResult, BaseAgent } from '../../src/agents/types';
import { AgentDomains } from '../../src/agents/types';

/**
 * Mock agent for testing
 */
class MockAgent implements BaseAgent {
  public name = 'MockAgent';
  public description = 'Agent for testing';
  public version = '1.0.0';
  public domain = AgentDomains.GENERAL;
  public capabilities = ['test'];
  public valid = true;

  public async execute(_props: AgentExecuteProps): Promise<AgentExecuteResult> {
    return {
      success: true,
      output: { message: 'Test executed successfully' }
    };
  }
}

describe('AgentRegistry', () => {
  let mockAgent: MockAgent;

  beforeEach(() => {
    // Create a new mock agent for each test
    mockAgent = new MockAgent();
  });

  it('should register and retrieve an agent', () => {
    // Register the mock agent
    agentRegistry.register(mockAgent);

    // Verify agent exists in registry
    expect(agentRegistry.hasAgent('MockAgent')).toBe(true);

    // Retrieve agent from registry
    const retrievedAgent = agentRegistry.getAgent('MockAgent');

    // Verify retrieved agent is the same as registered agent
    expect(retrievedAgent).toBeDefined();
    expect(retrievedAgent?.name).toBe('MockAgent');
    expect(retrievedAgent?.description).toBe('Agent for testing');
  });

  it('should execute an agent method', async () => {
    // Register the mock agent
    agentRegistry.register(mockAgent);

    // Mock execute method
    const executeSpy = vi.spyOn(mockAgent, 'execute');

    // Execute the agent via registry
    const result = await agentRegistry.execute('MockAgent', {
      intent: 'test',
      parameters: {}
    });

    // Verify agent was executed
    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      output: { message: 'Test executed successfully' }
    });
  });

  it('should return error for non-existent agent', async () => {
    // Execute non-existent agent
    const result = await agentRegistry.execute('NonExistentAgent', {
      intent: 'test',
      parameters: {}
    });

    // Verify error result
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
