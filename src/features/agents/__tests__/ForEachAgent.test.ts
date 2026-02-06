/**
 * Tests for ForEachAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForEachAgent } from '../implementations/ForEachAgent';
import { AgentDomains } from '../core/types';

describe('ForEachAgent', () => {
  let agent: ForEachAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new ForEachAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('ForEachAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('Iterates');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.PRODUCTIVITY);
    });
  });

  describe('execute - basic iteration', () => {
    it('should iterate over simple array', async () => {
      const list = [1, 2, 3];
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults).toEqual(list);
    });

    it('should iterate over objects in array', async () => {
      const list = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults).toEqual(list);
      expect(result.output?.iterationResults).toHaveLength(2);
    });

    it('should iterate over strings in array', async () => {
      const list = ['apple', 'banana', 'cherry'];
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults).toEqual(list);
    });

    it('should handle empty array', async () => {
      const list: any[] = [];
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults).toEqual([]);
      expect(result.output?.iterationResults).toHaveLength(0);
    });

    it('should handle single item array', async () => {
      const list = [{ value: 'test' }];
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults).toHaveLength(1);
    });
  });

  describe('execute - non-array input', () => {
    it('should reject string input', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list: 'not an array' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires an array');
    });

    it('should reject object input', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list: { items: [1, 2, 3] } }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires an array');
    });

    it('should reject number input', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list: 42 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires an array');
    });

    it('should reject null input', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list: null }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires an array');
    });

    it('should reject undefined input', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires an array');
    });
  });

  describe('execute - array with mixed types', () => {
    it('should handle arrays with mixed primitive types', async () => {
      const list = [1, 'two', true, null, undefined];
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults).toHaveLength(5);
    });

    it('should handle arrays with nested objects', async () => {
      const list = [
        { nested: { value: 1 } },
        { nested: { value: 2 } }
      ];
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults[0].nested.value).toBe(1);
    });

    it('should handle arrays with functions', async () => {
      const list = [
        () => 'test',
        () => 42
      ];
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults).toHaveLength(2);
    });
  });

  describe('execute - large arrays', () => {
    it('should handle large arrays efficiently', async () => {
      const list = Array.from({ length: 1000 }, (_, i) => i);
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults).toHaveLength(1000);
    });

    it('should handle very large arrays', async () => {
      const list = Array.from({ length: 10000 }, (_, i) => ({ index: i }));
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults).toHaveLength(10000);
    });
  });

  describe('workflow integration', () => {
    it('should preserve array order for sequential processing', async () => {
      const list = ['first', 'second', 'third'];
      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults[0]).toBe('first');
      expect(result.output?.iterationResults[1]).toBe('second');
      expect(result.output?.iterationResults[2]).toBe('third');
    });

    it('should maintain item identity throughout iteration', async () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const list = [obj1, obj2];

      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      expect(result.output?.iterationResults[0]).toBe(obj1);
      expect(result.output?.iterationResults[1]).toBe(obj2);
    });

    it('should be chainable with other workflow agents', async () => {
      const list = [
        { value: 10 },
        { value: 20 },
        { value: 30 }
      ];

      const result = await agent.execute({
        intent: 'execute',
        parameters: { list }
      });

      expect(result.success).toBe(true);
      // Output can be used as input for next agent in workflow
      expect(Array.isArray(result.output?.iterationResults)).toBe(true);
    });
  });
});
