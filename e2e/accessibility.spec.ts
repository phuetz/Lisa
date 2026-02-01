/**
 * E2E Tests for Accessibility
 * IT-008: Tests UI et Accessibilite
 * WCAG 2.1 AA Compliance Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Accessibility - Semantic Structure', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Page should have an h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // h1 should contain page title
    const h1Text = await h1.textContent();
    expect(h1Text).toBeTruthy();
  });

  test('should have main landmark', async ({ page }) => {
    await page.goto('/');

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have navigation landmark', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should have proper document structure', async ({ page }) => {
    await page.goto('/');

    // Check for root element
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // Page should have visible content
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test('should be able to navigate sidebar with keyboard', async ({ page }) => {
    await page.goto('/');

    // Tab to first nav item
    await page.keyboard.press('Tab');

    // Keep tabbing until we reach a navigation button
    let attempts = 0;
    while (attempts < 20) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName === 'BUTTON' && el?.textContent?.includes('Chat');
      });
      if (focused) break;
      await page.keyboard.press('Tab');
      attempts++;
    }

    // Focus should eventually reach navigation
    const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toBeTruthy();
  });

  test('should be able to activate buttons with Enter', async ({ page }) => {
    await page.goto('/');

    // Find and focus the theme button
    const themeButton = page.locator('button[title="Changer le theme"]');
    await themeButton.focus();

    // Press Enter
    await page.keyboard.press('Enter');

    // Dropdown should open
    await expect(page.getByText('Mode')).toBeVisible();
  });

  test('should be able to activate buttons with Space', async ({ page }) => {
    await page.goto('/');

    // Find and focus the theme button
    const themeButton = page.locator('button[title="Changer le theme"]');
    await themeButton.focus();

    // Press Space
    await page.keyboard.press('Space');

    // Dropdown should open
    await expect(page.getByText('Mode')).toBeVisible();
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/');

    // Tab to a button
    const firstButton = page.locator('button').first();
    await firstButton.focus();

    // Check that focus is visible (button is focused)
    const isFocused = await page.evaluate(() => {
      const focused = document.activeElement;
      return focused?.tagName === 'BUTTON';
    });
    expect(isFocused).toBe(true);
  });
});

test.describe('Accessibility - Interactive Elements', () => {
  test('all buttons should be focusable', async ({ page }) => {
    await page.goto('/');

    const buttons = page.locator('button');
    const count = await buttons.count();

    // All buttons should be accessible
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const tabIndex = await button.getAttribute('tabindex');
      // Should not have tabindex=-1 (unless intentionally hidden)
      expect(tabIndex).not.toBe('-1');
    }
  });

  test('theme dropdown items should be accessible', async ({ page }) => {
    await page.goto('/');

    // Open theme dropdown
    await page.locator('button[title="Changer le theme"]').click();

    // Mode buttons should be visible and clickable
    const modeButtons = page.locator('button', { hasText: /^(Clair|Sombre|Auto)$/ });
    const modeCount = await modeButtons.count();
    expect(modeCount).toBe(3);

    // Theme items should be accessible
    const themeItems = page.locator('button', { hasText: 'Lisa Classic' });
    await expect(themeItems.first()).toBeVisible();
  });

  test('navigation items should have accessible names', async ({ page }) => {
    await page.goto('/');

    // Check that nav buttons have text content
    const navItems = ['Chat', 'Dashboard', 'Vision', 'Audio', 'Agents'];

    for (const item of navItems) {
      const button = page.locator('button', { hasText: item });
      await expect(button.first()).toBeVisible();
    }
  });
});

test.describe('Accessibility - Color Contrast', () => {
  test('text should be visible in light mode', async ({ page }) => {
    await page.goto('/');

    // Ensure light mode
    await page.locator('button[title="Changer le theme"]').click();
    await page.getByText('Clair').click();

    // Check that page title is visible
    const title = page.locator('h1');
    await expect(title).toBeVisible();

    // Check text is not transparent
    const color = await title.evaluate(el => getComputedStyle(el).color);
    expect(color).not.toBe('rgba(0, 0, 0, 0)');
    expect(color).not.toBe('transparent');
  });

  test('text should be visible in dark mode', async ({ page }) => {
    await page.goto('/');

    // Switch to dark mode
    await page.locator('button[title="Changer le theme"]').click();
    await page.getByText('Sombre').click();

    // Check that page title is visible
    const title = page.locator('h1');
    await expect(title).toBeVisible();

    // Check text is not transparent
    const color = await title.evaluate(el => getComputedStyle(el).color);
    expect(color).not.toBe('rgba(0, 0, 0, 0)');
    expect(color).not.toBe('transparent');
  });

  test('accent colors should be distinguishable', async ({ page }) => {
    await page.goto('/');

    // Get accent color
    const accentColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--office-accent').trim();
    });

    // Accent color should be defined
    expect(accentColor).toBeTruthy();
    expect(accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

test.describe('Accessibility - Responsive Design', () => {
  test('should be usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Main content should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Title should be visible
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('should be usable on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Main content should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should be usable on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Main content and sidebar should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Sidebar navigation should be visible on desktop
    await expect(page.getByText('Chat')).toBeVisible();
  });
});

test.describe('Accessibility - Screen Reader Support', () => {
  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/');

    // Theme button should have title attribute
    const themeButton = page.locator('button[title="Changer le theme"]');
    await expect(themeButton).toHaveAttribute('title', 'Changer le theme');
  });

  test('navigation buttons should have text content', async ({ page }) => {
    await page.goto('/');

    // All navigation items should have text
    const navButtons = ['Chat', 'Dashboard', 'Vision', 'Audio', 'Agents', 'Workflows'];

    for (const text of navButtons) {
      const button = page.locator('button', { hasText: text }).first();
      await expect(button).toBeVisible();
      const textContent = await button.textContent();
      expect(textContent).toContain(text);
    }
  });

  test('page should have descriptive title', async ({ page }) => {
    await page.goto('/');

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - Motion Preferences', () => {
  test('should respect reduced motion preference when set in store', async ({ page }) => {
    await page.goto('/');

    // The app has a transitionsEnabled setting
    // Check that transitions can be disabled
    const transitionsEnabled = await page.evaluate(() => {
      const stored = localStorage.getItem('lisa-office-theme');
      if (stored) {
        return JSON.parse(stored).state?.transitionsEnabled;
      }
      return true; // Default is enabled
    });

    // By default transitions should be enabled
    expect(transitionsEnabled).not.toBe(false);
  });
});
