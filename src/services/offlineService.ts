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

type ConnectionListener = (isOnline: boolean) => void;

class OfflineService {
  private state: OfflineState = {
    isOnline: navigator.onLine,
    pendingMessages: [],
    lastSyncTime: 0,
  };
  
  private listeners: ConnectionListener[] = [];
  private syncInProgress = false;
  private readonly STORAGE_KEY = 'lisa_offline_queue';
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.loadPendingMessages();
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
      console.log('[OfflineService] Network plugin not available, using browser API');
    }
  }

  private handleConnectionChange(isOnline: boolean): void {
    const wasOffline = !this.state.isOnline;
    this.state.isOnline = isOnline;

    console.log(`[OfflineService] Connection status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    // Notifier les listeners
    this.listeners.forEach(listener => listener(isOnline));

    // Si on revient en ligne, synchroniser les messages en attente
    if (isOnline && wasOffline && this.state.pendingMessages.length > 0) {
      console.log('[OfflineService] Back online, syncing pending messages...');
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
    
    console.log(`[OfflineService] Message queued: ${message.id}`);
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
    console.log(`[OfflineService] Syncing ${this.state.pendingMessages.length} pending messages...`);

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
          console.log(`[OfflineService] Max retries reached for ${message.id}, removing`);
          results.failed.push(message.id);
          this.removeFromQueue(message.id);
        }
      }
    }

    this.state.lastSyncTime = Date.now();
    this.syncInProgress = false;
    
    console.log(`[OfflineService] Sync complete. Success: ${results.success.length}, Failed: ${results.failed.length}`);
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
        console.log(`[OfflineService] Loaded ${this.state.pendingMessages.length} pending messages`);
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
    console.log('[OfflineService] Queue cleared');
  }

  /**
   * Obtenir le temps écoulé depuis la dernière sync
   */
  getTimeSinceLastSync(): number {
    if (this.state.lastSyncTime === 0) return -1;
    return Date.now() - this.state.lastSyncTime;
  }
}

export const offlineService = new OfflineService();
export default offlineService;
