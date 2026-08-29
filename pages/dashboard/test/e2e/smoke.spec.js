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

test('DLS-PAGE-012 DLS-PAGE-014 built-in operational-value page renders a time-ordered absolute attainment series with definition, operational case, evaluator digest, subject, evidence timing, maturity, delta, evidence links, provenance, and independent data state in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-operational-value-render',
          title: 'Built In Operational Value Render',
          pages: [
            {
              id: 'operational-value',
              kind: 'built-in',
              page: 'operational-value',
              title: 'Operational Value',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'operational-values-source', data: { source: 'operational-values' } }
                ]
              }
            }
          ]
        }
      };

      const sources = {
        'operational-values': {
          source: 'operational-values',
          rows: [
            {
              organization: 'github',
              repository: 'central-agentic-ops',
              workflow: '.github/workflows/daily.yml',
              run: '1002',
              experiment: 'baseline-live',
              'operational-case': 'merge-latency',
              'evaluator-digest': 'sha256:def456',
              'operational-value': 0.71,
              'operational-value-definition': 'merge-efficiency',
              'requested-evidence-at': '2026-08-28T09:30:00Z',
              'evidence-cutoff': '2026-08-28T10:00:00Z',
              'maturity-at': '2026-08-29T12:00:00Z',
              'maturity-status': 'pending',
              'delta-from-baseline': null,
              'observed-at': '2026-08-28T11:00:00Z'
            },
            {
              organization: 'github',
              repository: 'central-agentic-ops',
              workflow: '.github/workflows/daily.yml',
              run: '1001',
              experiment: 'baseline-review',
              'operational-case': 'merge-latency',
              'evaluator-digest': 'sha256:abc123',
              'operational-value': 0.83,
              'operational-value-definition': 'merge-efficiency',
              'requested-evidence-at': '2026-08-29T09:30:00Z',
              'evidence-cutoff': '2026-08-29T10:00:00Z',
              'maturity-at': '2026-08-30T12:00:00Z',
              'maturity-status': 'accepted',
              'delta-from-baseline': 0.12,
              'observed-at': '2026-08-29T11:00:00Z',
              'evidence-link': {
                relation: 'evidence',
                href: 'https://example.com/evidence/1001',
                label: 'Evidence 1001'
              }
            }
          ],
          metadata: {
            'source-id': 'operational-values-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        }
      };

      document.querySelector('#root').append(renderDashboard({ document: dashboardDocument, sources }));
    </script>
  `);

  await expect(page.getByRole('heading', { name: 'Built In Operational Value Render' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Operational Value', exact: true, level: 2 })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.operational-value-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.operational-value-table tbody tr').first().locator('td')).toContainText([
    '2026-08-28T11:00:00Z',
    '0.71',
    'merge-efficiency',
    'merge-latency',
    'sha256:def456',
    'github',
    'central-agentic-ops',
    '.github/workflows/daily.yml',
    '1002',
    'baseline-live',
    '2026-08-28T09:30:00Z',
    '2026-08-28T10:00:00Z',
    '2026-08-29T12:00:00Z',
    'pending',
    'Unavailable',
    'Unavailable'
  ]);
  await expect(page.locator('.operational-value-table tbody tr').nth(1).locator('td')).toContainText([
    '2026-08-29T11:00:00Z',
    '0.83',
    'merge-efficiency',
    'merge-latency',
    'sha256:abc123',
    '1001',
    'baseline-review',
    'accepted',
    '0.12',
    'Evidence 1001'
  ]);
  await expect(page.locator('.operational-value-table tbody tr').nth(1).getByRole('link', { name: 'Evidence 1001' })).toHaveAttribute('href', 'https://example.com/evidence/1001');
  await expect(page.locator('.provenance-list li')).toContainText([
    'operational-values: operational-values-fixture (fixture) — as of 2026-08-29T19:00:00Z'
  ]);
});
