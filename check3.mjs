import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:4321/central-agentic-ops/', { waitUntil: 'networkidle0' });
await page.evaluate(() => { document.querySelector('.ops-wizard').open = true; });
await new Promise(r => setTimeout(r, 300));
const result = await page.evaluate(() => {
  const btn = document.querySelector('[data-copy-prompt]');
  let el = btn;
  const chain = [];
  while (el) {
    const style = getComputedStyle(el);
    chain.push({ tag: el.tagName, cls: el.className, opacity: style.opacity, animation: style.animationName, transition: style.transition });
    el = el.parentElement;
  }
  return chain;
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
