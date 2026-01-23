/**
 * E2E Tests - Vision Page
 * 
 * Tests complets pour la page Vision (MediaPipe)
 */

import { test, expect } from '@playwright/test';

test.describe('Vision Page', () => {
  test.beforeEach(async ({ page }) => {
    // Accorder les permissions caméra
    await page.context().grantPermissions(['camera']);
    await page.goto('/vision');
  });

  test('should load vision page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Lisa/);
    await expect(page.locator('h1')).toContainText('Vision');
  });

  test('should display MediaPipe models', async ({ page }) => {
    // Vérifier les cartes de modèles MediaPipe
    await expect(page.locator('[data-testid="model-face"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-hand"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-object"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-pose"]')).toBeVisible();
  });

  test('should display video preview', async ({ page }) => {
    // Vérifier la prévisualisation vidéo
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible();
  });

  test('should toggle model activation', async ({ page }) => {
    // Activer/désactiver un modèle
    const toggleButton = page.locator('[data-testid="toggle-face"]');
    await toggleButton.click();
    
    // Vérifier le changement d'état
    await expect(toggleButton).toHaveAttribute('aria-checked', 'true');
  });

  test('should display OCR panel', async ({ page }) => {
    // Vérifier le panel OCR
    await expect(page.locator('[data-testid="ocr-panel"]')).toBeVisible();
  });

  test('should upload image for OCR', async ({ page }) => {
    // Simuler l'upload d'une image
    const fileInput = page.locator('[data-testid="ocr-upload"]');
    await fileInput.setInputFiles('tests/fixtures/sample-image.jpg');
    
    // Vérifier que l'image est affichée
    await expect(page.locator('[data-testid="ocr-image"]')).toBeVisible();
  });
});
