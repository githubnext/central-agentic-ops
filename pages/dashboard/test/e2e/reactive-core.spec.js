import { test, expect } from '@playwright/test';

test('DLS-CONF-004 reactive DOM nodes render stable keyed output in browser', async ({ page }) => {
  await page.setContent(`
    <main id="app"></main>
    <script type="module">
      import { h, keyed } from 'file:///home/runner/work/central-agentic-ops/central-agentic-ops/pages/dashboard/src/dom.js';
      const app = document.querySelector('#app');
      const items = [
        { id: 'run-2', label: 'Run 2' },
        { id: 'run-1', label: 'Run 1' }
      ];
      app.append(h('section', null,
        h('h1', null, 'Reactive core'),
        h('div', { id: 'list' }, keyed(items, (item) => h('a', { href: '#' + item.id }, item.label), (item) => item.id))
      ));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Reactive core' })).toBeVisible();
  await expect(page.locator('#list a')).toHaveText(['Run 2', 'Run 1']);
});
