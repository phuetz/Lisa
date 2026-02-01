import { test, expect } from '@playwright/test';

/**
 * Dashboard Page E2E Tests
 * Tests for the main dashboard functionality
 */

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should render dashboard title', async ({ page }) => {
    // Check page title is visible
    const title = page.locator('text=Dashboard');
    await expect(title.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display stat cards', async ({ page }) => {
    // Check for stat cards
    const totalAgentsCard = page.locator('text=Total Agents');
    await expect(totalAgentsCard).toBeVisible({ timeout: 10000 });

    const activeAgentsCard = page.locator('text=Agents Actifs');
    await expect(activeAgentsCard).toBeVisible();

    const tasksCompletedCard = page.locator('text=Taches Completees');
    await expect(tasksCompletedCard).toBeVisible();

    const successRateCard = page.locator('text=Taux de Succes');
    await expect(successRateCard).toBeVisible();
  });

  test('should display quick actions section', async ({ page }) => {
    const quickActionsTitle = page.locator('text=Actions Rapides');
    await expect(quickActionsTitle).toBeVisible({ timeout: 10000 });

    // Check quick action buttons
    const visionButton = page.locator('button:has-text("Vision")');
    await expect(visionButton).toBeVisible();

    const audioButton = page.locator('button:has-text("Audio")');
    await expect(audioButton).toBeVisible();

    const workflowsButton = page.locator('button:has-text("Workflows")');
    await expect(workflowsButton).toBeVisible();
  });

  test('should navigate to vision page via quick action', async ({ page }) => {
    const visionButton = page.locator('button:has-text("Vision")');
    await expect(visionButton).toBeVisible({ timeout: 10000 });
    await visionButton.click();

    // Should navigate to vision page
    await expect(page).toHaveURL(/\/vision/);
  });

  test('should navigate to audio page via quick action', async ({ page }) => {
    const audioButton = page.locator('button:has-text("Audio")');
    await expect(audioButton).toBeVisible({ timeout: 10000 });
    await audioButton.click();

    // Should navigate to audio page
    await expect(page).toHaveURL(/\/audio/);
  });

  test('should navigate to workflows page via quick action', async ({ page }) => {
    const workflowsButton = page.locator('button:has-text("Workflows")');
    await expect(workflowsButton).toBeVisible({ timeout: 10000 });
    await workflowsButton.click();

    // Should navigate to workflows page
    await expect(page).toHaveURL(/\/workflows/);
  });

  test('should have refresh button', async ({ page }) => {
    const refreshButton = page.locator('button[aria-label="Rafraichir les statistiques"]');
    await expect(refreshButton).toBeVisible({ timeout: 10000 });
  });

  test('should display agents status section', async ({ page }) => {
    const agentsStatusTitle = page.locator('text=Etat des Agents');
    await expect(agentsStatusTitle).toBeVisible({ timeout: 10000 });

    // Check table headers
    const nameHeader = page.locator('text=NOM');
    await expect(nameHeader).toBeVisible();

    const typeHeader = page.locator('text=TYPE');
    await expect(typeHeader).toBeVisible();

    const statusHeader = page.locator('text=STATUT');
    await expect(statusHeader).toBeVisible();

    const tasksHeader = page.locator('text=TACHES');
    await expect(tasksHeader).toBeVisible();
  });

  test('should display recent activity section', async ({ page }) => {
    const activityTitle = page.locator('text=Activite Recente');
    await expect(activityTitle).toBeVisible({ timeout: 10000 });
  });

  test('should show percentage change indicators', async ({ page }) => {
    // Look for percentage indicators in stat cards
    const percentageIndicators = page.locator('text=/[+-]\\d+%/');
    const count = await percentageIndicators.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Dashboard Responsiveness', () => {
  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Stats should still be visible
    const totalAgentsCard = page.locator('text=Total Agents');
    await expect(totalAgentsCard).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Stats should still be visible
    const totalAgentsCard = page.locator('text=Total Agents');
    await expect(totalAgentsCard).toBeVisible({ timeout: 10000 });
  });
});
