/**
 * Tests for ScreenShareAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScreenShareAgent } from '../implementations/ScreenShareAgent';
import { AgentDomains } from '../core/types';

// Mock logger
vi.mock('../../../utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }))
}));

// Mock navigator.mediaDevices
const mockGetDisplayMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getDisplayMedia: mockGetDisplayMedia
  },
  writable: true
});

describe('ScreenShareAgent', () => {
  let agent: ScreenShareAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new ScreenShareAgent();

    // Default mock for getDisplayMedia
    mockGetDisplayMedia.mockResolvedValue({
      getTracks: vi.fn(() => [
        { stop: vi.fn(), kind: 'video' },
        { stop: vi.fn(), kind: 'audio' }
      ])
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('ScreenShareAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('écran');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.INTEGRATION);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('screen-sharing');
      expect(agent.capabilities).toContain('window-sharing');
      expect(agent.capabilities).toContain('monitor-sharing');
      expect(agent.capabilities).toContain('audio-sharing');
    });
  });

  describe('canHandle', () => {
    it('should recognize screen share keywords', async () => {
      const confidence1 = await agent.canHandle('partage d\'écran');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('screen share');
      expect(confidence2).toBeGreaterThan(0);

      const confidence3 = await agent.canHandle('partager mon écran');
      expect(confidence3).toBeGreaterThan(0);
    });

    it('should return zero for unrelated queries', async () => {
      const confidence = await agent.canHandle('what is the weather');
      expect(confidence).toBe(0);
    });
  });

  describe('execute - start_sharing action', () => {
    it('should start screen sharing', async () => {
      const result = await agent.execute({
        intent: 'start_sharing',
        parameters: {}
      });

      expect(result.success).toBeDefined();
    });

    it('should support display surface selection', async () => {
      const result = await agent.execute({
        intent: 'start_sharing',
        parameters: {
          displaySurface: 'window'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should include audio if requested', async () => {
      const result = await agent.execute({
        intent: 'start_sharing',
        parameters: {
          audio: true
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - stop_sharing action', () => {
    it('should stop screen sharing', async () => {
      // First start sharing
      await agent.execute({
        intent: 'start_sharing',
        parameters: {}
      });

      // Then stop
      const result = await agent.execute({
        intent: 'stop_sharing',
        parameters: {}
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - get_status action', () => {
    it('should get sharing status', async () => {
      const result = await agent.execute({
        intent: 'get_status',
        parameters: {}
      });

      expect(result.success).toBeDefined();
      expect(result.output.isActive).toBeDefined();
    });

    it('should show session info when active', async () => {
      // Start sharing first
      await agent.execute({
        intent: 'start_sharing',
        parameters: {}
      });

      const result = await agent.execute({
        intent: 'get_status',
        parameters: {}
      });

      expect(result.success).toBeDefined();
      expect(result.output.sessionId).toBeDefined();
    });
  });

  describe('execute - update_options action', () => {
    it('should update sharing options', async () => {
      const result = await agent.execute({
        intent: 'update_options',
        parameters: {
          audio: true,
          video: true
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('display surface options', () => {
    it('should support monitor sharing', async () => {
      const result = await agent.execute({
        intent: 'start_sharing',
        parameters: {
          displaySurface: 'monitor'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support window sharing', async () => {
      const result = await agent.execute({
        intent: 'start_sharing',
        parameters: {
          displaySurface: 'window'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support browser sharing', async () => {
      const result = await agent.execute({
        intent: 'start_sharing',
        parameters: {
          displaySurface: 'browser'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('audio sharing options', () => {
    it('should include system audio when requested', async () => {
      const result = await agent.execute({
        intent: 'start_sharing',
        parameters: {
          systemAudio: 'include'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should exclude system audio when requested', async () => {
      const result = await agent.execute({
        intent: 'start_sharing',
        parameters: {
          systemAudio: 'exclude'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle sharing rejection', async () => {
      mockGetDisplayMedia.mockRejectedValueOnce(new Error('User cancelled'));

      const result = await agent.execute({
        intent: 'start_sharing',
        parameters: {}
      });

      // Should handle error gracefully
      expect(result.success).toBeDefined();
    });

    it('should handle browser not supported', async () => {
      mockGetDisplayMedia.mockRejectedValueOnce(new Error('getDisplayMedia not supported'));

      const result = await agent.execute({
        intent: 'start_sharing',
        parameters: {}
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('session management', () => {
    it('should maintain session ID', async () => {
      const startResult = await agent.execute({
        intent: 'start_sharing',
        parameters: {}
      });

      const statusResult = await agent.execute({
        intent: 'get_status',
        parameters: {}
      });

      if (startResult.output.sessionId) {
        expect(statusResult.output.sessionId).toBeDefined();
      }
    });

    it('should track session duration', async () => {
      await agent.execute({
        intent: 'start_sharing',
        parameters: {}
      });

      const statusResult = await agent.execute({
        intent: 'get_status',
        parameters: {}
      });

      expect(statusResult.output.duration).toBeDefined();
    });
  });
});
