import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

test('DLS-PAGE-005 DLS-PAGE-014 built-in workflows page renders inventory, active state, rollout mode, run conclusions, outcomes, usage, findings, operational value, and independent data state in browser', async ({ page }) => {
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
          id: 'built-in-workflows-render',
          title: 'Built In Workflows Render',
          pages: [
            {
              id: 'workflows',
              kind: 'built-in',
              page: 'workflows',
              title: 'Workflows',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'workflows-source', data: { source: 'workflows' } },
                  { id: 'runs-source', data: { source: 'runs' } },
                  { id: 'outcomes-source', data: { source: 'outcomes' } },
                  { id: 'usage-source', data: { source: 'usage' } },
                  { id: 'findings-source', data: { source: 'findings' } },
                  { id: 'operational-values-source', data: { source: 'operational-values' } }
                ]
              }
            }
          ]
        }
      };

      const sources = {
        workflows: {
          source: 'workflows',
          rows: [
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'dashboard.yml',
              'workflow-active': 'true',
              'rollout-mode': 'review'
            },
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'release.yml',
              'workflow-active': 'false',
              'rollout-mode': 'live'
            }
          ],
          metadata: {
            'source-id': 'workflows-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        runs: {
          source: 'runs',
          rows: [
            { workflow: 'dashboard.yml', run: '1001', 'run-conclusion': 'success' },
            { workflow: 'dashboard.yml', run: '1002', 'run-conclusion': 'failure' },
            { workflow: 'release.yml', run: '1003', 'run-conclusion': 'success' }
          ],
          metadata: {
            'source-id': 'runs-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        outcomes: {
          source: 'outcomes',
          rows: [
            { workflow: 'dashboard.yml', 'outcome-state': 'accepted' },
            { workflow: 'dashboard.yml', 'outcome-state': 'pending' },
            { workflow: 'release.yml', 'outcome-state': 'rejected' }
          ],
          metadata: {
            'source-id': 'outcomes-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        usage: {
          source: 'usage',
          rows: [
            { workflow: 'dashboard.yml', aic: 3 },
            { workflow: 'dashboard.yml', aic: 2 },
            { workflow: 'release.yml', aic: 5 }
          ],
          metadata: {
            'source-id': 'usage-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        findings: {
          source: 'findings',
          rows: [
            { workflow: 'dashboard.yml', finding: 'f-1' },
            { workflow: 'release.yml', finding: 'f-2' },
            { workflow: 'release.yml', finding: 'f-3' }
          ],
          metadata: {
            'source-id': 'findings-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        'operational-values': {
          source: 'operational-values',
          rows: [
            { workflow: 'dashboard.yml', 'operational-value': 0.8 },
            { workflow: 'release.yml', 'operational-value': 0.4 }
          ],
          metadata: {
            'source-id': 'operational-values-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Built In Workflows Render' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.workflows-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.workflows-table tbody tr').first().locator('td')).toContainText([
    'dashboard.yml',
    'githubnext',
    'central-agentic-ops',
    'true',
    'review',
    '2',
    'success: 1, failure: 1',
    '2',
    '5',
    '1',
    '1'
  ]);
  await expect(page.locator('.workflows-table tbody tr').nth(1).locator('td')).toContainText([
    'release.yml',
    'false',
    'live',
    '1',
    'success: 1',
    '1',
    '5',
    '2',
    '1'
  ]);
  await expect(page.locator('.provenance-list li')).toContainText([
    'workflows: workflows-fixture (fixture) — as of 2026-08-29T13:00:00Z',
    'runs: runs-fixture (fixture) — as of 2026-08-29T13:00:00Z',
    'outcomes: outcomes-fixture (fixture) — as of 2026-08-29T13:00:00Z',
    'usage: usage-fixture (fixture) — as of 2026-08-29T13:00:00Z',
    'findings: findings-fixture (fixture) — as of 2026-08-29T13:00:00Z',
    'operational-values: operational-values-fixture (fixture) — as of 2026-08-29T13:00:00Z'
  ]);
});

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
  await expect(page.getByRole('heading', { name: 'Runs', exact: true, level: 2 })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.run-status-counts li')).toContainText(['completed: 1', 'in-progress: 1']);
  await expect(page.locator('.run-conclusion-counts li')).toContainText(['success: 1', 'unknown: 1']);
  await expect(page.locator('.run-outcome-counts li')).toContainText(['accepted: 1', 'pending: 1']);
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('tbody tr').first().locator('td')).toContainText([
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
  await expect(page.locator('tbody tr').nth(1).locator('td')).toContainText([
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
