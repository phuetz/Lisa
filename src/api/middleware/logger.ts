/**
 * Logger structuré pour l'API Lisa
 * Singleton avec redaction des données sensibles et support correlation ID
 * Inspiré des patterns OpenClaw (subsystem loggers, redaction)
 */

import { type Request, type Response, type NextFunction } from 'express';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  subsystem?: string;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  error?: unknown;
  [key: string]: unknown;
}

/**
 * Patterns de données sensibles à masquer dans les logs
 */
const SENSITIVE_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  { regex: /Bearer\s+[\w\-._~+/]+=*/gi, replacement: 'Bearer [REDACTED]' },
  { regex: /eyJ[\w\-._]+/g, replacement: '[JWT_REDACTED]' },
];

function redactSensitive(input: string): string {
  let result = input;
  for (const { regex, replacement } of SENSITIVE_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

class Logger {
  private static instance: Logger;
  private subsystemName: string | undefined;

  constructor(subsystem?: string) {
    this.subsystemName = subsystem;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Crée un sous-logger avec un préfixe de sous-système
   */
  child(subsystem: string): Logger {
    return new Logger(subsystem);
  }

  private formatLog(entry: LogEntry): string {
    return redactSensitive(JSON.stringify({
      ...entry,
      subsystem: this.subsystemName || entry.subsystem,
      timestamp: new Date().toISOString()
    }));
  }

  info(message: string, meta?: Partial<LogEntry>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...meta
    };
    console.log(this.formatLog(entry));
  }

  warn(message: string, meta?: Partial<LogEntry>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...meta
    };
    console.warn(this.formatLog(entry));
  }

  error(message: string, error?: unknown, meta?: Partial<LogEntry>): void {
    const errorValue = error instanceof Error ? error.stack : error;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: errorValue,
      ...meta
    };
    console.error(this.formatLog(entry));
  }

  debug(message: string, meta?: Partial<LogEntry>): void {
    if (process.env.NODE_ENV === 'development') {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        ...meta
      };
      console.debug(this.formatLog(entry));
    }
  }
}

export const logger = Logger.getInstance();

/**
 * Middleware de logging des requêtes HTTP
 * Inclut le requestId pour le tracing
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId,
    userId: (req as { user?: { userId?: string } }).user?.userId
  });

  const originalEnd = res.end.bind(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).end = function(chunk?: unknown, encoding?: BufferEncoding) {
    const responseTime = Date.now() - startTime;

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      requestId: req.requestId,
      userId: (req as { user?: { userId?: string } }).user?.userId
    });

    return originalEnd(chunk, encoding as BufferEncoding);
  };

  next();
};

/**
 * Middleware de gestion des erreurs avec logging
 */
export const errorLogger = (err: Error, req: Request, _res: Response, next: NextFunction) => {
  logger.error('Request error', err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    requestId: req.requestId,
    userId: (req as { user?: { userId?: string } }).user?.userId
  });

  next(err);
};
