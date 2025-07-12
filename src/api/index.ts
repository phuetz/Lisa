/**
 * Point d'entrée pour l'API de Lisa
 * 
 * Cette API permet à des applications externes (comme GPT Lisa)
 * d'accéder aux fonctionnalités de Lisa
 */
import dotenv from 'dotenv';
dotenv.config();

/**
 * Point d'entrée pour l'API de Lisa
 * 
 * Cette API permet à des applications externes (comme GPT Lisa)
 * d'accéder aux fonctionnalités de Lisa
 */
import { createServer } from './server.js';
import { API_CONFIG } from './config.js';

// Exporter les types nécessaires pour les clients de l'API
export type { ApiResponse } from './config.js';

try {
  const app = createServer();
  const port = API_CONFIG.port;

  if (!port) {
    throw new Error('Server port is not defined. Check your .env file for LISA_API_PORT.');
  }

  app.listen(port, () => {
    console.log(`🚀 Lisa API Server is running on http://localhost:${port}`);
    console.log(`🔑 JWT authentication is enabled on protected routes.`);
    console.log(`🕒 Current server time: ${new Date().toLocaleTimeString()}`);
    console.log(`🌐 CORS configured for: ${API_CONFIG.corsOrigins.join(', ')}`);
  });
} catch (error) {
  console.error('❌ Failed to start API server:', error);
  process.exit(1);
}
