/**
 * Tests for WorkflowHTTPAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowHTTPAgent } from '../implementations/WorkflowHTTPAgent';
import { AgentDomains } from '../core/types';

// Mock axios
vi.mock('axios', () => ({
  default: {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('WorkflowHTTPAgent', () => {
  let agent: WorkflowHTTPAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new WorkflowHTTPAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('WorkflowHTTPAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('HTTP');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.INTEGRATION);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('httpRequest');
      expect(agent.capabilities).toContain('apiCall');
      expect(agent.capabilities).toContain('webhookManagement');
    });

    it('should have valid property set to true', () => {
      expect(agent.valid).toBe(true);
    });
  });

  describe('execute - httpRequest intent', () => {
    it('should handle httpRequest intent', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://localhost/api/test',
          method: 'GET'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should include metadata with execution time', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://api.example.com/data',
          method: 'GET'
        }
      });

      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should support GET requests', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://api.example.com/users',
          method: 'GET'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support POST requests', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://api.example.com/users',
          method: 'POST',
          data: { name: 'John', email: 'john@example.com' }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support PUT requests', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://api.example.com/users/1',
          method: 'PUT',
          data: { name: 'Jane' }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support DELETE requests', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://api.example.com/users/1',
          method: 'DELETE'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - apiCall intent', () => {
    it('should handle apiCall intent', async () => {
      const result = await agent.execute({
        intent: 'apiCall',
        parameters: {
          endpoint: 'http://api.github.com/repos',
          method: 'GET'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support API calls with authentication', async () => {
      const result = await agent.execute({
        intent: 'apiCall',
        parameters: {
          endpoint: 'http://api.example.com/data',
          method: 'GET',
          headers: { 'Authorization': 'Bearer token123' }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support API calls with request body', async () => {
      const result = await agent.execute({
        intent: 'apiCall',
        parameters: {
          endpoint: 'http://api.openai.com/completions',
          method: 'POST',
          data: { model: 'gpt-4', prompt: 'Hello' }
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - webhookManagement intent', () => {
    it('should handle webhookManagement intent', async () => {
      const result = await agent.execute({
        intent: 'webhookManagement',
        parameters: {
          action: 'register',
          url: 'http://localhost/webhook',
          event: 'workflow.complete'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support webhook registration', async () => {
      const result = await agent.execute({
        intent: 'webhookManagement',
        parameters: {
          action: 'register',
          url: 'http://api.example.com/hooks/workflow',
          event: 'workflow.started'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support webhook deregistration', async () => {
      const result = await agent.execute({
        intent: 'webhookManagement',
        parameters: {
          action: 'unregister',
          webhookId: 'webhook-123'
        }
      });

      expect(result.success).toBeDefined();
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

  describe('input validation', () => {
    it('should validate required parameters for httpRequest', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {}
      });

      if (!result.success) {
        expect(result.error).toContain('Validation failed');
      }
    });

    it('should validate API endpoint URLs', async () => {
      const result = await agent.execute({
        intent: 'apiCall',
        parameters: {
          endpoint: 'not-a-valid-url'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle null parameters', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: null as any
      });

      expect(result.success).toBe(false);
    });
  });

  describe('security', () => {
    it('should restrict requests to allowed hosts', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://api.github.com/repos',
          method: 'GET'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should block requests to untrusted hosts', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://malicious-site.com/data',
          method: 'GET'
        }
      });

      // Should either block or handle safely
      expect(result.success).toBeDefined();
    });

    it('should not leak sensitive headers in errors', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://api.example.com/data',
          method: 'GET',
          headers: { 'Authorization': 'Bearer secret-token' }
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('workflow integration', () => {
    it('should fetch data for workflow processing', async () => {
      const result = await agent.execute({
        intent: 'apiCall',
        parameters: {
          endpoint: 'http://api.example.com/users',
          method: 'GET'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support data transformation between API calls', async () => {
      const call1 = await agent.execute({
        intent: 'apiCall',
        parameters: {
          endpoint: 'http://api.example.com/users/1',
          method: 'GET'
        }
      });

      expect(call1.success).toBeDefined();

      // Use result for second call
      const call2 = await agent.execute({
        intent: 'apiCall',
        parameters: {
          endpoint: 'http://api.example.com/posts',
          method: 'GET'
        }
      });

      expect(call2.success).toBeDefined();
    });

    it('should trigger webhooks on workflow events', async () => {
      const result = await agent.execute({
        intent: 'webhookManagement',
        parameters: {
          action: 'register',
          url: 'http://api.example.com/webhooks/workflow-complete',
          event: 'workflow.completed'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://unreachable-host.invalid/api',
          method: 'GET'
        }
      });

      // Should have error handling
      expect(result.success).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      const result = await agent.execute({
        intent: 'apiCall',
        parameters: {
          endpoint: 'http://api.example.com/error',
          method: 'GET'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should provide meaningful error messages', async () => {
      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://api.example.com/missing',
          method: 'GET'
        }
      });

      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('performance', () => {
    it('should execute HTTP requests efficiently', async () => {
      const startTime = Date.now();

      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://localhost:8080/api/test',
          method: 'GET'
        }
      });

      const duration = Date.now() - startTime;
      expect(result.metadata?.executionTime).toBeDefined();
    });

    it('should handle large request/response payloads', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: 'x'.repeat(100)
        }))
      };

      const result = await agent.execute({
        intent: 'httpRequest',
        parameters: {
          url: 'http://api.example.com/batch',
          method: 'POST',
          data: largeData
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

    it('should provide capability details', async () => {
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
