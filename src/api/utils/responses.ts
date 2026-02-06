/**
 * Helpers de réponse centralisés pour l'API Lisa
 * Inspiré des patterns sendJson/sendError d'OpenClaw
 */

import type { Response } from 'express';
import { ErrorCodes, apiError, type ErrorCode } from './errors.js';

/**
 * Réponse JSON standard (succès)
 */
export function sendJson<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Réponse d'erreur structurée
 */
export function sendError(
  res: Response,
  code: ErrorCode,
  overrideMessage?: string,
  details?: unknown,
): void {
  const def = ErrorCodes[code];
  res.status(def.status).json(apiError(code, overrideMessage, details));
}

/**
 * Réponse 201 Created
 */
export function sendCreated<T>(res: Response, data: T): void {
  sendJson(res, data, 201);
}

/**
 * Réponse 204 No Content
 */
export function sendNoContent(res: Response): void {
  res.status(204).end();
}

/**
 * Prépare les headers SSE pour le streaming
 */
export function sendStreamHeaders(res: Response, extraHeaders?: Record<string, string>): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      res.setHeader(key, value);
    }
  }
}
