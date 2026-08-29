import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

test('DLS-PAGE-006 DLS-PAGE-014 built-in runs page renders status counts, outcomes, scope, models, time, run links, and independent data state in browser', async ({ page }) => {
  const domSource = readFileSync(new URL('../../src/dom.js', import.meta.url), 'utf8');
  const presenterSource = readFileSync(new URL('../../src/presenter.js', import.meta.url), 'utf8');
  const domModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(domSource)}`;
  const presenterModuleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(presenterSource.replace("'./dom.js'", JSON.stringify(domModuleUrl)))}`;

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-runs-render',
          title: 'Built In Runs Render',
          pages: [
            {
              id: 'runs',
              kind: 'built-in',
              page: 'runs',
              title: 'Runs',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'run-status', data: { source: 'runs' } },
                  { id: 'run-outcomes', data: { source: 'outcomes' } }
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
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'dashboard.yml',
              run: '1001',
              'run-status': 'completed',
              'run-conclusion': 'success',
              'rollout-mode': 'review',
              engine: 'github-actions',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1-mini',
              'started-at': '2026-08-29T12:00:00Z',
              'run-link': {
                relation: 'run',
                href: 'https://example.com/runs/1001',
                label: 'Run 1001'
              }
            },
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'dashboard.yml',
              run: '1002',
              'run-status': 'in-progress',
              'run-conclusion': 'unknown',
              'rollout-mode': 'live',
              engine: 'github-actions',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1',
              'started-at': '2026-08-29T12:05:00Z'
            }
          ],
          metadata: {
            'source-id': 'runs-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T12:10:00Z',
            'retrieved-at': '2026-08-29T12:11:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        outcomes: {
          source: 'outcomes',
          rows: [
            {
              run: '1001',
              'outcome-state': 'accepted',
              'run-link': {
                relation: 'run',
                href: 'https://example.com/runs/1001',
                label: 'Run 1001'
              }
            },
            {
              run: '1001',
              'outcome-state': 'pending',
              'run-link': {
                relation: 'run',
                href: 'https://example.com/runs/1001',
                label: 'Run 1001'
              }
            }
          ],
          metadata: {
            'source-id': 'outcomes-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T12:10:00Z',
            'retrieved-at': '2026-08-29T12:11:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Built In Runs Render' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Runs', exact: true })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.run-status-counts')).toContainText(['completed: 1', 'in-progress: 1']);
  await expect(page.locator('.run-conclusion-counts')).toContainText(['success: 1', 'unknown: 1']);
  await expect(page.locator('.run-outcome-counts')).toContainText(['accepted: 1', 'pending: 1']);
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('tbody tr').first()).toContainText([
    '1001',
    'completed',
    'success',
    'githubnext',
    'central-agentic-ops',
    'dashboard.yml',
    'review',
    'github-actions',
    'gpt-4.1',
    'gpt-4.1-mini',
    '2026-08-29T12:00:00Z',
    '2',
    'Run 1001'
  ]);
  await expect(page.locator('tbody tr').nth(1)).toContainText([
    '1002',
    'in-progress',
    'unknown',
    'live',
    'gpt-4.1',
    '2026-08-29T12:05:00Z',
    '0',
    'Unavailable'
  ]);
  await expect(page.getByRole('link', { name: 'Run 1001' })).toHaveAttribute('href', 'https://example.com/runs/1001');
  await expect(page.locator('.provenance-list li')).toContainText([
    'runs: runs-fixture (fixture) — as of 2026-08-29T12:10:00Z',
    'outcomes: outcomes-fixture (fixture) — as of 2026-08-29T12:10:00Z'
  ]);
});
