/**
 * Health Check Routes
 * 
 * Fournit des endpoints pour vérifier la santé de l'application
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

/**
 * Health check basique
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    // Vérifier la base de données
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      database: 'connected',
      version: '1.0.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Health check détaillé
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  const checks = {
    database: false,
    memory: false,
    uptime: false,
  };

  const details: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  // Vérifier la base de données
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    details.databaseError = error instanceof Error ? error.message : 'Unknown error';
  }

  // Vérifier la mémoire
  const heapUsed = process.memoryUsage().heapUsed;
  const heapTotal = process.memoryUsage().heapTotal;
  checks.memory = heapUsed < heapTotal * 0.9; // Alerte si > 90%

  // Vérifier l'uptime
  checks.uptime = process.uptime() > 60; // Au moins 1 minute

  const allHealthy = Object.values(checks).every(v => v);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    details,
  });
});

/**
 * Readiness check (prêt à recevoir du trafic)
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * Liveness check (l'application est vivante)
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({ alive: true });
});

export default router;
