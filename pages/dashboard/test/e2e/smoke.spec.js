import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

function buildPresenterModuleUrl() {
  const domSource = readFileSync(new URL('../../src/dom.js', import.meta.url), 'utf8');
  const domModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(domSource)}`;

  const stylesSource = readFileSync(new URL('../../src/styles.js', import.meta.url), 'utf8');
  const stylesModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(stylesSource)}`;

  const octiconsSource = readFileSync(new URL('../../src/octicons.js', import.meta.url), 'utf8')
    .replace("'./dom.js'", JSON.stringify(domModuleUrl));
  const octiconsModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(octiconsSource)}`;

  const badgeSource = readFileSync(new URL('../../src/components/badge.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl));
  const badgeModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(badgeSource)}`;

  const dataStateSource = readFileSync(new URL('../../src/components/data-state.js', import.meta.url), 'utf8')
    .replace("'../dom.js'", JSON.stringify(domModuleUrl))
    .replace("'./badge.js'", JSON.stringify(badgeModuleUrl));
  const dataStateModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(dataStateSource)}`;

  const presenterSource = readFileSync(new URL('../../src/presenter.js', import.meta.url), 'utf8')
    .replace("'./dom.js'", JSON.stringify(domModuleUrl))
    .replace("'./styles.js'", JSON.stringify(stylesModuleUrl))
    .replace("'./octicons.js'", JSON.stringify(octiconsModuleUrl))
    .replace("'./components/badge.js'", JSON.stringify(badgeModuleUrl))
    .replace("'./components/data-state.js'", JSON.stringify(dataStateModuleUrl));

  return `data:text/javascript;charset=utf-8,${encodeURIComponent(presenterSource)}`;
}

test('DLS-PAGE-011 DLS-PAGE-014 built-in engines-models page renders separate engine, requested model, resolved model, run counts, run conclusions, outcomes, raw tokens, AIC, provenance, and independent data state in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-engines-models-render',
          title: 'Built In Engines Models Render',
          pages: [
            {
              id: 'engines-models',
              kind: 'built-in',
              page: 'engines-models',
              title: 'Engines Models',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'runs-source', data: { source: 'runs' } },
                  { id: 'outcomes-source', data: { source: 'outcomes' } },
                  { id: 'usage-source', data: { source: 'usage' } }
                ]
              }
            }
          ]
        }
      };

      const sources = {
        runs: {
          source: 'runs',
          rows: [
            {
              run: '1001',
              engine: 'openai',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1-mini',
              'run-conclusion': 'success'
            },
            {
              run: '1002',
              engine: 'openai',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1-mini',
              'run-conclusion': 'failure'
            },
            {
              run: '1003',
              engine: 'anthropic',
              'requested-model': 'claude-3.5-sonnet',
              'resolved-model': 'claude-3.5-sonnet',
              'run-conclusion': 'success'
            }
          ],
          metadata: {
            'source-id': 'runs-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        outcomes: {
          source: 'outcomes',
          rows: [
            { run: '1001', 'outcome-state': 'accepted' },
            { run: '1001', 'outcome-state': 'pending' },
            { run: '1003', 'outcome-state': 'rejected' }
          ],
          metadata: {
            'source-id': 'outcomes-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        usage: {
          source: 'usage',
          rows: [
            {
              invocation: 'invoke-1',
              run: '1001',
              engine: 'openai',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1-mini',
              'input-tokens': 10,
              'output-tokens': 5,
              'cache-read-tokens': 2,
              'cache-write-tokens': 1,
              'reasoning-tokens': 3,
              aic: 4
            },
            {
              invocation: 'invoke-2',
              run: '1002',
              engine: 'openai',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1-mini',
              'input-tokens': 7,
              'output-tokens': 11,
              'cache-read-tokens': 0,
              'cache-write-tokens': 4,
              'reasoning-tokens': 6,
              aic: 9
            },
            {
              invocation: 'invoke-3',
              run: '1003',
              engine: 'anthropic',
              'requested-model': 'claude-3.5-sonnet',
              'resolved-model': 'claude-3.5-sonnet',
              'input-tokens': 3,
              'output-tokens': 4,
              'cache-read-tokens': 1,
              'cache-write-tokens': 0,
              'reasoning-tokens': 2,
              aic: 5
            }
          ],
          metadata: {
            'source-id': 'usage-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Built In Engines Models Render' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Engines Models', exact: true, level: 2 })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.engines-models-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.engines-models-table tbody tr').first().locator('td')).toContainText([
    'anthropic',
    'claude-3.5-sonnet',
    'claude-3.5-sonnet',
    '1',
    'success: 1',
    '1',
    '3',
    '4',
    '1',
    '0',
    '2',
    '5'
  ]);
  await expect(page.locator('.engines-models-table tbody tr').nth(1).locator('td')).toContainText([
    'openai',
    'gpt-4.1',
    'gpt-4.1-mini',
    '2',
    'success: 1, failure: 1',
    '2',
    '17',
    '16',
    '2',
    '5',
    '9',
    '13'
  ]);
  await expect(page.locator('.provenance-list li')).toContainText([
    'runs: runs-fixture (fixture) — as of 2026-08-29T19:00:00Z',
    'outcomes: outcomes-fixture (fixture) — as of 2026-08-29T19:00:00Z',
    'usage: usage-fixture (fixture) — as of 2026-08-29T19:00:00Z'
  ]);
});
