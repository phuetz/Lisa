/**
 * Session Store - Stockage persistant des sessions
 * 
 * Implémente plusieurs backends:
 * - MemoryStore (défaut, développement)
 * - SQLiteStore (persistant)
 * - Avec TTL, compression et résumé automatique
 */

import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
    durationMs?: number;
  }>;
  metadata?: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  messages: SessionMessage[];
  context: Record<string, unknown>;
  summary?: string;
  messageCount: number;
  compressedAt?: string;
}

export interface SessionStoreConfig {
  maxMessages: number;           // Max messages avant compression
  ttlMs: number;                 // TTL des sessions (défaut: 24h)
  compressionThreshold: number;  // Seuil de compression (nombre de messages)
  autoCleanupInterval: number;   // Intervalle de nettoyage (ms)
}

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().optional(),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.string(),
    timestamp: z.string(),
    toolCalls: z.array(z.object({
      id: z.string(),
      name: z.string(),
      arguments: z.record(z.string(), z.unknown()),
      result: z.unknown().optional(),
      durationMs: z.number().optional()
    })).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })),
  context: z.record(z.string(), z.unknown()),
  summary: z.string().optional(),
  messageCount: z.number(),
  compressedAt: z.string().optional()
});

// ============================================================================
// Abstract Store Interface
// ============================================================================

export interface ISessionStore {
  get(sessionId: string): Promise<Session | null>;
  set(session: Session): Promise<void>;
  delete(sessionId: string): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
  list(userId?: string): Promise<Session[]>;
  cleanup(): Promise<number>;
  addMessage(sessionId: string, message: SessionMessage): Promise<void>;
  getMessages(sessionId: string, limit?: number): Promise<SessionMessage[]>;
  compress(sessionId: string): Promise<void>;
}

// ============================================================================
// Memory Store (Développement)
// ============================================================================

export class MemorySessionStore implements ISessionStore {
  private sessions: Map<string, Session> = new Map();
  private config: SessionStoreConfig;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config?: Partial<SessionStoreConfig>) {
    this.config = {
      maxMessages: 100,
      ttlMs: 24 * 60 * 60 * 1000, // 24h
      compressionThreshold: 50,
      autoCleanupInterval: 5 * 60 * 1000, // 5 min
      ...config
    };

    this.startAutoCleanup();
  }

  async get(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Vérifier expiration
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  async set(session: Session): Promise<void> {
    // Ajouter TTL si non défini
    if (!session.expiresAt) {
      session.expiresAt = new Date(Date.now() + this.config.ttlMs).toISOString();
    }
    this.sessions.set(session.id, session);
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async list(userId?: string): Promise<Session[]> {
    const sessions = Array.from(this.sessions.values());
    if (userId) {
      return sessions.filter(s => s.userId === userId);
    }
    return sessions;
  }

  async cleanup(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt && new Date(session.expiresAt) < now) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  async addMessage(sessionId: string, message: SessionMessage): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.messages.push(message);
    session.messageCount = session.messages.length;
    session.updatedAt = new Date().toISOString();

    // Auto-compression si nécessaire
    if (session.messages.length > this.config.compressionThreshold) {
      await this.compress(sessionId);
    }

    await this.set(session);
  }

  async getMessages(sessionId: string, limit?: number): Promise<SessionMessage[]> {
    const session = await this.get(sessionId);
    if (!session) return [];

    if (limit) {
      return session.messages.slice(-limit);
    }
    return session.messages;
  }

  async compress(sessionId: string): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) return;

    // Garder les N derniers messages, résumer les anciens
    const keepCount = Math.floor(this.config.compressionThreshold / 2);
    const toCompress = session.messages.slice(0, -keepCount);
    const toKeep = session.messages.slice(-keepCount);

    if (toCompress.length === 0) return;

    // Créer un résumé simple (pour un vrai résumé, utiliser un LLM)
    const summaryParts: string[] = [];
    if (session.summary) {
      summaryParts.push(session.summary);
    }
    
    const compressedSummary = toCompress
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `[${m.role}]: ${m.content.substring(0, 100)}...`)
      .join('\n');
    
    summaryParts.push(`--- Compressed ${toCompress.length} messages ---\n${compressedSummary}`);

    session.summary = summaryParts.join('\n\n');
    session.messages = toKeep;
    session.compressedAt = new Date().toISOString();

    await this.set(session);
  }

  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(console.error);
    }, this.config.autoCleanupInterval);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// ============================================================================
// SQLite Store (Production)
// ============================================================================

export class SQLiteSessionStore implements ISessionStore {
  private dbPath: string;
  private config: SessionStoreConfig;
  private initialized: boolean = false;

  constructor(dbPath: string = './data/sessions.db', config?: Partial<SessionStoreConfig>) {
    this.dbPath = dbPath;
    this.config = {
      maxMessages: 100,
      ttlMs: 24 * 60 * 60 * 1000,
      compressionThreshold: 50,
      autoCleanupInterval: 5 * 60 * 1000,
      ...config
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    // Créer le dossier data si nécessaire
    const { mkdir, writeFile, readFile } = await import('fs/promises');
    const { dirname } = await import('path');
    
    try {
      await mkdir(dirname(this.dbPath), { recursive: true });
    } catch {
      // Ignore si existe déjà
    }

    // Pour une vraie implémentation SQLite, utiliser better-sqlite3 ou sql.js
    // Ici on utilise un fichier JSON simple comme fallback
    try {
      await readFile(this.dbPath, 'utf-8');
    } catch {
      await writeFile(this.dbPath, JSON.stringify({ sessions: {} }));
    }

    this.initialized = true;
  }

  private async loadData(): Promise<{ sessions: Record<string, Session> }> {
    await this.ensureInitialized();
    const { readFile } = await import('fs/promises');
    const data = await readFile(this.dbPath, 'utf-8');
    return JSON.parse(data);
  }

  private async saveData(data: { sessions: Record<string, Session> }): Promise<void> {
    const { writeFile } = await import('fs/promises');
    await writeFile(this.dbPath, JSON.stringify(data, null, 2));
  }

  async get(sessionId: string): Promise<Session | null> {
    const data = await this.loadData();
    const session = data.sessions[sessionId];
    
    if (!session) return null;

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      delete data.sessions[sessionId];
      await this.saveData(data);
      return null;
    }

    return session;
  }

  async set(session: Session): Promise<void> {
    const data = await this.loadData();
    
    if (!session.expiresAt) {
      session.expiresAt = new Date(Date.now() + this.config.ttlMs).toISOString();
    }
    
    data.sessions[session.id] = session;
    await this.saveData(data);
  }

  async delete(sessionId: string): Promise<void> {
    const data = await this.loadData();
    delete data.sessions[sessionId];
    await this.saveData(data);
  }

  async exists(sessionId: string): Promise<boolean> {
    const data = await this.loadData();
    return sessionId in data.sessions;
  }

  async list(userId?: string): Promise<Session[]> {
    const data = await this.loadData();
    const sessions = Object.values(data.sessions);
    
    if (userId) {
      return sessions.filter(s => s.userId === userId);
    }
    return sessions;
  }

  async cleanup(): Promise<number> {
    const data = await this.loadData();
    const now = new Date();
    let cleaned = 0;

    for (const [id, session] of Object.entries(data.sessions)) {
      if (session.expiresAt && new Date(session.expiresAt) < now) {
        delete data.sessions[id];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.saveData(data);
    }

    return cleaned;
  }

  async addMessage(sessionId: string, message: SessionMessage): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.messages.push(message);
    session.messageCount = session.messages.length;
    session.updatedAt = new Date().toISOString();

    if (session.messages.length > this.config.compressionThreshold) {
      await this.compress(sessionId);
    } else {
      await this.set(session);
    }
  }

  async getMessages(sessionId: string, limit?: number): Promise<SessionMessage[]> {
    const session = await this.get(sessionId);
    if (!session) return [];

    if (limit) {
      return session.messages.slice(-limit);
    }
    return session.messages;
  }

  async compress(sessionId: string): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) return;

    const keepCount = Math.floor(this.config.compressionThreshold / 2);
    const toCompress = session.messages.slice(0, -keepCount);
    const toKeep = session.messages.slice(-keepCount);

    if (toCompress.length === 0) return;

    const summaryParts: string[] = [];
    if (session.summary) {
      summaryParts.push(session.summary);
    }
    
    const compressedSummary = toCompress
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `[${m.role}]: ${m.content.substring(0, 100)}...`)
      .join('\n');
    
    summaryParts.push(`--- Compressed ${toCompress.length} messages ---\n${compressedSummary}`);

    session.summary = summaryParts.join('\n\n');
    session.messages = toKeep;
    session.compressedAt = new Date().toISOString();

    await this.set(session);
  }
}

// ============================================================================
// Session Manager (façade)
// ============================================================================

export class SessionManager {
  private store: ISessionStore;

  constructor(store?: ISessionStore) {
    // Utiliser MemoryStore par défaut, SQLiteStore en prod
    this.store = store || new MemorySessionStore();
  }

  async createSession(userId?: string, initialContext?: Record<string, unknown>): Promise<Session> {
    const session: Session = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      context: initialContext || {},
      messageCount: 0
    };

    await this.store.set(session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.store.get(sessionId);
  }

  async addMessage(
    sessionId: string, 
    role: SessionMessage['role'], 
    content: string,
    toolCalls?: SessionMessage['toolCalls'],
    metadata?: SessionMessage['metadata']
  ): Promise<SessionMessage> {
    const message: SessionMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      toolCalls,
      metadata
    };

    await this.store.addMessage(sessionId, message);
    return message;
  }

  async getHistory(sessionId: string, limit?: number): Promise<SessionMessage[]> {
    return this.store.getMessages(sessionId, limit);
  }

  async updateContext(sessionId: string, context: Record<string, unknown>): Promise<void> {
    const session = await this.store.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.context = { ...session.context, ...context };
    session.updatedAt = new Date().toISOString();
    await this.store.set(session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);
  }

  async listSessions(userId?: string): Promise<Session[]> {
    return this.store.list(userId);
  }

  async cleanup(): Promise<number> {
    return this.store.cleanup();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

// Utiliser SQLiteStore en production, MemoryStore en dev
const isProduction = process.env.NODE_ENV === 'production';
const defaultStore = isProduction 
  ? new SQLiteSessionStore('./data/sessions.db')
  : new MemorySessionStore();

export const sessionManager = new SessionManager(defaultStore);

export default SessionManager;
