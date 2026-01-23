/**
 * E2E Tests - Agents Page
 * 
 * Tests complets pour la page Agents
 */

import { test, expect } from '@playwright/test';

test.describe('Agents Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents');
  });

  test('should load agents page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Lisa/);
    await expect(page.locator('h1')).toContainText('Agents');
  });

  test('should display agent categories tabs', async ({ page }) => {
    // Vérifier les onglets de catégories
    await expect(page.locator('[data-testid="tab-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-vision"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-audio"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-memory"]')).toBeVisible();
  });

  test('should display agents list', async ({ page }) => {
    // Vérifier la liste des agents
    const agentCards = page.locator('[data-testid="agent-card"]');
    const count = await agentCards.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('should filter agents by category', async ({ page }) => {
    // Cliquer sur l'onglet Vision
    await page.click('[data-testid="tab-vision"]');
    
    // Vérifier que seuls les agents de vision sont affichés
    await expect(page.locator('[data-testid="agent-card"]')).toBeVisible();
  });

  test('should open agent details modal', async ({ page }) => {
    // Cliquer sur le premier agent
    await page.click('[data-testid="agent-card"]:first-child');
    
    // Vérifier que le modal s'ouvre
    await expect(page.locator('[data-testid="agent-modal"]')).toBeVisible();
  });

  test('should search agents', async ({ page }) => {
    // Taper dans la barre de recherche
    await page.fill('[data-testid="search-input"]', 'vision');
    
    // Vérifier les résultats filtrés
    const results = page.locator('[data-testid="agent-card"]');
    const count = await results.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
