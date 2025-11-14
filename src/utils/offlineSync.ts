/**
 * Offline synchronization system
 * Handles background sync, queue management, and conflict resolution
 */

import { logInfo, logWarn, logError } from './logger';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  timestamp: number;
  retryCount: number;
  priority: number;
}

export interface SyncOptions {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Enable background sync API */
  enableBackgroundSync?: boolean;
  /** Storage key for pending operations */
  storageKey?: string;
}

const DEFAULT_OPTIONS: Required<SyncOptions> = {
  maxRetries: 3,
  retryDelay: 5000,
  enableBackgroundSync: true,
  storageKey: 'lisa_sync_queue',
};

/**
 * Offline Synchronization Manager
 * Manages queued operations and background sync
 */
export class OfflineSyncManager {
  private static instance: OfflineSyncManager;
  private queue: SyncOperation[] = [];
  private syncing: boolean = false;
  private options: Required<SyncOptions>;
  private registration?: ServiceWorkerRegistration;

  private constructor(options: SyncOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadQueue();
    this.setupBackgroundSync();
    this.setupOnlineListener();
  }

  static getInstance(options?: SyncOptions): OfflineSyncManager {
    if (!OfflineSyncManager.instance) {
      OfflineSyncManager.instance = new OfflineSyncManager(options);
    }
    return OfflineSyncManager.instance;
  }

  /**
   * Setup service worker for background sync
   */
  private async setupBackgroundSync(): Promise<void> {
    if (!this.options.enableBackgroundSync) return;
    if (!('serviceWorker' in navigator)) return;
    if (!('sync' in ServiceWorkerRegistration.prototype)) {
      logWarn('Background Sync API not supported', 'OfflineSync');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      logInfo('Background sync initialized', 'OfflineSync');
    } catch (error) {
      logError('Failed to initialize background sync', 'OfflineSync', error);
    }
  }

  /**
   * Setup online/offline listeners
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      logInfo('Connection restored, syncing...', 'OfflineSync');
      this.sync();
    });

    window.addEventListener('offline', () => {
      logInfo('Connection lost, queuing operations', 'OfflineSync');
    });
  }

  /**
   * Add operation to sync queue
   */
  async enqueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const op: SyncOperation = {
      ...operation,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(op);
    this.saveQueue();

    logInfo(`Operation queued: ${op.type} ${op.resource}`, 'OfflineSync');

    // Try to sync immediately if online
    if (navigator.onLine) {
      await this.sync();
    } else if (this.registration && this.options.enableBackgroundSync) {
      // Register for background sync
      await this.registration.sync.register('sync-operations');
    }
  }

  /**
   * Process sync queue
   */
  async sync(): Promise<void> {
    if (this.syncing || this.queue.length === 0) return;
    if (!navigator.onLine) {
      logInfo('Offline, skipping sync', 'OfflineSync');
      return;
    }

    this.syncing = true;
    logInfo(`Starting sync of ${this.queue.length} operations`, 'OfflineSync');

    // Sort by priority (higher first) and timestamp (older first)
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    const results = await Promise.allSettled(
      this.queue.map(op => this.processOperation(op))
    );

    // Remove successful operations
    const failedIds = new Set<string>();
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failedIds.add(this.queue[index].id);
      }
    });

    this.queue = this.queue.filter(op => failedIds.has(op.id));
    this.saveQueue();

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    logInfo(
      `Sync complete: ${successCount} successful, ${failedIds.size} failed`,
      'OfflineSync'
    );

    this.syncing = false;
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    try {
      logInfo(`Processing: ${operation.type} ${operation.resource}`, 'OfflineSync');

      // This would call your actual sync endpoint
      // For now, we'll simulate it
      await this.sendToServer(operation);

      logInfo(`Success: ${operation.type} ${operation.resource}`, 'OfflineSync');
    } catch (error) {
      operation.retryCount++;

      if (operation.retryCount >= this.options.maxRetries) {
        logError(
          `Max retries reached for: ${operation.type} ${operation.resource}`,
          'OfflineSync',
          error
        );
        throw error;
      }

      logWarn(
        `Retry ${operation.retryCount}/${this.options.maxRetries} for: ${operation.type} ${operation.resource}`,
        'OfflineSync'
      );

      // Wait before retry
      await new Promise(resolve =>
        setTimeout(resolve, this.options.retryDelay * operation.retryCount)
      );

      throw error;
    }
  }

  /**
   * Send operation to server
   */
  private async sendToServer(operation: SyncOperation): Promise<void> {
    const endpoint = this.getEndpoint(operation.resource);
    const method = this.getMethod(operation.type);

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(operation.data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Get API endpoint for resource
   */
  private getEndpoint(resource: string): string {
    // This should be configured based on your API structure
    return `/api/${resource}`;
  }

  /**
   * Get HTTP method for operation type
   */
  private getMethod(type: SyncOperation['type']): string {
    switch (type) {
      case 'create':
        return 'POST';
      case 'update':
        return 'PUT';
      case 'delete':
        return 'DELETE';
      default:
        return 'POST';
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      logError('Failed to save sync queue', 'OfflineSync', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        logInfo(`Loaded ${this.queue.length} pending operations`, 'OfflineSync');
      }
    } catch (error) {
      logError('Failed to load sync queue', 'OfflineSync', error);
      this.queue = [];
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    pending: number;
    syncing: boolean;
    operations: SyncOperation[];
  } {
    return {
      pending: this.queue.length,
      syncing: this.syncing,
      operations: [...this.queue],
    };
  }

  /**
   * Clear the sync queue
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    logInfo('Sync queue cleared', 'OfflineSync');
  }

  /**
   * Remove a specific operation
   */
  removeOperation(id: string): void {
    this.queue = this.queue.filter(op => op.id !== id);
    this.saveQueue();
  }

  /**
   * Manually trigger sync
   */
  async forceSyncNow(): Promise<void> {
    await this.sync();
  }
}

/**
 * Conflict resolution strategies
 */
export enum ConflictStrategy {
  CLIENT_WINS = 'client-wins',
  SERVER_WINS = 'server-wins',
  LAST_WRITE_WINS = 'last-write-wins',
  MANUAL = 'manual',
}

/**
 * Conflict resolver
 */
export class ConflictResolver {
  /**
   * Resolve a data conflict
   */
  static resolve<T>(
    clientData: T & { timestamp?: number },
    serverData: T & { timestamp?: number },
    strategy: ConflictStrategy = ConflictStrategy.LAST_WRITE_WINS
  ): T {
    switch (strategy) {
      case ConflictStrategy.CLIENT_WINS:
        return clientData;

      case ConflictStrategy.SERVER_WINS:
        return serverData;

      case ConflictStrategy.LAST_WRITE_WINS:
        if (clientData.timestamp && serverData.timestamp) {
          return clientData.timestamp > serverData.timestamp
            ? clientData
            : serverData;
        }
        return serverData; // Default to server if no timestamps

      case ConflictStrategy.MANUAL:
        // Would trigger a UI for manual resolution
        throw new Error('Manual conflict resolution required');

      default:
        return serverData;
    }
  }

  /**
   * Merge objects with conflict resolution
   */
  static merge<T extends Record<string, any>>(
    clientData: T,
    serverData: T,
    strategy: ConflictStrategy = ConflictStrategy.LAST_WRITE_WINS
  ): T {
    const result = { ...serverData };

    for (const key in clientData) {
      if (clientData[key] !== serverData[key]) {
        const resolved = this.resolve(
          { [key]: clientData[key], timestamp: clientData.timestamp },
          { [key]: serverData[key], timestamp: serverData.timestamp },
          strategy
        );
        result[key] = resolved[key];
      }
    }

    return result;
  }
}

/**
 * IndexedDB-based offline storage
 */
export class OfflineStorage {
  private dbName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = 'LisaOfflineDB') {
    this.dbName = dbName;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'id' });
        }
      };
    });
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.put({ id: key, value, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instances
export const syncManager = OfflineSyncManager.getInstance();
export const offlineStorage = new OfflineStorage();
