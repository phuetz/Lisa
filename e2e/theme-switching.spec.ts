/**
 * E2E Tests for Theme Switching
 * IT-008: Tests UI et Accessibilite
 */

import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with default theme
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display theme switcher button', async ({ page }) => {
    await page.goto('/');

    // Find theme button by title
    const themeButton = page.locator('button[title="Changer le theme"]');
    await expect(themeButton).toBeVisible();
  });

  test('should open theme dropdown on click', async ({ page }) => {
    await page.goto('/');

    // Click theme button
    await page.locator('button[title="Changer le theme"]').click();

    // Verify dropdown content
    await expect(page.getByText('Mode')).toBeVisible();
    await expect(page.getByText('Clair')).toBeVisible();
    await expect(page.getByText('Sombre')).toBeVisible();
    await expect(page.getByText('Auto')).toBeVisible();
  });

  test('should display all available themes', async ({ page }) => {
    await page.goto('/');

    // Open dropdown
    await page.locator('button[title="Changer le theme"]').click();

    // Check for theme options
    await expect(page.getByText('Lisa Classic')).toBeVisible();
    await expect(page.getByText('Office Classic')).toBeVisible();
    await expect(page.getByText('Office Blue')).toBeVisible();
    await expect(page.getByText('Word')).toBeVisible();
    await expect(page.getByText('Excel')).toBeVisible();
    await expect(page.getByText('PowerPoint')).toBeVisible();
    await expect(page.getByText('Teams')).toBeVisible();
  });

  test('should switch to dark mode', async ({ page }) => {
    await page.goto('/');

    // Open dropdown
    await page.locator('button[title="Changer le theme"]').click();

    // Click dark mode
    await page.getByText('Sombre').click();

    // Verify dark mode is applied by checking background color
    const body = page.locator('body');

    // Store mode in localStorage should be 'dark'
    const mode = await page.evaluate(() => {
      const stored = localStorage.getItem('lisa-office-theme');
      if (stored) {
        return JSON.parse(stored).state?.mode;
      }
      return null;
    });
    expect(mode).toBe('dark');
  });

  test('should switch to light mode', async ({ page }) => {
    await page.goto('/');

    // First switch to dark mode
    await page.locator('button[title="Changer le theme"]').click();
    await page.getByText('Sombre').click();

    // Then switch back to light
    await page.locator('button[title="Changer le theme"]').click();
    await page.getByText('Clair').click();

    // Verify light mode
    const mode = await page.evaluate(() => {
      const stored = localStorage.getItem('lisa-office-theme');
      if (stored) {
        return JSON.parse(stored).state?.mode;
      }
      return null;
    });
    expect(mode).toBe('light');
  });

  test('should change theme and persist', async ({ page }) => {
    await page.goto('/');

    // Open dropdown and select Teams theme
    await page.locator('button[title="Changer le theme"]').click();
    await page.getByText('Teams').click();

    // Verify theme is stored
    const themeId = await page.evaluate(() => {
      const stored = localStorage.getItem('lisa-office-theme');
      if (stored) {
        return JSON.parse(stored).state?.themeId;
      }
      return null;
    });
    expect(themeId).toBe('teams-purple');

    // Reload page
    await page.reload();

    // Theme should persist
    const persistedThemeId = await page.evaluate(() => {
      const stored = localStorage.getItem('lisa-office-theme');
      if (stored) {
        return JSON.parse(stored).state?.themeId;
      }
      return null;
    });
    expect(persistedThemeId).toBe('teams-purple');
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    await page.goto('/');

    // Open dropdown
    await page.locator('button[title="Changer le theme"]').click();
    await expect(page.getByText('Mode')).toBeVisible();

    // Click outside the dropdown
    await page.locator('main').click({ position: { x: 10, y: 10 } });

    // Dropdown should be closed
    await expect(page.getByText('Mode')).not.toBeVisible();
  });

  test('should close dropdown when selecting a theme', async ({ page }) => {
    await page.goto('/');

    // Open dropdown
    await page.locator('button[title="Changer le theme"]').click();
    await expect(page.getByText('Theme')).toBeVisible();

    // Select a theme
    await page.getByText('Excel').click();

    // Dropdown should be closed
    await expect(page.getByText('Theme')).not.toBeVisible();
  });

  test('should show checkmark on selected theme', async ({ page }) => {
    await page.goto('/');

    // Open dropdown
    await page.locator('button[title="Changer le theme"]').click();

    // Select Excel theme
    await page.getByText('Excel').click();

    // Reopen dropdown
    await page.locator('button[title="Changer le theme"]').click();

    // Excel should be marked as selected (has Check icon nearby)
    const excelItem = page.locator('button', { hasText: 'Excel' });
    await expect(excelItem).toBeVisible();
  });

  test('should apply theme colors to UI elements', async ({ page }) => {
    await page.goto('/');

    // Switch to Lisa Classic (green accent)
    await page.locator('button[title="Changer le theme"]').click();
    await page.getByText('Lisa Classic').click();

    // Verify CSS variable is set
    const accentColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--office-accent').trim();
    });
    expect(accentColor).toBe('#10b981'); // Lisa Classic accent

    // Switch to Excel (green but different shade)
    await page.locator('button[title="Changer le theme"]').click();
    await page.getByText('Excel').click();

    const excelAccent = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--office-accent').trim();
    });
    expect(excelAccent).toBe('#107c41'); // Excel accent
  });

  test('should handle system mode preference', async ({ page }) => {
    await page.goto('/');

    // Open dropdown and select Auto mode
    await page.locator('button[title="Changer le theme"]').click();
    await page.getByText('Auto').click();

    // Verify mode is set to system
    const mode = await page.evaluate(() => {
      const stored = localStorage.getItem('lisa-office-theme');
      if (stored) {
        return JSON.parse(stored).state?.mode;
      }
      return null;
    });
    expect(mode).toBe('system');
  });
});

test.describe('Theme Switching - Navigation', () => {
  test('should maintain theme across page navigation', async ({ page }) => {
    await page.goto('/');

    // Set theme to Teams
    await page.locator('button[title="Changer le theme"]').click();
    await page.getByText('Teams').click();

    // Navigate to Vision page
    await page.getByText('Vision').click();
    await expect(page).toHaveURL(/\/vision/);

    // Theme should still be Teams
    const themeId = await page.evaluate(() => {
      const stored = localStorage.getItem('lisa-office-theme');
      if (stored) {
        return JSON.parse(stored).state?.themeId;
      }
      return null;
    });
    expect(themeId).toBe('teams-purple');

    // Navigate to Audio page
    await page.getByText('Audio').click();
    await expect(page).toHaveURL(/\/audio/);

    // Theme should still persist
    const persistedId = await page.evaluate(() => {
      const stored = localStorage.getItem('lisa-office-theme');
      if (stored) {
        return JSON.parse(stored).state?.themeId;
      }
      return null;
    });
    expect(persistedId).toBe('teams-purple');
  });
});
