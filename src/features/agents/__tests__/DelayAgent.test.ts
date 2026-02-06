/**
 * Tests for DelayAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DelayAgent } from '../implementations/DelayAgent';
import { AgentDomains } from '../core/types';

describe('DelayAgent', () => {
  let agent: DelayAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new DelayAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('DelayAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('delay');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('0.1.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.PRODUCTIVITY);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('delay');
    });
  });

  describe('execute - delay intent', () => {
    it('should delay for specified milliseconds', async () => {
      const startTime = Date.now();
      const result = await agent.execute({
        intent: 'delay',
        parameters: {
          delayMs: '100'
        }
      });

      const duration = Date.now() - startTime;
      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should use default delay of 1000ms if not specified', async () => {
      const startTime = Date.now();
      const result = await agent.execute({
        intent: 'delay',
        parameters: {}
      });

      const duration = Date.now() - startTime;
      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(900); // Account for timing variance
    });

    it('should cap delay at 5000ms', async () => {
      const startTime = Date.now();
      const result = await agent.execute({
        intent: 'delay',
        parameters: {
          delayMs: '10000' // Requesting 10 seconds, should be capped at 5
        }
      });

      const duration = Date.now() - startTime;
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(7000); // Should not wait full 10 seconds
    });

    it('should return delayed flag and metadata', async () => {
      const result = await agent.execute({
        intent: 'delay',
        parameters: {
          delayMs: '50'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.delayed).toBe(true);
      expect(result.output?.delayMs).toBe(50);
    });

    it('should preserve input data in output', async () => {
      const inputData = { key: 'value', count: 42 };
      const result = await agent.execute({
        intent: 'delay',
        parameters: {
          delayMs: '50',
          input: inputData
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.original).toEqual(inputData);
    });

    it('should handle non-numeric delayMs by parsing', async () => {
      const result = await agent.execute({
        intent: 'delay',
        parameters: {
          delayMs: 'invalid'
        }
      });

      expect(result.success).toBe(true);
      // Should use default delay since parsing fails
      expect(result.output?.delayMs).toBe(1000);
    });

    it('should handle zero delay', async () => {
      const result = await agent.execute({
        intent: 'delay',
        parameters: {
          delayMs: '0'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.delayMs).toBe(0);
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

  describe('error handling', () => {
    it('should handle execution errors gracefully', async () => {
      const result = await agent.execute({
        intent: 'delay',
        parameters: {
          delayMs: null
        }
      });

      expect(result.success).toBe(true); // Should use default
    });
  });

  describe('workflow integration', () => {
    it('should be suitable for workflow pause/wait steps', async () => {
      const startTime = Date.now();
      const delays = [100, 100];

      for (const delayMs of delays) {
        const result = await agent.execute({
          intent: 'delay',
          parameters: { delayMs: String(delayMs) }
        });
        expect(result.success).toBe(true);
      }

      const totalDuration = Date.now() - startTime;
      expect(totalDuration).toBeGreaterThanOrEqual(200);
    });

    it('should handle rapid successive calls', async () => {
      const results = await Promise.all([
        agent.execute({ intent: 'delay', parameters: { delayMs: '10' } }),
        agent.execute({ intent: 'delay', parameters: { delayMs: '10' } }),
        agent.execute({ intent: 'delay', parameters: { delayMs: '10' } })
      ]);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});
