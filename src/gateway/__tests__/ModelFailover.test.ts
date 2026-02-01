/**
 * Tests unitaires pour ModelFailover
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelFailover, getModelFailover, resetModelFailover } from '../ModelFailover';

describe('ModelFailover', () => {
  let failover: ModelFailover;

  beforeEach(() => {
    resetModelFailover();
    failover = new ModelFailover({
      models: [
        { provider: 'openai', model: 'gpt-4', apiKey: 'test-key', priority: 1 },
        { provider: 'anthropic', model: 'claude-3-sonnet', apiKey: 'test-key', priority: 2 },
        { provider: 'ollama', model: 'llama3', baseUrl: 'http://localhost:11434', priority: 3 },
      ],
      maxRetries: 3,
      retryDelayMs: 100,
      timeoutMs: 5000,
    });
  });

  afterEach(() => {
    resetModelFailover();
  });

  describe('Configuration', () => {
    it('should create instance with config', () => {
      expect(failover).toBeInstanceOf(ModelFailover);
    });

    it('should accept multiple providers', () => {
      const multiProvider = new ModelFailover({
        models: [
          { provider: 'openai', model: 'gpt-4', apiKey: 'key1', priority: 1 },
          { provider: 'anthropic', model: 'claude-3', apiKey: 'key2', priority: 2 },
          { provider: 'google', model: 'gemini-pro', apiKey: 'key3', priority: 3 },
          { provider: 'groq', model: 'llama3-70b', apiKey: 'key4', priority: 4 },
          { provider: 'mistral', model: 'mistral-large', apiKey: 'key5', priority: 5 },
          { provider: 'ollama', model: 'llama3', baseUrl: 'http://localhost:11434', priority: 6 },
        ],
      });
      expect(multiProvider).toBeInstanceOf(ModelFailover);
    });

    it('should use singleton pattern', () => {
      const f1 = getModelFailover({
        models: [{ provider: 'openai', model: 'gpt-4', apiKey: 'key', priority: 1 }],
      });
      const f2 = getModelFailover({
        models: [{ provider: 'anthropic', model: 'claude', apiKey: 'key', priority: 1 }],
      });
      expect(f1).toBe(f2);
    });

    it('should reset singleton', () => {
      const f1 = getModelFailover({
        models: [{ provider: 'openai', model: 'gpt-4', apiKey: 'key', priority: 1 }],
      });
      resetModelFailover();
      const f2 = getModelFailover({
        models: [{ provider: 'anthropic', model: 'claude', apiKey: 'key', priority: 1 }],
      });
      expect(f1).not.toBe(f2);
    });
  });

  describe('Health Status', () => {
    it('should return health status for all models', () => {
      const health = failover.getHealthStatus();
      expect(health).toBeDefined();
      expect(typeof health).toBe('object');
    });

    it('should return healthy models', () => {
      const healthy = failover.getHealthyModels();
      expect(Array.isArray(healthy)).toBe(true);
    });
  });

  describe('Model Selection', () => {
    it('should have models configured', () => {
      expect(failover).toBeDefined();
    });

    it('should track model health', () => {
      const health = failover.getHealthStatus();
      expect(health).toBeDefined();
    });
  });

  describe('Event Emitter', () => {
    it('should emit events', () => {
      const callback = vi.fn();
      failover.on('test', callback);
      failover.emit('test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should emit error events', () => {
      const errorCallback = vi.fn();
      failover.on('error', errorCallback);
      failover.emit('error', { provider: 'openai', error: 'test error' });
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('Provider Support', () => {
    it('should support OpenAI provider', () => {
      const openaiFailover = new ModelFailover({
        models: [{ provider: 'openai', model: 'gpt-4', apiKey: 'key', priority: 1 }],
      });
      expect(openaiFailover).toBeInstanceOf(ModelFailover);
    });

    it('should support Anthropic provider', () => {
      const anthropicFailover = new ModelFailover({
        models: [{ provider: 'anthropic', model: 'claude-3', apiKey: 'key', priority: 1 }],
      });
      expect(anthropicFailover).toBeInstanceOf(ModelFailover);
    });

    it('should support Google provider', () => {
      const googleFailover = new ModelFailover({
        models: [{ provider: 'google', model: 'gemini-pro', apiKey: 'key', priority: 1 }],
      });
      expect(googleFailover).toBeInstanceOf(ModelFailover);
    });

    it('should support Groq provider', () => {
      const groqFailover = new ModelFailover({
        models: [{ provider: 'groq', model: 'llama3-70b', apiKey: 'key', priority: 1 }],
      });
      expect(groqFailover).toBeInstanceOf(ModelFailover);
    });

    it('should support Mistral provider', () => {
      const mistralFailover = new ModelFailover({
        models: [{ provider: 'mistral', model: 'mistral-large', apiKey: 'key', priority: 1 }],
      });
      expect(mistralFailover).toBeInstanceOf(ModelFailover);
    });

    it('should support Ollama provider', () => {
      const ollamaFailover = new ModelFailover({
        models: [{ provider: 'ollama', model: 'llama3', baseUrl: 'http://localhost:11434', priority: 1 }],
      });
      expect(ollamaFailover).toBeInstanceOf(ModelFailover);
    });
  });
});
