/**
 * IndexedDBStore Tests
 *
 * Tests the generic IndexedDB key-value wrapper:
 *   - open / close lifecycle
 *   - get / set / delete / getAll / clear CRUD operations
 *   - static isAvailable() check
 *   - error handling when IndexedDB is unavailable
 *   - error handling when store is not open
 *
 * Uses a manual IDB mock since jsdom does not include IndexedDB.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexedDBStore } from '../IndexedDBStore';

// ============================================================================
// IndexedDB Mock
// ============================================================================

/**
 * Minimal IndexedDB mock that simulates:
 *   - indexedDB.open() with onupgradeneeded / onsuccess / onerror
 *   - IDBDatabase with transaction() and objectStoreNames
 *   - IDBTransaction with objectStore() and oncomplete/onerror
 *   - IDBObjectStore with get/put/delete/clear/getAll
 *   - IDBRequest with onsuccess/onerror and result
 */

type RequestCallback = ((this: IDBRequest) => void) | null;

class MockIDBRequest {
  result: unknown = undefined;
  error: DOMException | null = null;
  onsuccess: RequestCallback = null;
  onerror: RequestCallback = null;

  _resolve(value: unknown): void {
    this.result = value;
    this.onsuccess?.call(this as unknown as IDBRequest);
  }

  _reject(error: DOMException): void {
    this.error = error;
    this.onerror?.call(this as unknown as IDBRequest);
  }
}

class MockIDBObjectStore {
  private data = new Map<string, unknown>();

  get(key: string): MockIDBRequest {
    const req = new MockIDBRequest();
    queueMicrotask(() => req._resolve(this.data.get(key)));
    return req;
  }

  put(entry: { key: string; [k: string]: unknown }): MockIDBRequest {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      this.data.set(entry.key, entry);
      req._resolve(entry.key);
    });
    return req;
  }

  delete(key: string): MockIDBRequest {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      this.data.delete(key);
      req._resolve(undefined);
    });
    return req;
  }

  clear(): MockIDBRequest {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      this.data.clear();
      req._resolve(undefined);
    });
    return req;
  }

  getAll(): MockIDBRequest {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      req._resolve(Array.from(this.data.values()));
    });
    return req;
  }

  /** Expose internal data for test assertions */
  _getData(): Map<string, unknown> {
    return this.data;
  }
}

class MockIDBTransaction {
  private stores: Map<string, MockIDBObjectStore>;
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  error: DOMException | null = null;

  constructor(stores: Map<string, MockIDBObjectStore>) {
    this.stores = stores;
  }

  objectStore(name: string): MockIDBObjectStore {
    const store = this.stores.get(name);
    if (!store) {
      throw new DOMException(`Object store "${name}" not found`, 'NotFoundError');
    }
    return store;
  }
}

class MockIDBDatabase {
  private stores = new Map<string, MockIDBObjectStore>();
  objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };
  onclose: (() => void) | null = null;

  createObjectStore(name: string, _options?: { keyPath?: string }): MockIDBObjectStore {
    const store = new MockIDBObjectStore();
    this.stores.set(name, store);
    return store;
  }

  transaction(
    storeNames: string | string[],
    _mode?: IDBTransactionMode,
  ): MockIDBTransaction {
    return new MockIDBTransaction(this.stores);
  }

  close(): void {
    // no-op
  }
}

class MockIDBOpenRequest {
  result: MockIDBDatabase | null = null;
  error: DOMException | null = null;
  onupgradeneeded: ((ev: { target: { result: MockIDBDatabase } }) => void) | null = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

function createMockIndexedDB() {
  const databases = new Map<string, MockIDBDatabase>();

  return {
    open(name: string, _version?: number): MockIDBOpenRequest {
      const req = new MockIDBOpenRequest();

      queueMicrotask(() => {
        let db = databases.get(name);
        const isNew = !db;
        if (!db) {
          db = new MockIDBDatabase();
          databases.set(name, db);
        }
        req.result = db;

        if (isNew && req.onupgradeneeded) {
          req.onupgradeneeded({ target: { result: db } });
        }

        req.onsuccess?.();
      });

      return req;
    },

    deleteDatabase(name: string): MockIDBRequest {
      const req = new MockIDBRequest();
      databases.delete(name);
      queueMicrotask(() => req._resolve(undefined));
      return req;
    },

    _databases: databases,
    _reset(): void {
      databases.clear();
    },
  };
}

// ============================================================================
// Test Setup
// ============================================================================

let mockIDB: ReturnType<typeof createMockIndexedDB>;
let originalIndexedDB: IDBFactory | undefined;

beforeEach(() => {
  mockIDB = createMockIndexedDB();
  originalIndexedDB = globalThis.indexedDB;
  Object.defineProperty(globalThis, 'indexedDB', {
    value: mockIDB,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  if (originalIndexedDB !== undefined) {
    Object.defineProperty(globalThis, 'indexedDB', {
      value: originalIndexedDB,
      writable: true,
      configurable: true,
    });
  } else {
    // @ts-expect-error - removing indexedDB in cleanup
    delete globalThis.indexedDB;
  }
});

// ============================================================================
// Tests
// ============================================================================

describe('IndexedDBStore', () => {
  // --------------------------------------------------------------------------
  // Static
  // --------------------------------------------------------------------------
  describe('static isAvailable()', () => {
    it('returns true when indexedDB is defined', () => {
      expect(IndexedDBStore.isAvailable()).toBe(true);
    });

    it('returns false when indexedDB is undefined', () => {
      const saved = globalThis.indexedDB;
      // @ts-expect-error - intentionally removing for test
      delete globalThis.indexedDB;
      expect(IndexedDBStore.isAvailable()).toBe(false);
      Object.defineProperty(globalThis, 'indexedDB', {
        value: saved,
        writable: true,
        configurable: true,
      });
    });
  });

  // --------------------------------------------------------------------------
  // open / close
  // --------------------------------------------------------------------------
  describe('open / close', () => {
    it('opens a new database and creates the object store', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();
      expect(store.isOpen).toBe(true);
      expect(mockIDB._databases.has('test-db')).toBe(true);
      store.close();
    });

    it('open is idempotent (calling twice reuses connection)', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();
      await store.open(); // should not throw
      expect(store.isOpen).toBe(true);
      store.close();
    });

    it('close sets isOpen to false', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();
      expect(store.isOpen).toBe(true);
      store.close();
      expect(store.isOpen).toBe(false);
    });

    it('close is safe to call when not open', () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      expect(() => store.close()).not.toThrow();
    });

    it('throws when IndexedDB is not available', async () => {
      const saved = globalThis.indexedDB;
      // @ts-expect-error - intentionally removing for test
      delete globalThis.indexedDB;

      const store = new IndexedDBStore('test-db', 'test-store');
      await expect(store.open()).rejects.toThrow('IndexedDB is not available');

      Object.defineProperty(globalThis, 'indexedDB', {
        value: saved,
        writable: true,
        configurable: true,
      });
    });
  });

  // --------------------------------------------------------------------------
  // set / get
  // --------------------------------------------------------------------------
  describe('set / get', () => {
    it('stores and retrieves a string value', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.set('greeting', 'hello world');
      const value = await store.get<string>('greeting');
      expect(value).toBe('hello world');

      store.close();
    });

    it('stores and retrieves an object value', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      const data = { name: 'Alice', age: 30, tags: ['dev', 'ts'] };
      await store.set('user', data);
      const value = await store.get<typeof data>('user');
      expect(value).toEqual(data);

      store.close();
    });

    it('returns null for non-existent key', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      const value = await store.get('nonexistent');
      expect(value).toBeNull();

      store.close();
    });

    it('overwrites existing value on set', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.set('key', 'first');
      await store.set('key', 'second');
      const value = await store.get<string>('key');
      expect(value).toBe('second');

      store.close();
    });

    it('stores and retrieves numbers', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.set('count', 42);
      const value = await store.get<number>('count');
      expect(value).toBe(42);

      store.close();
    });

    it('stores and retrieves arrays', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      const arr = [1, 'two', { three: 3 }];
      await store.set('list', arr);
      const value = await store.get<typeof arr>('list');
      expect(value).toEqual(arr);

      store.close();
    });

    it('stores and retrieves null values', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.set('nullable', null);
      const value = await store.get('nullable');
      expect(value).toBeNull();

      store.close();
    });
  });

  // --------------------------------------------------------------------------
  // delete
  // --------------------------------------------------------------------------
  describe('delete', () => {
    it('removes an existing key', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.set('key', 'value');
      await store.delete('key');
      const value = await store.get('key');
      expect(value).toBeNull();

      store.close();
    });

    it('is a no-op for non-existent key', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      // Should not throw
      await store.delete('nonexistent');

      store.close();
    });

    it('does not affect other keys', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.set('a', 1);
      await store.set('b', 2);
      await store.delete('a');

      expect(await store.get('a')).toBeNull();
      expect(await store.get<number>('b')).toBe(2);

      store.close();
    });
  });

  // --------------------------------------------------------------------------
  // getAll
  // --------------------------------------------------------------------------
  describe('getAll', () => {
    it('returns empty array for empty store', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      const all = await store.getAll();
      expect(all).toEqual([]);

      store.close();
    });

    it('returns all stored values', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.set('a', 'alpha');
      await store.set('b', 'beta');
      await store.set('c', 'gamma');

      const all = await store.getAll<string>();
      expect(all).toHaveLength(3);
      expect(all).toContain('alpha');
      expect(all).toContain('beta');
      expect(all).toContain('gamma');

      store.close();
    });

    it('reflects deletions', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.set('a', 1);
      await store.set('b', 2);
      await store.delete('a');

      const all = await store.getAll<number>();
      expect(all).toHaveLength(1);
      expect(all).toContain(2);

      store.close();
    });
  });

  // --------------------------------------------------------------------------
  // clear
  // --------------------------------------------------------------------------
  describe('clear', () => {
    it('removes all entries', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.set('a', 1);
      await store.set('b', 2);
      await store.set('c', 3);
      await store.clear();

      const all = await store.getAll();
      expect(all).toEqual([]);
      expect(await store.get('a')).toBeNull();

      store.close();
    });

    it('is safe to call on empty store', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.clear();
      const all = await store.getAll();
      expect(all).toEqual([]);

      store.close();
    });
  });

  // --------------------------------------------------------------------------
  // Error handling: not open
  // --------------------------------------------------------------------------
  describe('error handling (store not open)', () => {
    it('get throws when store is not open', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await expect(store.get('key')).rejects.toThrow('not open');
    });

    it('set throws when store is not open', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await expect(store.set('key', 'value')).rejects.toThrow('not open');
    });

    it('delete throws when store is not open', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await expect(store.delete('key')).rejects.toThrow('not open');
    });

    it('getAll throws when store is not open', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await expect(store.getAll()).rejects.toThrow('not open');
    });

    it('clear throws when store is not open', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await expect(store.clear()).rejects.toThrow('not open');
    });
  });

  // --------------------------------------------------------------------------
  // Default parameters
  // --------------------------------------------------------------------------
  describe('default parameters', () => {
    it('uses default dbName and storeName', async () => {
      const store = new IndexedDBStore();
      await store.open();
      expect(store.isOpen).toBe(true);
      expect(mockIDB._databases.has('lisa-memory')).toBe(true);
      store.close();
    });
  });

  // --------------------------------------------------------------------------
  // Multiple stores / isolation
  // --------------------------------------------------------------------------
  describe('store isolation', () => {
    it('separate database names are isolated', async () => {
      const storeA = new IndexedDBStore('db-a', 'store');
      const storeB = new IndexedDBStore('db-b', 'store');
      await storeA.open();
      await storeB.open();

      await storeA.set('key', 'from-a');
      await storeB.set('key', 'from-b');

      expect(await storeA.get<string>('key')).toBe('from-a');
      expect(await storeB.get<string>('key')).toBe('from-b');

      storeA.close();
      storeB.close();
    });
  });

  // --------------------------------------------------------------------------
  // Complex value types
  // --------------------------------------------------------------------------
  describe('complex value types', () => {
    it('stores nested objects with arrays', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      const complex = {
        version: 1,
        triples: [
          { subject: 'A', predicate: 'knows', object: 'B', metadata: { since: '2024' } },
          { subject: 'B', predicate: 'likes', object: 'C' },
        ],
        timestamp: 1709251200000,
      };

      await store.set('graph', complex);
      const retrieved = await store.get<typeof complex>('graph');
      expect(retrieved).toEqual(complex);

      store.close();
    });

    it('stores boolean values', async () => {
      const store = new IndexedDBStore('test-db', 'test-store');
      await store.open();

      await store.set('flag', true);
      expect(await store.get<boolean>('flag')).toBe(true);

      await store.set('flag', false);
      expect(await store.get<boolean>('flag')).toBe(false);

      store.close();
    });
  });
});
