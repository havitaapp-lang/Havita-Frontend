import { test, expect } from '@playwright/test';
test('check plans page', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  await page.goto('http://admin.localhost:5173/super-admin/plans');
  await page.waitForTimeout(5000);
});
