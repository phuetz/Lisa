/**
 * Middleware de correlation ID pour le tracing des requêtes
 * Inspiré du pattern OpenClaw
 */

import type { Request, Response, NextFunction } from 'express';
import { generateRequestId } from '../utils/crypto.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Attache un ID unique à chaque requête.
 * Propage le header X-Request-Id s'il existe, sinon en génère un.
 */
export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || generateRequestId();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
