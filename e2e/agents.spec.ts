import { test, expect } from '@playwright/test';

test.describe('Agent Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('SecurityAgent - Security scan functionality', async ({ page }) => {
    // Find and click Security Panel
    const securityPanel = page.locator('text=🔒 Security Monitor');
    await expect(securityPanel).toBeVisible({ timeout: 10000 });
    await securityPanel.click();

    // Click scan button
    const scanButton = page.locator('button:has-text("Scan")');
    await scanButton.click();

    // Wait for results
    await page.waitForTimeout(1000);
    
    // Check for security score
    const scoreElement = page.locator('text=/\\/100/');
    await expect(scoreElement).toBeVisible({ timeout: 5000 });
  });

  test('EmailAgent - Email classification', async ({ page }) => {
    const emailPanel = page.locator('text=📧 Email Assistant');
    await expect(emailPanel).toBeVisible({ timeout: 10000 });
    await emailPanel.click();

    // Fill in email fields
    await page.fill('input[placeholder="Subject"]', 'Meeting tomorrow');
    await page.fill('textarea[placeholder="Email body"]', 'Can we schedule a meeting for tomorrow?');

    // Click classify
    const classifyButton = page.locator('button:has-text("Classify")');
    await classifyButton.click();

    // Wait for classification result
    await page.waitForTimeout(1000);
    const categoryElement = page.locator('text=/Category:/');
    await expect(categoryElement).toBeVisible({ timeout: 5000 });
  });

  test('SchedulerAgent - Time suggestions', async ({ page }) => {
    const schedulerPanel = page.locator('text=📅 Smart Scheduler');
    await expect(schedulerPanel).toBeVisible({ timeout: 10000 });
    await schedulerPanel.click();

    // Fill in meeting purpose
    await page.fill('input[placeholder="Meeting purpose"]', 'Team sync');

    // Click suggest time
    const suggestButton = page.locator('button:has-text("Suggest Time")');
    await suggestButton.click();

    // Wait for suggestions
    await page.waitForTimeout(1000);
    const suggestionsElement = page.locator('text=/Suggested Times:/');
    await expect(suggestionsElement).toBeVisible({ timeout: 5000 });
  });

  test('DataAnalysisAgent - Statistics calculation', async ({ page }) => {
    const dataPanel = page.locator('text=📊 Data Analysis');
    await expect(dataPanel).toBeVisible({ timeout: 10000 });
    await dataPanel.click();

    // Data should be pre-filled, just click Stats
    const statsButton = page.locator('button:has-text("Stats")');
    await statsButton.click();

    // Wait for statistics
    await page.waitForTimeout(1000);
    const meanElement = page.locator('text=/Mean:/');
    await expect(meanElement).toBeVisible({ timeout: 5000 });
  });

  test('TranslationAgent - Translation functionality', async ({ page }) => {
    const translationPanel = page.locator('text=🌐 Translation');
    await expect(translationPanel).toBeVisible({ timeout: 10000 });
    await translationPanel.click();

    // Fill in text to translate
    await page.fill('textarea[placeholder*="Enter text"]', 'Hello world');

    // Click translate
    const translateButton = page.locator('button:has-text("Translate")');
    await translateButton.click();

    // Wait for translation
    await page.waitForTimeout(1000);
    const translationElement = page.locator('text=/Translation:/');
    await expect(translationElement).toBeVisible({ timeout: 5000 });
  });

  test('HealthMonitorAgent - Metric tracking', async ({ page }) => {
    const healthPanel = page.locator('text=💪 Health Monitor');
    await expect(healthPanel).toBeVisible({ timeout: 10000 });
    await healthPanel.click();

    // Fill in a metric value
    await page.fill('input[placeholder="Value"]', '8000');

    // Click log button
    const logButton = page.locator('button:has-text("Log")');
    await logButton.click();

    // Wait for logged metric
    await page.waitForTimeout(1000);
    const valueElement = page.locator('text=/8000/');
    await expect(valueElement).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Agent Registry', () => {
  test('All agents are registered', async ({ page }) => {
    await page.goto('/');
    
    // Check console for agent registration
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.waitForTimeout(2000);
    
    // Should see agent registration message
    const registrationLog = logs.find(log => log.includes('Successfully registered'));
    expect(registrationLog).toBeTruthy();
    
    // Should have 40 agents
    const agentCountLog = logs.find(log => log.includes('40 specialized agents'));
    expect(agentCountLog).toBeTruthy();
  });
});
