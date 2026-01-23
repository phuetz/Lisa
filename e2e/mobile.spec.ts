import { test, expect } from '@playwright/test';

test.describe('Mobile View', () => {
  test.use({ viewport: { width: 375, height: 667 }, isMobile: true });

  test('Shows mobile-specific elements on small screen', async ({ page }) => {
    await page.goto('/');

    // Check if the page title is correct
    await expect(page).toHaveTitle('Lisa – Vision & Hearing Assistant');

    // If authenticated (we might need to mock auth or login), check for mobile nav
    // For now, checking landing page responsiveness or login button visibility
    const loginButton = page.getByText('Se connecter', { exact: true }).first(); // Adjust selector as needed
    await expect(loginButton).toBeVisible();

    // Mock successful login state to test mobile nav?
    // This depends on how auth is mocked in E2E.
    // Assuming we land on login page first.
  });
});
