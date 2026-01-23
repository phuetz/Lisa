/**
 * E2E Tests - Audio Page
 * 
 * Tests complets pour la page Audio
 */

import { test, expect } from '@playwright/test';

test.describe('Audio Page', () => {
  test.beforeEach(async ({ page }) => {
    // Accorder les permissions microphone
    await page.context().grantPermissions(['microphone']);
    await page.goto('/audio');
  });

  test('should load audio page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Lisa/);
    await expect(page.locator('h1')).toContainText('Audio');
  });

  test('should display audio classifier', async ({ page }) => {
    await expect(page.locator('[data-testid="audio-classifier"]')).toBeVisible();
  });

  test('should display speech synthesis panel', async ({ page }) => {
    await expect(page.locator('[data-testid="speech-synthesis"]')).toBeVisible();
  });

  test('should start/stop audio classification', async ({ page }) => {
    const startButton = page.locator('[data-testid="start-classification"]');
    await startButton.click();
    
    // Vérifier que la classification a démarré
    await expect(page.locator('[data-testid="classification-status"]')).toContainText('En cours');
    
    // Arrêter
    const stopButton = page.locator('[data-testid="stop-classification"]');
    await stopButton.click();
  });

  test('should synthesize speech', async ({ page }) => {
    // Entrer du texte
    await page.fill('[data-testid="speech-text"]', 'Bonjour, je suis Lisa');
    
    // Cliquer sur le bouton de synthèse
    await page.click('[data-testid="synthesize-button"]');
    
    // Vérifier que la synthèse a démarré
    await expect(page.locator('[data-testid="speech-status"]')).toContainText('Lecture');
  });

  test('should display wake word detection', async ({ page }) => {
    await expect(page.locator('[data-testid="wake-word"]')).toBeVisible();
  });
});
