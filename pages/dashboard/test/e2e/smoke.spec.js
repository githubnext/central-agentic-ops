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

test('DLS-PAGE-009 DLS-PAGE-014 built-in evals page renders distinguishable definitions and observations, observed subject, YES/NO/UNKNOWN result, evaluation model when available, time, provenance, and independent data state in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-evals-render',
          title: 'Built In Evals Render',
          pages: [
            {
              id: 'evals',
              kind: 'built-in',
              page: 'evals',
              title: 'Evals',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'evals-source', data: { source: 'evals' } },
                  { id: 'eval-observations-source', data: { source: 'eval-observations' } }
                ]
              }
            }
          ]
        }
      };

      const sources = {
        evals: {
          source: 'evals',
          rows: [
            { eval: 'release-risk', 'eval-name': 'Release Risk', 'eval-question': 'Is the release risky?', 'requested-model': 'gpt-4o', 'observed-at': '2026-08-29T09:00:00Z' },
            { eval: 'doc-quality', 'eval-name': 'Documentation Quality', 'eval-question': 'Is the documentation complete?', 'requested-model': 'claude-3.5', 'observed-at': '2026-08-29T09:05:00Z' }
          ],
          metadata: {
            'source-id': 'evals-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        'eval-observations': {
          source: 'eval-observations',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', eval: 'release-risk', 'eval-result': 'YES', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:00:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', eval: 'release-risk', 'eval-result': 'UNKNOWN', 'requested-model': 'gpt-4o', 'resolved-model': '', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:10:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', eval: 'doc-quality', 'eval-result': 'NO', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.7', 'rollout-mode': 'review', 'observed-at': '2026-08-29T10:20:00Z' }
          ],
          metadata: {
            'source-id': 'eval-observations-fixture',
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

  await expect(page.getByRole('heading', { name: 'Built In Evals Render' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evals', exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Eval Definitions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Eval Observations' })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.evals-definitions-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.eval-observations-table tbody tr')).toHaveCount(3);

  await expect(page.locator('[data-eval-id="release-risk"] td').nth(1)).toHaveText('Release Risk');
  await expect(page.locator('[data-eval-id="release-risk"] td').nth(2)).toHaveText('Is the release risky?');
  await expect(page.locator('[data-eval-id="release-risk"] td').nth(3)).toHaveText('gpt-4o');
  await expect(page.locator('[data-eval-id="release-risk"] td').nth(5)).toHaveText('2');
  await expect(page.locator('[data-eval-id="release-risk"] td').nth(6)).toContainText('github / central-agentic-ops / .github/workflows/daily.yml / run 1001');
  await expect(page.locator('[data-eval-id="release-risk"] td').nth(6)).toContainText('github / central-agentic-ops / .github/workflows/daily.yml / run 1002');
  await expect(page.locator('[data-eval-id="release-risk"] td').nth(7)).toHaveText('YES: 1, UNKNOWN: 1');
  await expect(page.locator('[data-eval-id="release-risk"] td').nth(8)).toContainText('gpt-4o → gpt-4.1');
  await expect(page.locator('[data-eval-id="release-risk"] td').nth(9)).toHaveText('2026-08-29T10:10:00Z');

  await expect(page.locator('[data-eval-id="doc-quality"] td').nth(1)).toHaveText('Documentation Quality');
  await expect(page.locator('[data-eval-id="doc-quality"] td').nth(7)).toHaveText('NO: 1');
  await expect(page.locator('[data-eval-id="doc-quality"] td').nth(8)).toContainText('claude-3.5 → claude-3.7');

  await expect(page.locator('[data-eval-observation-key="release-risk-1001-0"]')).toContainText('release-risk');
  await expect(page.locator('[data-eval-observation-key="release-risk-1001-0"]')).toContainText('YES');
  await expect(page.locator('[data-eval-observation-key="release-risk-1001-0"]')).toContainText('gpt-4o');
  await expect(page.locator('[data-eval-observation-key="release-risk-1001-0"]')).toContainText('gpt-4.1');
  await expect(page.locator('[data-eval-observation-key="release-risk-1002-1"]')).toContainText('UNKNOWN');
  await expect(page.locator('[data-eval-observation-key="release-risk-1002-1"]')).toContainText('unknown');
  await expect(page.locator('[data-eval-observation-key="doc-quality-2001-2"]')).toContainText('NO');
  await expect(page.locator('[data-eval-observation-key="doc-quality-2001-2"]')).toContainText('claude-3.7');

  await expect(page.locator('.provenance-list li')).toContainText([
    'evals: evals-fixture (fixture) — as of 2026-08-29T20:00:00Z',
    'eval-observations: eval-observations-fixture (fixture) — as of 2026-08-29T20:00:00Z'
  ]);
});

test('DLS-SAFE-007 DLS-SAFE-008 DLS-SAFE-010 built-in findings page exposes accessible names, labeled columns, textual data states, and labeled external links in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'security-dashboard',
          title: 'Security Dashboard',
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
              finding: 'unsafe-html',
              'finding-summary': '<img src=x onerror=alert(1)>',
              'finding-severity': 'critical',
              'finding-status': 'open',
              organization: 'github',
              repository: 'central-agentic-ops',
              workflow: '.github/workflows/daily.yml',
              'observed-at': '2026-08-29T12:00:00Z',
              'issue-link': {
                relation: 'issue',
                href: 'https://example.com/issues/1',
                label: 'Issue 1 label'
              }
            }
          ],
          metadata: {
            'source-id': 'findings-fixture',
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

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Security Dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Findings', exact: true, level: 2 })).toBeVisible();
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('complete');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('fresh');
  await expect(page.getByRole('columnheader', { name: 'Issue Link' })).toBeVisible();
  await expect(page.locator('[data-finding-id="unsafe-html"] td').first()).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('[data-finding-id="unsafe-html"] img')).toHaveCount(0);

  const issueLink = page.getByRole('link', { name: 'Issue 1 label' });
  await expect(issueLink).toBeVisible();
  await expect(issueLink).toHaveAttribute('href', 'https://example.com/issues/1');
  await expect(issueLink).toHaveAttribute('target', '_blank');
  await expect(issueLink).toHaveAttribute('rel', 'noopener noreferrer');
});

test('DLS-SAFE-007 DLS-SAFE-008 keyboard navigation moves across labeled page sections in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard, enableDashboardKeyboardNavigation } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'runs-dashboard',
          title: 'Runs Dashboard',
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
                  { id: 'runs-source', data: { source: 'runs' } },
                  { id: 'outcomes-source', data: { source: 'outcomes' } }
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
              organization: 'github',
              repository: 'central-agentic-ops',
              workflow: '.github/workflows/daily.yml',
              run: '1001',
              'run-status': 'completed',
              'run-conclusion': 'success',
              'rollout-mode': 'live',
              engine: 'actions',
              'requested-model': 'gpt-4o',
              'resolved-model': 'gpt-4.1',
              'started-at': '2026-08-29T10:00:00Z',
              'run-link': {
                relation: 'run',
                href: 'https://example.com/runs/1001',
                label: 'Run 1001'
              }
            }
          ],
          metadata: {
            'source-id': 'runs-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        outcomes: {
          source: 'outcomes',
          rows: [
            { run: '1001', 'outcome-state': 'accepted' }
          ],
          metadata: {
            'source-id': 'outcomes-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      };

      const root = document.querySelector('#root');
      const dashboard = renderDashboard({ document: dashboardDocument, sources });
      root.append(dashboard);
      enableDashboardKeyboardNavigation(dashboard);
    </script>
  `);

  const sections = page.locator('.runs-page .page-section');
  await expect(sections).toHaveCount(4);
  await expect(page.locator('#runs-run-status-counts-heading')).toHaveText('Run Status Counts');
  await expect(page.locator('#runs-run-conclusion-counts-heading')).toHaveText('Run Conclusion Counts');

  await sections.nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await expect(sections.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(sections.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(sections.nth(1)).toBeFocused();
});
