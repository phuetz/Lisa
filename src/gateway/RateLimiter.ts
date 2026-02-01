/**
 * Lisa Rate Limiter
 * API protection and request throttling
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface RateLimitConfig {
  id: string;
  name: string;
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  blockDurationMs?: number; // Block duration when exceeded
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitEntry {
  key: string;
  requests: number;
  windowStart: number;
  blocked: boolean;
  blockedUntil?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
  blocked?: boolean;
}

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  activeWindows: number;
  topKeys: { key: string; requests: number }[];
}

// Default configurations
const DEFAULT_CONFIGS: RateLimitConfig[] = [
  {
    id: 'api-general',
    name: 'API General',
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 60,          // 60 req/min
    blockDurationMs: 60 * 1000
  },
  {
    id: 'api-chat',
    name: 'API Chat',
    windowMs: 60 * 1000,
    maxRequests: 30,
    blockDurationMs: 30 * 1000
  },
  {
    id: 'api-auth',
    name: 'API Auth',
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,          // 10 attempts
    blockDurationMs: 15 * 60 * 1000
  },
  {
    id: 'api-export',
    name: 'API Export',
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    blockDurationMs: 60 * 60 * 1000
  },
  {
    id: 'websocket',
    name: 'WebSocket Messages',
    windowMs: 1000,           // 1 second
    maxRequests: 10,          // 10 msg/sec
    blockDurationMs: 5000
  },
  {
    id: 'skill-invoke',
    name: 'Skill Invocation',
    windowMs: 60 * 1000,
    maxRequests: 20,
    blockDurationMs: 30 * 1000
  }
];

export class RateLimiter extends BrowserEventEmitter {
  private configs: Map<string, RateLimitConfig> = new Map();
  private entries: Map<string, RateLimitEntry> = new Map();
  private stats = {
    totalRequests: 0,
    blockedRequests: 0
  };

  constructor() {
    super();
    this.loadDefaultConfigs();
    this.startCleanupTimer();
  }

  private loadDefaultConfigs(): void {
    for (const config of DEFAULT_CONFIGS) {
      this.configs.set(config.id, config);
    }
  }

  private startCleanupTimer(): void {
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  private getEntryKey(configId: string, identifier: string): string {
    const config = this.configs.get(configId);
    if (config?.keyGenerator) {
      return `${configId}:${config.keyGenerator(identifier)}`;
    }
    return `${configId}:${identifier}`;
  }

  // Configuration
  addConfig(config: RateLimitConfig): void {
    this.configs.set(config.id, config);
    this.emit('config:added', config);
  }

  removeConfig(id: string): boolean {
    const deleted = this.configs.delete(id);
    if (deleted) {
      // Remove all entries for this config
      for (const key of this.entries.keys()) {
        if (key.startsWith(`${id}:`)) {
          this.entries.delete(key);
        }
      }
      this.emit('config:removed', { id });
    }
    return deleted;
  }

  getConfig(id: string): RateLimitConfig | undefined {
    return this.configs.get(id);
  }

  listConfigs(): RateLimitConfig[] {
    return Array.from(this.configs.values());
  }

  // Rate limiting
  check(configId: string, identifier: string): RateLimitResult {
    const config = this.configs.get(configId);
    if (!config) {
      return { allowed: true, remaining: Infinity, resetAt: new Date() };
    }

    const key = this.getEntryKey(configId, identifier);
    const now = Date.now();

    let entry = this.entries.get(key);

    // Check if blocked
    if (entry?.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      this.stats.blockedRequests++;
      this.emit('rate:blocked', { configId, identifier, key });
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.blockedUntil),
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
        blocked: true
      };
    }

    // Check if window expired
    if (!entry || now - entry.windowStart >= config.windowMs) {
      entry = {
        key,
        requests: 0,
        windowStart: now,
        blocked: false
      };
      this.entries.set(key, entry);
    }

    // Unblock if block expired
    if (entry.blocked && entry.blockedUntil && now >= entry.blockedUntil) {
      entry.blocked = false;
      entry.blockedUntil = undefined;
      entry.requests = 0;
      entry.windowStart = now;
    }

    // Check limit
    this.stats.totalRequests++;
    
    if (entry.requests >= config.maxRequests) {
      // Block if configured
      if (config.blockDurationMs) {
        entry.blocked = true;
        entry.blockedUntil = now + config.blockDurationMs;
      }

      this.stats.blockedRequests++;
      this.emit('rate:exceeded', { configId, identifier, key, requests: entry.requests });

      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.windowStart + config.windowMs),
        retryAfter: Math.ceil((entry.windowStart + config.windowMs - now) / 1000),
        blocked: entry.blocked
      };
    }

    // Allow request
    entry.requests++;
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.requests,
      resetAt: new Date(entry.windowStart + config.windowMs)
    };
  }

  // Consume a request (returns false if limit exceeded)
  consume(configId: string, identifier: string, count = 1): boolean {
    const config = this.configs.get(configId);
    if (!config) return true;

    for (let i = 0; i < count; i++) {
      const result = this.check(configId, identifier);
      if (!result.allowed) return false;
    }
    return true;
  }

  // Check without consuming
  peek(configId: string, identifier: string): RateLimitResult {
    const config = this.configs.get(configId);
    if (!config) {
      return { allowed: true, remaining: Infinity, resetAt: new Date() };
    }

    const key = this.getEntryKey(configId, identifier);
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now - entry.windowStart >= config.windowMs) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowMs)
      };
    }

    if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.blockedUntil),
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
        blocked: true
      };
    }

    return {
      allowed: entry.requests < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.requests),
      resetAt: new Date(entry.windowStart + config.windowMs)
    };
  }

  // Reset for specific identifier
  reset(configId: string, identifier: string): boolean {
    const key = this.getEntryKey(configId, identifier);
    return this.entries.delete(key);
  }

  // Unblock
  unblock(configId: string, identifier: string): boolean {
    const key = this.getEntryKey(configId, identifier);
    const entry = this.entries.get(key);
    
    if (entry?.blocked) {
      entry.blocked = false;
      entry.blockedUntil = undefined;
      entry.requests = 0;
      entry.windowStart = Date.now();
      this.emit('rate:unblocked', { configId, identifier, key });
      return true;
    }
    return false;
  }

  // Stats
  getStats(): RateLimitStats {
    const keyRequests: Record<string, number> = {};
    
    for (const [key, entry] of this.entries) {
      keyRequests[key] = entry.requests;
    }

    const topKeys = Object.entries(keyRequests)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, requests]) => ({ key, requests }));

    return {
      totalRequests: this.stats.totalRequests,
      blockedRequests: this.stats.blockedRequests,
      activeWindows: this.entries.size,
      topKeys
    };
  }

  getBlockedIdentifiers(configId?: string): string[] {
    const blocked: string[] = [];
    const now = Date.now();

    for (const [key, entry] of this.entries) {
      if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
        if (!configId || key.startsWith(`${configId}:`)) {
          blocked.push(key.split(':').slice(1).join(':'));
        }
      }
    }

    return blocked;
  }

  // Cleanup expired entries
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.entries) {
      const configId = key.split(':')[0];
      const config = this.configs.get(configId);
      
      if (!config) {
        this.entries.delete(key);
        removed++;
        continue;
      }

      // Remove if window expired and not blocked
      const windowExpired = now - entry.windowStart >= config.windowMs;
      const blockExpired = !entry.blocked || (entry.blockedUntil && now >= entry.blockedUntil);
      
      if (windowExpired && blockExpired) {
        this.entries.delete(key);
        removed++;
      }
    }

    return removed;
  }

  // Middleware helper for Express
  middleware(configId: string): (req: { ip?: string }, res: { status: (code: number) => { json: (data: unknown) => void }; setHeader: (name: string, value: string) => void }, next: () => void) => void {
    return (req, res, next) => {
      const identifier = req.ip || 'unknown';
      const result = this.check(configId, identifier);

      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter?.toString() || '60');
        res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: result.retryAfter,
          blocked: result.blocked
        });
        return;
      }

      next();
    };
  }
}

// Singleton
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

export function resetRateLimiter(): void {
  if (rateLimiterInstance) {
    rateLimiterInstance.removeAllListeners();
    rateLimiterInstance = null;
  }
}

