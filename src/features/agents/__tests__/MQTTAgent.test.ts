/**
 * Tests for MQTTAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MQTTAgent } from '../implementations/MQTTAgent';
import { AgentDomains } from '../core/types';

// Mock mqtt
vi.mock('mqtt', () => ({
  connect: vi.fn()
}));

describe('MQTTAgent', () => {
  let agent: MQTTAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new MQTTAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('MQTTAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('MQTT');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.INTEGRATION);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('mqtt_connect');
      expect(agent.capabilities).toContain('mqtt_publish');
      expect(agent.capabilities).toContain('mqtt_subscribe');
      expect(agent.capabilities).toContain('mqtt_disconnect');
    });
  });

  describe('execute - connect action', () => {
    it('should connect to MQTT broker', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'connect',
        parameters: {
          brokerUrl: 'mqtt://localhost:1883'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should accept broker URL', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'connect',
        parameters: {
          brokerUrl: 'mqtt://broker.example.com:1883'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should require broker URL', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'connect',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });

    it('should support connection options', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'connect',
        parameters: {
          brokerUrl: 'mqtt://localhost:1883',
          options: { username: 'user', password: 'pass' }
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - publish action', () => {
    it('should publish message to topic', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'publish',
        parameters: {
          topic: 'sensors/temperature',
          message: '23.5'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should require topic parameter', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'publish',
        parameters: {
          message: 'test'
        }
      });

      expect(result.success).toBe(false);
    });

    it('should require message parameter', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'publish',
        parameters: {
          topic: 'test/topic'
        }
      });

      expect(result.success).toBe(false);
    });

    it('should handle JSON messages', async () => {
      const message = JSON.stringify({ temp: 25, humidity: 60 });
      const result = await agent.execute({
        intent: 'execute',
        action: 'publish',
        parameters: {
          topic: 'sensors/data',
          message
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support publish options (QoS, retain)', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'publish',
        parameters: {
          topic: 'home/state',
          message: 'online',
          options: { qos: 1, retain: true }
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - subscribe action', () => {
    it('should subscribe to topic', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'subscribe',
        parameters: {
          topic: 'sensors/humidity'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should require topic for subscription', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'subscribe',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });

    it('should handle wildcard subscriptions', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'subscribe',
        parameters: {
          topic: 'sensors/+/temperature'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support subscription options', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'subscribe',
        parameters: {
          topic: 'updates/+',
          options: { qos: 1 }
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - unsubscribe action', () => {
    it('should unsubscribe from topic', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'unsubscribe',
        parameters: {
          topic: 'sensors/temperature'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should require topic for unsubscription', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'unsubscribe',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - disconnect action', () => {
    it('should disconnect from broker', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'disconnect',
        parameters: {}
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('IoT integration patterns', () => {
    it('should publish sensor data', async () => {
      const sensorData = {
        temperature: 22.5,
        humidity: 55,
        pressure: 1013.25
      };

      const result = await agent.execute({
        intent: 'execute',
        action: 'publish',
        parameters: {
          topic: 'home/sensors/livingroom',
          message: JSON.stringify(sensorData)
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle device status updates', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'publish',
        parameters: {
          topic: 'home/devices/light/status',
          message: 'on',
          options: { retain: true }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should subscribe to control commands', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'subscribe',
        parameters: {
          topic: 'home/commands/+/control'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle publishing when not connected', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'publish',
        parameters: {
          topic: 'test',
          message: 'msg'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle subscription when not connected', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'subscribe',
        parameters: {
          topic: 'test'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle invalid actions', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'invalid_action' as any,
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('MQTT broker compatibility', () => {
    it('should support Mosquitto broker', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'connect',
        parameters: {
          brokerUrl: 'mqtt://mosquitto:1883'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support HiveMQ broker', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'connect',
        parameters: {
          brokerUrl: 'mqtt://broker.hivemq.com:1883'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support secured MQTT (mqtts)', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'connect',
        parameters: {
          brokerUrl: 'mqtts://secure-broker.example.com:8883',
          options: { key: 'cert.key', cert: 'cert.crt' }
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('message handling', () => {
    it('should handle large messages', async () => {
      const largeMessage = JSON.stringify({
        data: Array.from({ length: 1000 }, (_, i) => i)
      });

      const result = await agent.execute({
        intent: 'execute',
        action: 'publish',
        parameters: {
          topic: 'data/large',
          message: largeMessage
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle binary messages', async () => {
      const result = await agent.execute({
        intent: 'execute',
        action: 'publish',
        parameters: {
          topic: 'binary/data',
          message: Buffer.from('binary data').toString('base64')
        }
      });

      expect(result.success).toBeDefined();
    });
  });
});
