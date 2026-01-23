/**
 * Système de logs structuré pour l'audit du démarrage de l'application
 * Permet de tracer et diagnostiquer les problèmes de démarrage
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogCategory = 
  | 'startup' 
  | 'component' 
  | 'store' 
  | 'worker' 
  | 'api' 
  | 'render' 
  | 'effect'
  | 'performance';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  component?: string;
  message: string;
  data?: unknown;
  error?: Error;
  duration?: number;
}

class StartupLogger {
  private logs: LogEntry[] = [];
  private startTime: number = Date.now();
  private timers: Map<string, number> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Activer les logs en dev ou si explicitement demandé
    this.enabled = import.meta.env.DEV || localStorage.getItem('lisa:debug') === 'true';
    
    if (this.enabled) {
      console.log('%c[StartupLogger] Initialized', 'color: #00ff88; font-weight: bold');
    }
  }

  /**
   * Log un message avec niveau et catégorie
   */
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: unknown,
    component?: string
  ): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      component,
      message,
      data,
    };

    this.logs.push(entry);

    // Console output avec couleurs
    const color = this.getColorForLevel(level);
    const prefix = `[${category}${component ? `/${component}` : ''}]`;
    const elapsed = `+${(entry.timestamp - this.startTime).toFixed(0)}ms`;
    
    console.log(
      `%c${prefix} %c${elapsed} %c${message}`,
      `color: ${color}; font-weight: bold`,
      'color: #888',
      'color: inherit',
      data || ''
    );
  }

  /**
   * Démarrer un timer pour mesurer la durée
   */
  startTimer(name: string): void {
    if (!this.enabled) return;
    this.timers.set(name, Date.now());
  }

  /**
   * Arrêter un timer et logger la durée
   */
  endTimer(name: string, category: LogCategory, component?: string): number {
    if (!this.enabled) return 0;
    
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.log('warn', category, `Timer "${name}" not found`, undefined, component);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    this.log(
      'info',
      'performance',
      `${name} completed`,
      { duration: `${duration}ms` },
      component
    );

    return duration;
  }

  /**
   * Logger une erreur
   */
  error(
    category: LogCategory,
    message: string,
    error: Error | unknown,
    component?: string
  ): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: 'error',
      category,
      component,
      message,
      error: error instanceof Error ? error : new Error(String(error)),
    };

    this.logs.push(entry);

    console.error(
      `[${category}${component ? `/${component}` : ''}] ${message}`,
      error
    );
  }

  /**
   * Obtenir tous les logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Obtenir les logs filtrés
   */
  getLogsByCategory(category: LogCategory): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  /**
   * Obtenir un résumé des logs
   */
  getSummary(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<LogCategory, number>;
    errors: LogEntry[];
    warnings: LogEntry[];
    startupTime: number;
  } {
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
    };

    const byCategory: Record<LogCategory, number> = {
      startup: 0,
      component: 0,
      store: 0,
      worker: 0,
      api: 0,
      render: 0,
      effect: 0,
      performance: 0,
    };

    this.logs.forEach(log => {
      byLevel[log.level]++;
      byCategory[log.category]++;
    });

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      errors: this.logs.filter(log => log.level === 'error' || log.level === 'critical'),
      warnings: this.logs.filter(log => log.level === 'warn'),
      startupTime: Date.now() - this.startTime,
    };
  }

  /**
   * Exporter les logs en JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      summary: this.getSummary(),
      logs: this.logs,
    }, null, 2);
  }

  /**
   * Afficher le résumé dans la console
   */
  printSummary(): void {
    if (!this.enabled) return;

    const summary = this.getSummary();
    
    console.group('%c📊 Startup Logs Summary', 'color: #00ff88; font-weight: bold; font-size: 14px');
    console.log(`⏱️  Total startup time: ${summary.startupTime}ms`);
    console.log(`📝 Total logs: ${summary.total}`);
    console.log(`❌ Errors: ${summary.byLevel.error + summary.byLevel.critical}`);
    console.log(`⚠️  Warnings: ${summary.byLevel.warn}`);
    
    console.group('By Category:');
    Object.entries(summary.byCategory).forEach(([cat, count]) => {
      if (count > 0) {
        console.log(`  ${cat}: ${count}`);
      }
    });
    console.groupEnd();

    if (summary.errors.length > 0) {
      console.group('❌ Errors:');
      summary.errors.forEach(err => {
        console.error(`  [${err.component || err.category}] ${err.message}`, err.error);
      });
      console.groupEnd();
    }

    if (summary.warnings.length > 0) {
      console.group('⚠️  Warnings:');
      summary.warnings.forEach(warn => {
        console.warn(`  [${warn.component || warn.category}] ${warn.message}`, warn.data);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Nettoyer les logs
   */
  clear(): void {
    this.logs = [];
    this.timers.clear();
    this.startTime = Date.now();
    console.log('%c[StartupLogger] Logs cleared', 'color: #00ff88');
  }

  /**
   * Activer/désactiver les logs
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('lisa:debug', enabled ? 'true' : 'false');
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case 'debug': return '#888';
      case 'info': return '#00aaff';
      case 'warn': return '#ffaa00';
      case 'error': return '#ff4444';
      case 'critical': return '#ff0000';
      default: return '#fff';
    }
  }
}

// Instance singleton
export const startupLogger = new StartupLogger();

// Helpers pour faciliter l'utilisation
export const logStartup = (message: string, data?: unknown) => 
  startupLogger.log('info', 'startup', message, data);

export const logComponent = (component: string, message: string, data?: unknown) =>
  startupLogger.log('info', 'component', message, data, component);

export const logStore = (store: string, message: string, data?: unknown) =>
  startupLogger.log('info', 'store', message, data, store);

export const logWorker = (worker: string, message: string, data?: unknown) =>
  startupLogger.log('info', 'worker', message, data, worker);

export const logError = (category: LogCategory, message: string, error: Error | unknown, component?: string) =>
  startupLogger.error(category, message, error, component);

export const logPerformance = (name: string, duration: number) =>
  startupLogger.log('info', 'performance', `${name}: ${duration}ms`);

// Exposer globalement pour debug
if (typeof window !== 'undefined') {
  (window as any).startupLogger = startupLogger;
  (window as any).printStartupSummary = () => startupLogger.printSummary();
  (window as any).exportStartupLogs = () => {
    const logs = startupLogger.exportLogs();
    console.log(logs);
    return logs;
  };
}
