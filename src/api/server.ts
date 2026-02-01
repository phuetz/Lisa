/**
 * Serveur API pour Lisa
 * 
 * Ce serveur expose les fonctionnalités de Lisa via une API REST
 * pour permettre à d'autres applications (comme GPT Lisa) d'y accéder
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { API_CONFIG, type ApiResponse } from './config.js';
import { agentRoutes } from './routes/agentRoutes.js';
import { intentRoutes } from './routes/intentRoutes.js';
import { weatherRoutes } from './routes/weatherRoutes.js';
import { todoRoutes } from './routes/todoRoutes.js';
import { memoryRoutes } from './routes/memoryRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import { authenticateToken } from './middleware/auth.js';


// Initialisation du serveur
export const createServer = () => {
  const app = express();
  
  // Middlewares de sécurité
  app.use(helmet());
  // Rate limiting
  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);
  app.use(cors({
    origin: API_CONFIG.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization']
  }));
  app.use(bodyParser.json());
  
  // --- Routes publiques ---
  // Route de santé (health check)
  app.get('/health', (_req: express.Request, res: express.Response) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    } as ApiResponse);
  });

  // Routes d'authentification (register, login)
  app.use('/api/auth', authRoutes);

  // --- Routes protégées ---
  // --- Routes protégées par JWT ---
  // Toutes les routes ci-dessous nécessitent un jeton JWT valide
  app.use('/api/agents', authenticateToken, agentRoutes);
  app.use('/api/intent', authenticateToken, intentRoutes);
  app.use('/api/weather', authenticateToken, weatherRoutes);
  app.use('/api/todos', authenticateToken, todoRoutes);
  app.use('/api/memory', authenticateToken, memoryRoutes);
  
  // Handler d'erreur général
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Erreur API:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    } as ApiResponse);
  });
  
  return app;
};


