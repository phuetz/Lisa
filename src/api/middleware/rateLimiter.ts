import rateLimit from 'express-rate-limit';

// Generic API rate limiter: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Trop de requêtes, veuillez réessayer plus tard.'
  }
});

// Auth-specific limiter: stricter to mitigate brute-force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Trop de tentatives de connexion, veuillez réessayer plus tard.'
  }
});
