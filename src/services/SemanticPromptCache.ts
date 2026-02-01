/**
 * Semantic Prompt Cache - Similarity-Based LLM Response Caching
 *
 * Unlike hash-based caching that requires exact prompt matches,
 * this cache uses vector similarity to find semantically similar prompts.
 * This enables cache hits even when prompts are slightly different but
 * semantically equivalent (e.g., "What is the weather?" vs "Tell me the weather").
 *
 * Features:
 * - Semantic similarity matching using embeddings
 * - Configurable similarity threshold
 * - TTL-based expiration
 * - IndexedDB persistence
 * - Cache statistics and monitoring
 */

import { VectorStoreService, type VectorEntry, type SearchResult } from './VectorStoreService';
import { embeddingService } from './EmbeddingService';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ============================================================================
// Types
// ============================================================================

export interface SemanticCacheEntry {
  id: string;
  prompt: string;
  response: string;
  model: string;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  lastAccessedAt: number;
}

export interface SemanticCacheConfig {
  /** Similarity threshold for cache hit (0-1, default: 0.92 = 92%) */
  similarityThreshold: number;
  /** Default TTL in milliseconds (default: 1 hour) */
  defaultTtlMs: number;
  /** Maximum cache size in entries (default: 500) */
  maxSize: number;
  /** Embedding dimensions (default: 1536 for OpenAI) */
  dimensions: number;
  /** Enable IndexedDB persistence (default: true) */
  persistToIndexedDB: boolean;
  /** IndexedDB database name */
  dbName: string;
  /** Enable cache (default: true) */
  enabled: boolean;
}

export interface SemanticCacheStats {
  /** Total cached entries */
  size: number;
  /** Semantic cache hits */
  hits: number;
  /** Cache misses */
  misses: number;
  /** Near misses (found similar but below threshold) */
  nearMisses: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Average similarity score of hits */
  avgHitSimilarity: number;
  /** Vector store stats */
  vectorStats: { size: number; dimensions: number; maxLevel: number };
}

// ============================================================================
// IndexedDB Schema
// ============================================================================

interface SemanticCacheDB extends DBSchema {
  entries: {
    key: string;
    value: SemanticCacheEntry;
    indexes: {
      'by-expires': number;
      'by-model': string;
    };
  };
  vectors: {
    key: string;
    value: {
      id: string;
      vector: number[];
    };
  };
}

// ============================================================================
// Semantic Prompt Cache
// ============================================================================

export class SemanticPromptCache {
  private vectorStore: VectorStoreService;
  private entries: Map<string, SemanticCacheEntry> = new Map();
  private db: IDBPDatabase<SemanticCacheDB> | null = null;
  private config: SemanticCacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    nearMisses: 0,
    totalHitSimilarity: 0
  };
  private initialized = false;

  constructor(config?: Partial<SemanticCacheConfig>) {
    this.config = {
      similarityThreshold: 0.92,
      defaultTtlMs: 60 * 60 * 1000, // 1 hour
      maxSize: 500,
      dimensions: 1536,
      persistToIndexedDB: true,
      dbName: 'lisa-semantic-cache',
      enabled: true,
      ...config
    };

    this.vectorStore = new VectorStoreService({
      dimensions: this.config.dimensions,
      M: 12,
      efConstruction: 100,
      efSearch: 50
    });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the cache (must be called before use)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize vector store
    await this.vectorStore.initialize();

    // Initialize IndexedDB
    if (this.config.persistToIndexedDB && typeof window !== 'undefined') {
      try {
        this.db = await openDB<SemanticCacheDB>(this.config.dbName, 1, {
          upgrade(db) {
            // Entries store
            const entriesStore = db.createObjectStore('entries', { keyPath: 'id' });
            entriesStore.createIndex('by-expires', 'expiresAt');
            entriesStore.createIndex('by-model', 'model');

            // Vectors store
            db.createObjectStore('vectors', { keyPath: 'id' });
          }
        });

        // Load from IndexedDB
        await this.loadFromDB();

        console.log('[SemanticCache] Initialized with IndexedDB');
      } catch (error) {
        console.warn('[SemanticCache] IndexedDB init failed, using memory only:', error);
        this.db = null;
      }
    }

    // Clean expired entries
    await this.cleanExpired();

    this.initialized = true;
    console.log(`[SemanticCache] Ready with ${this.entries.size} entries`);
  }

  /**
   * Load entries from IndexedDB
   */
  private async loadFromDB(): Promise<void> {
    if (!this.db) return;

    try {
      const [entries, vectors] = await Promise.all([
        this.db.getAll('entries'),
        this.db.getAll('vectors')
      ]);

      const now = Date.now();

      // Load non-expired entries
      for (const entry of entries) {
        if (entry.expiresAt > now) {
          this.entries.set(entry.id, entry);
        }
      }

      // Load vectors into vector store
      for (const vec of vectors) {
        if (this.entries.has(vec.id)) {
          await this.vectorStore.add({
            id: vec.id,
            vector: vec.vector,
            metadata: {}
          });
        }
      }

      console.log(`[SemanticCache] Loaded ${this.entries.size} entries from IndexedDB`);
    } catch (error) {
      console.warn('[SemanticCache] Failed to load from IndexedDB:', error);
    }
  }

  // ==========================================================================
  // Cache Operations
  // ==========================================================================

  /**
   * Get cached response for a semantically similar prompt
   */
  async get(prompt: string, model?: string): Promise<string | null> {
    if (!this.config.enabled || !this.initialized) return null;

    // Generate embedding for the query prompt
    const embedding = await this.generateEmbedding(prompt);
    if (!embedding) {
      this.stats.misses++;
      return null;
    }

    // Search for similar prompts
    const results = this.vectorStore.search(embedding, 5);

    if (results.length === 0) {
      this.stats.misses++;
      return null;
    }

    // Find best match above threshold
    for (const result of results) {
      const entry = this.entries.get(result.id);

      if (!entry) continue;

      // Check model match if specified
      if (model && entry.model !== model) continue;

      // Check expiration
      if (entry.expiresAt < Date.now()) {
        await this.remove(entry.id);
        continue;
      }

      // Check similarity threshold
      if (result.score >= this.config.similarityThreshold) {
        // Cache hit!
        this.stats.hits++;
        this.stats.totalHitSimilarity += result.score;

        // Update entry stats
        entry.hitCount++;
        entry.lastAccessedAt = Date.now();
        this.entries.set(entry.id, entry);

        // Persist update
        if (this.db) {
          this.db.put('entries', entry).catch(console.error);
        }

        console.log(
          `[SemanticCache] Hit with ${(result.score * 100).toFixed(1)}% similarity`,
          { prompt: prompt.slice(0, 50), cachedPrompt: entry.prompt.slice(0, 50) }
        );

        return entry.response;
      } else {
        // Near miss - found similar but below threshold
        this.stats.nearMisses++;
        console.log(
          `[SemanticCache] Near miss: ${(result.score * 100).toFixed(1)}% < ${(this.config.similarityThreshold * 100).toFixed(1)}%`
        );
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store a prompt/response pair in the cache
   */
  async set(
    prompt: string,
    response: string,
    model: string,
    options?: { ttlMs?: number }
  ): Promise<void> {
    if (!this.config.enabled || !this.initialized) return;

    // Generate embedding
    const embedding = await this.generateEmbedding(prompt);
    if (!embedding) {
      console.warn('[SemanticCache] Failed to generate embedding for prompt');
      return;
    }

    // Check if similar prompt already cached
    const existing = await this.findSimilar(embedding);
    if (existing && existing.score >= this.config.similarityThreshold) {
      // Update existing entry instead of creating new
      const entry = this.entries.get(existing.id);
      if (entry) {
        entry.response = response;
        entry.expiresAt = Date.now() + (options?.ttlMs ?? this.config.defaultTtlMs);
        this.entries.set(entry.id, entry);

        if (this.db) {
          await this.db.put('entries', entry);
        }

        console.log(`[SemanticCache] Updated existing entry with ${(existing.score * 100).toFixed(1)}% similarity`);
        return;
      }
    }

    // Enforce max size (LRU eviction)
    if (this.entries.size >= this.config.maxSize) {
      await this.evictLRU();
    }

    // Create new entry
    const now = Date.now();
    const id = `sem-${now}-${Math.random().toString(36).slice(2, 10)}`;
    const ttl = options?.ttlMs ?? this.config.defaultTtlMs;

    const entry: SemanticCacheEntry = {
      id,
      prompt,
      response,
      model,
      createdAt: now,
      expiresAt: now + ttl,
      hitCount: 0,
      lastAccessedAt: now
    };

    // Add to stores
    this.entries.set(id, entry);
    await this.vectorStore.add({
      id,
      vector: embedding,
      metadata: { model }
    });

    // Persist
    if (this.db) {
      await Promise.all([
        this.db.put('entries', entry),
        this.db.put('vectors', { id, vector: embedding })
      ]);
    }

    console.log(`[SemanticCache] Cached response for prompt (TTL: ${ttl}ms)`);
  }

  /**
   * Check if a semantically similar prompt is cached
   */
  async has(prompt: string, model?: string): Promise<boolean> {
    const result = await this.get(prompt, model);
    // Undo the hit/miss stat change since this is just a check
    if (result !== null) {
      this.stats.hits--;
    } else {
      this.stats.misses--;
    }
    return result !== null;
  }

  /**
   * Remove an entry by ID
   */
  async remove(id: string): Promise<boolean> {
    const existed = this.entries.delete(id);
    await this.vectorStore.remove(id);

    if (this.db && existed) {
      await Promise.all([
        this.db.delete('entries', id),
        this.db.delete('vectors', id)
      ]);
    }

    return existed;
  }

  /**
   * Invalidate entries for a specific model
   */
  async invalidateModel(model: string): Promise<number> {
    let count = 0;

    for (const [id, entry] of this.entries) {
      if (entry.model === model) {
        await this.remove(id);
        count++;
      }
    }

    console.log(`[SemanticCache] Invalidated ${count} entries for model: ${model}`);
    return count;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    for (const id of this.entries.keys()) {
      await this.vectorStore.remove(id);
    }

    this.entries.clear();

    if (this.db) {
      await Promise.all([
        this.db.clear('entries'),
        this.db.clear('vectors')
      ]);
    }

    this.stats = { hits: 0, misses: 0, nearMisses: 0, totalHitSimilarity: 0 };
    console.log('[SemanticCache] Cache cleared');
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      return await embeddingService.generateEmbedding(text);
    } catch (error) {
      console.error('[SemanticCache] Embedding generation failed:', error);
      return null;
    }
  }

  /**
   * Find similar cached entry
   */
  private findSimilar(embedding: number[]): SearchResult | null {
    const results = this.vectorStore.search(embedding, 1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Evict least recently used entry
   */
  private async evictLRU(): Promise<void> {
    let oldest: { id: string; timestamp: number } | null = null;

    for (const [id, entry] of this.entries) {
      if (!oldest || entry.lastAccessedAt < oldest.timestamp) {
        oldest = { id, timestamp: entry.lastAccessedAt };
      }
    }

    if (oldest) {
      await this.remove(oldest.id);
      console.log(`[SemanticCache] Evicted LRU entry: ${oldest.id}`);
    }
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    const now = Date.now();
    let count = 0;

    for (const [id, entry] of this.entries) {
      if (entry.expiresAt < now) {
        await this.remove(id);
        count++;
      }
    }

    if (count > 0) {
      console.log(`[SemanticCache] Cleaned ${count} expired entries`);
    }

    return count;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get cache statistics
   */
  getStats(): SemanticCacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    const avgHitSimilarity = this.stats.hits > 0
      ? this.stats.totalHitSimilarity / this.stats.hits
      : 0;

    return {
      size: this.entries.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      nearMisses: this.stats.nearMisses,
      hitRate,
      avgHitSimilarity,
      vectorStats: this.vectorStore.getStats()
    };
  }

  /**
   * Get all cached entries (for debugging)
   */
  getEntries(): SemanticCacheEntry[] {
    return Array.from(this.entries.values());
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Update configuration
   */
  setConfig(config: Partial<SemanticCacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current similarity threshold
   */
  getSimilarityThreshold(): number {
    return this.config.similarityThreshold;
  }

  /**
   * Set similarity threshold
   */
  setSimilarityThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this.config.similarityThreshold = threshold;
    console.log(`[SemanticCache] Similarity threshold set to ${(threshold * 100).toFixed(1)}%`);
  }

  /**
   * Enable or disable caching
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[SemanticCache] Cache ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if cache is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const semanticPromptCache = new SemanticPromptCache();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wrap an async function with semantic caching
 */
export function withSemanticCache(
  fn: (prompt: string, model: string) => Promise<string>,
  options?: { ttlMs?: number }
): (prompt: string, model: string) => Promise<string> {
  return async (prompt: string, model: string) => {
    // Initialize if needed
    if (!semanticPromptCache.isInitialized()) {
      await semanticPromptCache.initialize();
    }

    // Check cache first
    const cached = await semanticPromptCache.get(prompt, model);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const response = await fn(prompt, model);

    // Cache result
    await semanticPromptCache.set(prompt, response, model, options);

    return response;
  };
}

export default semanticPromptCache;
