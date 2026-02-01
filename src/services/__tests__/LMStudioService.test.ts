/**
 * Tests for LMStudioService
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import LMStudioService from '../LMStudioService';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
  CapacitorHttp: {
    request: vi.fn(),
  },
}));

// Mock networkConfig
vi.mock('../../config/networkConfig', () => ({
  getLMStudioUrl: vi.fn(() => '/lmstudio/v1'),
}));

describe('LMStudioService', () => {
  let service: LMStudioService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LMStudioService({
      baseUrl: '/lmstudio/v1',
      model: 'mistral',
      temperature: 0.7,
      maxTokens: 4096,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('should have default configuration', () => {
      const defaultService = new LMStudioService();
      const config = defaultService.getConfig();

      expect(config.model).toBe('mistralai/devstral-small-2-2512');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(4096);
    });

    it('should accept custom configuration', () => {
      const customService = new LMStudioService({
        model: 'custom-model',
        temperature: 0.5,
      });

      const config = customService.getConfig();
      expect(config.model).toBe('custom-model');
      expect(config.temperature).toBe(0.5);
    });

    it('should update configuration', () => {
      service.setConfig({ temperature: 0.9 });

      const config = service.getConfig();
      expect(config.temperature).toBe(0.9);
    });
  });

  describe('chat', () => {
    it('should send chat request and return response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Hello! How can I help?' } }],
          }),
      });

      const response = await service.chat([{ role: 'user', content: 'Hello' }]);

      expect(response).toBe('Hello! How can I help?');
      expect(mockFetch).toHaveBeenCalledWith(
        '/lmstudio/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should include system prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Response' } }],
          }),
      });

      await service.chat([{ role: 'user', content: 'Test' }]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toContain('Lisa');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.chat([{ role: 'user', content: 'Test' }])).rejects.toThrow(
        'LM Studio error: 500 Internal Server Error'
      );
    });

    it('should return default message when no content in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: {} }] }),
      });

      const response = await service.chat([{ role: 'user', content: 'Test' }]);

      expect(response).toContain('Désolé');
    });
  });

  describe('sanitizeMessages', () => {
    it('should filter empty messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Response' } }],
          }),
      });

      await service.chat([
        { role: 'user', content: '' },
        { role: 'user', content: 'Valid message' },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Should have system + valid user message
      expect(body.messages.length).toBe(2);
    });

    it('should merge consecutive same-role messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Response' } }],
          }),
      });

      await service.chat([
        { role: 'user', content: 'First' },
        { role: 'user', content: 'Second' },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Should merge user messages: system + merged user
      expect(body.messages.length).toBe(2);
      expect(body.messages[1].content).toContain('First');
      expect(body.messages[1].content).toContain('Second');
    });
  });

  describe('isAvailable', () => {
    it('should return true when LM Studio is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'model-1' }] }),
      });

      const available = await service.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when LM Studio is not available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const available = await service.isAvailable();

      expect(available).toBe(false);
    });

    it('should try multiple URLs', async () => {
      // First URL fails
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      // Second URL succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const available = await service.isAvailable();

      expect(available).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getModels', () => {
    it('should return list of models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ id: 'model-1' }, { id: 'model-2' }],
          }),
      });

      const models = await service.getModels();

      expect(models).toEqual(['model-1', 'model-2']);
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const models = await service.getModels();

      expect(models).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ id: 'devstral-model' }],
          }),
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.model).toBe('devstral-model');
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.model).toBeNull();
      expect(health.error).toBe('Connection failed');
    });

    it('should return degraded status for high latency', async () => {
      // Simulate slow response
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ data: [{ id: 'model' }] }),
                }),
              1100
            )
          )
      );

      const health = await service.healthCheck();

      expect(health.status).toBe('degraded');
    });
  });

  describe('isReady', () => {
    it('should return true when healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'model' }] }),
      });

      const ready = await service.isReady();

      expect(ready).toBe(true);
    });

    it('should return false when unhealthy', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Error'));

      const ready = await service.isReady();

      expect(ready).toBe(false);
    });
  });
});
