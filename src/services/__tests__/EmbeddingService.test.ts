/**
 * Tests for EmbeddingService
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { embeddingService } from '../EmbeddingService';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AuditService
vi.mock('../AuditService', () => ({
  auditActions: {
    errorOccurred: vi.fn(),
    toolExecuted: vi.fn(),
  },
}));

describe('EmbeddingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    embeddingService.clearCache();
    embeddingService.updateConfig({
      provider: 'local',
      dimension: 384,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('should have default configuration', () => {
      const config = embeddingService.getConfig();

      expect(config.provider).toBe('local');
      expect(config.dimension).toBe(384);
    });

    it('should update configuration', () => {
      embeddingService.updateConfig({ provider: 'openai', apiKey: 'test-key' });

      const config = embeddingService.getConfig();
      expect(config.provider).toBe('openai');
      expect(config.apiKey).toBe('test-key');
    });
  });

  describe('local embedding', () => {
    it('should generate local embedding', async () => {
      const result = await embeddingService.generateEmbedding('Hello world');

      expect(result.vector).toBeDefined();
      expect(result.vector.length).toBe(384);
      expect(result.model).toBe('local-tfidf');
    });

    it('should generate normalized vectors', async () => {
      const result = await embeddingService.generateEmbedding('Test text for embedding');

      // Check if vector is normalized (magnitude ~ 1)
      const magnitude = Math.sqrt(
        result.vector.reduce((sum, val) => sum + val * val, 0)
      );

      expect(magnitude).toBeCloseTo(1, 1);
    });

    it('should generate different embeddings for different texts', async () => {
      const result1 = await embeddingService.generateEmbedding('Hello world');
      const result2 = await embeddingService.generateEmbedding('Goodbye universe');

      // Vectors should be different
      const similarity = embeddingService.cosineSimilarity(result1.vector, result2.vector);
      expect(similarity).toBeLessThan(0.9);
    });

    it('should generate similar embeddings for similar texts', async () => {
      const result1 = await embeddingService.generateEmbedding('The cat sat on the mat');
      const result2 = await embeddingService.generateEmbedding('The cat is on the mat');

      const similarity = embeddingService.cosineSimilarity(result1.vector, result2.vector);
      expect(similarity).toBeGreaterThan(0.5);
    });
  });

  describe('caching', () => {
    it('should cache embeddings', async () => {
      await embeddingService.generateEmbedding('Cache test');
      await embeddingService.generateEmbedding('Cache test');

      const stats = embeddingService.getCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should return cached result', async () => {
      const result1 = await embeddingService.generateEmbedding('Cache test');
      const result2 = await embeddingService.generateEmbedding('Cache test');

      expect(result1.vector).toEqual(result2.vector);
    });

    it('should clear cache', async () => {
      await embeddingService.generateEmbedding('Test');

      embeddingService.clearCache();

      const stats = embeddingService.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vector = [1, 2, 3, 4, 5];

      const similarity = embeddingService.cosineSimilarity(vector, vector);

      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];

      const similarity = embeddingService.cosineSimilarity(vector1, vector2);

      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vector1 = [1, 2, 3];
      const vector2 = [-1, -2, -3];

      const similarity = embeddingService.cosineSimilarity(vector1, vector2);

      expect(similarity).toBeCloseTo(-1, 5);
    });

    it('should return 0 for different length vectors', () => {
      const vector1 = [1, 2, 3];
      const vector2 = [1, 2];

      const similarity = embeddingService.cosineSimilarity(vector1, vector2);

      expect(similarity).toBe(0);
    });

    it('should return 0 for zero vectors', () => {
      const vector1 = [0, 0, 0];
      const vector2 = [1, 2, 3];

      const similarity = embeddingService.cosineSimilarity(vector1, vector2);

      expect(similarity).toBe(0);
    });
  });

  describe('OpenAI embedding', () => {
    beforeEach(() => {
      embeddingService.updateConfig({
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'text-embedding-3-small',
      });
    });

    it('should call OpenAI API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ embedding: [0.1, 0.2, 0.3] }],
            model: 'text-embedding-3-small',
            usage: { prompt_tokens: 5, total_tokens: 5 },
          }),
      });

      const result = await embeddingService.generateEmbedding('Test text');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );

      // Vector is L2-normalized by the service
      const rawVec = [0.1, 0.2, 0.3];
      const mag = Math.sqrt(rawVec.reduce((s, v) => s + v * v, 0));
      const expected = rawVec.map(v => v / mag);
      expect(result.vector.length).toBe(3);
      result.vector.forEach((val: number, i: number) => {
        expect(val).toBeCloseTo(expected[i], 5);
      });
      expect(result.model).toBe('text-embedding-3-small');
      expect(result.usage).toEqual({ promptTokens: 5, totalTokens: 5 });
    });

    it('should throw error without API key', async () => {
      embeddingService.updateConfig({ provider: 'openai', apiKey: undefined });

      // Should fallback to local since openai fails
      const result = await embeddingService.generateEmbedding('Test');
      expect(result.model).toBe('local-tfidf');
    });

    it('should fallback to local on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'API Error' } }),
      });

      const result = await embeddingService.generateEmbedding('Test text');

      // Should fallback to local
      expect(result.model).toBe('local-tfidf');
    });
  });

  describe('batch embeddings', () => {
    it('should generate batch embeddings for local provider', async () => {
      embeddingService.updateConfig({ provider: 'local' });

      const results = await embeddingService.generateBatchEmbeddings([
        'Text 1',
        'Text 2',
        'Text 3',
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.vector.length).toBe(384);
        expect(result.model).toBe('local-tfidf');
      });
    });

    it('should batch API call for OpenAI provider', async () => {
      embeddingService.updateConfig({
        provider: 'openai',
        apiKey: 'test-key',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { embedding: [0.1, 0.2], index: 0 },
              { embedding: [0.3, 0.4], index: 1 },
            ],
            model: 'text-embedding-3-small',
            usage: { prompt_tokens: 10, total_tokens: 10 },
          }),
      });

      const results = await embeddingService.generateBatchEmbeddings(['Text 1', 'Text 2']);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(2);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      await embeddingService.generateEmbedding('Test 1');
      await embeddingService.generateEmbedding('Test 2');

      const stats = embeddingService.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.provider).toBe('local');
      expect(stats.dimension).toBe(384);
    });
  });
});
