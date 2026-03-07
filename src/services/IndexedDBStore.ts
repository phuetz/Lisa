/**
 * IndexedDBStore - Generic IndexedDB key-value wrapper
 *
 * Provides a simple async key-value API backed by IndexedDB.
 * Designed for browser-only use (no Node.js APIs).
 *
 * Used by KnowledgeGraphService as a higher-capacity alternative to localStorage.
 * Falls back gracefully when IndexedDB is not available (e.g., private browsing,
 * SSR, or environments without the API).
 */

// ============================================================================
// Types
// ============================================================================

interface StoredEntry<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

// ============================================================================
// IndexedDBStore
// ============================================================================

export class IndexedDBStore {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private version: number;

  constructor(
    dbName: string = 'lisa-memory',
    storeName: string = 'knowledge',
    version: number = 1,
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Open (or create) the IndexedDB database.
   * Must be called before any get/set/delete operations.
   * Safe to call multiple times - reuses existing connection.
   */
  async open(): Promise<void> {
    if (this.db) return;

    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not available in this environment');
    }

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Handle unexpected connection close (e.g., browser version upgrade)
        this.db.onclose = () => {
          this.db = null;
        };

        resolve();
      };

      request.onerror = () => {
        reject(
          request.error ?? new Error('Failed to open IndexedDB'),
        );
      };
    });
  }

  /**
   * Close the database connection.
   * Safe to call even if not open.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Get a value by key. Returns null if not found.
   */
  async get<T>(key: string): Promise<T | null> {
    const db = this.ensureOpen();
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as StoredEntry<T> | undefined;
        resolve(entry ? entry.value : null);
      };

      request.onerror = () => {
        reject(request.error ?? new Error(`Failed to get key "${key}"`));
      };
    });
  }

  /**
   * Set a value by key. Overwrites any existing value.
   */
  async set<T>(key: string, value: T): Promise<void> {
    const db = this.ensureOpen();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const entry: StoredEntry<T> = {
        key,
        value,
        updatedAt: Date.now(),
      };

      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(request.error ?? new Error(`Failed to set key "${key}"`));
      };
    });
  }

  /**
   * Delete a value by key. No-op if key does not exist.
   */
  async delete(key: string): Promise<void> {
    const db = this.ensureOpen();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(request.error ?? new Error(`Failed to delete key "${key}"`));
      };
    });
  }

  /**
   * Get all values in the store.
   */
  async getAll<T>(): Promise<T[]> {
    const db = this.ensureOpen();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = (request.result ?? []) as StoredEntry<T>[];
        resolve(entries.map((e) => e.value));
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to getAll'));
      };
    });
  }

  /**
   * Clear all data in the store.
   */
  async clear(): Promise<void> {
    const db = this.ensureOpen();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(request.error ?? new Error('Failed to clear store'));
      };
    });
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Check if IndexedDB is available in the current environment.
   */
  static isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Check if the store is currently open.
   */
  get isOpen(): boolean {
    return this.db !== null;
  }

  // ==========================================================================
  // Private
  // ==========================================================================

  private ensureOpen(): IDBDatabase {
    if (!this.db) {
      throw new Error(
        'IndexedDBStore is not open. Call open() before performing operations.',
      );
    }
    return this.db;
  }
}
