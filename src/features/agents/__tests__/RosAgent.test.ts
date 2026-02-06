/**
 * Tests for RosAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RosAgent } from '../implementations/RosAgent';

// Mock roslib
vi.mock('roslib', () => ({
  Ros: vi.fn(function(options) {
    this.url = options.url;
    this.isConnected = true;
    this.on = vi.fn();
    this.close = vi.fn();
  }),
  Topic: vi.fn(function(options) {
    this.name = options.name;
    this.messageType = options.messageType;
    this.publish = vi.fn();
    this.subscribe = vi.fn((cb) => cb({ data: 'test' }));
    this.unsubscribe = vi.fn();
  }),
  Service: vi.fn(function(options) {
    this.name = options.name;
    this.callService = vi.fn((req, success) => success({ result: true }));
  }),
  Message: vi.fn(function(payload) {
    this.payload = payload;
  }),
  ServiceRequest: vi.fn(function(payload) {
    this.payload = payload;
  })
}));

describe('RosAgent', () => {
  let agent: RosAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new RosAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct id', () => {
      expect(agent.id).toBe('RosAgent');
    });

    it('should have correct name', () => {
      expect(agent.name).toBe('ROS Agent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('ROS');
    });
  });

  describe('execute - publish mode', () => {
    it('should publish to ROS topic', async () => {
      const result = await agent.execute({
        url: 'ws://localhost:9090',
        topic: '/cmd_vel',
        messageType: 'geometry_msgs/Twist',
        mode: 'publish',
        payload: { linear: { x: 1 } }
      }, {} as any);

      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
    });

    it('should require payload for publish', async () => {
      try {
        await agent.execute({
          url: 'ws://localhost:9090',
          topic: '/cmd_vel',
          messageType: 'geometry_msgs/Twist',
          mode: 'publish'
        }, {} as any);
        expect(true).toBe(false); // Should throw
      } catch (error: any) {
        expect(error.message).toContain('Payload');
      }
    });
  });

  describe('execute - subscribe mode', () => {
    it('should subscribe to ROS topic', async () => {
      const result = await agent.execute({
        url: 'ws://localhost:9090',
        topic: '/sensor_data',
        messageType: 'sensor_msgs/Image',
        mode: 'subscribe',
        timeout: 5000
      }, {} as any);

      expect(result).toBeDefined();
    });

    it('should handle subscription timeout', async () => {
      try {
        await agent.execute({
          url: 'ws://localhost:9090',
          topic: '/slow_topic',
          messageType: 'std_msgs/String',
          mode: 'subscribe',
          timeout: 100
        }, {} as any);
      } catch (error: any) {
        expect(error.message).toContain('timed out');
      }
    });
  });

  describe('execute - service mode', () => {
    it('should call ROS service', async () => {
      const result = await agent.execute({
        url: 'ws://localhost:9090',
        topic: '/get_param',
        messageType: 'rosgraph_msgs/GetParamRequest',
        mode: 'service',
        payload: { key: 'test_param' }
      }, {} as any);

      expect(result).toBeDefined();
    });

    it('should require payload for service', async () => {
      try {
        await agent.execute({
          url: 'ws://localhost:9090',
          topic: '/service',
          messageType: 'my_service/Request',
          mode: 'service'
        }, {} as any);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('Payload');
      }
    });
  });

  describe('parameter validation', () => {
    it('should require all required parameters', async () => {
      try {
        await agent.execute({
          url: 'ws://localhost:9090'
        } as any, {} as any);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('required');
      }
    });
  });

  describe('ROS integration', () => {
    it('should handle multiple topics', async () => {
      const topics = ['/cmd_vel', '/odom', '/sensor_data'];

      for (const topic of topics) {
        const result = await agent.execute({
          url: 'ws://localhost:9090',
          topic,
          messageType: 'std_msgs/String',
          mode: 'publish',
          payload: { data: 'test' }
        }, {} as any);

        expect(result.ok).toBe(true);
      }
    });

    it('should support different message types', async () => {
      const messageTypes = ['geometry_msgs/Twist', 'sensor_msgs/Image', 'std_msgs/String'];

      for (const messageType of messageTypes) {
        const result = await agent.execute({
          url: 'ws://localhost:9090',
          topic: '/test',
          messageType,
          mode: 'publish',
          payload: {}
        }, {} as any);

        expect(result.ok).toBe(true);
      }
    });
  });

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      try {
        await agent.execute({
          url: 'ws://invalid-host:9090',
          topic: '/test',
          messageType: 'std_msgs/String',
          mode: 'publish',
          payload: {}
        }, {} as any);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid modes', async () => {
      try {
        await agent.execute({
          url: 'ws://localhost:9090',
          topic: '/test',
          messageType: 'std_msgs/String',
          mode: 'invalid' as any
        }, {} as any);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('Unsupported');
      }
    });
  });
});
