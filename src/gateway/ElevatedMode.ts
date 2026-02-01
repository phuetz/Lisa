/**
 * Lisa Elevated Mode
 * Permission management and elevated access control
 * Inspired by OpenClaw's /elevated command
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface ElevatedConfig {
  enabled: boolean;
  defaultMode: ElevatedLevel;
  sessionTimeout: number; // minutes
  requireConfirmation: boolean;
  allowedActions: string[];
  blockedActions: string[];
  auditLog: boolean;
}

export type ElevatedLevel = 'none' | 'basic' | 'elevated' | 'admin';

export interface ElevatedSession {
  id: string;
  level: ElevatedLevel;
  startedAt: Date;
  expiresAt: Date;
  reason?: string;
  approvedBy?: string;
}

export interface PermissionRequest {
  id: string;
  action: string;
  requiredLevel: ElevatedLevel;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  reason?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  level: ElevatedLevel;
  success: boolean;
  timestamp: Date;
  details?: string;
}

const DEFAULT_CONFIG: ElevatedConfig = {
  enabled: true,
  defaultMode: 'basic',
  sessionTimeout: 30, // 30 minutes
  requireConfirmation: true,
  allowedActions: [
    'file.read',
    'file.write',
    'shell.execute',
    'network.request',
    'system.info',
    'browser.navigate',
    'canvas.push'
  ],
  blockedActions: [
    'system.shutdown',
    'system.reboot',
    'file.delete_recursive',
    'shell.sudo'
  ],
  auditLog: true
};

// Action requirements by level
const ACTION_LEVELS: Record<string, ElevatedLevel> = {
  // None level - always allowed
  'chat.send': 'none',
  'chat.read': 'none',
  
  // Basic level
  'file.read': 'basic',
  'browser.navigate': 'basic',
  'canvas.push': 'basic',
  'system.info': 'basic',
  
  // Elevated level
  'file.write': 'elevated',
  'file.delete': 'elevated',
  'shell.execute': 'elevated',
  'network.request': 'elevated',
  'browser.evaluate': 'elevated',
  
  // Admin level
  'system.config': 'admin',
  'system.shutdown': 'admin',
  'system.reboot': 'admin',
  'file.delete_recursive': 'admin',
  'shell.sudo': 'admin',
  'elevated.grant': 'admin'
};

export class ElevatedMode extends BrowserEventEmitter {
  private config: ElevatedConfig;
  private currentSession: ElevatedSession | null = null;
  private pendingRequests: Map<string, PermissionRequest> = new Map();
  private auditLog: AuditEntry[] = [];
  private maxAuditEntries = 1000;

  constructor(config: Partial<ElevatedConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('lisa-elevated');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.session) {
          const session = {
            ...data.session,
            startedAt: new Date(data.session.startedAt),
            expiresAt: new Date(data.session.expiresAt)
          };
          
          // Check if session is still valid
          if (session.expiresAt > new Date()) {
            this.currentSession = session;
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = {
        session: this.currentSession
      };
      localStorage.setItem('lisa-elevated', JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  // Configuration
  configure(config: Partial<ElevatedConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:changed', this.config);
  }

  getConfig(): ElevatedConfig {
    return { ...this.config };
  }

  // Session management
  getCurrentLevel(): ElevatedLevel {
    if (!this.currentSession) {
      return this.config.defaultMode;
    }

    // Check expiration
    if (this.currentSession.expiresAt < new Date()) {
      this.endSession();
      return this.config.defaultMode;
    }

    return this.currentSession.level;
  }

  getSession(): ElevatedSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  // Elevate session
  async elevate(level: ElevatedLevel, options?: {
    reason?: string;
    duration?: number; // minutes
  }): Promise<boolean> {
    if (!this.config.enabled) {
      this.emit('error', { message: 'Elevated mode is disabled' });
      return false;
    }

    // Check if trying to elevate beyond current permissions
    const currentLevel = this.getCurrentLevel();
    if (this.compareLevels(level, 'admin') >= 0 && this.compareLevels(currentLevel, 'elevated') < 0) {
      // Requires confirmation for admin level
      if (this.config.requireConfirmation) {
        const confirmed = await this.requestConfirmation(level, options?.reason);
        if (!confirmed) {
          this.emit('elevate:denied', { level, reason: 'User denied confirmation' });
          return false;
        }
      }
    }

    const duration = options?.duration || this.config.sessionTimeout;
    const now = new Date();

    this.currentSession = {
      id: this.generateId('session'),
      level,
      startedAt: now,
      expiresAt: new Date(now.getTime() + duration * 60 * 1000),
      reason: options?.reason
    };

    this.saveToStorage();
    this.logAction('elevated.grant', level, true, `Elevated to ${level}`);
    this.emit('elevated', this.currentSession);

    // Auto-expire
    setTimeout(() => {
      if (this.currentSession?.id === this.currentSession?.id) {
        this.endSession();
      }
    }, duration * 60 * 1000);

    return true;
  }

  endSession(): void {
    if (this.currentSession) {
      const session = this.currentSession;
      this.currentSession = null;
      this.saveToStorage();
      this.logAction('elevated.revoke', session.level, true, 'Session ended');
      this.emit('session:ended', session);
    }
  }

  private async requestConfirmation(_level: ElevatedLevel, _reason?: string): Promise<boolean> {
    // In real implementation, would show confirmation dialog
    // For now, simulate auto-confirm
    return new Promise((resolve) => {
      this.emit('confirmation:requested', { level: _level, reason: _reason });
      // Auto-confirm after short delay (in real app, user would interact)
      setTimeout(() => resolve(true), 100);
    });
  }

  // Permission checking
  canPerform(action: string): boolean {
    // Check if action is blocked
    if (this.config.blockedActions.includes(action)) {
      return false;
    }

    // Get required level for action
    const requiredLevel = this.getRequiredLevel(action);
    const currentLevel = this.getCurrentLevel();

    return this.compareLevels(currentLevel, requiredLevel) >= 0;
  }

  getRequiredLevel(action: string): ElevatedLevel {
    // Check exact match
    if (ACTION_LEVELS[action]) {
      return ACTION_LEVELS[action];
    }

    // Check prefix match (e.g., 'file.' matches 'file.read')
    const prefix = action.split('.')[0] + '.';
    for (const [key, level] of Object.entries(ACTION_LEVELS)) {
      if (key.startsWith(prefix)) {
        return level;
      }
    }

    // Default to elevated for unknown actions
    return 'elevated';
  }

  private compareLevels(a: ElevatedLevel, b: ElevatedLevel): number {
    const order: ElevatedLevel[] = ['none', 'basic', 'elevated', 'admin'];
    return order.indexOf(a) - order.indexOf(b);
  }

  // Request permission
  async requestPermission(action: string, reason?: string): Promise<boolean> {
    const requiredLevel = this.getRequiredLevel(action);
    
    // If already have permission, approve immediately
    if (this.canPerform(action)) {
      return true;
    }

    const request: PermissionRequest = {
      id: this.generateId('request'),
      action,
      requiredLevel,
      requestedAt: new Date(),
      status: 'pending',
      reason
    };

    this.pendingRequests.set(request.id, request);
    this.emit('permission:requested', request);

    // Auto-elevate if confirmation succeeds
    const elevated = await this.elevate(requiredLevel, { reason });
    
    request.status = elevated ? 'approved' : 'denied';
    this.emit('permission:resolved', request);

    return elevated;
  }

  // Audit logging
  private logAction(action: string, level: ElevatedLevel, success: boolean, details?: string): void {
    if (!this.config.auditLog) return;

    const entry: AuditEntry = {
      id: this.generateId('audit'),
      action,
      level,
      success,
      timestamp: new Date(),
      details
    };

    this.auditLog.push(entry);

    // Trim old entries
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog.shift();
    }

    this.emit('audit:logged', entry);
  }

  getAuditLog(limit?: number): AuditEntry[] {
    const log = [...this.auditLog];
    return limit ? log.slice(-limit) : log;
  }

  clearAuditLog(): void {
    this.auditLog = [];
    this.emit('audit:cleared');
  }

  // Execute with permission check
  async executeWithPermission<T>(
    action: string,
    executor: () => T | Promise<T>,
    options?: { reason?: string }
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    if (!this.canPerform(action)) {
      const granted = await this.requestPermission(action, options?.reason);
      if (!granted) {
        this.logAction(action, this.getRequiredLevel(action), false, 'Permission denied');
        return { success: false, error: 'Permission denied' };
      }
    }

    try {
      const result = await executor();
      this.logAction(action, this.getCurrentLevel(), true);
      return { success: true, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logAction(action, this.getCurrentLevel(), false, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Stats
  getStats(): {
    currentLevel: ElevatedLevel;
    hasActiveSession: boolean;
    sessionExpiresIn: number | null;
    pendingRequests: number;
    auditEntries: number;
  } {
    const session = this.getSession();
    return {
      currentLevel: this.getCurrentLevel(),
      hasActiveSession: session !== null,
      sessionExpiresIn: session ? Math.max(0, session.expiresAt.getTime() - Date.now()) : null,
      pendingRequests: this.pendingRequests.size,
      auditEntries: this.auditLog.length
    };
  }
}

// Singleton
let elevatedModeInstance: ElevatedMode | null = null;

export function getElevatedMode(): ElevatedMode {
  if (!elevatedModeInstance) {
    elevatedModeInstance = new ElevatedMode();
  }
  return elevatedModeInstance;
}

export function resetElevatedMode(): void {
  if (elevatedModeInstance) {
    elevatedModeInstance.endSession();
    elevatedModeInstance.removeAllListeners();
    elevatedModeInstance = null;
  }
}

