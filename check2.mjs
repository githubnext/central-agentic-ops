import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:4321/central-agentic-ops/', { waitUntil: 'networkidle0' });
await page.evaluate(() => { document.querySelector('.ops-wizard').open = true; });
await new Promise(r => setTimeout(r, 300));
const result = await page.evaluate(() => {
  const btn = document.querySelector('[data-copy-prompt]');
  const sheets = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText && btn.matches(rule.selectorText) && rule.style.opacity) {
          sheets.push({selector: rule.selectorText, opacity: rule.style.opacity, href: sheet.href});
        }
      }
    } catch(e) {}
  }
  return { inlineStyle: btn.getAttribute('style'), matchingRules: sheets };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
