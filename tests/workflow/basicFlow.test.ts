import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowExecutor } from '../../src/workflow/WorkflowExecutor';
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../../src/agents/types';
import { AgentDomains } from '../../src/agents/types';
import type { Node } from 'reactflow';

/**
 * HelloAgent for testing - minimal agent that increments a counter
 */
class HelloAgent implements BaseAgent {
  public name = 'HelloAgent';
  public description = 'Test agent that increments a counter';
  public version = '1.0.0';
  public domain = AgentDomains.KNOWLEDGE;
  public capabilities = ['greet'];
  public valid = true;
  
  // Counter to track calls
  private static counter = 0;

  public async execute(_props: AgentExecuteProps): Promise<AgentExecuteResult> {
    // Increment counter
    HelloAgent.counter++;
    
    return {
      success: true,
      output: {
        greeting: `Hello #${HelloAgent.counter}!`,
        counter: HelloAgent.counter
      }
    };
  }
  
  // Method to get current counter value for testing
  public static getCounter(): number {
    return HelloAgent.counter;
  }
  
  // Reset counter for clean tests
  public static resetCounter(): void {
    HelloAgent.counter = 0;
  }
}

describe('WorkflowExecutor - Basic Flow', () => {
  // Reset counter before each test
  beforeEach(() => {
    HelloAgent.resetCounter();
    vi.clearAllMocks();
  });

  it('should execute a simple two-node workflow', async () => {
    // Create mock nodes
    const nodes: Node[] = [
      {
        id: 'node-1',
        type: 'helloNode',
        position: { x: 0, y: 0 },
        data: {
          agent: 'HelloAgent',
          params: { action: 'greet' }
        }
      },
      {
        id: 'node-2',
        type: 'helloNode',
        position: { x: 100, y: 100 },
        data: {
          agent: 'HelloAgent',
          params: { action: 'greet' }
        }
      }
    ];

    // Create mock edges
    const edges = [
      {
        id: 'edge-1-2',
        source: 'node-1',
        target: 'node-2'
      }
    ];

    // Create workflow executor with mocked dependencies
    const executor = new WorkflowExecutor(
      nodes,
      edges,
      { timeout: 5000 }
    );

    // Execute workflow
    const result = await executor.execute();

    // Verify execution succeeded
    expect(result.success).toBe(true);
    
    // Verify both nodes were executed
    expect(HelloAgent.getCounter()).toBe(2);
    
    // Verify results from nodes
    expect(result.nodeResults).toHaveProperty('node-1');
    expect(result.nodeResults).toHaveProperty('node-2');
  });
});
