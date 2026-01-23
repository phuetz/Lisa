/**
 * Structured Logger avec Pino
 * 
 * Fournit un logging structuré en JSON pour la production
 */

import type { Request, Response, NextFunction } from 'express';

// Logger simple en JSON (Pino n'est pas installé, on utilise une implémentation simple)
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  [key: string]: string | number | boolean | Record<string, unknown> | undefined;
}

class StructuredLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };

    // Afficher dans la console
    const color = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    }[level];
    const reset = '\x1b[0m';

    console.log(
      `${color}[${entry.timestamp}] [${level.toUpperCase()}]${reset} ${message}`,
      meta ? JSON.stringify(meta, null, 2) : ''
    );

    // Stocker en mémoire (limité)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.log('error', message, meta);
  }

  getLogs(level?: string, limit = 100): LogEntry[] {
    let filtered = this.logs;
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    return filtered.slice(-limit);
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new StructuredLogger();

/**
 * Middleware pour logger les requêtes HTTP
 */
export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const method = req.method;
  const path = req.path;
  const ip = req.ip;

  // Intercepter la fin de la réponse
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const level = statusCode >= 400 ? 'warn' : 'info';

    logger.log(level, `${method} ${path}`, {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

/**
 * Middleware pour logger les erreurs
 */
export function errorLogger(err: Error, req: Request, _res: Response, next: NextFunction) {
  logger.error('Request error', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    ip: req.ip,
  });

  next(err);
}

/**
 * Endpoint pour accéder aux logs
 */
export function logsEndpoint(req: Request, _res: Response) {
  const level = req.query.level as string | undefined;
  const limit = parseInt(req.query.limit as string) || 100;

  const logs = logger.getLogs(level, limit);

  _res.json({
    count: logs.length,
    logs,
  });
}

/**
 * Endpoint pour nettoyer les logs
 */
export function clearLogsEndpoint(_req: Request, _res: Response) {
  logger.clearLogs();
  _res.json({ message: 'Logs cleared' });
}
