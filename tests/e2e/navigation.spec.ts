/**
 * E2E Tests - Navigation
 * 
 * Tests complets pour la navigation globale
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should redirect to dashboard from root', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate through all pages', async ({ page }) => {
    const pages = [
      { url: '/dashboard', title: 'Tableau de Bord' },
      { url: '/agents', title: 'Agents' },
      { url: '/vision', title: 'Vision' },
      { url: '/audio', title: 'Audio' },
      { url: '/workflows', title: 'Workflows' },
      { url: '/tools', title: 'Outils' },
      { url: '/system', title: 'Système' },
      { url: '/settings', title: 'Paramètres' },
    ];

    for (const { url, title } of pages) {
      await page.goto(url);
      await expect(page.locator('h1')).toContainText(title);
    }
  });

  test('should display sidebar navigation', async ({ page }) => {
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // Vérifier tous les liens de navigation
    const navLinks = [
      'Dashboard',
      'Agents',
      'Vision',
      'Audio',
      'Workflows',
      'Outils',
      'Système',
      'Paramètres',
    ];

    for (const link of navLinks) {
      await expect(page.locator(`a:has-text("${link}")`)).toBeVisible();
    }
  });

  test('should toggle sidebar collapse', async ({ page }) => {
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
    await toggleButton.click();
    
    // Vérifier que la sidebar est collapsed
    await expect(page.locator('[data-testid="sidebar"]')).toHaveClass(/collapsed/);
  });

  test('should show active navigation item', async ({ page }) => {
    await page.goto('/agents');
    
    // Vérifier que l'item Agents est actif
    await expect(page.locator('a[href="/agents"]')).toHaveClass(/active/);
  });

  test('should display breadcrumbs', async ({ page }) => {
    await page.goto('/agents');
    
    await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible();
  });
});
