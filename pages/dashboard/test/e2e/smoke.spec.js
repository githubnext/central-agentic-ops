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

test('DLS-PAGE-008 DLS-PAGE-014 built-in graders page renders distinguishable definitions and observations, observed subject, result, score when present, time, provenance, and independent data state in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-graders-render',
          title: 'Built In Graders Render',
          pages: [
            {
              id: 'graders',
              kind: 'built-in',
              page: 'graders',
              title: 'Graders',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'graders-source', data: { source: 'graders' } },
                  { id: 'grader-observations-source', data: { source: 'grader-observations' } }
                ]
              }
            }
          ]
        }
      };

      const sources = {
        graders: {
          source: 'graders',
          rows: [
            { grader: 'quality', 'grader-name': 'Quality Gate', 'observed-at': '2026-08-29T09:00:00Z' },
            { grader: 'safety', 'grader-name': 'Safety Gate', 'observed-at': '2026-08-29T09:05:00Z' }
          ],
          metadata: {
            'source-id': 'graders-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        'grader-observations': {
          source: 'grader-observations',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', grader: 'quality', value: 0.75, status: 'pass', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', grader: 'quality', value: null, status: 'error', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:10:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', grader: 'safety', value: 0.25, status: 'fail', 'rollout-mode': 'review', 'observed-at': '2026-08-29T10:20:00Z' }
          ],
          metadata: {
            'source-id': 'grader-observations-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Built In Graders Render' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Graders', exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Grader Definitions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Grader Observations' })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.graders-definitions-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.grader-observations-table tbody tr')).toHaveCount(3);

  await expect(page.locator('[data-grader-id="quality"] td').nth(1)).toHaveText('Quality Gate');
  await expect(page.locator('[data-grader-id="quality"] td').nth(3)).toHaveText('2');
  await expect(page.locator('[data-grader-id="quality"] td').nth(4)).toContainText('github / central-agentic-ops / .github/workflows/daily.yml / run 1001');
  await expect(page.locator('[data-grader-id="quality"] td').nth(4)).toContainText('github / central-agentic-ops / .github/workflows/daily.yml / run 1002');
  await expect(page.locator('[data-grader-id="quality"] td').nth(5)).toHaveText('pass: 1, error: 1');
  await expect(page.locator('[data-grader-id="quality"] td').nth(6)).toHaveText('0.75');
  await expect(page.locator('[data-grader-id="quality"] td').nth(7)).toHaveText('2026-08-29T10:10:00Z');

  await expect(page.locator('[data-grader-id="safety"] td').nth(1)).toHaveText('Safety Gate');
  await expect(page.locator('[data-grader-id="safety"] td').nth(5)).toHaveText('fail: 1');
  await expect(page.locator('[data-grader-id="safety"] td').nth(6)).toHaveText('0.25');

  await expect(page.locator('.grader-observations-table tbody tr').nth(0)).toContainText('quality');
  await expect(page.locator('.grader-observations-table tbody tr').nth(0)).toContainText('github / central-agentic-ops / .github/workflows/daily.yml / run 1001');
  await expect(page.locator('.grader-observations-table tbody tr').nth(0)).toContainText('pass');
  await expect(page.locator('.grader-observations-table tbody tr').nth(0)).toContainText('0.75');
  await expect(page.locator('.grader-observations-table tbody tr').nth(1)).toContainText('error');
  await expect(page.locator('.grader-observations-table tbody tr').nth(1)).toContainText('Unavailable');
  await expect(page.locator('.grader-observations-table tbody tr').nth(2)).toContainText('fail');
  await expect(page.locator('.grader-observations-table tbody tr').nth(2)).toContainText('0.25');

  await expect(page.locator('.provenance-list li')).toContainText([
    'graders: graders-fixture (fixture) — as of 2026-08-29T20:00:00Z',
    'grader-observations: grader-observations-fixture (fixture) — as of 2026-08-29T20:00:00Z'
  ]);
});
