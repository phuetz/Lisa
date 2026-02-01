/**
 * Middleware de logging structuré pour l'API Lisa
 */

import { type Request, type Response, type NextFunction } from 'express';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  error?: unknown;
}

class Logger {
  private static instance: Logger;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString()
    });
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
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log de la requête entrante
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as { user?: { userId?: string } }).user?.userId
  });

  // Override de res.end pour capturer la réponse
  const originalEnd = res.end.bind(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).end = function(chunk?: unknown, encoding?: BufferEncoding) {
    const responseTime = Date.now() - startTime;
    
    // Log de la réponse
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      userId: (req as { user?: { userId?: string } }).user?.userId
    });

    // Appeler la méthode originale
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
    userId: (req as { user?: { userId?: string } }).user?.userId
  });

  next(err);
};
