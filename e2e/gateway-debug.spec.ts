/**
 * Gateway Debug Test - Check what's on the page
 */
import { test, expect } from '@playwright/test';

test('debug gateway page', async ({ page }) => {
  const consoleMessages: string[] = [];
  const errors: string[] = [];
  
  // Capture console messages
  page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => errors.push(err.message));
  
  // Navigate to gateway
  await page.goto('/gateway');
  
  // Wait for page to load
  await page.waitForTimeout(5000);
  
  // Log results
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Check for any visible text
  const bodyText = await page.locator('body').innerText();
  console.log('Body text length:', bodyText.length);
  console.log('Body text preview:', bodyText.slice(0, 500));
  
  // Check specific elements
  const tabs = await page.locator('text=Compagne').count();
  console.log('Compagne tabs found:', tabs);
  
  // Log errors
  console.log('\\n--- CONSOLE MESSAGES ---');
  consoleMessages.forEach(m => console.log(m));
  
  console.log('\\n--- PAGE ERRORS ---');
  errors.forEach(e => console.log(e));
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/gateway-debug.png', fullPage: true });
  
  expect(true).toBe(true);
});
