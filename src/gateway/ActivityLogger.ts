/**
 * Lisa Activity Logger / Audit Trail
 * Comprehensive logging for all system activities
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface ActivityLog {
  id: string;
  timestamp: Date;
  type: ActivityType;
  category: ActivityCategory;
  action: string;
  actor: ActivityActor;
  target?: ActivityTarget;
  metadata: Record<string, unknown>;
  result: 'success' | 'failure' | 'pending';
  duration?: number;
  error?: string;
}

export type ActivityType = 
  | 'user_action'
  | 'system_event'
  | 'api_call'
  | 'auth'
  | 'data_access'
  | 'config_change'
  | 'error'
  | 'security';

export type ActivityCategory =
  | 'chat'
  | 'session'
  | 'skill'
  | 'agent'
  | 'automation'
  | 'channel'
  | 'settings'
  | 'file'
  | 'network'
  | 'auth'
  | 'system';

export interface ActivityActor {
  type: 'user' | 'system' | 'agent' | 'skill' | 'automation';
  id: string;
  name?: string;
  ip?: string;
  userAgent?: string;
}

export interface ActivityTarget {
  type: string;
  id: string;
  name?: string;
}

export interface ActivityFilter {
  types?: ActivityType[];
  categories?: ActivityCategory[];
  actorId?: string;
  targetId?: string;
  result?: 'success' | 'failure' | 'pending';
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface ActivityStats {
  total: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byResult: Record<string, number>;
  recentErrors: number;
  avgDuration: number;
}

export class ActivityLogger extends BrowserEventEmitter {
  private logs: ActivityLog[] = [];
  private maxLogs = 10000;
  private retentionDays = 30;

  constructor() {
    super();
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    // Cleanup old logs every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  private generateId(): string {
    return `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Logging methods
  log(
    type: ActivityType,
    category: ActivityCategory,
    action: string,
    actor: ActivityActor,
    options: {
      target?: ActivityTarget;
      metadata?: Record<string, unknown>;
      result?: 'success' | 'failure' | 'pending';
      duration?: number;
      error?: string;
    } = {}
  ): ActivityLog {
    const log: ActivityLog = {
      id: this.generateId(),
      timestamp: new Date(),
      type,
      category,
      action,
      actor,
      target: options.target,
      metadata: options.metadata || {},
      result: options.result || 'success',
      duration: options.duration,
      error: options.error
    };

    this.logs.unshift(log);
    
    // Trim if over max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.emit('activity:logged', log);

    // Emit specific events for certain types
    if (log.type === 'error' || log.result === 'failure') {
      this.emit('activity:error', log);
    }
    if (log.type === 'security') {
      this.emit('activity:security', log);
    }

    return log;
  }

  // Convenience logging methods
  logUserAction(
    action: string,
    userId: string,
    options: {
      category?: ActivityCategory;
      target?: ActivityTarget;
      metadata?: Record<string, unknown>;
    } = {}
  ): ActivityLog {
    return this.log(
      'user_action',
      options.category || 'chat',
      action,
      { type: 'user', id: userId },
      options
    );
  }

  logSystemEvent(
    action: string,
    options: {
      category?: ActivityCategory;
      metadata?: Record<string, unknown>;
      result?: 'success' | 'failure';
    } = {}
  ): ActivityLog {
    return this.log(
      'system_event',
      options.category || 'system',
      action,
      { type: 'system', id: 'lisa' },
      options
    );
  }

  logApiCall(
    endpoint: string,
    method: string,
    options: {
      actorId?: string;
      statusCode?: number;
      duration?: number;
      error?: string;
    } = {}
  ): ActivityLog {
    return this.log(
      'api_call',
      'network',
      `${method} ${endpoint}`,
      { type: 'system', id: options.actorId || 'api' },
      {
        metadata: { method, endpoint, statusCode: options.statusCode },
        duration: options.duration,
        result: options.error ? 'failure' : 'success',
        error: options.error
      }
    );
  }

  logAuth(
    action: 'login' | 'logout' | 'token_refresh' | 'password_change' | 'failed_attempt',
    userId: string,
    options: {
      ip?: string;
      userAgent?: string;
      success?: boolean;
      error?: string;
    } = {}
  ): ActivityLog {
    return this.log(
      'auth',
      'auth',
      action,
      { type: 'user', id: userId, ip: options.ip, userAgent: options.userAgent },
      {
        result: options.success === false ? 'failure' : 'success',
        error: options.error
      }
    );
  }

  logDataAccess(
    action: 'read' | 'write' | 'delete' | 'export',
    actorId: string,
    target: ActivityTarget,
    options: {
      metadata?: Record<string, unknown>;
    } = {}
  ): ActivityLog {
    return this.log(
      'data_access',
      'file',
      action,
      { type: 'user', id: actorId },
      { target, metadata: options.metadata }
    );
  }

  logConfigChange(
    setting: string,
    actorId: string,
    options: {
      oldValue?: unknown;
      newValue?: unknown;
    } = {}
  ): ActivityLog {
    return this.log(
      'config_change',
      'settings',
      `Changed: ${setting}`,
      { type: 'user', id: actorId },
      {
        metadata: { setting, oldValue: options.oldValue, newValue: options.newValue }
      }
    );
  }

  logError(
    error: Error | string,
    options: {
      category?: ActivityCategory;
      actorId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): ActivityLog {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    return this.log(
      'error',
      options.category || 'system',
      errorMessage,
      { type: 'system', id: options.actorId || 'lisa' },
      {
        result: 'failure',
        error: errorMessage,
        metadata: { ...options.metadata, stack: errorStack }
      }
    );
  }

  logSecurityEvent(
    action: string,
    options: {
      actorId?: string;
      ip?: string;
      threat?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): ActivityLog {
    return this.log(
      'security',
      'auth',
      action,
      { type: 'system', id: options.actorId || 'security', ip: options.ip },
      {
        metadata: { threat: options.threat, severity: options.severity },
        result: 'failure'
      }
    );
  }

  // Query methods
  query(filter: ActivityFilter = {}): ActivityLog[] {
    let results = [...this.logs];

    if (filter.types?.length) {
      results = results.filter(l => filter.types!.includes(l.type));
    }
    if (filter.categories?.length) {
      results = results.filter(l => filter.categories!.includes(l.category));
    }
    if (filter.actorId) {
      results = results.filter(l => l.actor.id === filter.actorId);
    }
    if (filter.targetId) {
      results = results.filter(l => l.target?.id === filter.targetId);
    }
    if (filter.result) {
      results = results.filter(l => l.result === filter.result);
    }
    if (filter.from) {
      results = results.filter(l => l.timestamp >= filter.from!);
    }
    if (filter.to) {
      results = results.filter(l => l.timestamp <= filter.to!);
    }

    // Pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    
    return results.slice(offset, offset + limit);
  }

  getRecent(limit = 50): ActivityLog[] {
    return this.logs.slice(0, limit);
  }

  getErrors(limit = 50): ActivityLog[] {
    return this.query({ types: ['error'], result: 'failure', limit });
  }

  getSecurityEvents(limit = 50): ActivityLog[] {
    return this.query({ types: ['security'], limit });
  }

  getByActor(actorId: string, limit = 100): ActivityLog[] {
    return this.query({ actorId, limit });
  }

  // Stats
  getStats(since?: Date): ActivityStats {
    let logs = this.logs;
    
    if (since) {
      logs = logs.filter(l => l.timestamp >= since);
    }

    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byResult: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;
    let recentErrors = 0;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const log of logs) {
      byType[log.type] = (byType[log.type] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
      byResult[log.result] = (byResult[log.result] || 0) + 1;

      if (log.duration !== undefined) {
        totalDuration += log.duration;
        durationCount++;
      }

      if (log.result === 'failure' && log.timestamp >= oneHourAgo) {
        recentErrors++;
      }
    }

    return {
      total: logs.length,
      byType,
      byCategory,
      byResult,
      recentErrors,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : 0
    };
  }

  // Cleanup
  cleanup(): number {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const before = this.logs.length;
    
    this.logs = this.logs.filter(l => l.timestamp >= cutoff);
    
    const removed = before - this.logs.length;
    if (removed > 0) {
      this.emit('activity:cleanup', { removed });
    }
    
    return removed;
  }

  clear(): void {
    this.logs = [];
    this.emit('activity:cleared');
  }

  // Export
  export(filter?: ActivityFilter): string {
    const logs = filter ? this.query(filter) : this.logs;
    return JSON.stringify(logs, null, 2);
  }

  exportCSV(filter?: ActivityFilter): string {
    const logs = filter ? this.query(filter) : this.logs;
    
    const headers = ['id', 'timestamp', 'type', 'category', 'action', 'actor_type', 'actor_id', 'result', 'duration', 'error'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp.toISOString(),
      l.type,
      l.category,
      `"${l.action.replace(/"/g, '""')}"`,
      l.actor.type,
      l.actor.id,
      l.result,
      l.duration?.toString() || '',
      l.error ? `"${l.error.replace(/"/g, '""')}"` : ''
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  // Configuration
  setMaxLogs(max: number): void {
    this.maxLogs = max;
    if (this.logs.length > max) {
      this.logs = this.logs.slice(0, max);
    }
  }

  setRetentionDays(days: number): void {
    this.retentionDays = days;
  }
}

// Singleton
let activityLoggerInstance: ActivityLogger | null = null;

export function getActivityLogger(): ActivityLogger {
  if (!activityLoggerInstance) {
    activityLoggerInstance = new ActivityLogger();
  }
  return activityLoggerInstance;
}

export function resetActivityLogger(): void {
  if (activityLoggerInstance) {
    activityLoggerInstance.removeAllListeners();
    activityLoggerInstance = null;
  }
}

