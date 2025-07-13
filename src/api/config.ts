/**
 * Configuration de l'API Lisa
 */

export const API_CONFIG = {
  featureFlags: {
    advancedVision: false, // Default to false, can be overridden by env variable
    advancedHearing: false, // Default to false, can be overridden by env variable
  },
  port: process.env.LISA_API_PORT || 3001,
  apiKey: process.env.LISA_API_KEY || 'lisa-api-default-key', // À remplacer par une clé sécurisée en production
  corsOrigins: process.env.LISA_CORS_ORIGINS ? 
    process.env.LISA_CORS_ORIGINS.split(',') : 
    ['http://localhost:3000', 'https://chat.openai.com'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limite à 100 requêtes par fenêtre de 15 minutes
  }
};

/**
 * Types pour la configuration de l'API
 */
export interface ApiRequest {
  apiKey: string;
  action: string;
  params?: Record<string, any>;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}
