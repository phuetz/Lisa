/**
 * E2E Tests - Workflows Page
 * 
 * Tests complets pour la page Workflows
 */

import { test, expect } from '@playwright/test';

test.describe('Workflows Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workflows');
  });

  test('should load workflows page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Lisa/);
    await expect(page.locator('h1')).toContainText('Workflows');
  });

  test('should display workflows list', async ({ page }) => {
    await expect(page.locator('[data-testid="workflows-list"]')).toBeVisible();
  });

  test('should create new workflow', async ({ page }) => {
    // Cliquer sur créer un workflow
    await page.click('[data-testid="create-workflow"]');
    
    // Vérifier le modal de création
    await expect(page.locator('[data-testid="workflow-modal"]')).toBeVisible();
    
    // Remplir le formulaire
    await page.fill('[data-testid="workflow-name"]', 'Test Workflow');
    await page.fill('[data-testid="workflow-description"]', 'Workflow de test');
    
    // Soumettre
    await page.click('[data-testid="submit-workflow"]');
  });

  test('should display workflow editor', async ({ page }) => {
    // Cliquer sur éditer un workflow
    await page.click('[data-testid="edit-workflow"]:first-child');
    
    // Vérifier l'éditeur de workflow
    await expect(page.locator('[data-testid="workflow-editor"]')).toBeVisible();
  });

  test('should execute workflow', async ({ page }) => {
    // Cliquer sur exécuter
    await page.click('[data-testid="execute-workflow"]:first-child');
    
    // Vérifier l'exécution
    await expect(page.locator('[data-testid="workflow-status"]')).toContainText('En cours');
  });
});
