/**
 * Tests E2E - API
 * 
 * Tests pour les endpoints API
 */

import { test, expect } from '@playwright/test';

test.describe('API Health Checks', () => {
  test('should return health status', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('healthy');
  });

  test('should return detailed health status', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health/detailed');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('checks');
    expect(data.checks).toHaveProperty('database');
    expect(data.checks).toHaveProperty('memory');
    expect(data.checks).toHaveProperty('uptime');
  });

  test('should return readiness status', async ({ request }) => {
    const response = await request.get('http://localhost:3001/ready');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('ready');
    expect(data.ready).toBe(true);
  });

  test('should return liveness status', async ({ request }) => {
    const response = await request.get('http://localhost:3001/live');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('alive');
    expect(data.alive).toBe(true);
  });
});

test.describe('API Metrics', () => {
  test('should expose Prometheus metrics', async ({ request }) => {
    const response = await request.get('http://localhost:3001/metrics');
    
    expect(response.status()).toBe(200);
    
    const text = await response.text();
    expect(text).toContain('http_request_duration_seconds');
    expect(text).toContain('http_requests_total');
    expect(text).toContain('errors_total');
  });

  test('should have correct metrics format', async ({ request }) => {
    const response = await request.get('http://localhost:3001/metrics');
    
    const text = await response.text();
    
    // Vérifier le format Prometheus
    expect(text).toMatch(/# HELP/);
    expect(text).toMatch(/# TYPE/);
    expect(text).toMatch(/\{.*\}/); // Labels
  });
});

test.describe('API Logs', () => {
  test('should return logs', async ({ request }) => {
    const response = await request.get('http://localhost:3001/logs');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('logs');
    expect(Array.isArray(data.logs)).toBe(true);
  });

  test('should filter logs by level', async ({ request }) => {
    const response = await request.get('http://localhost:3001/logs?level=error');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('logs');
    
    // Tous les logs doivent être de niveau error
    data.logs.forEach((log: any) => {
      expect(log.level).toBe('error');
    });
  });

  test('should limit logs', async ({ request }) => {
    const response = await request.get('http://localhost:3001/logs?limit=5');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.logs.length).toBeLessThanOrEqual(5);
  });
});

test.describe('API Error Handling', () => {
  test('should return 404 for non-existent endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/nonexistent');
    
    expect(response.status()).toBe(404);
  });

  test('should return 401 for unauthorized access', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/agents');
    
    expect(response.status()).toBe(401);
  });

  test('should handle CORS correctly', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health', {
      headers: {
        'Origin': 'http://localhost:5173',
      },
    });
    
    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-origin']).toBeDefined();
  });
});
