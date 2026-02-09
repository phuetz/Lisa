/**
 * Prompt Cache Service - Response Caching for LLM Calls
 *
 * Caches LLM responses to reduce API costs and latency for repeated queries.
 * Supports TTL-based expiration and semantic similarity matching.
 * Persistence via SQLite (DatabaseService).
 */

import { databaseService } from './DatabaseService';

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
  /** Enable persistence (default: true) */
  persistToIndexedDB: boolean;
  /** Database name (legacy, unused with SQLite) */
  dbName: string;
  /** Enable cache (default: true) */
  enabled: boolean;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  tokensSaved: number;
  costSaved: number;
}

// ============================================================================
// Prompt Cache Service
// ============================================================================

export class PromptCacheService {
  private memoryCache: Map<string, CachedPrompt> = new Map();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    tokensSaved: 0
  };
  private dbReady = false;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      defaultTtlMs: 60 * 60 * 1000,
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
      await databaseService.init();
      this.dbReady = true;

      // Load from SQLite to memory
      await this.loadFromDB();

      // Clean expired entries
      await this.cleanExpired();

      console.log('[PromptCache] Initialized with SQLite');
    } catch (error) {
      console.warn('[PromptCache] SQLite init failed, using memory only:', error);
    }
  }

  private async loadFromDB(): Promise<void> {
    if (!this.dbReady) return;

    try {
      const rows = await databaseService.all<{
        hash: string; model: string; response: string; messages: string;
        created_at: number; expires_at: number; hit_count: number; last_hit: number;
      }>('SELECT * FROM prompt_cache');

      const now = Date.now();

      for (const row of rows) {
        if (row.expires_at > now) {
          this.memoryCache.set(row.hash, {
            hash: row.hash,
            response: row.response,
            model: row.model,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            hitCount: row.hit_count,
            lastAccessedAt: row.last_hit || row.created_at,
            messages: row.messages ? JSON.parse(row.messages) : undefined,
          });
        }
      }

      console.log(`[PromptCache] Loaded ${this.memoryCache.size} entries from SQLite`);
    } catch (error) {
      console.warn('[PromptCache] Failed to load from SQLite:', error);
    }
  }

  // ==========================================================================
  // Hash Functions
  // ==========================================================================

  private async hashPrompt(messages: AIMessage[], model: string): Promise<string> {
    const content = JSON.stringify({ messages, model });

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    return this.simpleHash(content);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  // ==========================================================================
  // Cache Operations
  // ==========================================================================

  async get(messages: AIMessage[], model: string): Promise<string | null> {
    if (!this.config.enabled) return null;

    const hash = await this.hashPrompt(messages, model);
    const entry = this.memoryCache.get(hash);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.memoryCache.delete(hash);
      if (this.dbReady) {
        databaseService.run('DELETE FROM prompt_cache WHERE hash = ?', [hash]).catch(() => {});
      }
      this.stats.misses++;
      return null;
    }

    // Update hit count
    entry.hitCount++;
    entry.lastAccessedAt = Date.now();
    this.memoryCache.set(hash, entry);

    if (this.dbReady) {
      databaseService.run(
        'UPDATE prompt_cache SET hit_count = ?, last_hit = ? WHERE hash = ?',
        [entry.hitCount, entry.lastAccessedAt, hash]
      ).catch(() => {});
    }

    this.stats.hits++;
    this.stats.tokensSaved += entry.responseTokens || 0;

    console.log(`[PromptCache] Cache hit for ${hash.slice(0, 8)}...`);
    return entry.response;
  }

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

    if (this.memoryCache.size >= this.config.maxSize) {
      await this.evictLRU();
    }

    this.memoryCache.set(hash, entry);

    if (this.dbReady) {
      databaseService.run(
        'INSERT OR REPLACE INTO prompt_cache (hash, model, response, messages, created_at, expires_at, hit_count, last_hit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [hash, model, response, JSON.stringify(messages), now, now + ttl, 0, now]
      ).catch(() => {});
    }

    console.log(`[PromptCache] Cached response for ${hash.slice(0, 8)}... (TTL: ${ttl}ms)`);
  }

  async has(messages: AIMessage[], model: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    const hash = await this.hashPrompt(messages, model);
    const entry = this.memoryCache.get(hash);

    return entry !== undefined && entry.expiresAt > Date.now();
  }

  async invalidate(messages: AIMessage[], model: string): Promise<boolean> {
    const hash = await this.hashPrompt(messages, model);
    const existed = this.memoryCache.delete(hash);

    if (this.dbReady) {
      databaseService.run('DELETE FROM prompt_cache WHERE hash = ?', [hash]).catch(() => {});
    }

    return existed;
  }

  async invalidateModel(model: string): Promise<number> {
    let count = 0;

    for (const [hash, entry] of this.memoryCache) {
      if (entry.model === model) {
        this.memoryCache.delete(hash);
        count++;
      }
    }

    if (this.dbReady) {
      databaseService.run('DELETE FROM prompt_cache WHERE model = ?', [model]).catch(() => {});
    }

    return count;
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.dbReady) {
      databaseService.run('DELETE FROM prompt_cache').catch(() => {});
    }

    this.stats = { hits: 0, misses: 0, tokensSaved: 0 };
    console.log('[PromptCache] Cache cleared');
  }

  // ==========================================================================
  // Eviction
  // ==========================================================================

  private async evictLRU(): Promise<void> {
    let oldest: { hash: string; timestamp: number } | null = null;

    for (const [hash, entry] of this.memoryCache) {
      if (!oldest || entry.lastAccessedAt < oldest.timestamp) {
        oldest = { hash, timestamp: entry.lastAccessedAt };
      }
    }

    if (oldest) {
      this.memoryCache.delete(oldest.hash);
      if (this.dbReady) {
        databaseService.run('DELETE FROM prompt_cache WHERE hash = ?', [oldest.hash]).catch(() => {});
      }
      console.log(`[PromptCache] Evicted LRU entry: ${oldest.hash.slice(0, 8)}...`);
    }
  }

  async cleanExpired(): Promise<number> {
    const now = Date.now();
    let count = 0;

    for (const [hash, entry] of this.memoryCache) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(hash);
        count++;
      }
    }

    if (this.dbReady) {
      databaseService.run('DELETE FROM prompt_cache WHERE expires_at < ?', [now]).catch(() => {});
    }

    if (count > 0) {
      console.log(`[PromptCache] Cleaned ${count} expired entries`);
    }

    return count;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    const costPerToken = 0.00001;
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

  getEntries(): CachedPrompt[] {
    return Array.from(this.memoryCache.values());
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[PromptCache] Cache ${enabled ? 'enabled' : 'disabled'}`);
  }

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

export function withCache<T extends AIMessage[]>(
  fn: (messages: T, model: string) => Promise<string>,
  options?: { ttlMs?: number }
): (messages: T, model: string) => Promise<string> {
  return async (messages: T, model: string) => {
    const cached = await promptCacheService.get(messages, model);
    if (cached !== null) {
      return cached;
    }

    const response = await fn(messages, model);
    await promptCacheService.set(messages, model, response, options);
    return response;
  };
}

export default promptCacheService;
