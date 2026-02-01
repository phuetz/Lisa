/**
 * Offline Service
 * Gère le mode hors-ligne avec stockage local et synchronisation
 */

import { Capacitor } from '@capacitor/core';

interface PendingMessage {
  id: string;
  conversationId: string;
  content: string;
  timestamp: number;
  retryCount: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingMessages: PendingMessage[];
  lastSyncTime: number;
}

// Conflict Resolution Types
export type ConflictResolutionStrategy = 'local' | 'server' | 'merge' | 'manual';

export interface ConflictItem<T = unknown> {
  id: string;
  type: 'conversation' | 'message' | 'settings' | 'memory';
  localData: T;
  serverData: T;
  localTimestamp: number;
  serverTimestamp: number;
  resolved: boolean;
  resolution?: ConflictResolutionStrategy;
  mergedData?: T;
}

export interface ConflictResolutionResult<T = unknown> {
  success: boolean;
  resolvedData: T;
  strategy: ConflictResolutionStrategy;
  error?: string;
}

type ConflictListener = (conflicts: ConflictItem[]) => void;

type ConnectionListener = (isOnline: boolean) => void;

class OfflineService {
  private state: OfflineState = {
    isOnline: navigator.onLine,
    pendingMessages: [],
    lastSyncTime: 0,
  };

  private listeners: ConnectionListener[] = [];
  private conflictListeners: ConflictListener[] = [];
  private pendingConflicts: ConflictItem[] = [];
  private syncInProgress = false;
  private readonly STORAGE_KEY = 'lisa_offline_queue';
  private readonly CONFLICTS_KEY = 'lisa_conflicts';
  private readonly RESOLUTION_PREFS_KEY = 'lisa_conflict_prefs';
  private readonly MAX_RETRIES = 3;
  private defaultResolutionStrategy: ConflictResolutionStrategy = 'merge';

  constructor() {
    this.loadPendingMessages();
    this.loadConflicts();
    this.setupNetworkListeners();
  }

  get isOnline(): boolean {
    return this.state.isOnline;
  }

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  get pendingCount(): number {
    return this.state.pendingMessages.length;
  }

  /**
   * Configurer les listeners réseau
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));

    // Pour Capacitor, utiliser le plugin Network si disponible
    if (this.isNative) {
      this.setupCapacitorNetworkListener();
    }
  }

  private async setupCapacitorNetworkListener(): Promise<void> {
    try {
      const { Network } = await import('@capacitor/network');
      
      // État initial
      const status = await Network.getStatus();
      this.handleConnectionChange(status.connected);

      // Listener pour les changements
      Network.addListener('networkStatusChange', (status) => {
        this.handleConnectionChange(status.connected);
      });
    } catch {
      // Network plugin not available, using browser API
    }
  }

  private handleConnectionChange(isOnline: boolean): void {
    const wasOffline = !this.state.isOnline;
    this.state.isOnline = isOnline;

    // Notifier les listeners
    this.listeners.forEach(listener => listener(isOnline));

    // Si on revient en ligne, synchroniser les messages en attente
    if (isOnline && wasOffline && this.state.pendingMessages.length > 0) {
      this.syncPendingMessages();
    }
  }

  /**
   * S'abonner aux changements de connexion
   */
  onConnectionChange(listener: ConnectionListener): () => void {
    this.listeners.push(listener);
    // Appeler immédiatement avec l'état actuel
    listener(this.state.isOnline);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Ajouter un message à la queue hors-ligne
   */
  queueMessage(conversationId: string, content: string): string {
    const message: PendingMessage = {
      id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      content,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.state.pendingMessages.push(message);
    this.savePendingMessages();

    return message.id;
  }

  /**
   * Supprimer un message de la queue
   */
  removeFromQueue(messageId: string): void {
    this.state.pendingMessages = this.state.pendingMessages.filter(m => m.id !== messageId);
    this.savePendingMessages();
  }

  /**
   * Obtenir les messages en attente
   */
  getPendingMessages(): PendingMessage[] {
    return [...this.state.pendingMessages];
  }

  /**
   * Synchroniser les messages en attente
   */
  async syncPendingMessages(): Promise<void> {
    if (this.syncInProgress || !this.state.isOnline || this.state.pendingMessages.length === 0) {
      return;
    }

    this.syncInProgress = true;

    const messagesToSync = [...this.state.pendingMessages];
    const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

    for (const message of messagesToSync) {
      try {
        // Envoyer le message via l'API
        await this.sendPendingMessage(message);
        results.success.push(message.id);
        this.removeFromQueue(message.id);
      } catch (error) {
        console.error(`[OfflineService] Failed to sync message ${message.id}:`, error);
        message.retryCount++;

        if (message.retryCount >= this.MAX_RETRIES) {
          results.failed.push(message.id);
          this.removeFromQueue(message.id);
        }
      }
    }

    this.state.lastSyncTime = Date.now();
    this.syncInProgress = false;
  }

  /**
   * Envoyer un message en attente
   */
  private async sendPendingMessage(message: PendingMessage): Promise<void> {
    // Import dynamique du service AI pour éviter les dépendances circulaires
    const { aiService } = await import('./aiService');
    
    // Reconstruire l'historique de conversation
    const history = [{ role: 'user' as const, content: message.content }];
    
    // Envoyer le message
    await aiService.sendMessage(history);
  }

  /**
   * Sauvegarder les messages en attente dans le stockage local
   */
  private savePendingMessages(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state.pendingMessages));
    } catch (error) {
      console.error('[OfflineService] Failed to save pending messages:', error);
    }
  }

  /**
   * Charger les messages en attente depuis le stockage local
   */
  private loadPendingMessages(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.state.pendingMessages = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[OfflineService] Failed to load pending messages:', error);
      this.state.pendingMessages = [];
    }
  }

  /**
   * Vider la queue de messages en attente
   */
  clearQueue(): void {
    this.state.pendingMessages = [];
    this.savePendingMessages();
  }

  /**
   * Obtenir le temps écoulé depuis la dernière sync
   */
  getTimeSinceLastSync(): number {
    if (this.state.lastSyncTime === 0) return -1;
    return Date.now() - this.state.lastSyncTime;
  }

  // ============================================
  // CONFLICT RESOLUTION SYSTEM
  // ============================================

  /**
   * Set default conflict resolution strategy
   */
  setDefaultResolutionStrategy(strategy: ConflictResolutionStrategy): void {
    this.defaultResolutionStrategy = strategy;
    try {
      localStorage.setItem(this.RESOLUTION_PREFS_KEY, JSON.stringify({ default: strategy }));
    } catch (error) {
      console.warn('[OfflineService] Failed to save resolution prefs:', error);
    }
  }

  /**
   * Get default conflict resolution strategy
   */
  getDefaultResolutionStrategy(): ConflictResolutionStrategy {
    return this.defaultResolutionStrategy;
  }

  /**
   * Detect conflict between local and server data
   */
  detectConflict<T>(
    id: string,
    type: ConflictItem['type'],
    localData: T,
    serverData: T,
    localTimestamp: number,
    serverTimestamp: number
  ): ConflictItem<T> | null {
    // No conflict if data is identical
    if (JSON.stringify(localData) === JSON.stringify(serverData)) {
      return null;
    }

    // No conflict if timestamps indicate clear winner
    // (server is newer and local wasn't modified after last sync)
    if (serverTimestamp > localTimestamp && localTimestamp <= this.state.lastSyncTime) {
      return null;
    }

    // Conflict detected
    const conflict: ConflictItem<T> = {
      id,
      type,
      localData,
      serverData,
      localTimestamp,
      serverTimestamp,
      resolved: false,
    };

    this.addConflict(conflict);
    return conflict;
  }

  /**
   * Add a conflict to pending list
   */
  private addConflict<T>(conflict: ConflictItem<T>): void {
    // Remove existing conflict with same id if exists
    this.pendingConflicts = this.pendingConflicts.filter(c => c.id !== conflict.id);
    this.pendingConflicts.push(conflict as ConflictItem);
    this.saveConflicts();
    this.notifyConflictListeners();
  }

  /**
   * Resolve a specific conflict
   */
  resolveConflict<T>(
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    customMergedData?: T
  ): ConflictResolutionResult<T> {
    const conflict = this.pendingConflicts.find(c => c.id === conflictId) as ConflictItem<T> | undefined;

    if (!conflict) {
      return {
        success: false,
        resolvedData: null as unknown as T,
        strategy,
        error: 'Conflict not found',
      };
    }

    let resolvedData: T;

    switch (strategy) {
      case 'local':
        resolvedData = conflict.localData;
        break;

      case 'server':
        resolvedData = conflict.serverData;
        break;

      case 'merge':
        if (customMergedData) {
          resolvedData = customMergedData;
        } else {
          resolvedData = this.autoMerge(conflict.localData, conflict.serverData);
        }
        break;

      case 'manual':
        if (!customMergedData) {
          return {
            success: false,
            resolvedData: null as unknown as T,
            strategy,
            error: 'Manual resolution requires merged data',
          };
        }
        resolvedData = customMergedData;
        break;

      default:
        return {
          success: false,
          resolvedData: null as unknown as T,
          strategy,
          error: 'Invalid resolution strategy',
        };
    }

    // Mark conflict as resolved
    conflict.resolved = true;
    conflict.resolution = strategy;
    conflict.mergedData = resolvedData;

    // Remove from pending
    this.pendingConflicts = this.pendingConflicts.filter(c => c.id !== conflictId);
    this.saveConflicts();
    this.notifyConflictListeners();

    return {
      success: true,
      resolvedData,
      strategy,
    };
  }

  /**
   * Auto-merge two data objects
   * Uses "last write wins" for primitive fields
   * Merges arrays by combining unique items
   */
  private autoMerge<T>(localData: T, serverData: T): T {
    if (typeof localData !== 'object' || localData === null) {
      // For primitives, prefer server data (most recent from sync)
      return serverData;
    }

    if (Array.isArray(localData) && Array.isArray(serverData)) {
      // Merge arrays by combining unique items (by id or value)
      const merged = [...serverData];
      for (const localItem of localData) {
        const existsInServer = merged.some(serverItem => {
          if (typeof localItem === 'object' && localItem !== null && 'id' in localItem) {
            return (serverItem as { id?: string }).id === (localItem as { id?: string }).id;
          }
          return JSON.stringify(serverItem) === JSON.stringify(localItem);
        });
        if (!existsInServer) {
          merged.push(localItem);
        }
      }
      return merged as unknown as T;
    }

    // Merge objects recursively
    const merged = { ...serverData } as Record<string, unknown>;
    const local = localData as Record<string, unknown>;
    const server = serverData as Record<string, unknown>;

    for (const key of Object.keys(local)) {
      if (!(key in server)) {
        // Key only exists in local, keep it
        merged[key] = local[key];
      } else if (typeof local[key] === 'object' && typeof server[key] === 'object') {
        // Recursively merge nested objects
        merged[key] = this.autoMerge(local[key], server[key]);
      }
      // For same keys with different primitive values, server wins (already in merged)
    }

    return merged as T;
  }

  /**
   * Resolve all pending conflicts with default strategy
   */
  resolveAllConflicts(): { resolved: number; failed: number } {
    const results = { resolved: 0, failed: 0 };

    const conflictsToResolve = [...this.pendingConflicts];
    for (const conflict of conflictsToResolve) {
      const result = this.resolveConflict(conflict.id, this.defaultResolutionStrategy);
      if (result.success) {
        results.resolved++;
      } else {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Get all pending conflicts
   */
  getPendingConflicts(): ConflictItem[] {
    return [...this.pendingConflicts];
  }

  /**
   * Get conflicts count
   */
  get conflictsCount(): number {
    return this.pendingConflicts.length;
  }

  /**
   * Subscribe to conflict changes
   */
  onConflictsChange(listener: ConflictListener): () => void {
    this.conflictListeners.push(listener);
    // Immediately notify with current conflicts
    listener(this.pendingConflicts);

    return () => {
      this.conflictListeners = this.conflictListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify conflict listeners
   */
  private notifyConflictListeners(): void {
    this.conflictListeners.forEach(listener => {
      try {
        listener(this.pendingConflicts);
      } catch (error) {
        console.error('[OfflineService] Conflict listener error:', error);
      }
    });
  }

  /**
   * Save conflicts to local storage
   */
  private saveConflicts(): void {
    try {
      localStorage.setItem(this.CONFLICTS_KEY, JSON.stringify(this.pendingConflicts));
    } catch (error) {
      console.error('[OfflineService] Failed to save conflicts:', error);
    }
  }

  /**
   * Load conflicts from local storage
   */
  private loadConflicts(): void {
    try {
      const stored = localStorage.getItem(this.CONFLICTS_KEY);
      if (stored) {
        this.pendingConflicts = JSON.parse(stored);
      }

      // Load resolution preferences
      const prefs = localStorage.getItem(this.RESOLUTION_PREFS_KEY);
      if (prefs) {
        const parsed = JSON.parse(prefs);
        if (parsed.default) {
          this.defaultResolutionStrategy = parsed.default;
        }
      }
    } catch (error) {
      console.error('[OfflineService] Failed to load conflicts:', error);
      this.pendingConflicts = [];
    }
  }

  /**
   * Clear all pending conflicts
   */
  clearConflicts(): void {
    this.pendingConflicts = [];
    this.saveConflicts();
    this.notifyConflictListeners();
  }

  /**
   * Sync with conflict detection
   */
  async syncWithConflictDetection<T>(
    type: ConflictItem['type'],
    localItems: Array<T & { id: string; updatedAt: number }>,
    fetchServerItems: () => Promise<Array<T & { id: string; updatedAt: number }>>
  ): Promise<{ synced: T[]; conflicts: ConflictItem<T>[] }> {
    if (!this.state.isOnline) {
      return { synced: [], conflicts: [] };
    }

    try {
      const serverItems = await fetchServerItems();
      const synced: T[] = [];
      const conflicts: ConflictItem<T>[] = [];

      // Create maps for quick lookup
      const localMap = new Map(localItems.map(item => [item.id, item]));
      const serverMap = new Map(serverItems.map(item => [item.id, item]));

      // Check for conflicts
      for (const [id, localItem] of localMap) {
        const serverItem = serverMap.get(id);

        if (serverItem) {
          const conflict = this.detectConflict(
            id,
            type,
            localItem,
            serverItem,
            localItem.updatedAt,
            serverItem.updatedAt
          );

          if (conflict) {
            conflicts.push(conflict as ConflictItem<T>);
          } else {
            // No conflict, use newer version
            synced.push(serverItem.updatedAt > localItem.updatedAt ? serverItem : localItem);
          }
        } else {
          // Only exists locally, keep it
          synced.push(localItem);
        }
      }

      // Add server-only items
      for (const [id, serverItem] of serverMap) {
        if (!localMap.has(id)) {
          synced.push(serverItem);
        }
      }

      return { synced, conflicts };
    } catch (error) {
      console.error('[OfflineService] Sync with conflict detection failed:', error);
      return { synced: [], conflicts: [] };
    }
  }
}

export const offlineService = new OfflineService();
export default offlineService;
