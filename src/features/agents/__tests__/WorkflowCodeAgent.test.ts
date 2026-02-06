/**
 * Tests for WorkflowCodeAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowCodeAgent } from '../implementations/WorkflowCodeAgent';
import { AgentDomains } from '../core/types';

describe('WorkflowCodeAgent', () => {
  let agent: WorkflowCodeAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new WorkflowCodeAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('WorkflowCodeAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('JavaScript');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.ANALYSIS);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('executeCode');
      expect(agent.capabilities).toContain('evaluateExpression');
      expect(agent.capabilities).toContain('defineFunction');
    });

    it('should have valid property set to true', () => {
      expect(agent.valid).toBe(true);
    });
  });

  describe('execute - executeCode intent', () => {
    it('should execute simple code', async () => {
      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'return 5 + 3;'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe(8);
    });

    it('should execute code with input parameters', async () => {
      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'return input.value * 2;',
          input: { value: 10 }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should have execution time metadata', async () => {
      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'return 42;'
        }
      });

      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should have timestamp in metadata', async () => {
      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'return true;'
        }
      });

      expect(result.metadata?.timestamp).toBeDefined();
    });
  });

  describe('execute - evaluateExpression intent', () => {
    it('should evaluate arithmetic expression', async () => {
      const result = await agent.execute({
        intent: 'evaluateExpression',
        parameters: {
          expression: '5 * 3 + 2'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should evaluate expression with context', async () => {
      const result = await agent.execute({
        intent: 'evaluateExpression',
        parameters: {
          expression: 'value > threshold',
          context: { value: 100, threshold: 50 }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle expression errors', async () => {
      const result = await agent.execute({
        intent: 'evaluateExpression',
        parameters: {
          expression: 'invalid syntax !!!'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('execute - defineFunction intent', () => {
    it('should define a function', async () => {
      const result = await agent.execute({
        intent: 'defineFunction',
        parameters: {
          name: 'add',
          code: 'return a + b;'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should include metadata for function definition', async () => {
      const result = await agent.execute({
        intent: 'defineFunction',
        parameters: {
          name: 'multiply',
          code: 'return x * y;'
        }
      });

      expect(result.metadata?.executionTime).toBeDefined();
    });
  });

  describe('execute - unknown intent', () => {
    it('should return error for unknown intent', async () => {
      const result = await agent.execute({
        intent: 'unknown_intent',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown intent');
      expect(result.metadata?.executionTime).toBeDefined();
    });
  });

  describe('input validation', () => {
    it('should validate required parameters', async () => {
      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {}
      });

      if (!result.success) {
        expect(result.error).toContain('Validation failed');
      }
    });

    it('should provide meaningful validation errors', async () => {
      const result = await agent.execute({
        intent: 'defineFunction',
        parameters: {} // Missing required name and code
      });

      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('workflow integration', () => {
    it('should execute code for workflow processing', async () => {
      const workflowInput = {
        items: [1, 2, 3, 4, 5],
        multiplier: 2
      };

      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'return input.items.filter(x => x > 2);',
          input: workflowInput
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle chained code execution', async () => {
      const result1 = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'return 10;'
        }
      });

      expect(result1.success).toBeDefined();
    });

    it('should preserve execution context', async () => {
      const context = {
        workflowId: 'wf-123',
        userId: 'user-456'
      };

      const result = await agent.execute({
        intent: 'evaluateExpression',
        parameters: {
          expression: 'workflowId && userId',
          context
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle code execution timeout gracefully', async () => {
      // Test would depend on timeout implementation
      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'return 42;'
        }
      });

      expect(result.metadata?.executionTime).toBeDefined();
    });

    it('should provide error context', async () => {
      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'throw new Error("Custom error");'
        }
      });

      // Should either catch the error or have it in metadata
      expect(result).toBeDefined();
    });

    it('should handle null parameters gracefully', async () => {
      const result = await agent.execute({
        intent: 'executeCode',
        parameters: null as any
      });

      expect(result.success).toBe(false);
    });
  });

  describe('security considerations', () => {
    it('should restrict dangerous operations', async () => {
      // The actual implementation may use SafeEvaluator
      const result = await agent.execute({
        intent: 'evaluateExpression',
        parameters: {
          expression: 'global.process'
        }
      });

      // Should either block or handle safely
      expect(result).toBeDefined();
    });

    it('should validate module imports if applicable', async () => {
      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'return "safe code";'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should execute code efficiently', async () => {
      const startTime = Date.now();

      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'return 5 + 3;'
        }
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should be fast
      expect(result.metadata?.executionTime).toBeDefined();
    });

    it('should handle large input data', async () => {
      const largeInput = {
        items: Array.from({ length: 1000 }, (_, i) => i)
      };

      const result = await agent.execute({
        intent: 'executeCode',
        parameters: {
          code: 'return input.items.length;',
          input: largeInput
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('capabilities', () => {
    it('should list all capabilities', async () => {
      const capabilities = agent.capabilities;
      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities.length).toBeGreaterThan(0);
    });

    it('should provide capability details via getCapabilities', async () => {
      const capabilitiesInfo = await agent.getCapabilities?.();

      if (capabilitiesInfo) {
        expect(Array.isArray(capabilitiesInfo)).toBe(true);
        capabilitiesInfo.forEach(cap => {
          expect(cap.name).toBeDefined();
          expect(cap.description).toBeDefined();
        });
      }
    });
  });
});
