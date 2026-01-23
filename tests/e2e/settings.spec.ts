/**
 * E2E Tests - Settings Page
 * 
 * Tests complets pour la page Settings
 */

import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should load settings page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Lisa/);
    await expect(page.locator('h1')).toContainText('Paramètres');
  });

  test('should display settings tabs', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-general"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-appearance"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-models"]')).toBeVisible();
  });

  test('should update general settings', async ({ page }) => {
    // Modifier un paramètre
    await page.fill('[data-testid="setting-name"]', 'Lisa Test');
    
    // Sauvegarder
    await page.click('[data-testid="save-settings"]');
    
    // Vérifier la sauvegarde
    await expect(page.locator('[data-testid="save-toast"]')).toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    const darkModeToggle = page.locator('[data-testid="toggle-dark-mode"]');
    await darkModeToggle.click();
    
    // Vérifier le changement de thème
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should configure MediaPipe models', async ({ page }) => {
    // Aller dans l'onglet modèles
    await page.click('[data-testid="tab-models"]');
    
    // Vérifier les options de configuration
    await expect(page.locator('[data-testid="model-config"]')).toBeVisible();
  });
});
