/**
 * Prompt Cache Service - Response Caching for LLM Calls
 *
 * Caches LLM responses to reduce API costs and latency for repeated queries.
 * Supports TTL-based expiration and semantic similarity matching.
 *
 * Features:
 * - Hash-based exact matching
 * - Configurable TTL per cache entry
 * - Memory and IndexedDB storage options
 * - Cache statistics and monitoring
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ============================================================================
// Types
// ============================================================================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface CachedPrompt {
  /** Unique hash of the prompt */
  hash: string;
  /** The cached response */
  response: string;
  /** Model used for generation */
  model: string;
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Number of times this cache entry was hit */
  hitCount: number;
  /** Last access timestamp */
  lastAccessedAt: number;
  /** Token count of the response */
  responseTokens?: number;
  /** Original messages (for debugging) */
  messages?: AIMessage[];
}

export interface CacheConfig {
  /** Default TTL in milliseconds (default: 1 hour) */
  defaultTtlMs: number;
  /** Maximum cache size in entries (default: 1000) */
  maxSize: number;
  /** Enable IndexedDB persistence (default: true) */
  persistToIndexedDB: boolean;
  /** IndexedDB database name */
  dbName: string;
  /** Enable cache (default: true) */
  enabled: boolean;
}

export interface CacheStats {
  /** Total cache entries */
  size: number;
  /** Cache hits */
  hits: number;
  /** Cache misses */
  misses: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Estimated tokens saved */
  tokensSaved: number;
  /** Estimated cost saved (USD) */
  costSaved: number;
}

// ============================================================================
// IndexedDB Schema
// ============================================================================

interface PromptCacheDB extends DBSchema {
  prompts: {
    key: string;
    value: CachedPrompt;
    indexes: {
      'by-expires': number;
      'by-model': string;
    };
  };
}

// ============================================================================
// Prompt Cache Service
// ============================================================================

export class PromptCacheService {
  private memoryCache: Map<string, CachedPrompt> = new Map();
  private db: IDBPDatabase<PromptCacheDB> | null = null;
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    tokensSaved: 0
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      defaultTtlMs: 60 * 60 * 1000, // 1 hour
      maxSize: 1000,
      persistToIndexedDB: true,
      dbName: 'lisa-prompt-cache',
      enabled: true,
      ...config
    };

    if (this.config.persistToIndexedDB && typeof window !== 'undefined') {
      this.initDB().catch(console.error);
    }
  }

  // ==========================================================================
  // Database Initialization
  // ==========================================================================

  private async initDB(): Promise<void> {
    try {
      this.db = await openDB<PromptCacheDB>(this.config.dbName, 1, {
        upgrade(db) {
          const store = db.createObjectStore('prompts', { keyPath: 'hash' });
          store.createIndex('by-expires', 'expiresAt');
          store.createIndex('by-model', 'model');
        }
      });

      // Load from IndexedDB to memory
      await this.loadFromDB();

      // Clean expired entries
      await this.cleanExpired();

      console.log('[PromptCache] Initialized with IndexedDB');
    } catch (error) {
      console.warn('[PromptCache] IndexedDB init failed, using memory only:', error);
      this.db = null;
    }
  }

  private async loadFromDB(): Promise<void> {
    if (!this.db) return;

    try {
      const all = await this.db.getAll('prompts');
      const now = Date.now();

      for (const entry of all) {
        if (entry.expiresAt > now) {
          this.memoryCache.set(entry.hash, entry);
        }
      }

      console.log(`[PromptCache] Loaded ${this.memoryCache.size} entries from IndexedDB`);
    } catch (error) {
      console.warn('[PromptCache] Failed to load from IndexedDB:', error);
    }
  }

  // ==========================================================================
  // Hash Functions
  // ==========================================================================

  /**
   * Generate a hash for messages + model combination
   */
  private async hashPrompt(messages: AIMessage[], model: string): Promise<string> {
    const content = JSON.stringify({ messages, model });

    // Use Web Crypto API for hashing
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple hash for older environments
    return this.simpleHash(content);
  }

  /**
   * Simple hash function fallback
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  // ==========================================================================
  // Cache Operations
  // ==========================================================================

  /**
   * Get cached response for messages
   */
  async get(messages: AIMessage[], model: string): Promise<string | null> {
    if (!this.config.enabled) return null;

    const hash = await this.hashPrompt(messages, model);
    const entry = this.memoryCache.get(hash);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.memoryCache.delete(hash);
      if (this.db) {
        this.db.delete('prompts', hash).catch(console.error);
      }
      this.stats.misses++;
      return null;
    }

    // Update hit count and last accessed
    entry.hitCount++;
    entry.lastAccessedAt = Date.now();
    this.memoryCache.set(hash, entry);

    // Update in IndexedDB (async, don't wait)
    if (this.db) {
      this.db.put('prompts', entry).catch(console.error);
    }

    this.stats.hits++;
    this.stats.tokensSaved += entry.responseTokens || 0;

    console.log(`[PromptCache] Cache hit for ${hash.slice(0, 8)}...`);
    return entry.response;
  }

  /**
   * Store response in cache
   */
  async set(
    messages: AIMessage[],
    model: string,
    response: string,
    options?: { ttlMs?: number; responseTokens?: number }
  ): Promise<void> {
    if (!this.config.enabled) return;

    const hash = await this.hashPrompt(messages, model);
    const now = Date.now();
    const ttl = options?.ttlMs ?? this.config.defaultTtlMs;

    const entry: CachedPrompt = {
      hash,
      response,
      model,
      createdAt: now,
      expiresAt: now + ttl,
      hitCount: 0,
      lastAccessedAt: now,
      responseTokens: options?.responseTokens,
      messages
    };

    // Enforce max size (LRU eviction)
    if (this.memoryCache.size >= this.config.maxSize) {
      await this.evictLRU();
    }

    this.memoryCache.set(hash, entry);

    // Persist to IndexedDB
    if (this.db) {
      await this.db.put('prompts', entry);
    }

    console.log(`[PromptCache] Cached response for ${hash.slice(0, 8)}... (TTL: ${ttl}ms)`);
  }

  /**
   * Check if a prompt is cached
   */
  async has(messages: AIMessage[], model: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    const hash = await this.hashPrompt(messages, model);
    const entry = this.memoryCache.get(hash);

    return entry !== undefined && entry.expiresAt > Date.now();
  }

  /**
   * Invalidate a specific cache entry
   */
  async invalidate(messages: AIMessage[], model: string): Promise<boolean> {
    const hash = await this.hashPrompt(messages, model);
    const existed = this.memoryCache.delete(hash);

    if (this.db) {
      await this.db.delete('prompts', hash);
    }

    return existed;
  }

  /**
   * Invalidate all entries for a model
   */
  async invalidateModel(model: string): Promise<number> {
    let count = 0;

    for (const [hash, entry] of this.memoryCache) {
      if (entry.model === model) {
        this.memoryCache.delete(hash);
        count++;
      }
    }

    if (this.db) {
      const tx = this.db.transaction('prompts', 'readwrite');
      const index = tx.store.index('by-model');
      let cursor = await index.openCursor(IDBKeyRange.only(model));

      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    }

    return count;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.db) {
      await this.db.clear('prompts');
    }

    this.stats = { hits: 0, misses: 0, tokensSaved: 0 };
    console.log('[PromptCache] Cache cleared');
  }

  // ==========================================================================
  // Eviction
  // ==========================================================================

  /**
   * Evict least recently used entry
   */
  private async evictLRU(): Promise<void> {
    let oldest: { hash: string; timestamp: number } | null = null;

    for (const [hash, entry] of this.memoryCache) {
      if (!oldest || entry.lastAccessedAt < oldest.timestamp) {
        oldest = { hash, timestamp: entry.lastAccessedAt };
      }
    }

    if (oldest) {
      this.memoryCache.delete(oldest.hash);
      if (this.db) {
        await this.db.delete('prompts', oldest.hash);
      }
      console.log(`[PromptCache] Evicted LRU entry: ${oldest.hash.slice(0, 8)}...`);
    }
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    const now = Date.now();
    let count = 0;

    for (const [hash, entry] of this.memoryCache) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(hash);
        count++;
      }
    }

    if (this.db) {
      const tx = this.db.transaction('prompts', 'readwrite');
      const index = tx.store.index('by-expires');
      let cursor = await index.openCursor(IDBKeyRange.upperBound(now));

      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    }

    if (count > 0) {
      console.log(`[PromptCache] Cleaned ${count} expired entries`);
    }

    return count;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    // Estimate cost saved (rough estimate based on average token pricing)
    const costPerToken = 0.00001; // ~$10/1M tokens average
    const costSaved = this.stats.tokensSaved * costPerToken;

    return {
      size: this.memoryCache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      tokensSaved: this.stats.tokensSaved,
      costSaved
    };
  }

  /**
   * Get all cached entries (for debugging)
   */
  getEntries(): CachedPrompt[] {
    return Array.from(this.memoryCache.values());
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Update configuration
   */
  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable or disable caching
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[PromptCache] Cache ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const promptCacheService = new PromptCacheService();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wrap an async function with caching
 */
export function withCache<T extends AIMessage[]>(
  fn: (messages: T, model: string) => Promise<string>,
  options?: { ttlMs?: number }
): (messages: T, model: string) => Promise<string> {
  return async (messages: T, model: string) => {
    // Check cache first
    const cached = await promptCacheService.get(messages, model);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const response = await fn(messages, model);

    // Cache result
    await promptCacheService.set(messages, model, response, options);

    return response;
  };
}

export default promptCacheService;
