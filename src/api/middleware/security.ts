/**
 * Security Middleware
 * 
 * Middleware pour renforcer la sécurité de l'application
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Force HTTPS en production
 */
export function forceHttps(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
  }
  next();
}

/**
 * Configure les headers de sécurité stricts
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  // Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https: wss:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );

  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  next();
}

/**
 * Valide les headers de sécurité
 */
export function validateSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Vérifier la présence du header Authorization pour les routes protégées
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/auth')) {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({
        error: 'Missing Authorization header',
      });
    }
  }

  next();
}

/**
 * Prévient les attaques CSRF
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Vérifier que les méthodes dangereuses utilisent les bonnes origins
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.header('Origin');
    const referer = req.header('Referer');

    // Vérifier que la requête vient d'une origin autorisée
    const allowedOrigins = process.env.LISA_CORS_ORIGINS?.split(',') || ['http://localhost:5173'];

    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({
        error: 'CSRF validation failed',
      });
    }

    if (referer) {
      if (!allowedOrigins.some(o => referer.startsWith(o))) {
        return res.status(403).json({
          error: 'CSRF validation failed',
        });
      }
    }
  }

  next();
}

/**
 * Valide les types de contenu
 */
export function validateContentType(req: Request, res: Response, next: NextFunction) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.header('Content-Type');

    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        error: 'Content-Type must be application/json',
      });
    }
  }

  next();
}

/**
 * Limite la taille des requêtes
 */
export function limitRequestSize(maxSize = '10kb') {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.header('Content-Length') || '0');
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Payload too large',
      });
    }

    next();
  };
}

/**
 * Parse une taille (ex: "10kb" -> 10240)
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 10 * 1024; // Default 10kb

  const value = parseInt(match[1]);
  const unit = match[2] || 'b';

  return value * (units[unit] || 1);
}

/**
 * Sanitize les inputs
 */
export function sanitizeInputs(req: Request, _res: Response, next: NextFunction) {
  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      const value = req.query[key];
      if (typeof value === 'string') {
        // Supprimer les caractères dangereux
        req.query[key] = value
          .replace(/[<>]/g, '')
          .substring(0, 1000); // Limiter la longueur
      }
    }
  }

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
}

/**
 * Sanitize récursivement un objet
 */
function sanitizeObject(obj: Record<string, unknown>): void {
  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'string') {
      obj[key] = value
        .replace(/[<>]/g, '')
        .substring(0, 10000); // Limiter la longueur
    } else if (typeof value === 'object' && value !== null) {
      sanitizeObject(value as Record<string, unknown>);
    }
  }
}
