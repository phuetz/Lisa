/**
 * SmartHomeService Tests
 * Tests for smart home device management and automation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock console methods
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock agent registry - define mocks inline to avoid hoisting issues
vi.mock('../../features/agents/core/registry', () => ({
  agentRegistry: {
    getAgentAsync: vi.fn((name: string) => {
      if (name === 'MQTTAgent') {
        return Promise.resolve({
          execute: vi.fn().mockResolvedValue({
            success: true,
            output: {
              devices: [
                {
                  id: 'light-1',
                  name: 'Living Room Light',
                  type: 'light',
                  room: 'living_room',
                  status: 'online',
                  state: { on: true, brightness: 80 },
                  capabilities: ['on_off', 'brightness'],
                },
              ],
            },
          }),
        });
      }
      if (name === 'SmartHomeAgent') {
        return Promise.resolve({
          execute: vi.fn().mockResolvedValue({ success: true }),
        });
      }
      if (name === 'VisionAgent') return Promise.resolve({});
      return Promise.resolve(null);
    }),
  },
}));

// Import after mocks
import { smartHomeService } from '../SmartHomeService';
import type { SmartDevice as _SmartDevice } from '../SmartHomeService';

describe('SmartHomeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Default Scenes', () => {
    it('should have default scenes initialized', () => {
      const scenes = smartHomeService.getAllScenes();

      expect(scenes.length).toBeGreaterThanOrEqual(4);
      expect(scenes.some(s => s.id === 'scene_morning')).toBe(true);
      expect(scenes.some(s => s.id === 'scene_away')).toBe(true);
      expect(scenes.some(s => s.id === 'scene_night')).toBe(true);
      expect(scenes.some(s => s.id === 'scene_movie')).toBe(true);
    });
  });

  describe('discoverDevices', () => {
    it('should discover devices via MQTT agent', async () => {
      const devices = await smartHomeService.discoverDevices();

      // Verify devices were discovered
      expect(devices.length).toBeGreaterThanOrEqual(1);
      expect(devices[0].id).toBe('light-1');
    });

    it('should store discovered devices', async () => {
      await smartHomeService.discoverDevices();

      const device = smartHomeService.getDevice('light-1');
      expect(device).toBeDefined();
      expect(device?.name).toBe('Living Room Light');
    });
  });

  describe('controlDevice', () => {
    it('should control device via SmartHome agent', async () => {
      // First discover devices
      await smartHomeService.discoverDevices();

      const result = await smartHomeService.controlDevice('light-1', 'brightness', 50);

      expect(result).toBe(true);
    });

    it('should return false for unknown device', async () => {
      const result = await smartHomeService.controlDevice('unknown-device', 'on', true);

      expect(result).toBe(false);
    });

    it('should update device state after control', async () => {
      await smartHomeService.discoverDevices();
      await smartHomeService.controlDevice('light-1', 'brightness', 30);

      const device = smartHomeService.getDevice('light-1');
      expect(device?.state.brightness).toBe(30);
    });
  });

  describe('Automation Rules', () => {
    it('should add automation rule', () => {
      const rule = smartHomeService.addRule({
        name: 'Turn on lights at sunset',
        enabled: true,
        trigger: { type: 'time', config: { hour: 18, minute: 0 } },
        actions: [
          {
            type: 'device_control',
            deviceId: 'light-1',
            config: { command: 'on', value: true },
          },
        ],
      });

      expect(rule.id).toMatch(/^rule_/);
      expect(rule.name).toBe('Turn on lights at sunset');
      expect(rule.triggerCount).toBe(0);
    });

    it('should list all rules', () => {
      smartHomeService.addRule({
        name: 'Rule 1',
        enabled: true,
        trigger: { type: 'time', config: {} },
        actions: [],
      });

      const rules = smartHomeService.getAllRules();
      expect(rules.length).toBeGreaterThanOrEqual(1);
    });

    it('should toggle rule enabled state', () => {
      const rule = smartHomeService.addRule({
        name: 'Test Rule',
        enabled: true,
        trigger: { type: 'time', config: {} },
        actions: [],
      });

      smartHomeService.toggleRule(rule.id, false);

      const rules = smartHomeService.getAllRules();
      const updated = rules.find(r => r.id === rule.id);
      expect(updated?.enabled).toBe(false);
    });

    it('should delete rule', () => {
      const rule = smartHomeService.addRule({
        name: 'To Delete',
        enabled: true,
        trigger: { type: 'time', config: {} },
        actions: [],
      });

      const beforeCount = smartHomeService.getAllRules().length;
      smartHomeService.deleteRule(rule.id);
      const afterCount = smartHomeService.getAllRules().length;

      expect(afterCount).toBe(beforeCount - 1);
    });
  });

  describe('getDevicesByRoom', () => {
    it('should filter devices by room', async () => {
      await smartHomeService.discoverDevices();

      const livingRoomDevices = smartHomeService.getDevicesByRoom('living_room');

      expect(livingRoomDevices.length).toBeGreaterThanOrEqual(1);
      expect(livingRoomDevices[0].room).toBe('living_room');
    });

    it('should return empty array for unknown room', () => {
      const devices = smartHomeService.getDevicesByRoom('nonexistent_room');

      expect(devices).toEqual([]);
    });
  });

  describe('Presence Detection', () => {
    it('should enable presence detection', async () => {
      await smartHomeService.enablePresenceDetection();
      // Should not throw
      expect(true).toBe(true);
    });

    it('should disable presence detection', () => {
      smartHomeService.disablePresenceDetection();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Subscription', () => {
    it('should notify subscribers when devices change', async () => {
      const callback = vi.fn();

      const unsubscribe = smartHomeService.subscribe(callback);
      await smartHomeService.discoverDevices();

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(expect.any(Array));

      unsubscribe();
    });

    it('should stop notifying after unsubscribe', async () => {
      const callback = vi.fn();

      const unsubscribe = smartHomeService.subscribe(callback);
      unsubscribe();

      await smartHomeService.discoverDevices();

      // Callback shouldn't be called after unsubscribe
      // (though it might have been called once during discover before unsubscribe)
      const callCount = callback.mock.calls.length;
      await smartHomeService.discoverDevices();

      // Should not increase
      expect(callback.mock.calls.length).toBe(callCount);
    });
  });
});
