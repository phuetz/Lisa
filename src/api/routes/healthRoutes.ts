/**
 * Health Check Routes avec cache
 * Inspiré du pattern OpenClaw (cached snapshots + probe mode)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { sendJson, sendError } from '../utils/responses.js';

const router = Router();

// --- Health cache (10s TTL) ---
interface HealthSnapshot {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  details: Record<string, unknown>;
  cachedAt: number;
}

let cachedHealth: HealthSnapshot | null = null;
const CACHE_TTL_MS = 10_000;

async function probeHealth(): Promise<HealthSnapshot> {
  const checks: Record<string, boolean> = {
    database: false,
    memory: false,
    uptime: false,
  };

  const details: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  };

  // Check base de données
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    details.databaseError = error instanceof Error ? error.message : 'Unknown error';
  }

  // Check mémoire (alerte si > 90%)
  const mem = process.memoryUsage();
  checks.memory = mem.heapUsed < mem.heapTotal * 0.9;
  details.memory = {
    used: Math.round(mem.heapUsed / 1024 / 1024),
    total: Math.round(mem.heapTotal / 1024 / 1024),
  };

  // Check uptime (au moins 10s)
  checks.uptime = process.uptime() > 10;

  const allHealthy = Object.values(checks).every(v => v);
  const criticalFailed = !checks.memory;

  return {
    status: allHealthy ? 'healthy' : criticalFailed ? 'unhealthy' : 'degraded',
    checks,
    details,
    cachedAt: Date.now(),
  };
}

async function getHealth(forceRefresh = false): Promise<HealthSnapshot> {
  if (!forceRefresh && cachedHealth && (Date.now() - cachedHealth.cachedAt) < CACHE_TTL_MS) {
    return cachedHealth;
  }
  cachedHealth = await probeHealth();
  return cachedHealth;
}

// --- Routes ---

/**
 * Health check basique (avec cache)
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await getHealth();
    const status = health.status === 'unhealthy' ? 503 : 200;
    res.status(status).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: health.details.memory,
      database: health.checks.database ? 'connected' : 'disconnected',
      version: '1.0.0',
    });
  } catch (error) {
    sendError(res, 'UNAVAILABLE', error instanceof Error ? error.message : 'Health check failed');
  }
});

/**
 * Health check détaillé (force refresh)
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  try {
    const health = await getHealth(true);
    const status = health.status === 'unhealthy' ? 503 : 200;
    res.status(status).json({
      status: health.status,
      checks: health.checks,
      details: health.details,
    });
  } catch (error) {
    sendError(res, 'UNAVAILABLE', error instanceof Error ? error.message : 'Health check failed');
  }
});

/**
 * Readiness check (prêt à recevoir du trafic)
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendJson(res, { ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * Liveness check (l'application est vivante)
 */
router.get('/live', (_req: Request, res: Response) => {
  sendJson(res, { alive: true });
});

export default router;
