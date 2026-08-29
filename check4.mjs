import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('console', msg => errors.push('CONSOLE:'+msg.text()));
page.on('pageerror', err => errors.push('PAGEERROR:'+err.message));
await page.goto('http://localhost:4321/central-agentic-ops/', { waitUntil: 'networkidle0' });
await page.evaluate(() => { document.querySelector('.ops-wizard').open = true; });
await new Promise(r => setTimeout(r, 300));
const result = await page.evaluate(() => {
  const btn = document.querySelector('[data-copy-prompt]');
  return { outerHTML: btn.outerHTML, disabled: btn.disabled };
});
console.log(JSON.stringify(result, null, 2));
console.log(errors.join('\n'));
await browser.close();
