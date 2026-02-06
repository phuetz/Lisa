/**
 * Tests for TransformAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransformAgent } from '../implementations/TransformAgent';
import { AgentDomains } from '../core/types';

describe('TransformAgent', () => {
  let agent: TransformAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new TransformAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('TransformAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('transformation');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('0.1.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.ANALYSIS);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('transform');
    });
  });

  describe('execute - template transformation', () => {
    it('should transform using simple template', async () => {
      const input = { name: 'Alice', age: 30 };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: 'Hello {{name}}, you are {{age}} years old',
          input
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello Alice, you are 30 years old');
    });

    it('should handle nested object paths in template', async () => {
      const input = {
        user: {
          profile: {
            firstName: 'Bob',
            lastName: 'Smith'
          }
        }
      };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: '{{user.profile.firstName}} {{user.profile.lastName}}',
          input
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Bob Smith');
    });

    it('should preserve text without template variables', async () => {
      const input = { value: 'test' };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: 'This is plain text',
          input
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('This is plain text');
    });

    it('should handle multiple variables in template', async () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'admin'
      };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: 'User: {{firstName}} {{lastName}} ({{email}}) - {{role}}',
          input
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('John');
      expect(result.output).toContain('Doe');
      expect(result.output).toContain('john@example.com');
      expect(result.output).toContain('admin');
    });

    it('should handle object values in template', async () => {
      const input = {
        data: { key: 'value', count: 42 },
        name: 'test'
      };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: '{{data}} - {{name}}',
          input
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('test');
    });

    it('should handle undefined paths in template', async () => {
      const input = { name: 'Alice' };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: 'Name: {{name}}, Age: {{age}}',
          input
        }
      });

      expect(result.success).toBe(true);
      // Should preserve template variable if path undefined
      expect(result.output).toContain('Name: Alice');
    });
  });

  describe('execute - expression evaluation', () => {
    it('should evaluate simple expression', async () => {
      const input = { value: 10 };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          expression: 'value * 2',
          input,
          context: { value: 10 }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe(20);
    });

    it('should evaluate expression with context variables', async () => {
      const context = { multiplier: 5, offset: 10 };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          expression: '10 * multiplier + offset',
          input: {},
          context
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe(60); // 10 * 5 + 10
    });

    it('should evaluate arithmetic expressions', async () => {
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          expression: '5 + 3 * 2',
          input: {},
          context: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe(11);
    });

    it('should handle expression errors gracefully', async () => {
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          expression: 'invalid syntax !!!',
          input: {},
          context: {}
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Expression evaluation failed');
    });
  });

  describe('execute - passthrough', () => {
    it('should passthrough input when no transformation defined', async () => {
      const input = { key: 'value', count: 42 };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          input
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toEqual(input);
    });

    it('should passthrough null input', async () => {
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          input: null
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeNull();
    });

    it('should passthrough undefined input', async () => {
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          input: undefined
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeUndefined();
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
    });
  });

  describe('template edge cases', () => {
    it('should handle empty template', async () => {
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: '',
          input: { value: 'test' }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });

    it('should handle template with only variables', async () => {
      const input = { a: 'A', b: 'B', c: 'C' };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: '{{a}}{{b}}{{c}}',
          input
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('ABC');
    });

    it('should handle adjacent variables in template', async () => {
      const input = { first: 'Hello', second: 'World' };
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: '{{first}} {{second}}',
          input
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello World');
    });
  });

  describe('workflow integration', () => {
    it('should transform workflow data step by step', async () => {
      const step1Input = { firstName: 'John', lastName: 'Doe' };
      const step1 = await agent.execute({
        intent: 'transform',
        parameters: {
          template: '{{firstName}} {{lastName}}',
          input: step1Input
        }
      });

      expect(step1.success).toBe(true);
      expect(step1.output).toBe('John Doe');

      // Step 2: transform the output
      const step2 = await agent.execute({
        intent: 'transform',
        parameters: {
          expression: '"Hello, " + input',
          input: step1.output,
          context: {}
        }
      });

      expect(step2.success).toBe(true);
    });

    it('should chain multiple transformations', async () => {
      let data: any = { value: 5 };

      const results = [];

      // First transformation
      const result1 = await agent.execute({
        intent: 'transform',
        parameters: {
          expression: 'value * 2',
          input: data,
          context: data
        }
      });
      results.push(result1);
      data = { value: result1.output };

      // Second transformation
      const result2 = await agent.execute({
        intent: 'transform',
        parameters: {
          expression: 'value + 5',
          input: data,
          context: data
        }
      });
      results.push(result2);

      expect(results[0].output).toBe(10); // 5 * 2
      expect(results[1].output).toBe(15); // 10 + 5
    });

    it('should preserve workflow context across transformations', async () => {
      const context = {
        workflowId: 'wf-123',
        userId: 'user-456',
        multiplier: 3
      };

      const input = { baseValue: 10 };

      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          expression: 'baseValue * multiplier',
          input,
          context: { ...context, ...input }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe(30);
    });
  });

  describe('data type handling', () => {
    it('should handle string transformation', async () => {
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: 'Result: {{text}}',
          input: { text: 'transformation' }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('transformation');
    });

    it('should handle number transformation', async () => {
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: 'Value: {{count}}',
          input: { count: 42 }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('42');
    });

    it('should handle boolean transformation', async () => {
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: 'Active: {{status}}',
          input: { status: true }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('true');
    });

    it('should handle array in template', async () => {
      const result = await agent.execute({
        intent: 'transform',
        parameters: {
          template: 'Items: {{items}}',
          input: { items: [1, 2, 3] }
        }
      });

      expect(result.success).toBe(true);
    });
  });
});
