import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { ApiResponse } from '../config.js';

// Extend the Express Request type to include the user payload from the JWT
export interface AuthenticatedRequest extends Request {
  user?: string | jwt.JwtPayload;
}

/**
 * Middleware to validate JWT tokens.
 * It checks for a token in the 'Authorization' header, verifies it, and
 * attaches the decoded user payload to the request object.
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Accès non autorisé: Jeton manquant',
    } as ApiResponse);
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT secret not configured on server (process.env.JWT_SECRET)');
    return res.status(500).json({ success: false, error: 'Configuration serveur manquante (JWT_SECRET)' } as ApiResponse);
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Jeton invalide ou expiré',
      } as ApiResponse);
    }
    req.user = user;
    next();
  });
};
