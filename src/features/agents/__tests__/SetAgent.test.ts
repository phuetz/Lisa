/**
 * Tests for SetAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SetAgent } from '../implementations/SetAgent';
import { AgentDomains } from '../core/types';

describe('SetAgent', () => {
  let agent: SetAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SetAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('SetAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('variable');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.PRODUCTIVITY);
    });
  });

  describe('execute - set variable', () => {
    it('should set a variable in empty input', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'name',
          value: 'John',
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.name).toBe('John');
    });

    it('should add variable to existing object', async () => {
      const input = { existing: 'value' };
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'newKey',
          value: 'newValue',
          input
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.existing).toBe('value');
      expect(result.output?.newKey).toBe('newValue');
    });

    it('should overwrite existing variable', async () => {
      const input = { name: 'Jane' };
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'name',
          value: 'John',
          input
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.name).toBe('John');
    });

    it('should set variable with null value', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'nullable',
          value: null,
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.nullable).toBe(null);
    });

    it('should set variable with undefined value', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'optional',
          value: undefined,
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.optional).toBeUndefined();
    });

    it('should set variable with object value', async () => {
      const objValue = { nested: { deep: 'value' } };
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'data',
          value: objValue,
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.data).toEqual(objValue);
    });

    it('should set variable with array value', async () => {
      const arrayValue = [1, 2, 3];
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'items',
          value: arrayValue,
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.items).toEqual(arrayValue);
    });

    it('should set variable with number value', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'count',
          value: 42,
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.count).toBe(42);
    });

    it('should set variable with boolean value', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'active',
          value: true,
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.active).toBe(true);
    });

    it('should set variable with string value', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'message',
          value: 'Hello World',
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.message).toBe('Hello World');
    });
  });

  describe('execute - no input', () => {
    it('should handle missing input parameter', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'test',
          value: 'value'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.test).toBe('value');
    });

    it('should handle null input', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'test',
          value: 'value',
          input: null
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.test).toBe('value');
    });
  });

  describe('execute - multiple variables', () => {
    it('should allow sequential variable setting', async () => {
      let result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'first',
          value: 1,
          input: {}
        }
      });

      expect(result.output?.first).toBe(1);

      result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'second',
          value: 2,
          input: result.output
        }
      });

      expect(result.output?.first).toBe(1);
      expect(result.output?.second).toBe(2);
    });
  });

  describe('execute - special variable names', () => {
    it('should handle numeric string keys', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: '123',
          value: 'numeric key',
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.['123']).toBe('numeric key');
    });

    it('should handle keys with special characters', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'my-key-123',
          value: 'special',
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.['my-key-123']).toBe('special');
    });

    it('should handle keys with underscores', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'my_key_name',
          value: 'underscore',
          input: {}
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.my_key_name).toBe('underscore');
    });
  });

  describe('workflow integration', () => {
    it('should be chainable for workflow variable management', async () => {
      const workflow = {
        step1: { key: 'userId', value: 123 },
        step2: { key: 'userName', value: 'Alice' },
        step3: { key: 'active', value: true }
      };

      let state: any = {};

      for (const step of Object.values(workflow)) {
        const result = await agent.execute({
          intent: 'execute',
          parameters: {
            ...step,
            input: state
          }
        });
        state = result.output;
      }

      expect(state.userId).toBe(123);
      expect(state.userName).toBe('Alice');
      expect(state.active).toBe(true);
    });

    it('should preserve context across workflow steps', async () => {
      const initialContext = {
        workflowId: 'wf-123',
        startTime: Date.now()
      };

      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          key: 'status',
          value: 'running',
          input: initialContext
        }
      });

      expect(result.output?.workflowId).toBe('wf-123');
      expect(result.output?.startTime).toBeDefined();
      expect(result.output?.status).toBe('running');
    });
  });
});
