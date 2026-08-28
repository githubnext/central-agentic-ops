import { test, expect } from '@playwright/test';

test('DLS-CONF-004 scaffold browser harness loads a static document', async ({ page }) => {
  await page.setContent('<main><h1>Dashboard scaffold</h1><p>Browser harness ready.</p></main>');
  await expect(page.getByRole('heading', { name: 'Dashboard scaffold' })).toBeVisible();
  await expect(page.getByText('Browser harness ready.')).toBeVisible();
});
