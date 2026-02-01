/**
 * Lisa Sync Service
 * Cross-device synchronization and cloud storage
 *
 * Phase 4.2: Enhanced with real-time WebSocket sync for multi-device
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface SyncConfig {
  enabled: boolean;
  provider: SyncProvider;
  autoSync: boolean;
  syncInterval: number; // ms
  conflictResolution: 'local' | 'remote' | 'newest' | 'manual';
  syncItems: SyncItemType[];
  // Phase 4.2: Real-time sync
  realTimeEnabled: boolean;
  websocketUrl?: string;
  deviceId?: string;
  deviceName?: string;
}

export type SyncProvider = 'local' | 'lisa-cloud' | 'google-drive' | 'dropbox' | 'onedrive';
export type SyncItemType = 'conversations' | 'settings' | 'templates' | 'shortcuts' | 'themes' | 'plugins';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'conflict' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSync: Date | null;
  pendingChanges: number;
  conflicts: SyncConflict[];
  error?: string;
}

export interface SyncConflict {
  id: string;
  itemType: SyncItemType;
  itemId: string;
  localVersion: unknown;
  remoteVersion: unknown;
  localTimestamp: Date;
  remoteTimestamp: Date;
  resolved: boolean;
}

export interface SyncChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  itemType: SyncItemType;
  itemId: string;
  data?: unknown;
  timestamp: Date;
  synced: boolean;
}

export interface CloudStorageInfo {
  provider: SyncProvider;
  connected: boolean;
  usedSpace: number;
  totalSpace: number;
  lastCheck: Date | null;
}

// Phase 4.2: Device and real-time sync types
export interface ConnectedDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'web';
  lastSeen: Date;
  online: boolean;
  version?: string;
}

export interface RealTimeMessage {
  type: 'sync' | 'presence' | 'notification' | 'command';
  from: string;
  timestamp: Date;
  payload: unknown;
}

const DEFAULT_CONFIG: SyncConfig = {
  enabled: false,
  provider: 'local',
  autoSync: true,
  syncInterval: 5 * 60 * 1000, // 5 minutes
  conflictResolution: 'newest',
  syncItems: ['conversations', 'settings', 'templates', 'shortcuts'],
  // Phase 4.2
  realTimeEnabled: false,
  deviceId: typeof crypto !== 'undefined' ? crypto.randomUUID() : `device_${Date.now()}`,
  deviceName: typeof navigator !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'Unknown'
};

export class SyncService extends BrowserEventEmitter {
  private config: SyncConfig;
  private state: SyncState;
  private changes: Map<string, SyncChange> = new Map();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private storageInfo: CloudStorageInfo;
  // Phase 4.2: Real-time sync
  private websocket: WebSocket | null = null;
  private connectedDevices: Map<string, ConnectedDevice> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<SyncConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      status: 'idle',
      lastSync: null,
      pendingChanges: 0,
      conflicts: []
    };
    this.storageInfo = {
      provider: this.config.provider,
      connected: false,
      usedSpace: 0,
      totalSpace: 0,
      lastCheck: null
    };

    if (this.config.enabled && this.config.autoSync) {
      this.startAutoSync();
    }

    // Phase 4.2: Initialize real-time sync if enabled
    if (this.config.realTimeEnabled && this.config.websocketUrl) {
      this.connectRealTime();
    }
  }

  private generateId(): string {
    return `sync_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  // Configuration
  configure(updates: Partial<SyncConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...updates };

    if (this.config.enabled && this.config.autoSync && !wasEnabled) {
      this.startAutoSync();
    } else if (!this.config.enabled || !this.config.autoSync) {
      this.stopAutoSync();
    }

    this.emit('config:changed', this.config);
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  // Auto-sync
  private startAutoSync(): void {
    if (this.syncTimer) return;
    
    this.syncTimer = setInterval(() => {
      if (this.state.pendingChanges > 0) {
        this.sync();
      }
    }, this.config.syncInterval);

    this.emit('autosync:started');
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.emit('autosync:stopped');
    }
  }

  // Track changes
  trackChange(type: SyncChange['type'], itemType: SyncItemType, itemId: string, data?: unknown): void {
    const change: SyncChange = {
      id: this.generateId(),
      type,
      itemType,
      itemId,
      data,
      timestamp: new Date(),
      synced: false
    };

    this.changes.set(change.id, change);
    this.state.pendingChanges = Array.from(this.changes.values()).filter(c => !c.synced).length;
    
    this.emit('change:tracked', change);
  }

  getPendingChanges(): SyncChange[] {
    return Array.from(this.changes.values()).filter(c => !c.synced);
  }

  // Sync operations
  async sync(): Promise<boolean> {
    if (this.state.status === 'syncing') {
      return false;
    }

    if (!this.config.enabled) {
      this.emit('sync:skipped', { reason: 'disabled' });
      return false;
    }

    this.state.status = 'syncing';
    this.emit('sync:started');

    try {
      // Get pending changes
      const pendingChanges = this.getPendingChanges();

      if (pendingChanges.length === 0) {
        this.state.status = 'idle';
        this.state.lastSync = new Date();
        this.emit('sync:completed', { changes: 0 });
        return true;
      }

      // Group by item type
      const grouped = this.groupChangesByType(pendingChanges);

      // Sync each type
      for (const [itemType, changes] of Object.entries(grouped)) {
        await this.syncItemType(itemType as SyncItemType, changes);
      }

      // Mark as synced
      for (const change of pendingChanges) {
        change.synced = true;
      }

      this.state.status = 'idle';
      this.state.lastSync = new Date();
      this.state.pendingChanges = 0;

      this.emit('sync:completed', { changes: pendingChanges.length });
      return true;
    } catch (error) {
      this.state.status = 'error';
      this.state.error = error instanceof Error ? error.message : 'Sync failed';
      this.emit('sync:failed', { error });
      return false;
    }
  }

  private groupChangesByType(changes: SyncChange[]): Record<string, SyncChange[]> {
    const grouped: Record<string, SyncChange[]> = {};
    
    for (const change of changes) {
      if (!grouped[change.itemType]) {
        grouped[change.itemType] = [];
      }
      grouped[change.itemType].push(change);
    }

    return grouped;
  }

  private async syncItemType(itemType: SyncItemType, changes: SyncChange[]): Promise<void> {
    // Simulate sync based on provider
    switch (this.config.provider) {
      case 'local':
        await this.syncToLocal(itemType, changes);
        break;
      case 'lisa-cloud':
        await this.syncToCloud(itemType, changes);
        break;
      default:
        await this.syncToLocal(itemType, changes);
    }
  }

  private async syncToLocal(itemType: SyncItemType, changes: SyncChange[]): Promise<void> {
    // Save to localStorage
    if (typeof localStorage === 'undefined') return;

    const key = `lisa-sync-${itemType}`;
    const existing = localStorage.getItem(key);
    const data = existing ? JSON.parse(existing) : [];

    for (const change of changes) {
      if (change.type === 'delete') {
        const idx = data.findIndex((d: { id: string }) => d.id === change.itemId);
        if (idx >= 0) data.splice(idx, 1);
      } else {
        const idx = data.findIndex((d: { id: string }) => d.id === change.itemId);
        const changeData = (change.data && typeof change.data === 'object') ? change.data : {};
        if (idx >= 0) {
          data[idx] = { ...data[idx], ...(changeData as Record<string, unknown>) };
        } else {
          data.push({ id: change.itemId, ...(changeData as Record<string, unknown>) });
        }
      }
    }

    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`lisa-sync-${itemType}-timestamp`, new Date().toISOString());
  }

  private async syncToCloud(_itemType: SyncItemType, _changes: SyncChange[]): Promise<void> {
    // Simulate cloud sync delay
    await new Promise(resolve => setTimeout(resolve, 500));
    // In real implementation, this would call the Lisa Cloud API
  }

  // Pull from remote
  async pull(): Promise<boolean> {
    if (!this.config.enabled) return false;

    this.emit('pull:started');

    try {
      // Simulate pulling data
      await new Promise(resolve => setTimeout(resolve, 300));
      
      this.emit('pull:completed');
      return true;
    } catch (error) {
      this.emit('pull:failed', { error });
      return false;
    }
  }

  // Conflict resolution
  async resolveConflict(conflictId: string, resolution: 'local' | 'remote'): Promise<boolean> {
    const conflict = this.state.conflicts.find(c => c.id === conflictId);
    if (!conflict) return false;

    const data = resolution === 'local' ? conflict.localVersion : conflict.remoteVersion;

    // Apply resolution
    this.trackChange('update', conflict.itemType, conflict.itemId, data);
    
    conflict.resolved = true;
    this.state.conflicts = this.state.conflicts.filter(c => c.id !== conflictId);

    this.emit('conflict:resolved', { conflict, resolution });
    return true;
  }

  // Cloud storage
  async connect(provider: SyncProvider): Promise<boolean> {
    this.emit('storage:connecting', { provider });

    try {
      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.config.provider = provider;
      this.storageInfo = {
        provider,
        connected: true,
        usedSpace: Math.random() * 500 * 1024 * 1024, // Random 0-500MB
        totalSpace: 5 * 1024 * 1024 * 1024, // 5GB
        lastCheck: new Date()
      };

      this.emit('storage:connected', this.storageInfo);
      return true;
    } catch (error) {
      this.emit('storage:error', { error });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.stopAutoSync();
    this.storageInfo.connected = false;
    this.config.provider = 'local';
    this.emit('storage:disconnected');
  }

  getStorageInfo(): CloudStorageInfo {
    return { ...this.storageInfo };
  }

  // State
  getState(): SyncState {
    return { ...this.state };
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  // Cleanup
  clearPendingChanges(): void {
    this.changes.clear();
    this.state.pendingChanges = 0;
    this.emit('changes:cleared');
  }

  destroy(): void {
    this.stopAutoSync();
    this.disconnectRealTime();
    this.removeAllListeners();
  }

  // ============ PHASE 4.2: REAL-TIME MULTI-DEVICE SYNC ============

  /**
   * Connect to real-time sync server
   */
  async connectRealTime(url?: string): Promise<boolean> {
    const wsUrl = url || this.config.websocketUrl;
    if (!wsUrl) {
      this.emit('realtime:error', { error: 'No WebSocket URL configured' });
      return false;
    }

    if (this.websocket?.readyState === WebSocket.OPEN) {
      return true; // Already connected
    }

    return new Promise((resolve) => {
      try {
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          this.reconnectAttempts = 0;
          this.emit('realtime:connected');

          // Send presence announcement
          this.sendPresence('online');

          // Start heartbeat
          this.startHeartbeat();

          resolve(true);
        };

        this.websocket.onmessage = (event) => {
          this.handleRealtimeMessage(event.data);
        };

        this.websocket.onerror = (error) => {
          this.emit('realtime:error', { error });
          resolve(false);
        };

        this.websocket.onclose = () => {
          this.stopHeartbeat();
          this.emit('realtime:disconnected');

          // Auto-reconnect if enabled
          if (this.config.realTimeEnabled && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.emit('realtime:error', { error });
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from real-time sync
   */
  disconnectRealTime(): void {
    this.sendPresence('offline');
    this.stopHeartbeat();

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.connectedDevices.clear();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (this.config.realTimeEnabled) {
        this.connectRealTime();
      }
    }, delay);

    this.emit('realtime:reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay
    });
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendMessage({
        type: 'presence',
        from: this.config.deviceId!,
        timestamp: new Date(),
        payload: { status: 'heartbeat' }
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Handle incoming real-time message
   */
  private handleRealtimeMessage(data: string): void {
    try {
      const message: RealTimeMessage = JSON.parse(data);
      message.timestamp = new Date(message.timestamp);

      switch (message.type) {
        case 'sync':
          this.handleSyncMessage(message);
          break;
        case 'presence':
          this.handlePresenceMessage(message);
          break;
        case 'notification':
          this.handleNotificationMessage(message);
          break;
        case 'command':
          this.handleCommandMessage(message);
          break;
      }

      this.emit('realtime:message', message);
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Handle sync message from another device
   */
  private handleSyncMessage(message: RealTimeMessage): void {
    const payload = message.payload as {
      changes?: SyncChange[];
      itemType?: SyncItemType;
      data?: unknown;
    };

    if (payload.changes) {
      // Apply remote changes
      for (const change of payload.changes) {
        this.applyRemoteChange(change);
      }
    }

    this.emit('realtime:sync', {
      from: message.from,
      changes: payload.changes?.length || 0
    });
  }

  /**
   * Apply a remote change locally
   */
  private applyRemoteChange(change: SyncChange): void {
    // Check for conflict
    const existingChange = Array.from(this.changes.values())
      .find(c => c.itemId === change.itemId && !c.synced);

    if (existingChange && change.timestamp > existingChange.timestamp) {
      // Remote is newer, create conflict or auto-resolve
      if (this.config.conflictResolution === 'newest') {
        // Apply remote change
        this.trackChange(change.type, change.itemType, change.itemId, change.data);
        existingChange.synced = true;
      } else if (this.config.conflictResolution !== 'manual') {
        // Create conflict for manual resolution
        const conflict: SyncConflict = {
          id: this.generateId(),
          itemType: change.itemType,
          itemId: change.itemId,
          localVersion: existingChange.data,
          remoteVersion: change.data,
          localTimestamp: existingChange.timestamp,
          remoteTimestamp: change.timestamp,
          resolved: false
        };
        this.state.conflicts.push(conflict);
        this.emit('conflict:detected', conflict);
      }
    } else {
      // No conflict, apply directly
      this.trackChange(change.type, change.itemType, change.itemId, change.data);
    }
  }

  /**
   * Handle presence message
   */
  private handlePresenceMessage(message: RealTimeMessage): void {
    const payload = message.payload as {
      status: 'online' | 'offline' | 'heartbeat';
      deviceName?: string;
      deviceType?: ConnectedDevice['type'];
      version?: string;
    };

    if (payload.status === 'offline') {
      const device = this.connectedDevices.get(message.from);
      if (device) {
        device.online = false;
        device.lastSeen = message.timestamp;
      }
      this.emit('device:offline', { deviceId: message.from });
    } else {
      const existing = this.connectedDevices.get(message.from);
      const device: ConnectedDevice = {
        id: message.from,
        name: payload.deviceName || existing?.name || 'Unknown Device',
        type: payload.deviceType || existing?.type || 'web',
        lastSeen: message.timestamp,
        online: true,
        version: payload.version || existing?.version
      };
      this.connectedDevices.set(message.from, device);

      if (payload.status === 'online') {
        this.emit('device:online', device);
      }
    }
  }

  /**
   * Handle notification message
   */
  private handleNotificationMessage(message: RealTimeMessage): void {
    this.emit('realtime:notification', {
      from: message.from,
      payload: message.payload
    });
  }

  /**
   * Handle command message
   */
  private handleCommandMessage(message: RealTimeMessage): void {
    const payload = message.payload as { command: string; args?: unknown };

    switch (payload.command) {
      case 'request-sync':
        // Another device requests full sync
        this.broadcastChanges();
        break;
      case 'lock':
        // Lock a resource
        this.emit('resource:locked', { from: message.from, args: payload.args });
        break;
      case 'unlock':
        // Unlock a resource
        this.emit('resource:unlocked', { from: message.from, args: payload.args });
        break;
    }

    this.emit('realtime:command', { command: payload.command, from: message.from });
  }

  /**
   * Send a real-time message
   */
  sendMessage(message: RealTimeMessage): boolean {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.websocket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send presence update
   */
  sendPresence(status: 'online' | 'offline'): void {
    this.sendMessage({
      type: 'presence',
      from: this.config.deviceId!,
      timestamp: new Date(),
      payload: {
        status,
        deviceName: this.config.deviceName,
        deviceType: this.detectDeviceType(),
        version: '1.0.0'
      }
    });
  }

  /**
   * Detect device type
   */
  private detectDeviceType(): ConnectedDevice['type'] {
    if (typeof navigator === 'undefined') return 'web';

    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(ua)) {
      if (/ipad|tablet/.test(ua)) return 'tablet';
      return 'mobile';
    }
    if (/electron/.test(ua)) return 'desktop';
    return 'web';
  }

  /**
   * Broadcast pending changes to all devices
   */
  broadcastChanges(): void {
    const pendingChanges = this.getPendingChanges();
    if (pendingChanges.length === 0) return;

    this.sendMessage({
      type: 'sync',
      from: this.config.deviceId!,
      timestamp: new Date(),
      payload: { changes: pendingChanges }
    });
  }

  /**
   * Send notification to other devices
   */
  sendNotification(title: string, body: string, data?: unknown): void {
    this.sendMessage({
      type: 'notification',
      from: this.config.deviceId!,
      timestamp: new Date(),
      payload: { title, body, data }
    });
  }

  /**
   * Send command to specific device or all devices
   */
  sendCommand(command: string, args?: unknown, targetDevice?: string): void {
    this.sendMessage({
      type: 'command',
      from: this.config.deviceId!,
      timestamp: new Date(),
      payload: { command, args, target: targetDevice }
    });
  }

  /**
   * Request full sync from other devices
   */
  requestSync(): void {
    this.sendCommand('request-sync');
  }

  /**
   * Get list of connected devices
   */
  getConnectedDevices(): ConnectedDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * Get online devices
   */
  getOnlineDevices(): ConnectedDevice[] {
    return this.getConnectedDevices().filter(d => d.online);
  }

  /**
   * Check if real-time sync is connected
   */
  isRealTimeConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get device info
   */
  getDeviceInfo(): { id: string; name: string; type: ConnectedDevice['type'] } {
    return {
      id: this.config.deviceId!,
      name: this.config.deviceName!,
      type: this.detectDeviceType()
    };
  }

  /**
   * Set device name
   */
  setDeviceName(name: string): void {
    this.config.deviceName = name;
    if (this.isRealTimeConnected()) {
      this.sendPresence('online');
    }
  }
}

// Singleton
let syncServiceInstance: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
}

export function resetSyncService(): void {
  if (syncServiceInstance) {
    syncServiceInstance.destroy();
    syncServiceInstance = null;
  }
}

