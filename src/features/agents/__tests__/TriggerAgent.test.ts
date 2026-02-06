/**
 * Tests for TriggerAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TriggerAgent } from '../implementations/TriggerAgent';
import { AgentDomains } from '../core/types';

describe('TriggerAgent', () => {
  let agent: TriggerAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new TriggerAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('TriggerAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('trigger');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('0.1.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.INTEGRATION);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('trigger');
      expect(agent.capabilities).toContain('webhook');
    });
  });

  describe('execute - trigger intent', () => {
    it('should trigger and return success', async () => {
      const result = await agent.execute({
        intent: 'trigger',
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output?.triggered).toBe(true);
    });

    it('should include timestamp', async () => {
      const result = await agent.execute({
        intent: 'trigger',
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output?.timestamp).toBeDefined();
      expect(typeof result.output?.timestamp).toBe('string');
    });

    it('should include payload from parameters', async () => {
      const mockData = { action: 'test', data: 123 };
      const result = await agent.execute({
        intent: 'trigger',
        parameters: {
          mockData
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.payload).toEqual(mockData);
    });

    it('should handle empty payload', async () => {
      const result = await agent.execute({
        intent: 'trigger',
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output?.payload).toEqual({});
    });

    it('should handle complex payload', async () => {
      const complexPayload = {
        user: { id: 1, name: 'Alice' },
        event: 'workflow_start',
        metadata: { version: '1.0.0', timestamp: Date.now() }
      };
      const result = await agent.execute({
        intent: 'trigger',
        parameters: {
          mockData: complexPayload
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.payload).toEqual(complexPayload);
    });
  });

  describe('execute - webhook intent', () => {
    it('should handle webhook intent', async () => {
      const result = await agent.execute({
        intent: 'webhook',
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output?.triggered).toBe(true);
    });

    it('should include timestamp for webhook', async () => {
      const result = await agent.execute({
        intent: 'webhook',
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output?.timestamp).toBeDefined();
    });

    it('should support webhook payload', async () => {
      const webhookPayload = { event: 'push', repo: 'test-repo' };
      const result = await agent.execute({
        intent: 'webhook',
        parameters: {
          mockData: webhookPayload
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.payload).toEqual(webhookPayload);
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

  describe('timestamp behavior', () => {
    it('should generate ISO timestamp', async () => {
      const result = await agent.execute({
        intent: 'trigger',
        parameters: {}
      });

      expect(result.success).toBe(true);
      const timestamp = result.output?.timestamp;
      // Verify ISO 8601 format
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should generate recent timestamp', async () => {
      const beforeTime = Date.now();
      const result = await agent.execute({
        intent: 'trigger',
        parameters: {}
      });
      const afterTime = Date.now();

      expect(result.success).toBe(true);
      const timestamp = new Date(result.output?.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime - 100);
      expect(timestamp).toBeLessThanOrEqual(afterTime + 100);
    });

    it('should have unique timestamps across calls', async () => {
      const result1 = await agent.execute({
        intent: 'trigger',
        parameters: {}
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));

      const result2 = await agent.execute({
        intent: 'trigger',
        parameters: {}
      });

      expect(result1.output?.timestamp).not.toBe(result2.output?.timestamp);
    });
  });

  describe('workflow integration', () => {
    it('should be suitable as workflow start trigger', async () => {
      const result = await agent.execute({
        intent: 'trigger',
        parameters: {
          mockData: {
            workflowId: 'wf-123',
            initiator: 'user@example.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.triggered).toBe(true);
      expect(result.output?.payload?.workflowId).toBe('wf-123');
    });

    it('should support webhook-based workflow triggers', async () => {
      const webhookEvent = {
        event_type: 'repository.push',
        repository: 'my-repo',
        branch: 'main',
        commit: { sha: 'abc123', message: 'Update docs' }
      };

      const result = await agent.execute({
        intent: 'webhook',
        parameters: {
          mockData: webhookEvent
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.payload?.event_type).toBe('repository.push');
    });

    it('should handle rapid successive triggers', async () => {
      const results = await Promise.all([
        agent.execute({ intent: 'trigger', parameters: { mockData: { id: 1 } } }),
        agent.execute({ intent: 'trigger', parameters: { mockData: { id: 2 } } }),
        agent.execute({ intent: 'trigger', parameters: { mockData: { id: 3 } } })
      ]);

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.output?.payload?.id).toBe(index + 1);
      });
    });
  });

  describe('error handling', () => {
    it('should gracefully handle null parameters', async () => {
      const result = await agent.execute({
        intent: 'trigger',
        parameters: null as any
      });

      expect(result.success).toBe(true);
    });

    it('should gracefully handle undefined parameters', async () => {
      const result = await agent.execute({
        intent: 'trigger',
        parameters: undefined as any
      });

      expect(result.success).toBe(true);
    });
  });
});
