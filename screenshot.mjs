import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1200 });
await page.goto('http://localhost:4321/central-agentic-ops/', { waitUntil: 'networkidle0' });
// Open the wizard details element
await page.evaluate(() => {
  const details = document.querySelector('.ops-wizard');
  if (details) details.open = true;
});
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: '/tmp/wizard-full.png', fullPage: true });

const button = await page.$('[data-copy-prompt]');
console.log('Button found:', !!button);
if (button) {
  const box = await button.boundingBox();
  console.log('Button box:', JSON.stringify(box));
  const visible = await page.evaluate(el => {
    const style = getComputedStyle(el);
    return { display: style.display, visibility: style.visibility, opacity: style.opacity };
  }, button);
  console.log('Button style:', JSON.stringify(visible));
}
await browser.close();
