/**
 * Tests for CriticAgentV2
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CriticAgentV2, criticAgentV2 } from '../implementations/CriticAgentV2';
import type { ActionProposal } from '../implementations/CriticAgentV2';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    })
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

// Mock AuditService
vi.mock('../../../services/AuditService', () => ({
  auditActions: {
    toolExecuted: vi.fn(),
    toolBlocked: vi.fn(),
    errorOccurred: vi.fn()
  }
}));

describe('CriticAgentV2', () => {
  let agent: CriticAgentV2;

  beforeEach(() => {
    agent = new CriticAgentV2();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('CriticAgentV2');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('2.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe('analysis');
    });

    it('should have capabilities defined', () => {
      expect(agent.capabilities).toContain('validate_action');
      expect(agent.capabilities).toContain('assess_risks');
      expect(agent.capabilities).toContain('check_permissions');
      expect(agent.capabilities).toContain('check_reversibility');
    });

    it('should have description', () => {
      expect(agent.description).toBeTruthy();
      expect(agent.description.length).toBeGreaterThan(10);
    });
  });

  describe('execute method', () => {
    const createProposal = (overrides?: Partial<ActionProposal>): ActionProposal => ({
      id: 'test-123',
      type: 'tool',
      name: 'testTool',
      description: 'A test tool',
      parameters: {},
      timestamp: new Date().toISOString(),
      ...overrides
    });

    it('should validate action with valid proposal', async () => {
      const proposal = createProposal();
      const result = await agent.execute({
        intent: 'validate_action',
        parameters: { proposal }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output.approved).toBeDefined();
      expect(result.output.riskAssessment).toBeDefined();
    });

    it('should return error when proposal is missing', async () => {
      const result = await agent.execute({
        intent: 'validate_action',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing proposal parameter');
    });

    it('should assess risks for a proposal', async () => {
      const proposal = createProposal({ type: 'system' });
      const result = await agent.execute({
        intent: 'assess_risks',
        parameters: { proposal }
      });

      expect(result.success).toBe(true);
      expect(result.output.riskLevel).toBeDefined();
      expect(result.output.score).toBeDefined();
      expect(result.output.factors).toBeInstanceOf(Array);
    });

    it('should get validation history', async () => {
      const result = await agent.execute({
        intent: 'get_history',
        parameters: { limit: 10 }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeInstanceOf(Array);
    });

    it('should get stats', async () => {
      const result = await agent.execute({
        intent: 'get_stats',
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.totalValidations).toBeDefined();
      expect(result.output.approved).toBeDefined();
      expect(result.output.rejected).toBeDefined();
    });

    it('should return error for unknown intent without proposal', async () => {
      const result = await agent.execute({
        intent: 'unknown_intent',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown intent');
    });

    it('should default to validate_action when proposal provided with unknown intent', async () => {
      const proposal = createProposal();
      const result = await agent.execute({
        intent: 'some_other_intent',
        parameters: { proposal }
      });

      expect(result.success).toBe(true);
      expect(result.output.approved).toBeDefined();
    });
  });

  describe('risk assessment', () => {
    const createProposal = (overrides?: Partial<ActionProposal>): ActionProposal => ({
      id: 'test-123',
      type: 'tool',
      name: 'testTool',
      description: 'A test tool',
      parameters: {},
      timestamp: new Date().toISOString(),
      ...overrides
    });

    it('should detect dangerous parameters', async () => {
      const proposal = createProposal({
        name: 'executeTool',
        parameters: { command: 'exec rm -rf /data', target: '/data' }
      });

      const result = await agent.execute({
        intent: 'validate_action',
        parameters: { proposal }
      });

      expect(result.success).toBe(true);
      // The agent detects dangerous patterns like 'exec' in parameters
      expect(result.output.riskAssessment.score).toBeGreaterThan(0);
    });

    it('should flag system type actions', async () => {
      const proposal = createProposal({ type: 'system' });

      const result = await agent.execute({
        intent: 'assess_risks',
        parameters: { proposal }
      });

      expect(result.success).toBe(true);
      const factors = result.output.factors;
      expect(factors.some((f: { category: string }) => f.category === 'security')).toBe(true);
    });

    it('should approve low risk actions', async () => {
      const proposal = createProposal({
        name: 'readData',
        type: 'tool',
        parameters: { query: 'select * from users' }
      });

      const result = await agent.execute({
        intent: 'validate_action',
        parameters: { proposal }
      });

      expect(result.success).toBe(true);
      expect(result.output.riskAssessment.riskLevel).toBe('low');
    });
  });

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(criticAgentV2).toBeDefined();
      expect(criticAgentV2).toBeInstanceOf(CriticAgentV2);
    });

    it('singleton should have same properties as new instance', () => {
      expect(criticAgentV2.name).toBe(agent.name);
      expect(criticAgentV2.version).toBe(agent.version);
      expect(criticAgentV2.domain).toBe(agent.domain);
    });
  });
});
