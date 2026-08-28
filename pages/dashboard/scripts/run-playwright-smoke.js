import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent('<main><h1>Dashboard scaffold</h1></main>');
  const heading = page.getByRole('heading', { name: 'Dashboard scaffold' });

  if (!(await heading.isVisible())) {
    throw new Error('Playwright smoke check failed: heading not visible');
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
