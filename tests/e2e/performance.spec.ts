/**
 * E2E Tests - Performance
 * 
 * Tests de performance et métriques Web Vitals
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load dashboard within 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });

  test('should have good Lighthouse scores', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Vérifier les métriques de performance
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });
    
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1500);
    expect(performanceMetrics.loadComplete).toBeLessThan(2000);
  });

  test('should lazy load pages', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Naviguer vers une autre page
    await page.click('a[href="/agents"]');
    
    // Vérifier que la page se charge rapidement
    await expect(page.locator('h1')).toContainText('Agents', { timeout: 1000 });
  });

  test('should have efficient bundle size', async ({ page }) => {
    await page.goto('/');
    const resources = await page.evaluate(() =>
      performance.getEntriesByType('resource')
        .filter((entry): entry is PerformanceResourceTiming => entry.entryType === 'resource')
        .map((r) => ({
          name: r.name,
          size: r.transferSize,
        }))
    );
    
    const totalSize = resources.reduce((sum, r) => sum + (r.size || 0), 0);
    
    // Vérifier que le bundle total est raisonnable (<5MB)
    expect(totalSize).toBeLessThan(5 * 1024 * 1024);
  });

  test('should render components quickly', async ({ page }) => {
    await page.goto('/dashboard');
    
    const startTime = Date.now();
    await page.locator('[data-testid="stat-agents"]').waitFor();
    const renderTime = Date.now() - startTime;
    
    expect(renderTime).toBeLessThan(500);
  });
});
