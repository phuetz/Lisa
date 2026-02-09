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
 * - SQLite persistence (via DatabaseService)
 * - Cache statistics and monitoring
 */

import { VectorStoreService, type SearchResult } from './VectorStoreService';
import { embeddingService } from './EmbeddingService';
import { databaseService } from './DatabaseService';

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
  /** Enable persistence (default: true) */
  persist: boolean;
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
// Semantic Prompt Cache
// ============================================================================

export class SemanticPromptCache {
  private vectorStore: VectorStoreService;
  private entries: Map<string, SemanticCacheEntry> = new Map();
  private dbReady = false;
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
      persist: true,
      enabled: true,
      ...config
    };

    this.vectorStore = new VectorStoreService(this.config.dimensions, {
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

    // Initialize vector store (uses SQLite internally)
    await this.vectorStore.initialize();

    // Initialize SQLite
    if (this.config.persist && typeof window !== 'undefined') {
      try {
        await databaseService.init();
        this.dbReady = true;
        await this.loadFromDB();
        console.log('[SemanticCache] Initialized with SQLite');
      } catch (error) {
        console.warn('[SemanticCache] SQLite init failed, using memory only:', error);
      }
    }

    // Clean expired entries
    await this.cleanExpired();

    this.initialized = true;
    console.log(`[SemanticCache] Ready with ${this.entries.size} entries`);
  }

  /**
   * Load entries from SQLite
   */
  private async loadFromDB(): Promise<void> {
    if (!this.dbReady) return;

    try {
      const rows = await databaseService.all<{
        id: string; prompt: string; response: string; model: string;
        embedding: string; created_at: number; expires_at: number; hit_count: number;
      }>('SELECT * FROM semantic_cache');

      const now = Date.now();

      for (const row of rows) {
        if (row.expires_at > now) {
          this.entries.set(row.id, {
            id: row.id,
            prompt: row.prompt,
            response: row.response,
            model: row.model || '',
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            hitCount: row.hit_count || 0,
            lastAccessedAt: row.created_at
          });

          // Load vector into in-memory HNSW
          if (row.embedding) {
            const vector = JSON.parse(row.embedding) as number[];
            await this.vectorStore.add({ id: row.id, vector, metadata: {} });
          }
        }
      }

      console.log(`[SemanticCache] Loaded ${this.entries.size} entries from SQLite`);
    } catch (error) {
      console.warn('[SemanticCache] Failed to load from SQLite:', error);
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
        if (this.dbReady) {
          databaseService.run(
            'UPDATE semantic_cache SET hit_count = ? WHERE id = ?',
            [entry.hitCount, entry.id]
          ).catch(console.error);
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

        if (this.dbReady) {
          await databaseService.run(
            'UPDATE semantic_cache SET response = ?, expires_at = ? WHERE id = ?',
            [response, entry.expiresAt, entry.id]
          );
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
    if (this.dbReady) {
      await databaseService.run(
        'INSERT OR REPLACE INTO semantic_cache (id, prompt, response, model, embedding, created_at, expires_at, hit_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, prompt, response, model, JSON.stringify(embedding), now, now + ttl, 0]
      );
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

    if (this.dbReady && existed) {
      await databaseService.run('DELETE FROM semantic_cache WHERE id = ?', [id]);
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
        this.entries.delete(id);
        await this.vectorStore.remove(id);
        count++;
      }
    }

    if (this.dbReady) {
      await databaseService.run('DELETE FROM semantic_cache WHERE model = ?', [model]);
    }

    console.log(`[SemanticCache] Invalidated ${count} entries for model: ${model}`);
    return count;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    await this.vectorStore.clear();
    this.entries.clear();

    if (this.dbReady) {
      await databaseService.run('DELETE FROM semantic_cache');
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
        this.entries.delete(id);
        await this.vectorStore.remove(id);
        count++;
      }
    }

    if (this.dbReady) {
      await databaseService.run('DELETE FROM semantic_cache WHERE expires_at < ?', [now]);
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
