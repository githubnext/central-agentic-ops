import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

test('DLS-PAGE-002 DLS-PAGE-014 built-in overview page renders independent data state and provenance in browser', async ({ page }) => {
  const domSource = readFileSync(new URL('../../src/dom.js', import.meta.url), 'utf8');
  const presenterSource = readFileSync(new URL('../../src/presenter.js', import.meta.url), 'utf8');
  const domModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(domSource)}`;
  const presenterModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(presenterSource.replace("'./dom.js'", JSON.stringify(domModuleUrl)))}`;

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const document = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-overview-render',
          title: 'Built In Overview Render',
          pages: [
            {
              id: 'overview',
              kind: 'built-in',
              page: 'overview',
              title: 'Overview',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'workflow-inventory', data: { source: 'workflows' } },
                  { id: 'run-status', data: { source: 'runs' } },
                  { id: 'usage', data: { source: 'usage' } },
                  { id: 'findings', data: { source: 'findings' } },
                  { id: 'operational-values', data: { source: 'operational-values' } }
                ]
              }
            }
          ]
        }
      };

      const sources = {
        workflows: {
          source: 'workflows',
          rows: [{ workflow: 'build' }],
          metadata: {
            'source-id': 'workflows-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T12:00:00Z',
            'retrieved-at': '2026-08-29T12:05:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        runs: {
          source: 'runs',
          rows: [],
          metadata: {
            'source-id': 'runs-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T12:00:00Z',
            'retrieved-at': '2026-08-29T12:05:00Z',
            completeness: 'partial',
            freshness: 'fresh',
            availability: 'empty'
          }
        },
        usage: {
          source: 'usage',
          rows: [{ aic: 12 }],
          metadata: {
            'source-id': 'usage-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T12:00:00Z',
            'retrieved-at': '2026-08-29T12:05:00Z',
            completeness: 'complete',
            freshness: 'stale',
            availability: 'available'
          }
        },
        findings: {
          source: 'findings',
          rows: [{ finding: 'finding-1' }],
          metadata: {
            'source-id': 'findings-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T12:00:00Z',
            'retrieved-at': '2026-08-29T12:05:00Z',
            completeness: 'unknown',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        'operational-values': {
          source: 'operational-values',
          rows: [],
          metadata: {
            'source-id': 'operational-value-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T12:00:00Z',
            'retrieved-at': '2026-08-29T12:05:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'unavailable'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Built In Overview Render' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('unavailable');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.provenance-list li')).toContainText([
    'workflows: workflows-fixture (fixture) — as of 2026-08-29T12:00:00Z',
    'runs: runs-fixture (fixture) — as of 2026-08-29T12:00:00Z',
    'usage: usage-fixture (fixture) — as of 2026-08-29T12:00:00Z',
    'findings: findings-fixture (fixture) — as of 2026-08-29T12:00:00Z',
    'operational-values: operational-value-fixture (fixture) — as of 2026-08-29T12:00:00Z'
  ]);
});
