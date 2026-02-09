/**
 * EmbeddingService - Service for generating text embeddings
 * Supports multiple providers: OpenAI, local transformers
 * Inspired by OpenClaw: L2 normalization + persistent IndexedDB cache
 */

import { openDB, type IDBPDatabase } from 'idb';
import { auditActions } from './AuditService';

export type EmbeddingProvider = 'openai' | 'local' | 'transformers';

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  apiKey?: string;
  model?: string;
  dimension?: number;
}

export interface EmbeddingResult {
  vector: number[];
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

interface CachedEmbedding {
  key: string;
  vector: number[];
  model: string;
  provider: string;
  createdAt: number;
}

const DEFAULT_CONFIG: EmbeddingConfig = {
  provider: 'local',
  dimension: 384,
  model: 'text-embedding-3-small'
};

const IDB_CACHE_NAME = 'lisa-embedding-cache';
const IDB_CACHE_VERSION = 1;
const IDB_STORE_NAME = 'embeddings';
const IDB_MAX_ENTRIES = 5000;

class EmbeddingServiceImpl {
  private config: EmbeddingConfig = DEFAULT_CONFIG;
  private cache: Map<string, number[]> = new Map();
  private readonly MAX_CACHE_SIZE = 500;
  private idbCache: IDBPDatabase | null = null;
  private idbInitPromise: Promise<void> | null = null;

  constructor() {
    // Fire-and-forget IDB init
    this.idbInitPromise = this.initIdbCache().catch(err => {
      console.warn('[EmbeddingService] IndexedDB cache init failed:', err);
    });
  }

  /**
   * Initialize persistent IndexedDB cache (OpenClaw-inspired)
   */
  private async initIdbCache(): Promise<void> {
    try {
      this.idbCache = await openDB(IDB_CACHE_NAME, IDB_CACHE_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            const store = db.createObjectStore(IDB_STORE_NAME, { keyPath: 'key' });
            store.createIndex('provider', 'provider');
            store.createIndex('createdAt', 'createdAt');
          }
        },
      });
    } catch {
      // IndexedDB not available (e.g., test environment)
      this.idbCache = null;
    }
  }

  /**
   * Update the embedding configuration
   */
  updateConfig(config: Partial<EmbeddingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * L2-normalize a vector to unit length (OpenClaw pattern)
   * Critical for cosine similarity accuracy across all providers.
   */
  private normalizeL2(vector: number[]): number[] {
    const sanitized = vector.map(v => Number.isFinite(v) ? v : 0);
    const magnitude = Math.sqrt(sanitized.reduce((sum, v) => sum + v * v, 0));
    if (magnitude < 1e-10) return sanitized;
    return sanitized.map(v => v / magnitude);
  }

  /**
   * Compute a stable hash for cache key
   */
  private hashText(text: string): string {
    let h = 0;
    for (let i = 0; i < text.length; i++) {
      h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(36);
  }

  /**
   * Generate embeddings for text
   * Cache lookup: LRU in-memory → IndexedDB persistent → generate + store
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const provider = this.config.provider;
    const contentHash = this.hashText(text);
    const cacheKey = `${provider}:${contentHash}`;

    // 1. Check in-memory LRU cache first
    const memCached = this.cache.get(cacheKey);
    if (memCached) {
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, memCached);
      return { vector: memCached, model: this.config.model || 'cached' };
    }

    // 2. Check persistent IndexedDB cache
    await this.idbInitPromise;
    if (this.idbCache) {
      try {
        const idbEntry = await this.idbCache.get(IDB_STORE_NAME, cacheKey) as CachedEmbedding | undefined;
        if (idbEntry) {
          // Promote to LRU
          this.cache.set(cacheKey, idbEntry.vector);
          if (this.cache.size > this.MAX_CACHE_SIZE) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) this.cache.delete(oldestKey);
          }
          return { vector: idbEntry.vector, model: idbEntry.model };
        }
      } catch {
        // Non-critical, continue to generation
      }
    }

    // 3. Generate embedding
    try {
      let result: EmbeddingResult;

      switch (provider) {
        case 'openai':
          result = await this.generateOpenAIEmbedding(text);
          break;
        case 'transformers':
          result = await this.generateTransformersEmbedding(text);
          break;
        case 'local':
        default:
          result = await this.generateLocalEmbedding(text);
          break;
      }

      // L2-normalize all vectors (local already normalizes, but idempotent)
      result.vector = this.normalizeL2(result.vector);

      // Store in LRU cache
      this.cache.set(cacheKey, result.vector);
      if (this.cache.size > this.MAX_CACHE_SIZE) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey !== undefined) this.cache.delete(oldestKey);
      }

      // Store in persistent IndexedDB cache (fire-and-forget)
      if (this.idbCache) {
        const entry: CachedEmbedding = {
          key: cacheKey,
          vector: result.vector,
          model: result.model,
          provider,
          createdAt: Date.now(),
        };
        this.idbCache.put(IDB_STORE_NAME, entry).catch(() => {});
        // Evict old entries if over limit (async, non-blocking)
        this.evictOldEntries().catch(() => {});
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      auditActions.errorOccurred(`Embedding generation failed: ${errorMsg}`, { text: text.slice(0, 100) });

      // Fallback to local embedding on error
      if (this.config.provider !== 'local') {
        console.warn('Falling back to local embeddings');
        return this.generateLocalEmbedding(text);
      }
      throw error;
    }
  }

  /**
   * Evict oldest IndexedDB entries when over limit
   */
  private async evictOldEntries(): Promise<void> {
    if (!this.idbCache) return;
    const count = await this.idbCache.count(IDB_STORE_NAME);
    if (count <= IDB_MAX_ENTRIES) return;

    const toDelete = count - IDB_MAX_ENTRIES + 100; // Delete 100 extra to avoid frequent eviction
    const tx = this.idbCache.transaction(IDB_STORE_NAME, 'readwrite');
    const index = tx.store.index('createdAt');
    let cursor = await index.openCursor();
    let deleted = 0;

    while (cursor && deleted < toDelete) {
      await cursor.delete();
      deleted++;
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (this.config.provider === 'openai' && this.config.apiKey) {
      const results = await this.generateOpenAIBatchEmbedding(texts);
      // L2-normalize batch results
      return results.map(r => ({ ...r, vector: this.normalizeL2(r.vector) }));
    }

    // For other providers, process sequentially (generateEmbedding already normalizes)
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  /**
   * OpenAI Embeddings API
   */
  private async generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();

    return {
      vector: data.data[0].embedding,
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens
      }
    };
  }

  /**
   * OpenAI Batch Embeddings
   */
  private async generateOpenAIBatchEmbedding(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();

    return data.data.map((item: { embedding: number[]; index: number }) => ({
      vector: item.embedding,
      model: data.model,
      usage: {
        promptTokens: Math.floor(data.usage.prompt_tokens / texts.length),
        totalTokens: Math.floor(data.usage.total_tokens / texts.length)
      }
    }));
  }

  /**
   * Local embedding using TF-IDF-like approach
   * More sophisticated than simple hash, captures semantic meaning
   */
  private async generateLocalEmbedding(text: string): Promise<EmbeddingResult> {
    const dimension = this.config.dimension || 384;
    const embedding: number[] = new Array(dimension).fill(0);

    // Normalize and tokenize
    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\s+/).filter(w => w.length > 1);

    // Build vocabulary-based features
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = this.hashString(word);

      // Word position encoding
      const positionWeight = 1 - (i / words.length) * 0.3;

      // Multiple hash projections for better distribution
      for (let j = 0; j < 3; j++) {
        const idx = Math.abs((hash * (j + 1) * 31) % dimension);
        const value = Math.sin(hash * (j + 1)) * positionWeight;
        embedding[idx] += value;
      }

      // Bigram features
      if (i < words.length - 1) {
        const bigram = word + words[i + 1];
        const bigramHash = this.hashString(bigram);
        const bigramIdx = Math.abs(bigramHash % dimension);
        embedding[bigramIdx] += Math.cos(bigramHash) * 0.5;
      }
    }

    // Character-level features for robustness
    for (let i = 0; i < normalizedText.length && i < 500; i++) {
      const charCode = normalizedText.charCodeAt(i);
      const idx = Math.abs((charCode * 73856093 + i * 19349663) % dimension);
      embedding[idx] += 0.1 * Math.sin(charCode);
    }

    // Normalize to unit vector (L2 normalization done here natively)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimension; i++) {
        embedding[i] /= magnitude;
      }
    }

    return {
      vector: embedding,
      model: 'local-tfidf'
    };
  }

  /**
   * Transformers.js embedding (if loaded)
   */
  private async generateTransformersEmbedding(text: string): Promise<EmbeddingResult> {
    // Check if transformers is available globally
    const transformers = (window as unknown as { transformers?: { pipeline: (task: string, model: string) => Promise<(text: string) => Promise<{ data: number[] }>> } }).transformers;
    if (!transformers) {
      console.warn('Transformers.js not available, falling back to local');
      return this.generateLocalEmbedding(text);
    }

    try {
      const extractor = await transformers.pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );

      const output = await extractor(text);
      const embedding = Array.from(output.data);

      return {
        vector: embedding,
        model: 'all-MiniLM-L6-v2'
      };
    } catch (error) {
      console.warn('Transformers embedding failed, falling back to local:', error);
      return this.generateLocalEmbedding(text);
    }
  }

  /**
   * Hash function for strings (used by local embedding)
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Clear the embedding cache (both in-memory and IndexedDB)
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    if (this.idbCache) {
      try {
        await this.idbCache.clear(IDB_STORE_NAME);
      } catch {
        // Non-critical
      }
    }
  }

  /**
   * Get cache statistics (sync — in-memory only)
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      provider: this.config.provider,
      dimension: this.config.dimension
    };
  }

  /**
   * Get full cache statistics including persistent IndexedDB count
   */
  async getFullCacheStats() {
    let persistentSize = 0;
    if (this.idbCache) {
      try {
        persistentSize = await this.idbCache.count(IDB_STORE_NAME);
      } catch {
        // Non-critical
      }
    }
    return {
      size: this.cache.size,
      persistentSize,
      provider: this.config.provider,
      dimension: this.config.dimension
    };
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingServiceImpl();
