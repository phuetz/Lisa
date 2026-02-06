/**
 * Point d'entrée pour l'API de Lisa
 *
 * Cette API permet à des applications externes (comme GPT Lisa)
 * d'accéder aux fonctionnalités de Lisa
 */
import dotenv from 'dotenv';
dotenv.config();

import { createServer } from './server.js';
import { API_CONFIG } from './config.js';
import { logger } from './middleware/logger.js';
import { prisma } from './utils/prisma.js';
import { validateEnvironment } from './utils/envValidation.js';

// Exporter les types nécessaires pour les clients de l'API
export type { ApiResponse } from './config.js';

// --- Validation d'environnement ---
if (process.env.NODE_ENV === 'production') {
  validateEnvironment();
} else {
  try {
    validateEnvironment();
  } catch {
    logger.warn('Environment validation failed (dev mode, continuing anyway)');
  }
}

try {
  const app = createServer();
  const port = API_CONFIG.port;

  if (!port) {
    throw new Error('Server port is not defined. Check your .env file for LISA_API_PORT.');
  }

  const server = app.listen(port, () => {
    logger.info(`Lisa API Server started`, {
      url: `http://localhost:${port}`,
      port: port as number,
    });
    logger.info(`CORS configured for: ${API_CONFIG.corsOrigins.join(', ')}`);
  });

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    server.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      await prisma.$disconnect();
      logger.info('Database connections closed');
    } catch {
      // Ignore disconnect errors during shutdown
    }

    // Timeout de sécurité pour les requêtes en cours
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

} catch (error) {
  logger.error('Failed to start API server', error);
  process.exit(1);
}
