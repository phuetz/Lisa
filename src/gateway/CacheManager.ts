/**
 * Lisa Cache Manager
 * In-memory caching with TTL and LRU eviction
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  accessedAt: number;
  accessCount: number;
  size: number;
  tags: string[];
}

export interface CacheConfig {
  maxSize: number;           // Max entries
  maxMemory: number;         // Max memory in bytes (approximate)
  defaultTTL: number;        // Default TTL in milliseconds
  cleanupInterval: number;   // Cleanup interval in milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
}

export interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  evictions: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export interface CacheSetOptions {
  ttl?: number;
  tags?: string[];
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 1000,
  maxMemory: 50 * 1024 * 1024, // 50MB
  defaultTTL: 5 * 60 * 1000,   // 5 minutes
  cleanupInterval: 60 * 1000,  // 1 minute
  evictionPolicy: 'lru'
};

export class CacheManager extends BrowserEventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }

  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // Approximate bytes
    } catch {
      return 1024; // Default estimate
    }
  }

  private getTotalMemory(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  private evict(): void {
    if (this.cache.size === 0) return;

    let victimKey: string | null = null;
    let victimEntry: CacheEntry | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru': {
        // Least Recently Used
        let oldest = Infinity;
        for (const [key, entry] of this.cache) {
          if (entry.accessedAt < oldest) {
            oldest = entry.accessedAt;
            victimKey = key;
            victimEntry = entry;
          }
        }
        break;
      }
      case 'lfu': {
        // Least Frequently Used
        let minAccess = Infinity;
        for (const [key, entry] of this.cache) {
          if (entry.accessCount < minAccess) {
            minAccess = entry.accessCount;
            victimKey = key;
            victimEntry = entry;
          }
        }
        break;
      }
      case 'fifo': {
        // First In First Out
        let oldestCreation = Infinity;
        for (const [key, entry] of this.cache) {
          if (entry.createdAt < oldestCreation) {
            oldestCreation = entry.createdAt;
            victimKey = key;
            victimEntry = entry;
          }
        }
        break;
      }
    }

    if (victimKey) {
      this.cache.delete(victimKey);
      this.stats.evictions++;
      this.emit('cache:evicted', { key: victimKey, entry: victimEntry });
    }
  }

  // Core operations
  set<T>(key: string, value: T, options: CacheSetOptions = {}): void {
    const now = Date.now();
    const ttl = options.ttl ?? this.config.defaultTTL;
    const size = this.estimateSize(value);

    // Check memory limit
    while (this.getTotalMemory() + size > this.config.maxMemory && this.cache.size > 0) {
      this.evict();
    }

    // Check size limit
    while (this.cache.size >= this.config.maxSize) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt: now + ttl,
      accessedAt: now,
      accessCount: 0,
      size,
      tags: options.tags || []
    };

    const existed = this.cache.has(key);
    this.cache.set(key, entry as CacheEntry);

    this.emit(existed ? 'cache:updated' : 'cache:set', { key, entry });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.emit('cache:expired', { key });
      return null;
    }

    // Update access stats
    entry.accessedAt = Date.now();
    entry.accessCount++;
    this.stats.hits++;

    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.emit('cache:deleted', { key });
    }
    return deleted;
  }

  // Get or set (useful for caching computations)
  async getOrSet<T>(
    key: string,
    factory: () => T | Promise<T>,
    options: CacheSetOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  // Tag operations
  getByTag(tag: string): CacheEntry[] {
    const results: CacheEntry[] = [];
    const now = Date.now();

    for (const entry of this.cache.values()) {
      if (entry.tags.includes(tag) && now <= entry.expiresAt) {
        results.push(entry);
      }
    }

    return results;
  }

  deleteByTag(tag: string): number {
    let deleted = 0;

    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.emit('cache:tagDeleted', { tag, count: deleted });
    }

    return deleted;
  }

  // Pattern matching
  getByPattern(pattern: RegExp): CacheEntry[] {
    const results: CacheEntry[] = [];
    const now = Date.now();

    for (const entry of this.cache.values()) {
      if (pattern.test(entry.key) && now <= entry.expiresAt) {
        results.push(entry);
      }
    }

    return results;
  }

  deleteByPattern(pattern: RegExp): number {
    let deleted = 0;

    for (const [key] of this.cache) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  // TTL management
  touch(key: string, ttl?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.accessedAt = Date.now();
    if (ttl !== undefined) {
      entry.expiresAt = Date.now() + ttl;
    }
    
    return true;
  }

  ttl(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  expire(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiresAt = Date.now() + ttl;
    return true;
  }

  // Cleanup
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.emit('cache:cleanup', { removed });
    }

    return removed;
  }

  clear(): void {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  // Stats
  getStats(): CacheStats {
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;

    for (const entry of this.cache.values()) {
      const created = new Date(entry.createdAt);
      if (!oldestEntry || created < oldestEntry) {
        oldestEntry = created;
      }
      if (!newestEntry || created > newestEntry) {
        newestEntry = created;
      }
    }

    const total = this.stats.hits + this.stats.misses;

    return {
      entries: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      memoryUsage: this.getTotalMemory(),
      evictions: this.stats.evictions,
      oldestEntry,
      newestEntry
    };
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  values<T>(): T[] {
    const now = Date.now();
    const results: T[] = [];

    for (const entry of this.cache.values()) {
      if (now <= entry.expiresAt) {
        results.push(entry.value as T);
      }
    }

    return results;
  }

  entries<T>(): Array<[string, T]> {
    const now = Date.now();
    const results: Array<[string, T]> = [];

    for (const [key, entry] of this.cache) {
      if (now <= entry.expiresAt) {
        results.push([key, entry.value as T]);
      }
    }

    return results;
  }

  // Configuration
  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.cleanupInterval) {
      this.startCleanup();
    }
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  // Serialization
  export(): string {
    const entries = Array.from(this.cache.entries());
    return JSON.stringify(entries, null, 2);
  }

  import(data: string): number {
    const entries = JSON.parse(data) as Array<[string, CacheEntry]>;
    let imported = 0;
    const now = Date.now();

    for (const [key, entry] of entries) {
      if (entry.expiresAt > now) {
        this.cache.set(key, entry);
        imported++;
      }
    }

    return imported;
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Singleton
let cacheManagerInstance: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
}

export function resetCacheManager(): void {
  if (cacheManagerInstance) {
    cacheManagerInstance.dispose();
    cacheManagerInstance.removeAllListeners();
    cacheManagerInstance = null;
  }
}

