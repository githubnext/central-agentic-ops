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

test('DLS-PAGE-003 DLS-PAGE-014 built-in organizations page renders organization inventory, repository count, workflow count, run count, available usage measures, provenance, and independent data state in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-organizations-render',
          title: 'Built In Organizations Render',
          pages: [
            {
              id: 'organizations',
              kind: 'built-in',
              page: 'organizations',
              title: 'Organizations',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'organizations-source', data: { source: 'organizations' } },
                  { id: 'repositories-source', data: { source: 'repositories' } },
                  { id: 'workflows-source', data: { source: 'workflows' } },
                  { id: 'runs-source', data: { source: 'runs' } },
                  { id: 'usage-source', data: { source: 'usage' } }
                ]
              }
            }
          ]
        }
      };

      const sources = {
        organizations: {
          source: 'organizations',
          rows: [
            { organization: 'github', 'organization-name': 'GitHub', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'octo-org', 'organization-name': 'Octo Org', 'observed-at': '2026-08-29T10:00:00Z' }
          ],
          metadata: {
            'source-id': 'organizations-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        repositories: {
          source: 'repositories',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', 'repository-name': 'Central Agentic Ops', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'github', repository: 'mona-tools', 'repository-name': 'Mona Tools', 'rollout-mode': 'review', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', 'repository-name': 'Octo Repo', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' }
          ],
          metadata: {
            'source-id': 'repositories-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        workflows: {
          source: 'workflows',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', 'workflow-name': 'Daily', 'workflow-active': 'true', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'github', repository: 'mona-tools', workflow: '.github/workflows/review.yml', 'workflow-name': 'Review', 'workflow-active': 'false', 'rollout-mode': 'review', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', 'workflow-name': 'Nightly', 'workflow-active': 'true', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' }
          ],
          metadata: {
            'source-id': 'workflows-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        runs: {
          source: 'runs',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', 'started-at': '2026-08-29T09:00:00Z', 'run-status': 'completed', 'run-conclusion': 'success', 'rollout-mode': 'live', engine: 'gpt', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1' },
            { organization: 'github', repository: 'mona-tools', workflow: '.github/workflows/review.yml', run: '1002', 'started-at': '2026-08-29T09:30:00Z', 'run-status': 'completed', 'run-conclusion': 'failure', 'rollout-mode': 'review', engine: 'gpt', 'requested-model': 'gpt-4o-mini', 'resolved-model': 'gpt-4o-mini' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', 'started-at': '2026-08-29T08:00:00Z', 'run-status': 'in-progress', 'run-conclusion': 'unknown', 'rollout-mode': 'live', engine: 'claude', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.5' }
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
        usage: {
          source: 'usage',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', invocation: 'u1', engine: 'gpt', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'live', 'input-tokens': 100, 'output-tokens': 50, 'cache-read-tokens': 20, 'cache-write-tokens': 10, 'reasoning-tokens': 5, aic: 3.5, 'observed-at': '2026-08-29T09:05:00Z' },
            { organization: 'github', repository: 'mona-tools', workflow: '.github/workflows/review.yml', run: '1002', invocation: 'u2', engine: 'gpt', 'requested-model': 'gpt-4o-mini', 'resolved-model': 'gpt-4o-mini', 'rollout-mode': 'review', 'input-tokens': 200, 'output-tokens': 80, 'cache-read-tokens': 40, 'cache-write-tokens': 15, 'reasoning-tokens': 7, aic: 4.5, 'observed-at': '2026-08-29T09:35:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', invocation: 'u3', engine: 'claude', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.5', 'rollout-mode': 'live', 'input-tokens': 150, 'output-tokens': 60, 'cache-read-tokens': 30, 'cache-write-tokens': 12, 'reasoning-tokens': 9, aic: 2.25, 'observed-at': '2026-08-29T08:05:00Z' }
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

  await expect(page.getByRole('heading', { name: 'Built In Organizations Render' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Organizations', exact: true, level: 2 })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.organizations-table tbody tr')).toHaveCount(2);
  await expect(page.locator('[data-organization-id="github"]')).toContainText('github');
  await expect(page.locator('[data-organization-id="github"]')).toContainText('GitHub');
  await expect(page.locator('[data-organization-id="github"] td').nth(2)).toHaveText('2');
  await expect(page.locator('[data-organization-id="github"] td').nth(3)).toHaveText('2');
  await expect(page.locator('[data-organization-id="github"] td').nth(4)).toHaveText('2');
  await expect(page.locator('[data-organization-id="github"] td').nth(5)).toHaveText('300');
  await expect(page.locator('[data-organization-id="github"] td').nth(6)).toHaveText('130');
  await expect(page.locator('[data-organization-id="github"] td').nth(7)).toHaveText('60');
  await expect(page.locator('[data-organization-id="github"] td').nth(8)).toHaveText('25');
  await expect(page.locator('[data-organization-id="github"] td').nth(9)).toHaveText('12');
  await expect(page.locator('[data-organization-id="github"] td').nth(10)).toHaveText('8');

  await expect(page.locator('[data-organization-id="octo-org"]')).toContainText('octo-org');
  await expect(page.locator('[data-organization-id="octo-org"]')).toContainText('Octo Org');
  await expect(page.locator('[data-organization-id="octo-org"] td').nth(2)).toHaveText('1');
  await expect(page.locator('[data-organization-id="octo-org"] td').nth(3)).toHaveText('1');
  await expect(page.locator('[data-organization-id="octo-org"] td').nth(4)).toHaveText('1');
  await expect(page.locator('[data-organization-id="octo-org"] td').nth(5)).toHaveText('150');
  await expect(page.locator('[data-organization-id="octo-org"] td').nth(6)).toHaveText('60');
  await expect(page.locator('[data-organization-id="octo-org"] td').nth(7)).toHaveText('30');
  await expect(page.locator('[data-organization-id="octo-org"] td').nth(8)).toHaveText('12');
  await expect(page.locator('[data-organization-id="octo-org"] td').nth(9)).toHaveText('9');
  await expect(page.locator('[data-organization-id="octo-org"] td').nth(10)).toHaveText('2.25');
  await expect(page.locator('.provenance-list li')).toContainText([
    'organizations: organizations-fixture (fixture) — as of 2026-08-29T19:00:00Z',
    'repositories: repositories-fixture (fixture) — as of 2026-08-29T19:00:00Z',
    'workflows: workflows-fixture (fixture) — as of 2026-08-29T19:00:00Z',
    'runs: runs-fixture (fixture) — as of 2026-08-29T19:00:00Z',
    'usage: usage-fixture (fixture) — as of 2026-08-29T19:00:00Z'
  ]);
});
