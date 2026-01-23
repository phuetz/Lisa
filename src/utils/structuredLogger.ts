/**
 * Système de logging structuré pour remplacer console.log
 * Permet un logging professionnel avec niveaux, contexte et filtrage
 */

export const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
} as const;
export type LogLevel = typeof LOG_LEVEL[keyof typeof LOG_LEVEL];
const levelNames: Record<number, string> = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR',
  4: 'FATAL',
};

export interface LogContext {
  component?: string;
  agent?: string;
  hook?: string;
  service?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context?: LogContext;
  error?: Error;
  data?: unknown;
}

class StructuredLogger {
  private static instance: StructuredLogger;
  private minLevel: LogLevel = LOG_LEVEL.INFO;
  private isProduction: boolean = import.meta.env.PROD;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor() {
    // Singleton
    if (this.isProduction) {
      this.minLevel = LOG_LEVEL.WARN; // En production, seulement WARN et plus
    } else {
      this.minLevel = LOG_LEVEL.DEBUG; // En dev, tout logger
    }
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    data?: unknown
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      levelName: levelNames[level] ?? String(level),
      message,
      context,
      error,
      data,
    };
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    // Stocker dans l'historique
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Supprimer le plus ancien
    }

    // Logger dans la console en dev
    if (!this.isProduction) {
      this.logToConsole(entry);
    }

    // En production, envoyer à un service de monitoring
    if (this.isProduction && entry.level >= LOG_LEVEL.ERROR) {
      this.sendToMonitoring(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.levelName}]`;
    const contextStr = entry.context ? ` [${JSON.stringify(entry.context)}]` : '';
    const fullMessage = `${prefix}${contextStr} ${entry.message}`;

    switch (entry.level) {
      case LOG_LEVEL.DEBUG:
        console.debug(fullMessage, entry.data);
        break;
      case LOG_LEVEL.INFO:
        console.info(fullMessage, entry.data);
        break;
      case LOG_LEVEL.WARN:
        console.warn(fullMessage, entry.data);
        break;
      case LOG_LEVEL.ERROR:
      case LOG_LEVEL.FATAL:
        console.error(fullMessage, entry.error || entry.data);
        break;
    }
  }

  private sendToMonitoring(_entry: LogEntry): void {
    // TODO: Intégrer avec Sentry, DataDog, etc.
    // Pour l'instant, juste stocker
    try {
      // Exemple: envoyer à une API de monitoring
      // fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry),
      // });
    } catch (error) {
      // Ne pas crasher si le monitoring échoue
      console.error('Failed to send log to monitoring:', error);
    }
  }

  debug(message: string, context?: LogContext, data?: unknown): void {
    this.log(this.createEntry(LOG_LEVEL.DEBUG, message, context, undefined, data));
  }

  info(message: string, context?: LogContext, data?: unknown): void {
    this.log(this.createEntry(LOG_LEVEL.INFO, message, context, undefined, data));
  }

  warn(message: string, context?: LogContext, data?: unknown): void {
    this.log(this.createEntry(LOG_LEVEL.WARN, message, context, undefined, data));
  }

  error(message: string, error?: Error, context?: LogContext, data?: unknown): void {
    this.log(this.createEntry(LOG_LEVEL.ERROR, message, context, error, data));
  }

  fatal(message: string, error?: Error, context?: LogContext, data?: unknown): void {
    this.log(this.createEntry(LOG_LEVEL.FATAL, message, context, error, data));
  }

  // Méthodes utilitaires
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  getStats(): {
    total: number;
    byLevel: Record<string, number>;
  } {
    const byLevel: Record<string, number> = {};
    
    this.logs.forEach(log => {
      const levelName = levelNames[log.level] ?? String(log.level);
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;
    });

    return {
      total: this.logs.length,
      byLevel,
    };
  }
}

// Export singleton instance
export const logger = StructuredLogger.getInstance();

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext, data?: unknown) => 
    logger.debug(message, context, data),
  
  info: (message: string, context?: LogContext, data?: unknown) => 
    logger.info(message, context, data),
  
  warn: (message: string, context?: LogContext, data?: unknown) => 
    logger.warn(message, context, data),
  
  error: (message: string, error?: Error, context?: LogContext, data?: unknown) => 
    logger.error(message, error, context, data),
  
  fatal: (message: string, error?: Error, context?: LogContext, data?: unknown) => 
    logger.fatal(message, error, context, data),
};

// Helper pour créer un logger avec contexte pré-rempli
export function createLogger(defaultContext: LogContext) {
  return {
    debug: (message: string, data?: unknown) => 
      logger.debug(message, defaultContext, data),
    
    info: (message: string, data?: unknown) => 
      logger.info(message, defaultContext, data),
    
    warn: (message: string, data?: unknown) => 
      logger.warn(message, defaultContext, data),
    
    error: (message: string, error?: Error, data?: unknown) => 
      logger.error(message, error, defaultContext, data),
    
    fatal: (message: string, error?: Error, data?: unknown) => 
      logger.fatal(message, error, defaultContext, data),
  };
}

// Export default
export default logger;
