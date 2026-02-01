/**
 * Lisa Gateway E2E Tests
 * Tests complets pour la page Gateway et ses 20 onglets
 */

import { test, expect } from '@playwright/test';

test.describe('Gateway Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gateway');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should load Gateway page', async ({ page }) => {
    await expect(page).toHaveURL(/.*gateway/);
    // Check for the first tab "Vue d'ensemble"
    await expect(page.locator('text=Vue d\'ensemble').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display tabs', async ({ page }) => {
    // Check some key tabs are visible
    await expect(page.locator('text=Compagne').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Channels').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Desktop').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Compagne tab', async ({ page }) => {
    await page.click('text=Compagne');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Mode Compagne')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Channels tab', async ({ page }) => {
    await page.click('text=Channels');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Canaux supportés')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Companion Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gateway');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.click('text=Compagne');
    await page.waitForTimeout(500);
  });

  test('should display Companion Panel', async ({ page }) => {
    await expect(page.locator('text=Mode Compagne')).toBeVisible({ timeout: 10000 });
  });

  test('should toggle companion mode', async ({ page }) => {
    const toggleBtn = page.locator('button:has-text("Activé"), button:has-text("Désactivé")').first();
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
    await toggleBtn.click();
    await page.waitForTimeout(300);
  });

  test('should display relationship stats', async ({ page }) => {
    await expect(page.locator('text=jours ensemble')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=souvenirs')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Channels Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gateway');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.click('text=Channels');
    await page.waitForTimeout(500);
  });

  test('should display Channels Panel', async ({ page }) => {
    await expect(page.locator('text=Canaux supportés')).toBeVisible({ timeout: 10000 });
  });

  test('should show supported channels', async ({ page }) => {
    await expect(page.locator('text=Telegram').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Discord').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=WhatsApp').first()).toBeVisible({ timeout: 10000 });
  });

  test('should open add channel modal', async ({ page }) => {
    await page.click('text=Ajouter');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Ajouter un canal')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Other Panels', () => {
  test('should display Desktop Panel', async ({ page }) => {
    await page.goto('/gateway');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.click('text=Desktop');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Desktop Control').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display Skills Panel', async ({ page }) => {
    await page.goto('/gateway');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.click('text=Skills');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Skills Registry').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display Browser Panel', async ({ page }) => {
    await page.goto('/gateway');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.click('text=Browser');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Browser Control').first()).toBeVisible({ timeout: 10000 });
  });
});
