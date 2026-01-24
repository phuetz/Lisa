/**
 * Offline Storage Service
 * Enhanced offline storage using IndexedDB for conversations, messages, and cached responses
 */

import { Capacitor } from '@capacitor/core';

// Database schema version
const DB_VERSION = 1;
const DB_NAME = 'lisa_offline_db';

// Store names
const STORES = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  CACHED_RESPONSES: 'cachedResponses',
  PENDING_ACTIONS: 'pendingActions',
  SYNC_METADATA: 'syncMetadata'
} as const;

export interface OfflineConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessage?: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  serverVersion?: number;
}

export interface OfflineMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  image?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  localOnly?: boolean;
}

export interface CachedResponse {
  id: string;
  queryHash: string;
  query: string;
  response: string;
  model: string;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface PendingAction {
  id: string;
  type: 'send_message' | 'create_conversation' | 'delete_message' | 'update_conversation';
  payload: unknown;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncMetadata {
  id: string;
  lastSyncTime: number;
  serverVersion: number;
  conflictsResolved: number;
}

export type ConflictResolution = 'local' | 'server' | 'merge';

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private isReady = false;
  private readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.initializeDatabase();
  }

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Wait for database to be ready
   */
  async ready(): Promise<void> {
    await this.readyPromise;
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        console.warn('[OfflineStorage] IndexedDB not available');
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Database open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('[OfflineStorage] Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });
  }

  /**
   * Create object stores
   */
  private createStores(db: IDBDatabase): void {
    // Conversations store
    if (!db.objectStoreNames.contains(STORES.CONVERSATIONS)) {
      const conversationStore = db.createObjectStore(STORES.CONVERSATIONS, { keyPath: 'id' });
      conversationStore.createIndex('updatedAt', 'updatedAt');
      conversationStore.createIndex('syncStatus', 'syncStatus');
    }

    // Messages store
    if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
      const messageStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
      messageStore.createIndex('conversationId', 'conversationId');
      messageStore.createIndex('timestamp', 'timestamp');
      messageStore.createIndex('syncStatus', 'syncStatus');
    }

    // Cached responses store
    if (!db.objectStoreNames.contains(STORES.CACHED_RESPONSES)) {
      const cacheStore = db.createObjectStore(STORES.CACHED_RESPONSES, { keyPath: 'id' });
      cacheStore.createIndex('queryHash', 'queryHash');
      cacheStore.createIndex('expiresAt', 'expiresAt');
    }

    // Pending actions store
    if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
      const actionsStore = db.createObjectStore(STORES.PENDING_ACTIONS, { keyPath: 'id' });
      actionsStore.createIndex('type', 'type');
      actionsStore.createIndex('createdAt', 'createdAt');
    }

    // Sync metadata store
    if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
      db.createObjectStore(STORES.SYNC_METADATA, { keyPath: 'id' });
    }

    console.log('[OfflineStorage] Stores created');
  }

  /**
   * Get a transaction for the given stores
   */
  private getTransaction(storeNames: string | string[], mode: IDBTransactionMode = 'readonly'): IDBTransaction {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.transaction(storeNames, mode);
  }

  // ============ CONVERSATIONS ============

  /**
   * Save a conversation
   */
  async saveConversation(conversation: OfflineConversation): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.CONVERSATIONS, 'readwrite');
      const store = tx.objectStore(STORES.CONVERSATIONS);
      const request = store.put(conversation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<OfflineConversation | undefined> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.CONVERSATIONS);
      const store = tx.objectStore(STORES.CONVERSATIONS);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all conversations
   */
  async getAllConversations(): Promise<OfflineConversation[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.CONVERSATIONS);
      const store = tx.objectStore(STORES.CONVERSATIONS);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev');
      const results: OfflineConversation[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    await this.ready();

    // Delete conversation
    const tx1 = this.getTransaction(STORES.CONVERSATIONS, 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = tx1.objectStore(STORES.CONVERSATIONS).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Delete associated messages
    const messages = await this.getMessagesByConversation(id);
    const tx2 = this.getTransaction(STORES.MESSAGES, 'readwrite');
    const store = tx2.objectStore(STORES.MESSAGES);
    for (const msg of messages) {
      store.delete(msg.id);
    }
  }

  // ============ MESSAGES ============

  /**
   * Save a message
   */
  async saveMessage(message: OfflineMessage): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.MESSAGES);
      const request = store.put(message);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get messages by conversation ID
   */
  async getMessagesByConversation(conversationId: string): Promise<OfflineMessage[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.MESSAGES);
      const store = tx.objectStore(STORES.MESSAGES);
      const index = store.index('conversationId');
      const request = index.openCursor(IDBKeyRange.only(conversationId));
      const results: OfflineMessage[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          // Sort by timestamp
          results.sort((a, b) => a.timestamp - b.timestamp);
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get pending messages (not synced)
   */
  async getPendingMessages(): Promise<OfflineMessage[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.MESSAGES);
      const store = tx.objectStore(STORES.MESSAGES);
      const index = store.index('syncStatus');
      const request = index.openCursor(IDBKeyRange.only('pending'));
      const results: OfflineMessage[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ============ CACHED RESPONSES ============

  /**
   * Cache a response
   */
  async cacheResponse(
    query: string,
    response: string,
    model: string,
    ttlMs: number = 24 * 60 * 60 * 1000 // 24 hours default
  ): Promise<void> {
    await this.ready();
    const queryHash = await this.hashString(query);
    const now = Date.now();

    const cached: CachedResponse = {
      id: queryHash,
      queryHash,
      query,
      response,
      model,
      cachedAt: now,
      expiresAt: now + ttlMs,
      hitCount: 0
    };

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.CACHED_RESPONSES, 'readwrite');
      const store = tx.objectStore(STORES.CACHED_RESPONSES);
      const request = store.put(cached);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached response
   */
  async getCachedResponse(query: string): Promise<CachedResponse | undefined> {
    await this.ready();
    const queryHash = await this.hashString(query);

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.CACHED_RESPONSES, 'readwrite');
      const store = tx.objectStore(STORES.CACHED_RESPONSES);
      const request = store.get(queryHash);

      request.onsuccess = () => {
        const result = request.result as CachedResponse | undefined;
        if (result) {
          // Check expiration
          if (result.expiresAt < Date.now()) {
            store.delete(queryHash);
            resolve(undefined);
          } else {
            // Update hit count
            result.hitCount++;
            store.put(result);
            resolve(result);
          }
        } else {
          resolve(undefined);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<number> {
    await this.ready();
    const now = Date.now();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.CACHED_RESPONSES, 'readwrite');
      const store = tx.objectStore(STORES.CACHED_RESPONSES);
      const index = store.index('expiresAt');
      const request = index.openCursor(IDBKeyRange.upperBound(now));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ============ PENDING ACTIONS ============

  /**
   * Queue a pending action
   */
  async queueAction(type: PendingAction['type'], payload: unknown): Promise<string> {
    await this.ready();
    const action: PendingAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      createdAt: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.PENDING_ACTIONS, 'readwrite');
      const store = tx.objectStore(STORES.PENDING_ACTIONS);
      const request = store.add(action);
      request.onsuccess = () => resolve(action.id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending actions
   */
  async getPendingActions(): Promise<PendingAction[]> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.PENDING_ACTIONS);
      const store = tx.objectStore(STORES.PENDING_ACTIONS);
      const index = store.index('createdAt');
      const request = index.openCursor();
      const results: PendingAction[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove a pending action
   */
  async removeAction(id: string): Promise<void> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.PENDING_ACTIONS, 'readwrite');
      const store = tx.objectStore(STORES.PENDING_ACTIONS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update action retry count
   */
  async updateActionRetry(id: string, error?: string): Promise<void> {
    await this.ready();
    const action = await new Promise<PendingAction | undefined>((resolve, reject) => {
      const tx = this.getTransaction(STORES.PENDING_ACTIONS);
      const request = tx.objectStore(STORES.PENDING_ACTIONS).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (action) {
      action.retryCount++;
      action.lastError = error;

      return new Promise((resolve, reject) => {
        const tx = this.getTransaction(STORES.PENDING_ACTIONS, 'readwrite');
        const request = tx.objectStore(STORES.PENDING_ACTIONS).put(action);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // ============ SYNC METADATA ============

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(key: string, data: Partial<SyncMetadata>): Promise<void> {
    await this.ready();
    const existing = await this.getSyncMetadata(key);
    const metadata: SyncMetadata = {
      id: key,
      lastSyncTime: Date.now(),
      serverVersion: 0,
      conflictsResolved: 0,
      ...existing,
      ...data
    };

    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.SYNC_METADATA, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_METADATA);
      const request = store.put(metadata);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata(key: string): Promise<SyncMetadata | undefined> {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.getTransaction(STORES.SYNC_METADATA);
      const store = tx.objectStore(STORES.SYNC_METADATA);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ CONFLICT RESOLUTION ============

  /**
   * Resolve a conflict between local and server data
   */
  async resolveConflict(
    conversationId: string,
    localData: OfflineConversation,
    serverData: OfflineConversation,
    resolution: ConflictResolution
  ): Promise<OfflineConversation> {
    let resolved: OfflineConversation;

    switch (resolution) {
      case 'local':
        resolved = { ...localData, syncStatus: 'synced' };
        break;
      case 'server':
        resolved = { ...serverData, syncStatus: 'synced' };
        break;
      case 'merge':
        // Merge strategy: take newer data for each field
        resolved = {
          id: conversationId,
          title: localData.updatedAt > serverData.updatedAt ? localData.title : serverData.title,
          createdAt: Math.min(localData.createdAt, serverData.createdAt),
          updatedAt: Math.max(localData.updatedAt, serverData.updatedAt),
          messageCount: Math.max(localData.messageCount, serverData.messageCount),
          lastMessage: localData.updatedAt > serverData.updatedAt ? localData.lastMessage : serverData.lastMessage,
          syncStatus: 'synced',
          serverVersion: Math.max(localData.serverVersion || 0, serverData.serverVersion || 0) + 1
        };
        break;
    }

    await this.saveConversation(resolved);
    return resolved;
  }

  // ============ UTILITIES ============

  /**
   * Hash a string using SHA-256
   */
  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    conversations: number;
    messages: number;
    cachedResponses: number;
    pendingActions: number;
    estimatedSize: number;
  }> {
    await this.ready();

    const countStore = async (storeName: string): Promise<number> => {
      return new Promise((resolve, reject) => {
        const tx = this.getTransaction(storeName);
        const request = tx.objectStore(storeName).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    };

    const [conversations, messages, cachedResponses, pendingActions] = await Promise.all([
      countStore(STORES.CONVERSATIONS),
      countStore(STORES.MESSAGES),
      countStore(STORES.CACHED_RESPONSES),
      countStore(STORES.PENDING_ACTIONS)
    ]);

    // Estimate size (rough calculation)
    const estimatedSize = messages * 500 + cachedResponses * 2000 + conversations * 200;

    return {
      conversations,
      messages,
      cachedResponses,
      pendingActions,
      estimatedSize
    };
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    await this.ready();
    const storeNames = Object.values(STORES);
    const tx = this.getTransaction(storeNames, 'readwrite');

    for (const name of storeNames) {
      tx.objectStore(name).clear();
    }

    console.log('[OfflineStorage] All data cleared');
  }

  /**
   * Export all data for backup
   */
  async exportData(): Promise<{
    conversations: OfflineConversation[];
    messages: OfflineMessage[];
    exportedAt: string;
  }> {
    const conversations = await this.getAllConversations();
    const messages: OfflineMessage[] = [];

    for (const conv of conversations) {
      const convMessages = await this.getMessagesByConversation(conv.id);
      messages.push(...convMessages);
    }

    return {
      conversations,
      messages,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data from backup
   */
  async importData(data: {
    conversations: OfflineConversation[];
    messages: OfflineMessage[];
  }): Promise<void> {
    for (const conv of data.conversations) {
      await this.saveConversation(conv);
    }
    for (const msg of data.messages) {
      await this.saveMessage(msg);
    }
    console.log(`[OfflineStorage] Imported ${data.conversations.length} conversations, ${data.messages.length} messages`);
  }
}

// Export singleton
export const offlineStorageService = new OfflineStorageService();
export default offlineStorageService;
