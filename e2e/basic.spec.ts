import { test, expect, request } from '@playwright/test';

// Basic smoke tests: API health and UI loads

test.describe('Lisa smoke', () => {
  test('API /health responds ok', async () => {
    const api = await request.newContext();
    const res = await api.get('http://localhost:3101/health');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toMatchObject({ success: true });
    expect(json.data?.status).toBe('ok');
  });

  test('UI renders title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Lisa – Vision & Hearing Assistant');
    await expect(page.locator('#root')).toBeVisible();
  });
});
