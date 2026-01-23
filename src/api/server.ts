/**
 * Serveur API pour Lisa
 * 
 * Ce serveur expose les fonctionnalités de Lisa via une API REST
 * pour permettre à d'autres applications (comme GPT Lisa) d'y accéder
 */
import express from 'express';
import dotenv from 'dotenv';

// Charger les variables d'environnement - .env.local en priorité
dotenv.config({ path: '.env.local' });
dotenv.config();
import cors from 'cors';
import helmet, { type HelmetOptions } from 'helmet';
import bodyParser from 'body-parser';
import { API_CONFIG, type ApiResponse } from './config.js';
import { agentRoutes } from './routes/agentRoutes.js';
import { intentRoutes } from './routes/intentRoutes.js';
import { weatherRoutes } from './routes/weatherRoutes.js';
import { todoRoutes } from './routes/todoRoutes.js';
import { memoryRoutes } from './routes/memoryRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import robotRoutes from './routes/robotRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import aiProxyRoutes from './routes/aiProxy.js';
import bridgeRoutes from './routes/bridge.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import { authenticateToken } from './middleware/auth.js';
import { requestLogger, errorLogger } from './middleware/logger.js';
import { validateEnvironment } from './utils/envValidation.js';
import { metricsMiddleware, metricsRouter } from './middleware/prometheus.js';
import { httpLogger, errorLogger as structuredErrorLogger } from './middleware/structuredLogger.js';


// Initialisation du serveur
export const createServer = () => {
  // Valider les variables d'environnement au démarrage
  validateEnvironment();
  
  const app = express();

  if (API_CONFIG.security.trustProxy) {
    app.set('trust proxy', 1);
  }

  if (API_CONFIG.security.forceHttps) {
    app.use((req, res, next) => {
      const forwardedProto = req.headers['x-forwarded-proto'];
      if (req.secure || forwardedProto === 'https') {
        return next();
      }

      const host = req.headers.host;
      if (!host) {
        return res.status(400).json({ success: false, error: 'Missing host header' } as ApiResponse);
      }

      if (req.method === 'GET' || req.method === 'HEAD') {
        return res.redirect(301, `https://${host}${req.originalUrl}`);
      }

      return res.status(403).json({ success: false, error: 'HTTPS required' } as ApiResponse);
    });
  }

  // Middlewares de sécurité
  const helmetOptions: HelmetOptions = {
    contentSecurityPolicy: API_CONFIG.security.contentSecurityPolicy,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
  };
  app.use(helmet(helmetOptions));
  // Logging des requêtes
  app.use(requestLogger);
  app.use(httpLogger);
  // Metrics collection
  app.use(metricsMiddleware);
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
  // Routes de santé (health checks)
  app.use('/', healthRoutes);
  
  // Routes de métriques (Prometheus)
  app.use('/', metricsRouter);

  // Routes d'authentification (register, login)
  app.use('/api/auth', authRoutes);
  
  // Routes proxy AI (sécurisées)
  app.use('/api/proxy', aiProxyRoutes);

  // Routes du bridge AI (ChatGPT/Claude integration)
  // Note: Le bridge a son propre middleware d'authentification
  app.use('/api/bridge', bridgeRoutes);

  // --- Routes protégées ---
  // --- Routes protégées par JWT ---
  // Toutes les routes ci-dessous nécessitent un jeton JWT valide
  app.use('/api/agents', authenticateToken, agentRoutes);
  app.use('/api/intent', authenticateToken, intentRoutes);
  app.use('/api/weather', authenticateToken, weatherRoutes);
  app.use('/api/todos', authenticateToken, todoRoutes);
  app.use('/api/memory', authenticateToken, memoryRoutes);
  app.use('/api/robot', robotRoutes);
  
  // Handler d'erreur général avec logging
  app.use(errorLogger);
  app.use(structuredErrorLogger);
  app.use((_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    } as ApiResponse);
  });
  
  return app;
};


