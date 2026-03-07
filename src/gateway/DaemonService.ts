/**
 * Lisa Daemon Service
 *
 * Unified background service that orchestrates:
 * - Service lifecycle management (start/stop/restart)
 * - Heartbeat with active hours awareness
 * - Session maintenance (prune idle, cap max)
 * - Auto-recovery on service failure
 * - Integration with HealthMonitor and CronManager
 *
 * Works in both browser (Electron/Web Worker) and Node.js contexts.
 * Ported from Code Buddy's daemon subsystem pattern.
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

// ============================================================================
// Types
// ============================================================================

export interface DaemonConfig {
  /** Heartbeat interval in ms (default: 60_000 = 1 minute) */
  heartbeatIntervalMs: number;
  /** Start of active hours 0-23 (default: 6) */
  activeHoursStart: number;
  /** End of active hours 0-23 (default: 23) */
  activeHoursEnd: number;
  /** Max consecutive failures before marking a service as dead (default: 3) */
  maxConsecutiveFailures: number;
  /** Auto-restart failed services (default: true) */
  autoRestart: boolean;
  /** Session idle timeout in ms before pruning (default: 30 min) */
  sessionIdleTimeoutMs: number;
  /** Max concurrent sessions (default: 50) */
  maxSessions: number;
  /** Daily reset hour 0-23 (default: 4) */
  dailyResetHour: number;
}

export const DEFAULT_DAEMON_CONFIG: DaemonConfig = {
  heartbeatIntervalMs: 60_000,
  activeHoursStart: 6,
  activeHoursEnd: 23,
  maxConsecutiveFailures: 3,
  autoRestart: true,
  sessionIdleTimeoutMs: 30 * 60 * 1000,
  maxSessions: 50,
  dailyResetHour: 4,
};

export interface ManagedService {
  name: string;
  status: 'stopped' | 'starting' | 'running' | 'failed';
  startFn: () => Promise<void>;
  stopFn: () => Promise<void>;
  healthFn?: () => Promise<boolean>;
  startedAt?: Date;
  failureCount: number;
  lastError?: string;
}

export interface DaemonStatus {
  running: boolean;
  startedAt: Date | null;
  uptime: number;
  services: ServiceSnapshot[];
  heartbeat: HeartbeatSnapshot;
  sessions: SessionSnapshot;
}

export interface ServiceSnapshot {
  name: string;
  status: ManagedService['status'];
  startedAt?: Date;
  failureCount: number;
  lastError?: string;
}

export interface HeartbeatSnapshot {
  totalTicks: number;
  lastTick: Date | null;
  insideActiveHours: boolean;
  skippedOutsideHours: number;
}

export interface SessionSnapshot {
  active: number;
  pruned: number;
  maxAllowed: number;
}

export interface DaemonEvent {
  type: string;
  timestamp: Date;
  data?: unknown;
}

// ============================================================================
// Daemon Service
// ============================================================================

export class DaemonService extends BrowserEventEmitter {
  private config: DaemonConfig;
  private services = new Map<string, ManagedService>();
  private running = false;
  private startedAt: Date | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private dailyResetTimer: ReturnType<typeof setInterval> | null = null;

  // Heartbeat stats
  private totalTicks = 0;
  private lastTick: Date | null = null;
  private skippedOutsideHours = 0;

  // Session tracking (delegated — the daemon tracks counts, not actual sessions)
  private activeSessions = 0;
  private prunedSessions = 0;

  // Session pruning callback (set by the host app)
  private sessionPruneFn: (() => Promise<{ pruned: number; remaining: number }>) | null = null;

  constructor(config: Partial<DaemonConfig> = {}) {
    super();
    this.config = { ...DEFAULT_DAEMON_CONFIG, ...config };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.startedAt = new Date();

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => this.tick(), this.config.heartbeatIntervalMs);

    // Schedule daily reset check every minute
    this.dailyResetTimer = setInterval(() => this.checkDailyReset(), 60_000);

    // Auto-start registered services
    const startPromises = [...this.services.values()]
      .filter(s => s.status === 'stopped')
      .map(s => this.startService(s.name));
    await Promise.allSettled(startPromises);

    this.emit('daemon:started', { startedAt: this.startedAt });
  }

  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.dailyResetTimer) {
      clearInterval(this.dailyResetTimer);
      this.dailyResetTimer = null;
    }

    // Stop all services
    const stopPromises = [...this.services.values()]
      .filter(s => s.status === 'running')
      .map(s => this.stopService(s.name));
    await Promise.allSettled(stopPromises);

    this.emit('daemon:stopped', { uptime: this.getUptime() });
  }

  // ============================================================================
  // Service Management
  // ============================================================================

  registerService(
    name: string,
    startFn: () => Promise<void>,
    stopFn: () => Promise<void>,
    healthFn?: () => Promise<boolean>,
  ): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' already registered`);
    }

    this.services.set(name, {
      name,
      status: 'stopped',
      startFn,
      stopFn,
      healthFn,
      failureCount: 0,
    });

    this.emit('service:registered', { name });
  }

  unregisterService(name: string): boolean {
    const service = this.services.get(name);
    if (!service) return false;

    if (service.status === 'running') {
      // Can't unregister a running service
      throw new Error(`Cannot unregister running service '${name}'. Stop it first.`);
    }

    this.services.delete(name);
    this.emit('service:unregistered', { name });
    return true;
  }

  async startService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) throw new Error(`Unknown service: ${name}`);
    if (service.status === 'running') return;

    service.status = 'starting';
    this.emit('service:starting', { name });

    try {
      await service.startFn();
      service.status = 'running';
      service.startedAt = new Date();
      service.failureCount = 0;
      service.lastError = undefined;
      this.emit('service:started', { name });
    } catch (err) {
      service.status = 'failed';
      service.failureCount++;
      service.lastError = err instanceof Error ? err.message : String(err);
      this.emit('service:failed', { name, error: service.lastError });
    }
  }

  async stopService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) throw new Error(`Unknown service: ${name}`);
    if (service.status === 'stopped') return;

    try {
      await service.stopFn();
    } catch {
      // Best effort stop
    }
    service.status = 'stopped';
    service.startedAt = undefined;
    this.emit('service:stopped', { name });
  }

  async restartService(name: string): Promise<void> {
    await this.stopService(name);
    await this.startService(name);
  }

  // ============================================================================
  // Heartbeat
  // ============================================================================

  private async tick(): Promise<void> {
    if (!this.running) return;

    this.totalTicks++;
    this.lastTick = new Date();

    // Active hours check
    if (!this.isInsideActiveHours()) {
      this.skippedOutsideHours++;
      this.emit('heartbeat:skipped', { reason: 'outside_active_hours' });
      return;
    }

    // Health check all services
    const healthResults: Array<{ name: string; healthy: boolean }> = [];

    for (const service of this.services.values()) {
      if (service.status !== 'running') continue;

      if (service.healthFn) {
        try {
          const healthy = await service.healthFn();
          healthResults.push({ name: service.name, healthy });

          if (!healthy) {
            service.failureCount++;
            this.emit('service:unhealthy', { name: service.name, failures: service.failureCount });

            // Auto-restart if threshold exceeded
            if (this.config.autoRestart && service.failureCount >= this.config.maxConsecutiveFailures) {
              this.emit('service:auto-restarting', { name: service.name });
              await this.restartService(service.name);
            }
          } else {
            service.failureCount = 0;
          }
        } catch {
          service.failureCount++;
          healthResults.push({ name: service.name, healthy: false });
        }
      } else {
        healthResults.push({ name: service.name, healthy: true });
      }
    }

    // Session maintenance
    if (this.sessionPruneFn) {
      try {
        const result = await this.sessionPruneFn();
        this.prunedSessions += result.pruned;
        this.activeSessions = result.remaining;
      } catch {
        // Session prune is best-effort
      }
    }

    this.emit('heartbeat:tick', {
      tick: this.totalTicks,
      services: healthResults,
      sessions: { active: this.activeSessions, pruned: this.prunedSessions },
    });
  }

  isInsideActiveHours(): boolean {
    const hour = new Date().getHours();
    if (this.config.activeHoursStart <= this.config.activeHoursEnd) {
      return hour >= this.config.activeHoursStart && hour < this.config.activeHoursEnd;
    }
    // Wraps midnight (e.g., 22 → 6)
    return hour >= this.config.activeHoursStart || hour < this.config.activeHoursEnd;
  }

  // ============================================================================
  // Daily Reset
  // ============================================================================

  private lastResetDate: string | null = null;

  private async checkDailyReset(): Promise<void> {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (now.getHours() === this.config.dailyResetHour && this.lastResetDate !== todayStr) {
      this.lastResetDate = todayStr;
      this.emit('daemon:daily-reset', { date: todayStr });

      // Reset per-day counters
      this.prunedSessions = 0;
    }
  }

  // ============================================================================
  // Session Tracking
  // ============================================================================

  setSessionPruneFn(fn: () => Promise<{ pruned: number; remaining: number }>): void {
    this.sessionPruneFn = fn;
  }

  updateSessionCount(count: number): void {
    this.activeSessions = count;
  }

  // ============================================================================
  // Status
  // ============================================================================

  getStatus(): DaemonStatus {
    return {
      running: this.running,
      startedAt: this.startedAt,
      uptime: this.getUptime(),
      services: [...this.services.values()].map(s => ({
        name: s.name,
        status: s.status,
        startedAt: s.startedAt,
        failureCount: s.failureCount,
        lastError: s.lastError,
      })),
      heartbeat: {
        totalTicks: this.totalTicks,
        lastTick: this.lastTick,
        insideActiveHours: this.isInsideActiveHours(),
        skippedOutsideHours: this.skippedOutsideHours,
      },
      sessions: {
        active: this.activeSessions,
        pruned: this.prunedSessions,
        maxAllowed: this.config.maxSessions,
      },
    };
  }

  getUptime(): number {
    if (!this.startedAt) return 0;
    return Date.now() - this.startedAt.getTime();
  }

  getService(name: string): ManagedService | undefined {
    return this.services.get(name);
  }

  getServiceNames(): string[] {
    return [...this.services.keys()];
  }

  isRunning(): boolean {
    return this.running;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let daemonInstance: DaemonService | null = null;

export function getDaemonService(config?: Partial<DaemonConfig>): DaemonService {
  if (!daemonInstance) {
    daemonInstance = new DaemonService(config);
  }
  return daemonInstance;
}

export function resetDaemonService(): void {
  if (daemonInstance) {
    daemonInstance.stop();
    daemonInstance.removeAllListeners();
    daemonInstance = null;
  }
}
