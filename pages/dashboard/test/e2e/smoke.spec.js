import { test, expect } from '@playwright/test';

test('scaffold browser harness launches', async ({ page }) => {
  await page.setContent('<main><h1>Dashboard scaffold</h1></main>');
  await expect(page.getByRole('heading', { name: 'Dashboard scaffold' })).toBeVisible();
});
