/**
 * Validation des variables d'environnement au démarrage
 */

import { z } from 'zod';

const envSchema = z.object({
  // Base de données
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // Sécurité
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  LISA_API_KEY: z.string().min(16, 'LISA_API_KEY must be at least 16 characters'),
  
  // Configuration API
  LISA_API_PORT: z.string().regex(/^\d+$/, 'LISA_API_PORT must be a number').optional(),
  LISA_CORS_ORIGINS: z.string().optional(),
  LISA_FORCE_HTTPS: z.enum(['true', 'false']).optional(),
  LISA_TRUST_PROXY: z.enum(['true', 'false']).optional(),
  
  // ROS2
  VITE_ROS_BRIDGE_URL: z.string().url('VITE_ROS_BRIDGE_URL must be a valid WebSocket URL').optional(),
  
  // APIs externes (optionnelles)
  VITE_GOOGLE_CLIENT_ID: z.string().optional(),
  VITE_GOOGLE_API_KEY: z.string().optional(),
  VITE_OPENAI_API_KEY: z.string().optional(),
  VITE_PICOVOICE_ACCESS_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnvironment(): EnvConfig {
  try {
    const env = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.issues.forEach((issue) => {
        const path = issue.path.join('.') || 'root';
        console.error(`  - ${path}: ${issue.message}`);
      });
      
      console.error('\n📋 Required environment variables:');
      console.error('  - DATABASE_URL: PostgreSQL connection string');
      console.error('  - JWT_SECRET: Secure secret key (32+ chars)');
      console.error('  - LISA_API_KEY: API authentication key (16+ chars)');
      
      console.error('\n💡 Optional environment variables:');
      console.error('  - LISA_API_PORT: API server port (default: 3001)');
      console.error('  - LISA_CORS_ORIGINS: Allowed CORS origins');
      console.error('  - VITE_ROS_BRIDGE_URL: ROS Bridge WebSocket URL');
      console.error('  - VITE_GOOGLE_CLIENT_ID: Google OAuth client ID');
      console.error('  - VITE_GOOGLE_API_KEY: Google API key');
      console.error('  - VITE_OPENAI_API_KEY: OpenAI API key');
      console.error('  - VITE_PICOVOICE_ACCESS_KEY: Picovoice access key');
      console.error('  - LISA_FORCE_HTTPS: Force HTTPS redirect (true/false)');
      console.error('  - LISA_TRUST_PROXY: Trust reverse proxy for secure detection (true/false)');
      
      process.exit(1);
    }
    throw error;
  }
}

export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}
