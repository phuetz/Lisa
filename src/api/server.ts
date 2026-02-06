/**
 * Serveur API pour Lisa — Modernisé
 *
 * Middleware chain:
 *   correlationId → requestLogger → helmet → rateLimit → cors
 *   → json(limit:256kb) → sanitizeInputs → metricsMiddleware
 *   → routes → errorLogger → errorHandler
 *
 * Inspiré des patterns OpenClaw (typed errors, structured logging, response helpers)
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { API_CONFIG } from './config.js';

// Middleware
import { correlationId } from './middleware/correlationId.js';
import { requestLogger, errorLogger, logger } from './middleware/logger.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import { sanitizeInputs } from './middleware/security.js';
import { metricsMiddleware, metricsRouter } from './middleware/prometheus.js';
import { authenticateToken } from './middleware/auth.js';

// Routes
import { agentRoutes } from './routes/agentRoutes.js';
import { intentRoutes } from './routes/intentRoutes.js';
import { weatherRoutes } from './routes/weatherRoutes.js';
import { todoRoutes } from './routes/todoRoutes.js';
import { memoryRoutes } from './routes/memoryRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import robotRoutes from './routes/robotRoutes.js';
import aiProxy from './routes/aiProxy.js';
import llmProxy from './routes/llmProxy.js';
import bridgeRoutes from './routes/bridge.js';

// Utils
import { sendError } from './utils/responses.js';

export const createServer = () => {
  const app = express();

  // --- Tracing & Observability ---
  app.use(correlationId);
  app.use(requestLogger);
  app.use(metricsMiddleware);

  // --- Sécurité ---
  app.use(helmet());
  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);
  app.use(cors({
    origin: API_CONFIG.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'x-lisa-api-key', 'Authorization', 'X-Request-Id']
  }));

  // --- Body parsing avec limite (pattern OpenClaw: 256kb) ---
  app.use(express.json({ limit: '256kb' }));
  app.use(sanitizeInputs);

  // --- Routes publiques ---
  app.use('/', healthRoutes);           // /health, /health/detailed, /ready, /live
  app.use(metricsRouter);               // GET /metrics (Prometheus)
  app.use('/api/auth', authRoutes);      // register, login

  // --- Routes protégées par JWT ---
  app.use('/api/agents', authenticateToken, agentRoutes);
  app.use('/api/intent', authenticateToken, intentRoutes);
  app.use('/api/weather', authenticateToken, weatherRoutes);
  app.use('/api/todos', authenticateToken, todoRoutes);
  app.use('/api/memory', authenticateToken, memoryRoutes);
  app.use('/api/robot', robotRoutes);    // Auth intégrée dans le routeur
  app.use('/api/ai', aiProxy);           // Auth conditionnelle (prod/dev)
  app.use('/api/llm', llmProxy);         // Auth conditionnelle (prod/dev)

  // --- Bridge API (auth par clé API) ---
  app.use('/api/bridge', bridgeRoutes);

  // --- Error handling ---
  app.use(errorLogger);
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', err);
    sendError(
      res,
      'INTERNAL',
      process.env.NODE_ENV === 'development' ? err.message : undefined
    );
  });

  return app;
};
