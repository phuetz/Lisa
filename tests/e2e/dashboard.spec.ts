/**
 * E2E Tests - Dashboard Page
 * 
 * Tests complets pour la page Dashboard
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should load dashboard page successfully', async ({ page }) => {
    // Vérifier le titre
    await expect(page).toHaveTitle(/Lisa/);
    
    // Vérifier la présence des éléments principaux
    await expect(page.locator('h1')).toContainText('Tableau de Bord');
  });

  test('should display stats cards', async ({ page }) => {
    // Vérifier les cartes de statistiques
    await expect(page.locator('[data-testid="stat-agents"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-memory"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-perception"]')).toBeVisible();
  });

  test('should show agent activity', async ({ page }) => {
    // Vérifier la table d'activité des agents
    await expect(page.locator('[data-testid="agents-table"]')).toBeVisible();
    
    // Vérifier qu'il y a des lignes dans la table
    const rows = page.locator('[data-testid="agents-table"] tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should navigate to agents page', async ({ page }) => {
    // Cliquer sur le lien vers les agents
    await page.click('a[href="/agents"]');
    
    // Vérifier la navigation
    await expect(page).toHaveURL(/\/agents/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Test responsive mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Vérifier que le contenu est visible
    await expect(page.locator('h1')).toBeVisible();
  });
});
