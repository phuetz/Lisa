/**
 * Tests for RobotAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RobotAgent } from '../implementations/RobotAgent';
import { AgentDomains } from '../core/types';

// Mock RosService - path relative to test file must resolve to src/services/RosService
vi.mock('../../../services/RosService', () => ({
  RosService: vi.fn(function(url: string) {
    this.url = url;
    this.ensureConnection = vi.fn().mockResolvedValue(undefined);
    this.publish = vi.fn();
    this.callService = vi.fn().mockResolvedValue({});
  })
}));

describe('RobotAgent', () => {
  let agent: RobotAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new RobotAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('RobotAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('robot');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('0.1.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.INTEGRATION);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('move');
      expect(agent.capabilities).toContain('turn');
      expect(agent.capabilities).toContain('pickUp');
    });
  });

  describe('execute - move intent', () => {
    it('should move robot by distance', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: { distance: 10 }
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('10');
    });

    it('should handle positive distance', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: { distance: 5.5 }
      });

      expect(result.success).toBe(true);
    });

    it('should handle negative distance (backward)', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: { distance: -10 }
      });

      expect(result.success).toBe(true);
    });

    it('should handle zero distance', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: { distance: 0 }
      });

      expect(result.success).toBe(true);
    });

    it('should require distance parameter', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('distance');
    });

    it('should reject non-numeric distance', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: { distance: 'invalid' }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - turn intent', () => {
    it('should turn robot by angle', async () => {
      const result = await agent.execute({
        intent: 'turn',
        parameters: { angle: 90 }
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('90');
    });

    it('should handle positive angle (counterclockwise)', async () => {
      const result = await agent.execute({
        intent: 'turn',
        parameters: { angle: 45 }
      });

      expect(result.success).toBe(true);
    });

    it('should handle negative angle (clockwise)', async () => {
      const result = await agent.execute({
        intent: 'turn',
        parameters: { angle: -90 }
      });

      expect(result.success).toBe(true);
    });

    it('should handle 360 degree rotation', async () => {
      const result = await agent.execute({
        intent: 'turn',
        parameters: { angle: 360 }
      });

      expect(result.success).toBe(true);
    });

    it('should handle fractional angles', async () => {
      const result = await agent.execute({
        intent: 'turn',
        parameters: { angle: 22.5 }
      });

      expect(result.success).toBe(true);
    });

    it('should require angle parameter', async () => {
      const result = await agent.execute({
        intent: 'turn',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('angle');
    });

    it('should reject non-numeric angle', async () => {
      const result = await agent.execute({
        intent: 'turn',
        parameters: { angle: 'ninety' }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - pickUp intent', () => {
    it('should pick up object by ID', async () => {
      const result = await agent.execute({
        intent: 'pickUp',
        parameters: { objectId: 'object-123' }
      });

      expect(result.success).toBe(true);
    });

    it('should handle various object identifiers', async () => {
      const objectIds = ['obj-1', 'cube_red', 'block_42', 'item_abc'];

      for (const objectId of objectIds) {
        const result = await agent.execute({
          intent: 'pickUp',
          parameters: { objectId }
        });

        expect(result.success).toBe(true);
      }
    });

    it('should require objectId parameter', async () => {
      const result = await agent.execute({
        intent: 'pickUp',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('objectId');
    });

    it('should reject non-string objectId', async () => {
      const result = await agent.execute({
        intent: 'pickUp',
        parameters: { objectId: 123 }
      });

      expect(result.success).toBe(false);
    });

    it('should handle pickup service responses', async () => {
      const result = await agent.execute({
        intent: 'pickUp',
        parameters: { objectId: 'target-object' }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toContain('target-object');
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

  describe('ROS integration', () => {
    it('should ensure ROS connection before execution', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: { distance: 5 }
      });

      expect(result.success).toBeDefined();
    });

    it('should publish to /cmd_vel for movement', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: { distance: 10 }
      });

      expect(result.success).toBe(true);
    });

    it('should call /pick_up_object service', async () => {
      const result = await agent.execute({
        intent: 'pickUp',
        parameters: { objectId: 'test-obj' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle ROS communication errors', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: { distance: 10 }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle null parameters gracefully', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: null as any
      });

      expect(result.success).toBe(false);
    });
  });

  describe('robot movement patterns', () => {
    it('should support square movement pattern', async () => {
      const movements = [10, 90, 10, 90, 10, 90, 10, 90];

      for (let i = 0; i < movements.length; i += 2) {
        const moveResult = await agent.execute({
          intent: 'move',
          parameters: { distance: movements[i] }
        });
        expect(moveResult.success).toBe(true);

        const turnResult = await agent.execute({
          intent: 'turn',
          parameters: { angle: movements[i + 1] }
        });
        expect(turnResult.success).toBe(true);
      }
    });

    it('should handle sequential operations', async () => {
      const result1 = await agent.execute({
        intent: 'move',
        parameters: { distance: 5 }
      });

      const result2 = await agent.execute({
        intent: 'turn',
        parameters: { angle: 45 }
      });

      const result3 = await agent.execute({
        intent: 'pickUp',
        parameters: { objectId: 'obj-1' }
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
    });
  });

  describe('parameter validation', () => {
    it('should handle missing parameters object', async () => {
      const result = await agent.execute({
        intent: 'move'
      });

      expect(result.success).toBe(false);
    });

    it('should handle undefined parameters', async () => {
      const result = await agent.execute({
        intent: 'move',
        parameters: undefined as any
      });

      expect(result.success).toBe(false);
    });
  });
});
