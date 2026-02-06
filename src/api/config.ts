/**
 * Configuration de l'API Lisa
 */

const corsOrigins = process.env.LISA_CORS_ORIGINS ? 
  process.env.LISA_CORS_ORIGINS.split(',').map(origin => origin.trim()) : 
  ['http://localhost:5180', 'http://localhost:5173', 'http://localhost:3000'];

const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    connectSrc: ["'self'", 'https:', 'http:', 'ws:', 'wss:', ...corsOrigins],
    imgSrc: ["'self'", 'data:', 'blob:'],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: [],
  },
} as const;

export const API_CONFIG = {
  featureFlags: {
    advancedVision: false, // Default to false, can be overridden by env variable
    advancedHearing: false, // Default to false, can be overridden by env variable
  },
  port: process.env.LISA_API_PORT || 3001,
  apiKey: process.env.LISA_API_KEY || 'dev-api-key-change-in-production',
  corsOrigins,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limite à 100 requêtes par fenêtre de 15 minutes
  },
  security: {
    forceHttps: process.env.LISA_FORCE_HTTPS === 'true',
    trustProxy: process.env.LISA_TRUST_PROXY === 'true',
    contentSecurityPolicy,
  },
  robot: {
    rosBridgeUrl: process.env.VITE_ROS_BRIDGE_URL || 'ws://localhost:9090',
    maxLinearVelocity: 1.0, // m/s
    maxAngularVelocity: 1.0, // rad/s
    commandTimeout: 5000 // ms
  }
};

/**
 * Types pour la configuration de l'API
 */
export interface ApiRequest {
  apiKey: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
