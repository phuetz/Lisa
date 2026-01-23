/**
 * Bridge Security Middleware
 * 
 * Sécurité renforcée pour l'API Bridge:
 * - Authentification API Key / JWT
 * - Rate limiting par IP et par clé
 * - Anti-replay (nonce + timestamp)
 * - CORS strict
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ============================================================================
// Audit Log
// ============================================================================

export interface AuditLogEntry {
  timestamp: string;
  traceId: string;
  sessionId?: string;
  tool: string;
  action: 'invoke' | 'success' | 'error' | 'denied';
  durationMs?: number;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  ip?: string;
  userId?: string;
}

class AuditLog {
  private entries: AuditLogEntry[] = [];
  private maxEntries: number = 10000;
  private listeners: Array<(entry: AuditLogEntry) => void> = [];

  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    this.entries.push(fullEntry);

    // Limiter la taille
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Notifier les listeners
    this.listeners.forEach(listener => listener(fullEntry));

    // Log console en JSON structuré
    console.log(JSON.stringify({
      type: 'audit',
      ...fullEntry
    }));
  }

  getEntries(options?: {
    tool?: string;
    sessionId?: string;
    action?: AuditLogEntry['action'];
    since?: string;
    limit?: number;
  }): AuditLogEntry[] {
    let filtered = this.entries;

    if (options?.tool) {
      filtered = filtered.filter(e => e.tool === options.tool);
    }
    if (options?.sessionId) {
      filtered = filtered.filter(e => e.sessionId === options.sessionId);
    }
    if (options?.action) {
      filtered = filtered.filter(e => e.action === options.action);
    }
    if (options?.since) {
      const since = options.since;
      filtered = filtered.filter(e => e.timestamp >= since);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  getStats(): {
    total: number;
    byAction: Record<string, number>;
    byTool: Record<string, number>;
    errorRate: number;
  } {
    const byAction: Record<string, number> = {};
    const byTool: Record<string, number> = {};
    let errors = 0;

    for (const entry of this.entries) {
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
      byTool[entry.tool] = (byTool[entry.tool] || 0) + 1;
      if (entry.action === 'error' || entry.action === 'denied') {
        errors++;
      }
    }

    return {
      total: this.entries.length,
      byAction,
      byTool,
      errorRate: this.entries.length > 0 ? errors / this.entries.length : 0
    };
  }

  subscribe(listener: (entry: AuditLogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  clear(): void {
    this.entries = [];
  }
}

export const auditLog = new AuditLog();

// ============================================================================
// Types
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface NonceEntry {
  timestamp: number;
  used: boolean;
}

interface SecurityConfig {
  apiKeys: Set<string>;
  jwtSecret?: string;
  rateLimitWindow: number; // ms
  rateLimitMax: number;
  nonceWindow: number; // ms
  allowedOrigins: string[];
  enableAntiReplay: boolean;
}

// ============================================================================
// Security Store (en mémoire - pour prod utiliser Redis)
// ============================================================================

class SecurityStore {
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private nonces: Map<string, NonceEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Nettoyage périodique des entrées expirées
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  // Rate limiting
  checkRateLimit(key: string, window: number, max: number): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = this.rateLimits.get(key);

    if (!entry || now > entry.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: now + window });
      return { allowed: true, remaining: max - 1, resetIn: window };
    }

    if (entry.count >= max) {
      return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
    }

    entry.count++;
    return { allowed: true, remaining: max - entry.count, resetIn: entry.resetTime - now };
  }

  // Anti-replay
  checkNonce(nonce: string, window: number): boolean {
    const now = Date.now();
    const entry = this.nonces.get(nonce);

    // Nonce déjà utilisé
    if (entry && entry.used) {
      return false;
    }

    // Nonce expiré
    if (entry && now - entry.timestamp > window) {
      return false;
    }

    // Marquer comme utilisé
    this.nonces.set(nonce, { timestamp: now, used: true });
    return true;
  }

  private cleanup() {
    const now = Date.now();

    // Nettoyer les rate limits expirés
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(key);
      }
    }

    // Nettoyer les nonces expirés (garder 5 min)
    for (const [key, entry] of this.nonces.entries()) {
      if (now - entry.timestamp > 300000) {
        this.nonces.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

const securityStore = new SecurityStore();

// ============================================================================
// Configuration
// ============================================================================

const config: SecurityConfig = {
  apiKeys: new Set([
    process.env.LISA_BRIDGE_API_KEY || 'dev-api-key-change-me'
  ]),
  jwtSecret: process.env.JWT_SECRET,
  rateLimitWindow: 60000, // 1 minute
  rateLimitMax: 100, // 100 requêtes/minute
  nonceWindow: 300000, // 5 minutes
  allowedOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
  enableAntiReplay: process.env.NODE_ENV === 'production'
};

// Ajouter des clés API supplémentaires depuis l'environnement
if (process.env.LISA_BRIDGE_API_KEYS) {
  process.env.LISA_BRIDGE_API_KEYS.split(',').forEach(key => {
    if (key.trim()) config.apiKeys.add(key.trim());
  });
}

// ============================================================================
// Middleware: Authentication
// ============================================================================

export function bridgeAuth(req: Request, res: Response, next: NextFunction): void {
  // Extraire l'API key
  const apiKey = 
    req.headers['x-lisa-api-key'] as string ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    req.query.api_key as string;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_MISSING'
    });
    return;
  }

  if (!config.apiKeys.has(apiKey)) {
    res.status(403).json({
      success: false,
      error: 'Invalid API key',
      code: 'AUTH_INVALID'
    });
    return;
  }

  // Ajouter l'info d'auth à la requête
  (req as Request & { apiKey: string }).apiKey = apiKey;
  next();
}

// ============================================================================
// Middleware: Rate Limiting
// ============================================================================

export function bridgeRateLimit(options?: { window?: number; max?: number }) {
  const window = options?.window || config.rateLimitWindow;
  const max = options?.max || config.rateLimitMax;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Clé de rate limit = API key + IP
    const apiKey = (req as Request & { apiKey?: string }).apiKey || 'anonymous';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${apiKey}:${ip}`;

    const result = securityStore.checkRateLimit(key, window, max);

    // Headers de rate limit
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetIn / 1000).toString());

    if (!result.allowed) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        retryAfter: Math.ceil(result.resetIn / 1000)
      });
      return;
    }

    next();
  };
}

// ============================================================================
// Middleware: Anti-Replay
// ============================================================================

export function bridgeAntiReplay(req: Request, res: Response, next: NextFunction): void {
  // Skip si désactivé
  if (!config.enableAntiReplay) {
    next();
    return;
  }

  const nonce = req.headers['x-lisa-nonce'] as string;
  const timestamp = req.headers['x-lisa-timestamp'] as string;

  if (!nonce || !timestamp) {
    res.status(400).json({
      success: false,
      error: 'Anti-replay headers required (X-Lisa-Nonce, X-Lisa-Timestamp)',
      code: 'REPLAY_HEADERS_MISSING'
    });
    return;
  }

  // Vérifier le timestamp (± 5 minutes)
  const requestTime = parseInt(timestamp, 10);
  const now = Date.now();
  
  if (isNaN(requestTime) || Math.abs(now - requestTime) > config.nonceWindow) {
    res.status(400).json({
      success: false,
      error: 'Request timestamp expired or invalid',
      code: 'REPLAY_TIMESTAMP_INVALID'
    });
    return;
  }

  // Vérifier le nonce
  if (!securityStore.checkNonce(nonce, config.nonceWindow)) {
    res.status(400).json({
      success: false,
      error: 'Nonce already used or expired',
      code: 'REPLAY_NONCE_INVALID'
    });
    return;
  }

  next();
}

// ============================================================================
// Middleware: CORS Strict
// ============================================================================

export function bridgeCors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (config.allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Lisa-API-Key, X-Lisa-Nonce, X-Lisa-Timestamp');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

// ============================================================================
// Middleware: Request Tracing
// ============================================================================

export function bridgeTracing(req: Request, res: Response, next: NextFunction): void {
  const traceId = req.headers['x-trace-id'] as string || 
    `trace_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  (req as Request & { traceId: string }).traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);

  // Log de la requête
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      type: 'bridge_request',
      traceId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }));
  });

  next();
}

// ============================================================================
// Middleware combiné: Sécurité complète
// ============================================================================

export function bridgeSecurityMiddleware(options?: {
  skipAuth?: boolean;
  skipRateLimit?: boolean;
  skipAntiReplay?: boolean;
  rateLimitMax?: number;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // CORS d'abord
    bridgeCors(req, res, () => {
      // Tracing
      bridgeTracing(req, res, () => {
        // Auth (sauf si skip)
        if (options?.skipAuth) {
          // Rate limit
          if (options?.skipRateLimit) {
            // Anti-replay
            if (options?.skipAntiReplay) {
              next();
            } else {
              bridgeAntiReplay(req, res, next);
            }
          } else {
            bridgeRateLimit({ max: options?.rateLimitMax })(req, res, () => {
              if (options?.skipAntiReplay) {
                next();
              } else {
                bridgeAntiReplay(req, res, next);
              }
            });
          }
        } else {
          bridgeAuth(req, res, () => {
            // Rate limit
            if (options?.skipRateLimit) {
              if (options?.skipAntiReplay) {
                next();
              } else {
                bridgeAntiReplay(req, res, next);
              }
            } else {
              bridgeRateLimit({ max: options?.rateLimitMax })(req, res, () => {
                if (options?.skipAntiReplay) {
                  next();
                } else {
                  bridgeAntiReplay(req, res, next);
                }
              });
            }
          });
        }
      });
    });
  };
}

// ============================================================================
// Helpers
// ============================================================================

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateApiKey(): string {
  return `lisa_${crypto.randomBytes(24).toString('hex')}`;
}

export function addApiKey(key: string): void {
  config.apiKeys.add(key);
}

export function removeApiKey(key: string): void {
  config.apiKeys.delete(key);
}

export function updateConfig(updates: Partial<SecurityConfig>): void {
  Object.assign(config, updates);
}

export { securityStore };
