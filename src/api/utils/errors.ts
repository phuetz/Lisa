/**
 * Système d'erreurs typées pour l'API Lisa
 * Inspiré du pattern ErrorCodes + errorShape() d'OpenClaw
 */

export const ErrorCodes = {
  // Auth
  AUTH_MISSING:       { status: 401, code: 'AUTH_MISSING', message: 'Jeton d\'authentification manquant' },
  AUTH_INVALID:       { status: 403, code: 'AUTH_INVALID', message: 'Jeton invalide ou expiré' },
  AUTH_EXPIRED:       { status: 403, code: 'AUTH_EXPIRED', message: 'Jeton expiré' },
  UNAUTHORIZED:       { status: 401, code: 'UNAUTHORIZED', message: 'Clé API invalide' },

  // Validation
  VALIDATION:         { status: 400, code: 'VALIDATION_FAILED', message: 'Erreur de validation' },
  INVALID_CONTENT:    { status: 415, code: 'INVALID_CONTENT_TYPE', message: 'Content-Type doit être application/json' },
  PAYLOAD_TOO_LARGE:  { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Charge utile trop volumineuse' },

  // Ressources
  NOT_FOUND:          { status: 404, code: 'NOT_FOUND', message: 'Ressource non trouvée' },
  AGENT_NOT_FOUND:    { status: 404, code: 'AGENT_NOT_FOUND', message: 'Agent non trouvé' },
  SESSION_NOT_FOUND:  { status: 404, code: 'SESSION_NOT_FOUND', message: 'Session non trouvée' },

  // Rate limit
  RATE_LIMITED:       { status: 429, code: 'RATE_LIMITED', message: 'Trop de requêtes', retryable: true },

  // Serveur
  INTERNAL:           { status: 500, code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
  UNAVAILABLE:        { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Service indisponible', retryable: true },
  CONFIG_MISSING:     { status: 500, code: 'CONFIG_MISSING', message: 'Configuration serveur manquante' },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

export interface ErrorShape {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryable?: boolean;
    retryAfterMs?: number;
  };
  requestId?: string;
  timestamp: string;
}

/**
 * Construit un objet d'erreur structuré
 */
export function apiError(
  code: ErrorCode,
  overrideMessage?: string,
  details?: unknown,
  options?: { retryAfterMs?: number; requestId?: string }
): ErrorShape {
  const def = ErrorCodes[code];
  return {
    success: false,
    error: {
      code: def.code,
      message: overrideMessage || def.message,
      details,
      retryable: 'retryable' in def ? def.retryable : undefined,
      retryAfterMs: options?.retryAfterMs,
    },
    requestId: options?.requestId,
    timestamp: new Date().toISOString(),
  };
}
