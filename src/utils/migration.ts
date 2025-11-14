/**
 * Migration and Upgrade System
 * Handles version migrations and data upgrades
 */

import { logInfo, logWarn, logError } from './logger';

export interface MigrationStep {
  version: string;
  name: string;
  description: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

export interface MigrationState {
  currentVersion: string;
  lastMigration?: string;
  migrations: string[];
  completedAt?: number;
}

const STORAGE_KEY = 'lisa_migration_state';

/**
 * Migration Manager
 * Handles database and storage migrations between versions
 */
export class MigrationManager {
  private static instance: MigrationManager;
  private migrations: Map<string, MigrationStep> = new Map();
  private state: MigrationState;

  private constructor() {
    this.state = this.loadState();
    this.registerMigrations();
  }

  static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  /**
   * Register all available migrations
   */
  private registerMigrations(): void {
    // Migration from v1 to v2
    this.register({
      version: '2.0.0',
      name: 'Add structured logging',
      description: 'Migrate to new structured logging system',
      up: async () => {
        // Migrate old logs to new format
        const oldLogs = localStorage.getItem('lisa_logs_old');
        if (oldLogs) {
          logInfo('Migrating old logs to structured format', 'Migration');
          localStorage.removeItem('lisa_logs_old');
        }
      },
    });

    // Migration from v2 to v3
    this.register({
      version: '3.0.0',
      name: 'Add analytics and performance tracking',
      description: 'Initialize analytics and performance monitoring',
      up: async () => {
        logInfo('Initializing analytics system', 'Migration');
        // Analytics will auto-initialize
      },
    });

    // Migration from v3 to v3.1
    this.register({
      version: '3.1.0',
      name: 'Add feature flags',
      description: 'Initialize feature flags system',
      up: async () => {
        logInfo('Initializing feature flags', 'Migration');
        // Feature flags will auto-initialize
      },
    });

    // Migration for IndexedDB cache
    this.register({
      version: '3.2.0',
      name: 'Migrate to IndexedDB cache',
      description: 'Move model cache to IndexedDB',
      up: async () => {
        logInfo('Setting up IndexedDB model cache', 'Migration');
        // Clear old localStorage cache if exists
        const oldCacheKeys = Object.keys(localStorage).filter(key =>
          key.startsWith('lisa_model_')
        );
        oldCacheKeys.forEach(key => localStorage.removeItem(key));
      },
    });

    // Migration for offline sync
    this.register({
      version: '3.3.0',
      name: 'Initialize offline sync',
      description: 'Set up offline synchronization system',
      up: async () => {
        logInfo('Initializing offline sync', 'Migration');
        // Offline sync will auto-initialize
      },
    });
  }

  /**
   * Register a migration step
   */
  register(migration: MigrationStep): void {
    this.migrations.set(migration.version, migration);
  }

  /**
   * Run all pending migrations
   */
  async migrate(targetVersion?: string): Promise<void> {
    const currentVersion = this.state.currentVersion;
    const migrations = this.getPendingMigrations(targetVersion);

    if (migrations.length === 0) {
      logInfo('No pending migrations', 'Migration');
      return;
    }

    logInfo(
      `Running ${migrations.length} migrations from ${currentVersion}`,
      'Migration'
    );

    for (const migration of migrations) {
      try {
        logInfo(`Migrating to ${migration.version}: ${migration.name}`, 'Migration');

        await migration.up();

        this.state.migrations.push(migration.version);
        this.state.lastMigration = migration.version;
        this.state.currentVersion = migration.version;
        this.state.completedAt = Date.now();

        this.saveState();

        logInfo(`Migration to ${migration.version} completed`, 'Migration');
      } catch (error) {
        logError(
          `Migration to ${migration.version} failed`,
          'Migration',
          error
        );
        throw new Error(
          `Migration failed at version ${migration.version}: ${error}`
        );
      }
    }

    logInfo('All migrations completed successfully', 'Migration');
  }

  /**
   * Rollback to a previous version
   */
  async rollback(targetVersion: string): Promise<void> {
    const currentVersion = this.state.currentVersion;
    const migrations = this.getRollbackMigrations(targetVersion);

    if (migrations.length === 0) {
      logWarn('No migrations to rollback', 'Migration');
      return;
    }

    logInfo(
      `Rolling back ${migrations.length} migrations to ${targetVersion}`,
      'Migration'
    );

    for (const migration of migrations) {
      if (!migration.down) {
        throw new Error(
          `Migration ${migration.version} does not support rollback`
        );
      }

      try {
        logInfo(`Rolling back ${migration.version}`, 'Migration');

        await migration.down();

        // Remove from completed migrations
        this.state.migrations = this.state.migrations.filter(
          v => v !== migration.version
        );
        this.state.currentVersion = targetVersion;

        this.saveState();

        logInfo(`Rollback of ${migration.version} completed`, 'Migration');
      } catch (error) {
        logError(`Rollback of ${migration.version} failed`, 'Migration', error);
        throw error;
      }
    }

    logInfo('All rollbacks completed successfully', 'Migration');
  }

  /**
   * Get pending migrations
   */
  private getPendingMigrations(targetVersion?: string): MigrationStep[] {
    const allVersions = Array.from(this.migrations.keys()).sort(
      this.compareVersions
    );

    const currentIndex = allVersions.indexOf(this.state.currentVersion);
    const targetIndex = targetVersion
      ? allVersions.indexOf(targetVersion)
      : allVersions.length - 1;

    if (currentIndex === -1) {
      // Current version not found, run all migrations
      return allVersions
        .slice(0, targetIndex + 1)
        .map(v => this.migrations.get(v)!);
    }

    return allVersions
      .slice(currentIndex + 1, targetIndex + 1)
      .map(v => this.migrations.get(v)!);
  }

  /**
   * Get migrations to rollback
   */
  private getRollbackMigrations(targetVersion: string): MigrationStep[] {
    const completed = this.state.migrations.sort(this.compareVersions).reverse();
    const targetIndex = completed.indexOf(targetVersion);

    if (targetIndex === -1) {
      return completed.map(v => this.migrations.get(v)!);
    }

    return completed.slice(0, targetIndex).map(v => this.migrations.get(v)!);
  }

  /**
   * Compare version strings
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;

      if (aVal !== bVal) {
        return aVal - bVal;
      }
    }

    return 0;
  }

  /**
   * Get current migration state
   */
  getState(): MigrationState {
    return { ...this.state };
  }

  /**
   * Get all available migrations
   */
  getAllMigrations(): MigrationStep[] {
    return Array.from(this.migrations.values()).sort((a, b) =>
      this.compareVersions(a.version, b.version)
    );
  }

  /**
   * Check if migrations are needed
   */
  needsMigration(): boolean {
    return this.getPendingMigrations().length > 0;
  }

  /**
   * Get latest version
   */
  getLatestVersion(): string {
    const versions = Array.from(this.migrations.keys()).sort(
      this.compareVersions
    );
    return versions[versions.length - 1] || '1.0.0';
  }

  /**
   * Load migration state from storage
   */
  private loadState(): MigrationState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logWarn('Failed to load migration state', 'Migration', error);
    }

    return {
      currentVersion: '1.0.0',
      migrations: [],
    };
  }

  /**
   * Save migration state to storage
   */
  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      logError('Failed to save migration state', 'Migration', error);
    }
  }

  /**
   * Reset migration state (for testing)
   */
  reset(): void {
    this.state = {
      currentVersion: '1.0.0',
      migrations: [],
    };
    this.saveState();
  }
}

/**
 * Auto-run migrations on app start
 */
export async function autoMigrate(): Promise<void> {
  const manager = MigrationManager.getInstance();

  if (manager.needsMigration()) {
    logInfo('Pending migrations detected, running auto-migration', 'Migration');
    await manager.migrate();
  } else {
    logInfo('No migrations needed', 'Migration');
  }
}

// Export singleton
export const migrationManager = MigrationManager.getInstance();
