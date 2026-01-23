/**
 * Prometheus Metrics Middleware (prom-client)
 *
 * Collecte des métriques HTTP/DB prêtes pour Prometheus/Grafana
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
// prom-client ne fournit pas encore de types ESM ; types déclarés dans src/types/prom-client.d.ts
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

const register = new Registry();

collectDefaultMetrics({ register });

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
  registers: [register],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpErrorTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP requests resulting in error status codes (>=400)',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1],
  registers: [register],
});

const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries executed',
  labelNames: ['operation'],
  registers: [register],
});

/**
 * Middleware pour enregistrer les métriques HTTP
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const method = req.method;
  const route = req.route?.path ?? (req.baseUrl || req.originalUrl.split('?')[0] || 'unknown');
  const stopTimer = httpRequestDuration.startTimer({ method, route });

  res.on('finish', () => {
    const statusCode = res.statusCode.toString();
    stopTimer({ status_code: statusCode });
    const labels = { method, route, status_code: statusCode };
    httpRequestTotal.inc(labels);

    if (res.statusCode >= 400) {
      httpErrorTotal.inc(labels);
    }
  });

  next();
}

/**
 * Instrumentation manuelle des requêtes base de données
 */
export function recordDbQuery(operation: string, durationSeconds?: number) {
  if (typeof durationSeconds === 'number') {
    dbQueryDuration.labels(operation).observe(durationSeconds);
    dbQueryTotal.labels(operation).inc();
    return;
  }

  // Retourne une fonction helper pour mesurer automatiquement la durée
  const stopTimer = dbQueryDuration.startTimer({ operation });
  return () => {
    stopTimer();
    dbQueryTotal.labels(operation).inc();
  };
}

/**
 * Endpoint pour exposer les métriques au format Prometheus
 */
export async function metricsEndpoint(_req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
}

/**
 * Router pour les endpoints de métriques
 */
export const metricsRouter = Router();
metricsRouter.get('/metrics', metricsEndpoint);

/**
 * Obtenir les métriques actuelles au format JSON (debug)
 */
export async function getMetrics() {
  return register.getMetricsAsJSON();
}

export { register as metricsRegistry };
