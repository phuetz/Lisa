/**
 * Lisa Backup Manager
 * Automated backup and restore functionality
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface Backup {
  id: string;
  name: string;
  description?: string;
  type: BackupType;
  status: BackupStatus;
  size: number;
  createdAt: Date;
  expiresAt?: Date;
  metadata: BackupMetadata;
  data?: string; // Compressed/encoded data
}

export type BackupType = 'full' | 'incremental' | 'conversations' | 'settings' | 'custom';
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';

export interface BackupMetadata {
  version: string;
  appVersion: string;
  itemCount: number;
  includes: BackupIncludes;
  checksum?: string;
}

export interface BackupIncludes {
  conversations: boolean;
  settings: boolean;
  plugins: boolean;
  templates: boolean;
  shortcuts: boolean;
  themes: boolean;
}

export interface BackupSchedule {
  id: string;
  name: string;
  type: BackupType;
  enabled: boolean;
  cron: string;
  retention: number; // Days to keep
  includes: BackupIncludes;
  lastRun?: Date;
  nextRun?: Date;
}

export interface RestoreOptions {
  overwrite: boolean;
  includeSettings: boolean;
  includeConversations: boolean;
  includePlugins: boolean;
}

const DEFAULT_INCLUDES: BackupIncludes = {
  conversations: true,
  settings: true,
  plugins: true,
  templates: true,
  shortcuts: true,
  themes: true
};

export class BackupManager extends BrowserEventEmitter {
  private backups: Map<string, Backup> = new Map();
  private schedules: Map<string, BackupSchedule> = new Map();
  private maxBackups = 50;
  private defaultRetention = 30; // days

  constructor() {
    super();
    this.loadDefaultSchedules();
  }

  private loadDefaultSchedules(): void {
    const defaultSchedules: BackupSchedule[] = [
      {
        id: 'daily-full',
        name: 'Sauvegarde quotidienne',
        type: 'full',
        enabled: false,
        cron: '0 2 * * *', // 2 AM daily
        retention: 7,
        includes: DEFAULT_INCLUDES
      },
      {
        id: 'weekly-full',
        name: 'Sauvegarde hebdomadaire',
        type: 'full',
        enabled: false,
        cron: '0 3 * * 0', // 3 AM Sunday
        retention: 30,
        includes: DEFAULT_INCLUDES
      },
      {
        id: 'conversations-daily',
        name: 'Conversations quotidien',
        type: 'conversations',
        enabled: false,
        cron: '0 1 * * *', // 1 AM daily
        retention: 14,
        includes: { ...DEFAULT_INCLUDES, settings: false, plugins: false, themes: false }
      }
    ];

    for (const schedule of defaultSchedules) {
      this.schedules.set(schedule.id, schedule);
    }
  }

  private generateId(): string {
    return `bkp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  // Backup creation
  async createBackup(options: {
    name?: string;
    description?: string;
    type?: BackupType;
    includes?: Partial<BackupIncludes>;
  } = {}): Promise<Backup> {
    const id = this.generateId();
    const includes = { ...DEFAULT_INCLUDES, ...options.includes };

    const backup: Backup = {
      id,
      name: options.name || `Backup ${new Date().toLocaleDateString('fr-FR')}`,
      description: options.description,
      type: options.type || 'full',
      status: 'in_progress',
      size: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.defaultRetention * 24 * 60 * 60 * 1000),
      metadata: {
        version: '1.0',
        appVersion: '1.0.0',
        itemCount: 0,
        includes
      }
    };

    this.backups.set(id, backup);
    this.emit('backup:started', backup);

    try {
      // Collect data based on includes
      const data = await this.collectBackupData(includes);
      
      // Encode/compress data
      const encoded = this.encodeData(data);
      
      backup.data = encoded;
      backup.size = encoded.length;
      backup.metadata.itemCount = this.countItems(data);
      backup.metadata.checksum = this.calculateChecksum(encoded);
      backup.status = 'completed';

      this.emit('backup:completed', backup);
      
      // Cleanup old backups
      this.cleanupOldBackups();
      
      return backup;
    } catch (error) {
      backup.status = 'failed';
      this.emit('backup:failed', { backup, error });
      throw error;
    }
  }

  private async collectBackupData(includes: BackupIncludes): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    if (includes.conversations) {
      data.conversations = this.getConversationsData();
    }
    if (includes.settings) {
      data.settings = this.getSettingsData();
    }
    if (includes.plugins) {
      data.plugins = this.getPluginsData();
    }
    if (includes.templates) {
      data.templates = this.getTemplatesData();
    }
    if (includes.shortcuts) {
      data.shortcuts = this.getShortcutsData();
    }
    if (includes.themes) {
      data.themes = this.getThemesData();
    }

    return data;
  }

  private getConversationsData(): unknown {
    // Get from localStorage or state
    if (typeof localStorage !== 'undefined') {
      const conversations = localStorage.getItem('lisa-conversations');
      return conversations ? JSON.parse(conversations) : [];
    }
    return [];
  }

  private getSettingsData(): unknown {
    if (typeof localStorage !== 'undefined') {
      const settings = localStorage.getItem('lisa-settings');
      return settings ? JSON.parse(settings) : {};
    }
    return {};
  }

  private getPluginsData(): unknown {
    if (typeof localStorage !== 'undefined') {
      const plugins = localStorage.getItem('lisa-plugins');
      return plugins ? JSON.parse(plugins) : [];
    }
    return [];
  }

  private getTemplatesData(): unknown {
    if (typeof localStorage !== 'undefined') {
      const templates = localStorage.getItem('lisa-templates');
      return templates ? JSON.parse(templates) : [];
    }
    return [];
  }

  private getShortcutsData(): unknown {
    if (typeof localStorage !== 'undefined') {
      const shortcuts = localStorage.getItem('lisa-shortcuts');
      return shortcuts ? JSON.parse(shortcuts) : [];
    }
    return [];
  }

  private getThemesData(): unknown {
    if (typeof localStorage !== 'undefined') {
      const themes = localStorage.getItem('lisa-themes');
      return themes ? JSON.parse(themes) : [];
    }
    return [];
  }

  private encodeData(data: Record<string, unknown>): string {
    const json = JSON.stringify(data);
    // In a real app, we'd compress this with gzip/lz-string
    return btoa(encodeURIComponent(json));
  }

  private decodeData(encoded: string): Record<string, unknown> {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  }

  private countItems(data: Record<string, unknown>): number {
    let count = 0;
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) {
        count += value.length;
      } else if (value && typeof value === 'object') {
        count += Object.keys(value).length;
      }
    }
    return count;
  }

  private calculateChecksum(data: string): string {
    // Simple hash for demo purposes
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // Restore
  async restore(backupId: string, options: RestoreOptions = {
    overwrite: false,
    includeSettings: true,
    includeConversations: true,
    includePlugins: true
  }): Promise<boolean> {
    const backup = this.backups.get(backupId);
    if (!backup || !backup.data) {
      throw new Error('Backup not found or has no data');
    }

    this.emit('restore:started', { backup, options });

    try {
      const data = this.decodeData(backup.data);

      if (options.includeConversations && data.conversations) {
        await this.restoreConversations(data.conversations, options.overwrite);
      }
      if (options.includeSettings && data.settings) {
        await this.restoreSettings(data.settings as Record<string, unknown>, options.overwrite);
      }
      if (options.includePlugins && data.plugins) {
        await this.restorePlugins(data.plugins, options.overwrite);
      }

      this.emit('restore:completed', { backup, options });
      return true;
    } catch (error) {
      this.emit('restore:failed', { backup, options, error });
      throw error;
    }
  }

  private async restoreConversations(data: unknown, _overwrite: boolean): Promise<void> {
    if (typeof localStorage !== 'undefined' && data) {
      localStorage.setItem('lisa-conversations', JSON.stringify(data));
    }
  }

  private async restoreSettings(data: Record<string, unknown>, _overwrite: boolean): Promise<void> {
    if (typeof localStorage !== 'undefined' && data) {
      localStorage.setItem('lisa-settings', JSON.stringify(data));
    }
  }

  private async restorePlugins(data: unknown, _overwrite: boolean): Promise<void> {
    if (typeof localStorage !== 'undefined' && data) {
      localStorage.setItem('lisa-plugins', JSON.stringify(data));
    }
  }

  // Backup management
  getBackup(id: string): Backup | undefined {
    return this.backups.get(id);
  }

  listBackups(filter?: {
    type?: BackupType;
    status?: BackupStatus;
    limit?: number;
  }): Backup[] {
    let backups = Array.from(this.backups.values());

    if (filter?.type) {
      backups = backups.filter(b => b.type === filter.type);
    }
    if (filter?.status) {
      backups = backups.filter(b => b.status === filter.status);
    }

    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filter?.limit) {
      backups = backups.slice(0, filter.limit);
    }

    return backups;
  }

  deleteBackup(id: string): boolean {
    const deleted = this.backups.delete(id);
    if (deleted) {
      this.emit('backup:deleted', { id });
    }
    return deleted;
  }

  // Schedule management
  getSchedule(id: string): BackupSchedule | undefined {
    return this.schedules.get(id);
  }

  listSchedules(): BackupSchedule[] {
    return Array.from(this.schedules.values());
  }

  updateSchedule(id: string, updates: Partial<BackupSchedule>): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;

    Object.assign(schedule, updates);
    this.emit('schedule:updated', schedule);
    return true;
  }

  enableSchedule(id: string): boolean {
    return this.updateSchedule(id, { enabled: true });
  }

  disableSchedule(id: string): boolean {
    return this.updateSchedule(id, { enabled: false });
  }

  // Cleanup
  cleanupOldBackups(): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, backup] of this.backups) {
      if (backup.expiresAt && backup.expiresAt.getTime() < now) {
        this.backups.delete(id);
        removed++;
      }
    }

    // Also trim to max backups
    const backups = this.listBackups();
    if (backups.length > this.maxBackups) {
      const toRemove = backups.slice(this.maxBackups);
      for (const backup of toRemove) {
        this.backups.delete(backup.id);
        removed++;
      }
    }

    if (removed > 0) {
      this.emit('backups:cleaned', { removed });
    }

    return removed;
  }

  // Export/Import
  exportBackup(id: string): string | null {
    const backup = this.backups.get(id);
    if (!backup) return null;

    return JSON.stringify({
      ...backup,
      exported: new Date().toISOString()
    }, null, 2);
  }

  importBackup(json: string): Backup | null {
    try {
      const data = JSON.parse(json);
      const backup: Backup = {
        ...data,
        id: this.generateId(),
        createdAt: new Date(data.createdAt),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
      };

      this.backups.set(backup.id, backup);
      this.emit('backup:imported', backup);
      return backup;
    } catch {
      return null;
    }
  }

  // Download backup file
  downloadBackup(id: string): void {
    const backup = this.backups.get(id);
    if (!backup || typeof window === 'undefined') return;

    const json = this.exportBackup(id);
    if (!json) return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lisa-backup-${backup.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Stats
  getStats(): {
    totalBackups: number;
    totalSize: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    scheduledBackups: number;
  } {
    const backups = this.listBackups();
    const enabledSchedules = Array.from(this.schedules.values()).filter(s => s.enabled);

    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].createdAt : null,
      newestBackup: backups.length > 0 ? backups[0].createdAt : null,
      scheduledBackups: enabledSchedules.length
    };
  }
}

// Singleton
let backupManagerInstance: BackupManager | null = null;

export function getBackupManager(): BackupManager {
  if (!backupManagerInstance) {
    backupManagerInstance = new BackupManager();
  }
  return backupManagerInstance;
}

export function resetBackupManager(): void {
  if (backupManagerInstance) {
    backupManagerInstance.removeAllListeners();
    backupManagerInstance = null;
  }
}

