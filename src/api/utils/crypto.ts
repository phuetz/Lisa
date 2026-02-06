/**
 * Utilitaires cryptographiques pour l'API Lisa
 */

import crypto from 'node:crypto';

/**
 * Comparaison timing-safe de deux chaînes (prévient les attaques par timing)
 * Inspiré du pattern OpenClaw
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf-8'), Buffer.from(b, 'utf-8'));
}

/**
 * Génère un ID unique pour le tracing des requêtes
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}
