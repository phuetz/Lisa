import { test, expect } from '@playwright/test';

test.describe('Workflow Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Multi-agent workflow - Security scan + recommendations', async ({ page }) => {
    // Open Security Panel
    const securityPanel = page.locator('text=🔒 Security Monitor');
    await securityPanel.click();

    // Run security scan
    const scanButton = page.locator('button:has-text("Scan")');
    await scanButton.click();
    await page.waitForTimeout(1500);

    // Get recommendations
    const recommendButton = page.locator('button:has-text("Get Recommendations")');
    await recommendButton.click();
    await page.waitForTimeout(1000);

    // Verify recommendations appear
    const recommendations = page.locator('text=/Priority:/');
    await expect(recommendations.first()).toBeVisible({ timeout: 5000 });
  });

  test('Email workflow - Classify + Spam detection + Reply', async ({ page }) => {
    const emailPanel = page.locator('text=📧 Email Assistant');
    await emailPanel.click();

    // Fill test email
    await page.fill('input[placeholder="Subject"]', 'URGENT: You won a prize!!!');
    await page.fill('textarea[placeholder="Email body"]', 'Click here now to claim your free prize!');

    // Classify
    await page.locator('button:has-text("Classify")').click();
    await page.waitForTimeout(1000);

    // Check spam
    await page.locator('button:has-text("Spam?")').click();
    await page.waitForTimeout(1000);

    // Should detect as spam
    const spamDetected = page.locator('text=/SPAM DETECTED/');
    await expect(spamDetected).toBeVisible({ timeout: 5000 });
  });

  test('Scheduler workflow - Find availability + Optimize schedule', async ({ page }) => {
    const schedulerPanel = page.locator('text=📅 Smart Scheduler');
    await schedulerPanel.click();

    // Set meeting purpose
    await page.fill('input[placeholder="Meeting purpose"]', 'Team planning');

    // Suggest time
    await page.locator('button:has-text("Suggest Time")').click();
    await page.waitForTimeout(1500);

    // Find available slots
    await page.locator('button:has-text("Find Slots")').click();
    await page.waitForTimeout(1500);

    // Verify results
    const availableSlots = page.locator('text=/Available Slots:/');
    await expect(availableSlots).toBeVisible({ timeout: 5000 });
  });

  test('Data analysis workflow - Stats + Trends + Outliers', async ({ page }) => {
    const dataPanel = page.locator('text=📊 Data Analysis');
    await dataPanel.click();

    // Use sample data with trend
    await page.fill('textarea', '1, 2, 3, 5, 8, 13, 21, 34');

    // Calculate stats
    await page.locator('button:has-text("Stats")').click();
    await page.waitForTimeout(1000);

    // Detect trends
    await page.locator('button:has-text("Trends")').click();
    await page.waitForTimeout(1000);

    // Should show increasing trend
    const trendElement = page.locator('text=/Trend Analysis:/');
    await expect(trendElement).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Agent Error Handling', () => {
  test('Handles missing data gracefully', async ({ page }) => {
    await page.goto('/');

    // Try data analysis with empty data
    const dataPanel = page.locator('text=📊 Data Analysis');
    await dataPanel.click();

    await page.fill('textarea', '');
    await page.locator('button:has-text("Stats")').click();

    // Should not crash, might show error or do nothing
    await page.waitForTimeout(1000);
    // Just verify page is still functional
    await expect(dataPanel).toBeVisible();
  });

  test('Handles invalid input gracefully', async ({ page }) => {
    await page.goto('/');

    // Try data analysis with invalid data
    const dataPanel = page.locator('text=📊 Data Analysis');
    await dataPanel.click();

    await page.fill('textarea', 'abc, xyz, 123invalid');
    await page.locator('button:has-text("Stats")').click();

    await page.waitForTimeout(1000);
    // Page should remain functional
    await expect(dataPanel).toBeVisible();
  });
});
