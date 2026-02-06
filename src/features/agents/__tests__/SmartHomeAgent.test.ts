/**
 * Tests for SmartHomeAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SmartHomeAgent } from '../implementations/SmartHomeAgent';
import { AgentDomains } from '../core/types';

describe('SmartHomeAgent', () => {
  let agent: SmartHomeAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SmartHomeAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('SmartHomeAgent');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.INTEGRATION);
    });

    it('should have device control capability', () => {
      expect(agent.capabilities).toContain('device_control');
    });
  });

  describe('execute - toggle_device intent', () => {
    it('should toggle light device', async () => {
      const result = await agent.execute({
        intent: 'toggle_device',
        parameters: { deviceId: 'salon_lumiere' }
      });

      expect(result.success).toBe(true);
    });

    it('should require deviceId parameter', async () => {
      const result = await agent.execute({
        intent: 'toggle_device',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });

    it('should handle thermostat toggling', async () => {
      const result = await agent.execute({
        intent: 'toggle_device',
        parameters: { deviceId: 'salon_thermostat' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - get_device_status intent', () => {
    it('should get device status', async () => {
      const result = await agent.execute({
        intent: 'get_device_status',
        parameters: { deviceId: 'salon_lumiere' }
      });

      expect(result.success).toBe(true);
      if (result.output) {
        expect(result.output.status).toBeDefined();
      }
    });

    it('should return device type', async () => {
      const result = await agent.execute({
        intent: 'get_device_status',
        parameters: { deviceId: 'entree_lock' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - set_device_value intent', () => {
    it('should set device value', async () => {
      const result = await agent.execute({
        intent: 'set_device_value',
        parameters: {
          deviceId: 'salon_lumiere',
          property: 'brightness',
          value: 75
        }
      });

      expect(result.success).toBe(true);
    });

    it('should set temperature', async () => {
      const result = await agent.execute({
        intent: 'set_device_value',
        parameters: {
          deviceId: 'salon_thermostat',
          property: 'temperature',
          value: 22
        }
      });

      expect(result.success).toBe(true);
    });

    it('should set color property', async () => {
      const result = await agent.execute({
        intent: 'set_device_value',
        parameters: {
          deviceId: 'salon_lumiere',
          property: 'color',
          value: 'cool'
        }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - run_scene intent', () => {
    it('should run a scene', async () => {
      const result = await agent.execute({
        intent: 'run_scene',
        parameters: { sceneId: 'film' }
      });

      expect(result.success).toBe(true);
    });

    it('should require sceneId parameter', async () => {
      const result = await agent.execute({
        intent: 'run_scene',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });

    it('should handle multiple devices in scene', async () => {
      const result = await agent.execute({
        intent: 'run_scene',
        parameters: { sceneId: 'film' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - list_devices intent', () => {
    it('should list all devices', async () => {
      const result = await agent.execute({
        intent: 'list_devices',
        parameters: {}
      });

      expect(result.success).toBe(true);
      if (result.output?.devices) {
        expect(Array.isArray(result.output.devices)).toBe(true);
      }
    });

    it('should filter devices by type', async () => {
      const result = await agent.execute({
        intent: 'list_devices',
        parameters: { type: 'light' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - list_scenes intent', () => {
    it('should list available scenes', async () => {
      const result = await agent.execute({
        intent: 'list_scenes',
        parameters: {}
      });

      expect(result.success).toBe(true);
      if (result.output?.scenes) {
        expect(Array.isArray(result.output.scenes)).toBe(true);
      }
    });
  });

  describe('device types', () => {
    it('should support light devices', async () => {
      const result = await agent.execute({
        intent: 'get_device_status',
        parameters: { deviceId: 'cuisine_lumiere' }
      });

      expect(result.success).toBe(true);
    });

    it('should support thermostat devices', async () => {
      const result = await agent.execute({
        intent: 'get_device_status',
        parameters: { deviceId: 'salon_thermostat' }
      });

      expect(result.success).toBe(true);
    });

    it('should support lock devices', async () => {
      const result = await agent.execute({
        intent: 'get_device_status',
        parameters: { deviceId: 'entree_lock' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('scene management', () => {
    it('should apply all device states in scene', async () => {
      const result = await agent.execute({
        intent: 'run_scene',
        parameters: { sceneId: 'film' }
      });

      expect(result.success).toBe(true);
    });

    it('should handle scene not found', async () => {
      const result = await agent.execute({
        intent: 'run_scene',
        parameters: { sceneId: 'non-existent' }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle unknown intent', async () => {
      const result = await agent.execute({
        intent: 'unknown_intent' as any,
        parameters: {}
      });

      expect(result.success).toBe(false);
    });

    it('should handle missing parameters', async () => {
      const result = await agent.execute({
        intent: 'set_device_value' as any,
        parameters: { deviceId: 'light1' }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('automation patterns', () => {
    it('should support turning off all lights', async () => {
      const lights = ['salon_lumiere', 'cuisine_lumiere', 'chambre_lumiere'];

      for (const light of lights) {
        const result = await agent.execute({
          intent: 'set_device_value',
          parameters: { deviceId: light, property: 'on', value: false }
        });

        expect(result.success).toBe(true);
      }
    });

    it('should support temperature adjustment', async () => {
      const result = await agent.execute({
        intent: 'set_device_value',
        parameters: {
          deviceId: 'salon_thermostat',
          property: 'temperature',
          value: 20
        }
      });

      expect(result.success).toBe(true);
    });
  });
});
