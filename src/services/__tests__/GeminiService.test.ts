/**
 * Tests for GeminiService
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GeminiService, GEMINI_MODELS } from '../GeminiService';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GeminiService({ apiKey: 'test-api-key' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('should detect when configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should detect when not configured', () => {
      const unconfiguredService = new GeminiService({ apiKey: '' });
      // May have env key, so just check the apiKey setter works
      unconfiguredService.setApiKey('');
      expect(unconfiguredService.isConfigured()).toBe(false);
    });

    it('should set API key', () => {
      const newService = new GeminiService({ apiKey: '' });
      newService.setApiKey(''); // Ensure it's empty
      expect(newService.isConfigured()).toBe(false);

      newService.setApiKey('new-key');
      expect(newService.isConfigured()).toBe(true);
    });

    it('should set and get model', () => {
      service.setModel('gemini-1.5-pro');
      expect(service.getModel()).toBe('gemini-1.5-pro');
    });

    it('should return available models', () => {
      const models = service.getAvailableModels();
      expect(models).toEqual(GEMINI_MODELS);
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('isAvailable', () => {
    it('should return false when not configured', async () => {
      const unconfigured = new GeminiService({ apiKey: '' });
      const available = await unconfigured.isAvailable();
      expect(available).toBe(false);
    });

    it('should return true when API responds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const available = await service.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const available = await service.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('chat', () => {
    it('should throw error when not configured', async () => {
      const unconfigured = new GeminiService({ apiKey: '' });
      unconfigured.setApiKey(''); // Ensure it's empty

      await expect(unconfigured.chat('Hello')).rejects.toThrow('API key not configured');
    });

    it('should send chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Hello! How can I help?' }] } }],
          }),
      });

      const response = await service.chat('Hello');

      expect(response).toBe('Hello! How can I help?');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should include system instruction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Response' }] } }],
          }),
      });

      await service.chat('Test');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.systemInstruction).toBeDefined();
      expect(body.systemInstruction.parts[0].text).toContain('Lisa');
    });

    it('should handle image input', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'I see an image' }] } }],
          }),
      });

      await service.chat('What is this?', 'data:image/png;base64,abc123');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userMessage = body.contents[0];
      expect(userMessage.parts.length).toBe(2);
      expect(userMessage.parts[1].inlineData).toBeDefined();
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      await expect(service.chat('Test')).rejects.toThrow('Invalid API key');
    });

    it('should maintain conversation history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'First response' }] } }],
          }),
      });

      await service.chat('First message');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Second response' }] } }],
          }),
      });

      await service.chat('Second message');

      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      // Should have user, model, user (3 messages in history)
      expect(body.contents.length).toBe(3);
    });
  });

  describe('clearHistory', () => {
    it('should clear conversation history', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Response' }] } }],
          }),
      });

      await service.chat('First');
      await service.chat('Second');

      service.clearHistory();

      await service.chat('After clear');

      // Last call should only have 1 message (fresh start)
      const body = JSON.parse(mockFetch.mock.calls[2][1].body);
      expect(body.contents.length).toBe(1);
    });
  });

  describe('analyzeImage', () => {
    it('should analyze image with default prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Image analysis' }] } }],
          }),
      });

      const result = await service.analyzeImage('data:image/png;base64,abc');

      expect(result).toBe('Image analysis');
    });

    it('should use custom prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Custom analysis' }] } }],
          }),
      });

      await service.analyzeImage('data:image/png;base64,abc', 'Custom prompt');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.contents[0].parts[0].text).toBe('Custom prompt');
    });
  });

  describe('generateCode', () => {
    it('should generate code with language', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'const x = 1;' }] } }],
          }),
      });

      const code = await service.generateCode('Create a variable', 'javascript');

      expect(code).toBe('const x = 1;');
    });
  });

  describe('translate', () => {
    it('should translate text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Bonjour' }] } }],
          }),
      });

      const translated = await service.translate('Hello', 'French');

      expect(translated).toBe('Bonjour');
    });
  });

  describe('summarize', () => {
    it('should summarize text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Summary here' }] } }],
          }),
      });

      const summary = await service.summarize('Long text...', 100);

      expect(summary).toBe('Summary here');
    });
  });

  describe('GEMINI_MODELS', () => {
    it('should have required properties for each model', () => {
      GEMINI_MODELS.forEach((model) => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.description).toBeDefined();
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.outputTokens).toBeGreaterThan(0);
        expect(Array.isArray(model.features)).toBe(true);
      });
    });

    it('should include latest models', () => {
      const modelIds = GEMINI_MODELS.map((m) => m.id);
      expect(modelIds).toContain('gemini-2.0-flash-exp');
      expect(modelIds).toContain('gemini-1.5-pro-latest');
    });
  });
});
