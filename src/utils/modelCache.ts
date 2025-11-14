/**
 * Model Cache using IndexedDB
 * Provides persistent caching for ML models and large assets
 */

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  size: number;
  metadata?: Record<string, any>;
}

interface CacheOptions {
  /** Name of the IndexedDB database */
  dbName?: string;
  /** Name of the object store */
  storeName?: string;
  /** Maximum cache size in bytes (default: 500MB) */
  maxSize?: number;
  /** TTL in milliseconds (0 = no expiration) */
  ttl?: number;
  /** Enable compression */
  enableCompression?: boolean;
}

const DEFAULT_OPTIONS: Required<CacheOptions> = {
  dbName: 'LisaModelCache',
  storeName: 'models',
  maxSize: 500 * 1024 * 1024, // 500MB
  ttl: 0, // No expiration by default
  enableCompression: false,
};

/**
 * IndexedDB-based cache for ML models and large assets
 */
export class ModelCache {
  private static instance: ModelCache;
  private db: IDBDatabase | null = null;
  private options: Required<CacheOptions>;
  private initPromise: Promise<void> | null = null;
  private currentSize: number = 0;

  private constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  static getInstance(options?: CacheOptions): ModelCache {
    if (!ModelCache.instance) {
      ModelCache.instance = new ModelCache(options);
    }
    return ModelCache.instance;
  }

  /**
   * Initialize the IndexedDB connection
   */
  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.dbName, 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.calculateCurrentSize().then(() => resolve());
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.options.storeName)) {
          const store = db.createObjectStore(this.options.storeName, {
            keyPath: 'key',
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Calculate current cache size
   */
  private async calculateCurrentSize(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        this.currentSize = entries.reduce((sum, entry) => sum + entry.size, 0);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store data in cache
   */
  async set(
    key: string,
    data: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // Estimate size
    const dataStr = JSON.stringify(data);
    const size = new Blob([dataStr]).size;

    // Check if we need to make space
    if (this.currentSize + size > this.options.maxSize) {
      await this.evictLRU(size);
    }

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      size,
      metadata,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.put(entry);

      request.onsuccess = () => {
        this.currentSize += size;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve data from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        // Check TTL
        if (this.options.ttl > 0) {
          const age = Date.now() - entry.timestamp;
          if (age > this.options.ttl) {
            this.delete(key); // Expired, delete it
            resolve(null);
            return;
          }
        }

        resolve(entry.data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Delete entry from cache
   */
  async delete(key: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // Get size first
    const entry = await this.getEntry(key);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        if (entry) {
          this.currentSize -= entry.size;
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache entry with metadata
   */
  private async getEntry(key: string): Promise<CacheEntry | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        this.currentSize = 0;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all cache keys
   */
  async keys(): Promise<string[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readonly');
      const store = transaction.objectStore(this.options.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Evict least recently used entries to make space
   */
  private async evictLRU(neededSpace: number): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.options.storeName], 'readwrite');
      const store = transaction.objectStore(this.options.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor();

      let freedSpace = 0;
      const toDelete: string[] = [];

      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor && freedSpace < neededSpace) {
          const entry = cursor.value as CacheEntry;
          toDelete.push(entry.key);
          freedSpace += entry.size;
          cursor.continue();
        } else {
          // Delete collected entries
          Promise.all(toDelete.map(key => this.delete(key)))
            .then(() => resolve())
            .catch(reject);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    maxSize: number;
    utilization: number;
  }> {
    await this.init();
    const keys = await this.keys();

    return {
      totalEntries: keys.length,
      totalSize: this.currentSize,
      maxSize: this.options.maxSize,
      utilization: this.currentSize / this.options.maxSize,
    };
  }

  /**
   * Get or set with automatic caching
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, fetch and store
    const data = await factory();
    await this.set(key, data, metadata);
    return data;
  }

  /**
   * Preload multiple models
   */
  async preload(entries: Array<{ key: string; url: string; metadata?: Record<string, any> }>): Promise<void> {
    const promises = entries.map(async entry => {
      const exists = await this.has(entry.key);
      if (!exists) {
        const response = await fetch(entry.url);
        const data = await response.arrayBuffer();
        await this.set(entry.key, data, entry.metadata);
      }
    });

    await Promise.all(promises);
  }
}

/**
 * Specialized cache for TensorFlow.js models
 */
export class TFModelCache {
  private cache = ModelCache.getInstance();

  /**
   * Cache a TensorFlow.js model
   */
  async cacheModel(modelName: string, modelUrl: string): Promise<void> {
    return this.cache.getOrSet(
      `tfjs_model_${modelName}`,
      async () => {
        const response = await fetch(modelUrl);
        return response.arrayBuffer();
      },
      { type: 'tfjs', modelName }
    );
  }

  /**
   * Get cached model data
   */
  async getModel(modelName: string): Promise<ArrayBuffer | null> {
    return this.cache.get(`tfjs_model_${modelName}`);
  }
}

/**
 * Specialized cache for MediaPipe models
 */
export class MediaPipeModelCache {
  private cache = ModelCache.getInstance();

  /**
   * Cache a MediaPipe model
   */
  async cacheModel(taskName: string, modelUrl: string): Promise<void> {
    return this.cache.getOrSet(
      `mediapipe_${taskName}`,
      async () => {
        const response = await fetch(modelUrl);
        return response.arrayBuffer();
      },
      { type: 'mediapipe', taskName }
    );
  }

  /**
   * Get cached model data
   */
  async getModel(taskName: string): Promise<ArrayBuffer | null> {
    return this.cache.get(`mediapipe_${taskName}`);
  }
}

// Export singleton instances
export const modelCache = ModelCache.getInstance();
export const tfModelCache = new TFModelCache();
export const mediaPipeCache = new MediaPipeModelCache();
