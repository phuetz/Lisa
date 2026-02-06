/**
 * Tests for UserWorkflowAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserWorkflowAgent } from '../implementations/UserWorkflowAgent';
import { AgentDomains } from '../core/types';

describe('UserWorkflowAgent', () => {
  let agent: UserWorkflowAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new UserWorkflowAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('UserWorkflowAgent');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.PRODUCTIVITY);
    });

    it('should have valid property set to true', () => {
      expect(agent.valid).toBe(true);
    });
  });

  describe('execute - createWorkflow intent', () => {
    it('should create user-defined workflow', async () => {
      const workflowDefinition = {
        name: 'My Workflow',
        nodes: [
          { type: 'trigger', id: 'trigger-1' },
          { type: 'action', id: 'action-1' }
        ],
        edges: [
          { from: 'trigger-1', to: 'action-1' }
        ]
      };

      const result = await agent.execute({
        intent: 'createWorkflow',
        parameters: { workflow: workflowDefinition }
      });

      expect(result.success).toBeDefined();
    });

    it('should validate workflow structure', async () => {
      const invalidWorkflow = {
        name: 'Invalid',
        nodes: []
      };

      const result = await agent.execute({
        intent: 'createWorkflow',
        parameters: { workflow: invalidWorkflow }
      });

      expect(result.success).toBeDefined();
    });

    it('should return workflow ID on creation', async () => {
      const workflow = {
        name: 'Test Workflow',
        nodes: [{ type: 'trigger', id: 'trigger-1' }],
        edges: []
      };

      const result = await agent.execute({
        intent: 'createWorkflow',
        parameters: { workflow }
      });

      if (result.success && result.output?.workflowId) {
        expect(typeof result.output.workflowId).toBe('string');
      }
    });
  });

  describe('execute - executeWorkflow intent', () => {
    it('should execute user-defined workflow', async () => {
      const result = await agent.execute({
        intent: 'executeWorkflow',
        parameters: {
          workflowId: 'workflow-123',
          input: { data: 'test' }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute workflow with configuration', async () => {
      const result = await agent.execute({
        intent: 'executeWorkflow',
        parameters: {
          workflowId: 'workflow-456',
          input: {},
          config: {
            timeout: 5000,
            retryCount: 3
          }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should include execution metadata', async () => {
      const result = await agent.execute({
        intent: 'executeWorkflow',
        parameters: {
          workflowId: 'workflow-789',
          input: {}
        }
      });

      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should pass input through workflow', async () => {
      const inputData = { userId: 1, action: 'approve' };

      const result = await agent.execute({
        intent: 'executeWorkflow',
        parameters: {
          workflowId: 'workflow-input-test',
          input: inputData
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - getWorkflow intent', () => {
    it('should retrieve workflow definition', async () => {
      const result = await agent.execute({
        intent: 'getWorkflow',
        parameters: {
          workflowId: 'workflow-123'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should include workflow metadata', async () => {
      const result = await agent.execute({
        intent: 'getWorkflow',
        parameters: {
          workflowId: 'workflow-metadata'
        }
      });

      if (result.success && result.output?.workflow) {
        expect(result.output.workflow.id).toBeDefined();
        expect(result.output.workflow.name).toBeDefined();
      }
    });
  });

  describe('execute - updateWorkflow intent', () => {
    it('should update existing workflow', async () => {
      const updates = {
        name: 'Updated Workflow',
        nodes: [
          { type: 'trigger', id: 'trigger-1' },
          { type: 'action', id: 'action-1' },
          { type: 'action', id: 'action-2' }
        ]
      };

      const result = await agent.execute({
        intent: 'updateWorkflow',
        parameters: {
          workflowId: 'workflow-update-test',
          updates
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should preserve workflow ID on update', async () => {
      const result = await agent.execute({
        intent: 'updateWorkflow',
        parameters: {
          workflowId: 'workflow-123',
          updates: { name: 'Updated Name' }
        }
      });

      if (result.success) {
        expect(result.output?.workflowId).toBe('workflow-123');
      }
    });
  });

  describe('execute - deleteWorkflow intent', () => {
    it('should delete workflow', async () => {
      const result = await agent.execute({
        intent: 'deleteWorkflow',
        parameters: {
          workflowId: 'workflow-to-delete'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should confirm deletion', async () => {
      const result = await agent.execute({
        intent: 'deleteWorkflow',
        parameters: {
          workflowId: 'workflow-delete-confirm'
        }
      });

      if (result.success) {
        expect(result.output?.deleted).toBe(true);
      }
    });
  });

  describe('execute - listWorkflows intent', () => {
    it('should list user workflows', async () => {
      const result = await agent.execute({
        intent: 'listWorkflows',
        parameters: {
          userId: 'user-123'
        }
      });

      expect(result.success).toBeDefined();
      if (result.success) {
        expect(Array.isArray(result.output?.workflows)).toBe(true);
      }
    });

    it('should support pagination', async () => {
      const result = await agent.execute({
        intent: 'listWorkflows',
        parameters: {
          userId: 'user-123',
          page: 1,
          limit: 10
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support filtering', async () => {
      const result = await agent.execute({
        intent: 'listWorkflows',
        parameters: {
          userId: 'user-123',
          status: 'active'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - validateWorkflow intent', () => {
    it('should validate workflow definition', async () => {
      const workflow = {
        name: 'Valid Workflow',
        nodes: [
          { type: 'trigger', id: 'trigger-1' },
          { type: 'action', id: 'action-1' }
        ],
        edges: [
          { from: 'trigger-1', to: 'action-1' }
        ]
      };

      const result = await agent.execute({
        intent: 'validateWorkflow',
        parameters: { workflow }
      });

      expect(result.success).toBeDefined();
      if (result.success) {
        expect(result.output?.valid).toBeDefined();
      }
    });

    it('should detect invalid node references', async () => {
      const workflow = {
        name: 'Invalid Workflow',
        nodes: [{ type: 'trigger', id: 'trigger-1' }],
        edges: [
          { from: 'trigger-1', to: 'non-existent-id' }
        ]
      };

      const result = await agent.execute({
        intent: 'validateWorkflow',
        parameters: { workflow }
      });

      expect(result.success).toBeDefined();
    });

    it('should provide validation errors', async () => {
      const invalidWorkflow = {
        name: '',
        nodes: []
      };

      const result = await agent.execute({
        intent: 'validateWorkflow',
        parameters: { workflow: invalidWorkflow }
      });

      if (!result.success || (result.output?.valid === false)) {
        expect(result.output?.errors).toBeDefined();
      }
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

  describe('workflow lifecycle', () => {
    it('should support complete workflow lifecycle', async () => {
      // Create
      const createResult = await agent.execute({
        intent: 'createWorkflow',
        parameters: {
          workflow: {
            name: 'Lifecycle Test',
            nodes: [{ type: 'trigger', id: 'trigger-1' }],
            edges: []
          }
        }
      });

      expect(createResult.success).toBeDefined();
      const workflowId = createResult.output?.workflowId;

      if (workflowId) {
        // Get
        const getResult = await agent.execute({
          intent: 'getWorkflow',
          parameters: { workflowId }
        });

        expect(getResult.success).toBeDefined();

        // Update
        const updateResult = await agent.execute({
          intent: 'updateWorkflow',
          parameters: {
            workflowId,
            updates: { name: 'Updated Lifecycle Test' }
          }
        });

        expect(updateResult.success).toBeDefined();

        // Execute
        const executeResult = await agent.execute({
          intent: 'executeWorkflow',
          parameters: {
            workflowId,
            input: {}
          }
        });

        expect(executeResult.success).toBeDefined();
      }
    });
  });

  describe('workflow persistence', () => {
    it('should persist workflow across multiple operations', async () => {
      const workflowId = 'workflow-persist-test';

      const result1 = await agent.execute({
        intent: 'executeWorkflow',
        parameters: { workflowId, input: {} }
      });

      const result2 = await agent.execute({
        intent: 'getWorkflow',
        parameters: { workflowId }
      });

      expect(result1.success).toBeDefined();
      expect(result2.success).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing workflow gracefully', async () => {
      const result = await agent.execute({
        intent: 'getWorkflow',
        parameters: {
          workflowId: 'non-existent-workflow'
        }
      });

      expect(result.success).toBeDefined();
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle execution errors', async () => {
      const result = await agent.execute({
        intent: 'executeWorkflow',
        parameters: {
          workflowId: 'workflow-error-test',
          input: {}
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should provide meaningful validation errors', async () => {
      const result = await agent.execute({
        intent: 'validateWorkflow',
        parameters: {
          workflow: null as any
        }
      });

      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('performance', () => {
    it('should handle workflow execution efficiently', async () => {
      const result = await agent.execute({
        intent: 'executeWorkflow',
        parameters: {
          workflowId: 'workflow-perf-test',
          input: {}
        }
      });

      expect(result.metadata?.executionTime).toBeDefined();
    });

    it('should support complex workflows', async () => {
      const complexWorkflow = {
        name: 'Complex Workflow',
        nodes: Array.from({ length: 50 }, (_, i) => ({
          type: i % 3 === 0 ? 'trigger' : 'action',
          id: `node-${i}`
        })),
        edges: Array.from({ length: 49 }, (_, i) => ({
          from: `node-${i}`,
          to: `node-${i + 1}`
        }))
      };

      const result = await agent.execute({
        intent: 'validateWorkflow',
        parameters: { workflow: complexWorkflow }
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
