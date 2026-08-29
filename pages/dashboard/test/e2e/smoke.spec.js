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

test('DLS-PAGE-005 DLS-PAGE-014 built-in workflows page renders inventory, active state, rollout mode, run conclusions, outcomes, usage, findings, operational value, and independent data state in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

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
  const presenterModuleUrl = buildPresenterModuleUrl();

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

test('DLS-PAGE-013 DLS-PAGE-014 built-in findings page renders summary, severity, status, scope, time, provenance, and available issue, pull-request, and run links in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-findings-render',
          title: 'Built In Findings Render',
          pages: [
            {
              id: 'findings',
              kind: 'built-in',
              page: 'findings',
              title: 'Findings',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'findings-source', data: { source: 'findings' } }
                ]
              }
            }
          ]
        }
      };

      const sources = {
        findings: {
          source: 'findings',
          rows: [
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'dashboard.yml',
              finding: 'f-100',
              'finding-summary': 'Unsafe shell interpolation in generated script',
              'finding-severity': 'high',
              'finding-status': 'open',
              'observed-at': '2026-08-29T15:00:00Z',
              'issue-link': {
                relation: 'issue',
                href: 'https://example.com/issues/42',
                label: 'Issue 42'
              },
              'pull-request-link': {
                relation: 'pull-request',
                href: 'https://example.com/pull/7',
                label: 'Pull Request 7'
              },
              'run-link': {
                relation: 'run',
                href: 'https://example.com/runs/1001',
                label: 'Run 1001'
              }
            },
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'release.yml',
              finding: 'f-101',
              'finding-summary': 'Missing provenance on partial dataset',
              'finding-severity': 'low',
              'finding-status': 'resolved',
              'observed-at': '2026-08-29T16:00:00Z'
            }
          ],
          metadata: {
            'source-id': 'findings-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T16:30:00Z',
            'retrieved-at': '2026-08-29T16:31:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Built In Findings Render' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Findings', exact: true, level: 2 })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.finding-severity-counts li')).toContainText(['high: 1', 'low: 1']);
  await expect(page.locator('.finding-status-counts li')).toContainText(['open: 1', 'resolved: 1']);
  await expect(page.locator('.findings-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.findings-table tbody tr').first().locator('td')).toContainText([
    'Unsafe shell interpolation in generated script',
    'high',
    'open',
    'githubnext',
    'central-agentic-ops',
    'dashboard.yml',
    '2026-08-29T15:00:00Z',
    'Issue 42',
    'Pull Request 7',
    'Run 1001'
  ]);
  await expect(page.locator('.findings-table tbody tr').nth(1).locator('td')).toContainText([
    'Missing provenance on partial dataset',
    'low',
    'resolved',
    'release.yml',
    '2026-08-29T16:00:00Z',
    'Unavailable',
    'Unavailable',
    'Unavailable'
  ]);
  await expect(page.getByRole('link', { name: 'Issue 42' })).toHaveAttribute('href', 'https://example.com/issues/42');
  await expect(page.getByRole('link', { name: 'Pull Request 7' })).toHaveAttribute('href', 'https://example.com/pull/7');
  await expect(page.getByRole('link', { name: 'Run 1001' })).toHaveAttribute('href', 'https://example.com/runs/1001');
  await expect(page.locator('.provenance-list li')).toContainText([
    'findings: findings-fixture (fixture) — as of 2026-08-29T16:30:00Z'
  ]);
});

test('DLS-PRES-001 GitHub Primer brand-aligned app shell, sidebar navigation, and Octicon elements render correctly in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'primer-shell-render',
          title: 'Agentic Operations Dashboard',
          description: 'Unified operational health, workflows, and execution telemetry.',
          pages: [
            {
              id: 'workflows',
              kind: 'built-in',
              page: 'workflows',
              title: 'Workflows',
              definition: {
                'data-state': { availability: true, completeness: true, freshness: true },
                views: [{ id: 'workflows-source', data: { source: 'workflows' } }]
              }
            },
            {
              id: 'runs',
              kind: 'built-in',
              page: 'runs',
              title: 'Runs',
              definition: {
                'data-state': { availability: true, completeness: true, freshness: true },
                views: [{ id: 'runs-source', data: { source: 'runs' } }]
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
          rows: [],
          metadata: {
            'source-id': 'runs-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'empty'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.locator('.skip-link')).toHaveAttribute('href', '#main-content');
  await expect(page.locator('.org-sidebar')).toBeVisible();
  await expect(page.locator('.sidebar-brand-mark')).toBeVisible();
  await expect(page.locator('.brand-title')).toHaveText('Agentic Operations Dashboard');
  await expect(page.locator('.brand-org')).toHaveText('githubnext');
  await expect(page.locator('.primary-nav .nav-item')).toHaveCount(2);
  await expect(page.locator('.primary-nav .nav-item').first()).toHaveClass(/active/);
  await expect(page.locator('.primary-nav .nav-item .octicon-workflow')).toBeVisible();
  await expect(page.locator('.primary-nav .nav-item .octicon-play')).toBeVisible();
  await expect(page.locator('.breadcrumb')).toContainText('githubnext');
  await expect(page.locator('.overview-header h1')).toHaveText('Agentic Operations Dashboard');
  await expect(page.locator('.overview-header p')).toHaveText('Unified operational health, workflows, and execution telemetry.');
  await expect(page.locator('.status.status-success').first()).toBeVisible();
  await expect(page.locator('.mode-badge.mode-live')).toHaveText('live');
  await expect(page.locator('.report-footer')).toContainText('GitHub Primer Design System');
});
