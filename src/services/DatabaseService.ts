/**
 * DatabaseService - Unified SQLite storage via sql.js (WASM)
 *
 * Replaces 6 separate IndexedDB databases + localStorage with a single SQLite DB.
 * The DB is serialized as a Uint8Array blob and persisted in one IndexedDB entry.
 * Writes are debounced (500ms) to batch multiple operations into a single persist.
 */

import type { Database, SqlJsStatic } from 'sql.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueryResult {
  columns: string[];
  values: unknown[][];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const IDB_NAME = 'lisa-sqlite';
const IDB_STORE = 'database';
const IDB_KEY = 'main';
const PERSIST_DEBOUNCE_MS = 500;

// ─── Schema DDL ──────────────────────────────────────────────────────────────

const SCHEMA_DDL = `
-- Embedding cache
CREATE TABLE IF NOT EXISTS embedding_cache (
  key TEXT PRIMARY KEY,
  vector TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emb_provider ON embedding_cache(provider);
CREATE INDEX IF NOT EXISTS idx_emb_created ON embedding_cache(created_at);

-- HNSW vector nodes
CREATE TABLE IF NOT EXISTS vectors (
  id TEXT PRIMARY KEY,
  vector TEXT NOT NULL,
  metadata TEXT,
  level INTEGER NOT NULL,
  neighbors TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vector_config (
  key TEXT PRIMARY KEY,
  entry_point TEXT,
  max_level INTEGER,
  next_index INTEGER
);

-- Long-term memories
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  key TEXT,
  value TEXT NOT NULL,
  importance REAL DEFAULT 0.5,
  source TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  access_count INTEGER DEFAULT 0,
  conversation_id TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_mem_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_mem_key ON memories(key);
CREATE INDEX IF NOT EXISTS idx_mem_importance ON memories(importance);

-- Memory tags (normalized junction table)
CREATE TABLE IF NOT EXISTS memory_tags (
  memory_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (memory_id, tag),
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON memory_tags(tag);

-- Prompt cache
CREATE TABLE IF NOT EXISTS prompt_cache (
  hash TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  response TEXT NOT NULL,
  messages TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_hit INTEGER
);
CREATE INDEX IF NOT EXISTS idx_pc_model ON prompt_cache(model);
CREATE INDEX IF NOT EXISTS idx_pc_expires ON prompt_cache(expires_at);

-- Semantic prompt cache
CREATE TABLE IF NOT EXISTS semantic_cache (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT,
  embedding TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  hit_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sc_model ON semantic_cache(model);
CREATE INDEX IF NOT EXISTS idx_sc_expires ON semantic_cache(expires_at);

-- RAG embeddings
CREATE TABLE IF NOT EXISTS rag_embeddings (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT NOT NULL,
  metadata TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rag_doc ON rag_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_created ON rag_embeddings(created_at);

-- RAG config
CREATE TABLE IF NOT EXISTS rag_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// FTS4 tables created separately (CREATE VIRTUAL TABLE IF NOT EXISTS works differently)
const FTS_DDL = `
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts4(id, value, key, tokenize=unicode61);
CREATE VIRTUAL TABLE IF NOT EXISTS rag_fts USING fts4(id, content, tokenize=unicode61);
`;

// ─── IDB helpers (raw, no idb package needed) ────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase): Promise<Uint8Array | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve(req.result as Uint8Array | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(data, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── DatabaseService ─────────────────────────────────────────────────────────

class DatabaseService {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private idb: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private _ready = false;

  /** True once the database has been fully initialized */
  get ready(): boolean {
    return this._ready;
  }

  /**
   * Initialize the database. Safe to call multiple times (idempotent).
   */
  async init(): Promise<void> {
    if (this._ready) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    try {
      // 1. Load sql.js WASM
      const initSqlJs = (await import(/* @vite-ignore */ 'sql.js')).default;
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `/${file}`,
      });

      // 2. Open IDB for blob persistence
      this.idb = await openIDB();

      // 3. Try to load existing database from IDB
      const existingData = await idbGet(this.idb);
      if (existingData) {
        this.db = new this.SQL.Database(existingData);
        console.log('[DatabaseService] Loaded existing database from IDB');
      } else {
        this.db = new this.SQL.Database();
        console.log('[DatabaseService] Created new database');
      }

      // 4. Execute schema DDL (IF NOT EXISTS makes this safe to run always)
      this.db.exec(SCHEMA_DDL);
      this.db.exec(FTS_DDL);

      // 5. Enable WAL-like pragmas for performance
      this.db.exec('PRAGMA journal_mode = MEMORY;');
      this.db.exec('PRAGMA synchronous = OFF;');
      this.db.exec('PRAGMA foreign_keys = ON;');

      // 6. Persist the initial schema (if new DB)
      if (!existingData) {
        await this._persist();
      }

      this._ready = true;
      console.log('[DatabaseService] Initialized successfully');

      // 7. Clean up old IndexedDB databases (one-time migration)
      this.cleanupOldDatabases();
    } catch (err) {
      console.error('[DatabaseService] Initialization failed:', err);
      this.initPromise = null;
      throw err;
    }
  }

  /**
   * Get the raw sql.js Database instance.
   * Ensures init has completed first.
   */
  async getDb(): Promise<Database> {
    await this.init();
    if (!this.db) throw new Error('DatabaseService not initialized');
    return this.db;
  }

  // ─── Query helpers ──────────────────────────────────────────────────────────

  /**
   * Execute a SQL statement that modifies data (INSERT, UPDATE, DELETE).
   * Automatically schedules a debounced persist.
   */
  async run(sql: string, params?: unknown[]): Promise<void> {
    const db = await this.getDb();
    db.run(sql, params as any);
    this.schedulePersist();
  }

  /**
   * Execute raw SQL (multiple statements). For DDL or batch operations.
   */
  async exec(sql: string): Promise<void> {
    const db = await this.getDb();
    db.exec(sql);
    this.schedulePersist();
  }

  /**
   * Get a single row as an object, or undefined if not found.
   */
  async get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined> {
    const db = await this.getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params as any);
    if (stmt.step()) {
      const row = stmt.getAsObject() as T;
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }

  /**
   * Get all matching rows as an array of objects.
   */
  async all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    const db = await this.getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params as any);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return rows;
  }

  /**
   * Execute a query and return raw results (columns + values arrays).
   */
  async query(sql: string, params?: unknown[]): Promise<QueryResult[]> {
    const db = await this.getDb();
    return db.exec(sql, params as any);
  }

  // ─── Transaction helper ─────────────────────────────────────────────────────

  /**
   * Run multiple operations inside a transaction.
   */
  async transaction(fn: () => void | Promise<void>): Promise<void> {
    const db = await this.getDb();
    db.run('BEGIN TRANSACTION');
    try {
      await fn();
      db.run('COMMIT');
      this.schedulePersist();
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }
  }

  // ─── Persistence ────────────────────────────────────────────────────────────

  /**
   * Schedule a debounced persist (500ms). Multiple calls within the window
   * are batched into a single IndexedDB write.
   */
  schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this._persist().catch(err =>
        console.error('[DatabaseService] Persist failed:', err)
      );
    }, PERSIST_DEBOUNCE_MS);
  }

  /**
   * Immediately persist the database to IndexedDB.
   */
  async persist(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    await this._persist();
  }

  private async _persist(): Promise<void> {
    if (!this.db || !this.idb) return;
    const data = this.db.export();
    await idbPut(this.idb, data);
  }

  // ─── Export / Import ────────────────────────────────────────────────────────

  /**
   * Export the entire database as a Uint8Array (for backup/download).
   */
  async exportDatabase(): Promise<Uint8Array> {
    const db = await this.getDb();
    return db.export();
  }

  /**
   * Import a database from a Uint8Array (from backup/upload).
   * Replaces the current database entirely.
   */
  async importDatabase(data: Uint8Array): Promise<void> {
    if (!this.SQL) throw new Error('SQL.js not loaded');
    if (this.db) this.db.close();
    this.db = new this.SQL.Database(data);
    // Re-apply schema in case import is from older version
    this.db.exec(SCHEMA_DDL);
    this.db.exec(FTS_DDL);
    await this._persist();
    console.log('[DatabaseService] Database imported successfully');
  }

  // ─── Old database cleanup ───────────────────────────────────────────────────

  /**
   * Delete old IndexedDB databases that were replaced by this unified SQLite store.
   * Runs silently in the background; failures are non-fatal.
   */
  private cleanupOldDatabases(): void {
    const OLD_DBS = [
      'lisa-embedding-cache',
      'lisa-vector-store',
      'lisa-memory-db',
      'lisa-prompt-cache',
      'lisa-semantic-cache',
    ];

    for (const name of OLD_DBS) {
      try {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => console.log(`[DatabaseService] Deleted old DB: ${name}`);
        req.onerror = () => {}; // ignore
      } catch { /* ignore */ }
    }

    // Clean old localStorage keys
    try {
      localStorage.removeItem('lisa:rag:embeddings');
      localStorage.removeItem('lisa:rag:config');
    } catch { /* ignore */ }
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Close the database and flush any pending writes.
   */
  async close(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.db) {
      await this._persist();
      this.db.close();
      this.db = null;
    }
    if (this.idb) {
      this.idb.close();
      this.idb = null;
    }
    this._ready = false;
    this.initPromise = null;
    console.log('[DatabaseService] Closed');
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const databaseService = new DatabaseService();
export default databaseService;
