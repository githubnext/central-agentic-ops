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

test('DLS-PAGE-007 DLS-PAGE-014 built-in experiments page renders definitions, observed assignments, grader observations, eval observations, outcomes, usage, operational value, provenance, and independent data state in browser', async ({ page }) => {
  const presenterModuleUrl = buildPresenterModuleUrl();

  await page.setContent(`
    <div id="root"></div>
    <script type="module">
      import { renderDashboard } from ${JSON.stringify(presenterModuleUrl)};

      const dashboardDocument = {
        languageVersion: '0.1.0',
        dashboard: {
          id: 'built-in-experiments-render',
          title: 'Built In Experiments Render',
          pages: [
            {
              id: 'experiments',
              kind: 'built-in',
              page: 'experiments',
              title: 'Experiments',
              definition: {
                'data-state': {
                  availability: true,
                  completeness: true,
                  freshness: true
                },
                views: [
                  { id: 'experiments-source', data: { source: 'experiments' } },
                  { id: 'assignments-source', data: { source: 'experiment-assignments' } },
                  { id: 'grader-observations-source', data: { source: 'grader-observations' } },
                  { id: 'eval-observations-source', data: { source: 'eval-observations' } },
                  { id: 'outcomes-source', data: { source: 'outcomes' } },
                  { id: 'usage-source', data: { source: 'usage' } },
                  { id: 'operational-values-source', data: { source: 'operational-values' } }
                ]
              }
            }
          ]
        }
      };

      const sources = {
        experiments: {
          source: 'experiments',
          rows: [
            { experiment: 'exp-alpha', 'experiment-name': 'Experiment Alpha', 'observed-at': '2026-08-29T10:00:00Z' },
            { experiment: 'exp-beta', 'experiment-name': 'Experiment Beta', 'observed-at': '2026-08-29T10:00:00Z' }
          ],
          metadata: {
            'source-id': 'experiments-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        'experiment-assignments': {
          source: 'experiment-assignments',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', experiment: 'exp-alpha', variant: 'control', 'observed-at': '2026-08-29T10:01:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', experiment: 'exp-alpha', variant: 'treatment', 'observed-at': '2026-08-29T10:02:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', experiment: 'exp-beta', variant: 'variant-b', 'observed-at': '2026-08-29T10:03:00Z' }
          ],
          metadata: {
            'source-id': 'assignments-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        'grader-observations': {
          source: 'grader-observations',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', experiment: 'exp-alpha', grader: 'safety', value: 0.9, status: 'pass', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:04:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', experiment: 'exp-alpha', grader: 'safety', value: 0.2, status: 'fail', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:05:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', experiment: 'exp-beta', grader: 'quality', value: 0.8, status: 'pass', 'rollout-mode': 'review', 'observed-at': '2026-08-29T10:06:00Z' }
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
        },
        'eval-observations': {
          source: 'eval-observations',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', experiment: 'exp-alpha', eval: 'helpfulness', 'eval-result': 'YES', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:07:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', experiment: 'exp-alpha', eval: 'helpfulness', 'eval-result': 'NO', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'live', 'observed-at': '2026-08-29T10:08:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', experiment: 'exp-beta', eval: 'clarity', 'eval-result': 'UNKNOWN', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.5', 'rollout-mode': 'review', 'observed-at': '2026-08-29T10:09:00Z' }
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
        },
        outcomes: {
          source: 'outcomes',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', 'safe-output': 'so-1', 'outcome-state': 'accepted', 'observed-at': '2026-08-29T10:10:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', 'safe-output': 'so-2', 'outcome-state': 'rejected', 'observed-at': '2026-08-29T10:11:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', 'safe-output': 'so-3', 'outcome-state': 'pending', 'observed-at': '2026-08-29T10:12:00Z' }
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
        },
        usage: {
          source: 'usage',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', experiment: 'exp-alpha', invocation: 'u1', engine: 'gpt', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'live', aic: 2.5, 'input-tokens': 100, 'output-tokens': 20, 'cache-read-tokens': 5, 'cache-write-tokens': 1, 'reasoning-tokens': 2, 'observed-at': '2026-08-29T10:13:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', experiment: 'exp-alpha', invocation: 'u2', engine: 'gpt', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'live', aic: 3.5, 'input-tokens': 150, 'output-tokens': 30, 'cache-read-tokens': 6, 'cache-write-tokens': 2, 'reasoning-tokens': 4, 'observed-at': '2026-08-29T10:14:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', experiment: 'exp-beta', invocation: 'u3', engine: 'claude', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.5', 'rollout-mode': 'review', aic: 4.25, 'input-tokens': 90, 'output-tokens': 10, 'cache-read-tokens': 3, 'cache-write-tokens': 1, 'reasoning-tokens': 1, 'observed-at': '2026-08-29T10:15:00Z' }
          ],
          metadata: {
            'source-id': 'usage-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T20:00:00Z',
            'retrieved-at': '2026-08-29T20:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        'operational-values': {
          source: 'operational-values',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', experiment: 'exp-alpha', 'operational-case': 'triage', 'evaluator-digest': 'digest-a', 'rollout-mode': 'live', 'operational-value': 0.55, 'operational-value-definition': 'merge-latency', 'requested-evidence-at': '2026-08-29T10:00:00Z', 'evidence-cutoff': '2026-08-29T10:30:00Z', 'maturity-at': '2026-08-29T11:00:00Z', 'maturity-status': 'accepted', 'delta-from-baseline': 0.1, 'observed-at': '2026-08-29T10:16:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', experiment: 'exp-alpha', 'operational-case': 'triage', 'evaluator-digest': 'digest-b', 'rollout-mode': 'live', 'operational-value': 0.6, 'operational-value-definition': 'review-latency', 'requested-evidence-at': '2026-08-29T10:05:00Z', 'evidence-cutoff': '2026-08-29T10:35:00Z', 'maturity-at': '2026-08-29T11:05:00Z', 'maturity-status': 'accepted', 'delta-from-baseline': 0.2, 'observed-at': '2026-08-29T10:17:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '2001', experiment: 'exp-beta', 'operational-case': 'summaries', 'evaluator-digest': 'digest-c', 'rollout-mode': 'review', 'operational-value': 0.8, 'operational-value-definition': 'merge-latency', 'requested-evidence-at': '2026-08-29T10:06:00Z', 'evidence-cutoff': '2026-08-29T10:36:00Z', 'maturity-at': '2026-08-29T11:06:00Z', 'maturity-status': 'accepted', 'delta-from-baseline': 0.3, 'observed-at': '2026-08-29T10:18:00Z' }
          ],
          metadata: {
            'source-id': 'operational-values-fixture',
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

  await expect(page.getByRole('heading', { name: 'Built In Experiments Render' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Experiments', exact: true, level: 2 })).toBeVisible();
  await expect(page.locator('[data-page-name="experiments"]')).toContainText('without implying causation');
  await expect(page.locator('[data-state-axis="availability"]')).toHaveText('available');
  await expect(page.locator('[data-state-axis="completeness"]')).toHaveText('partial');
  await expect(page.locator('[data-state-axis="freshness"]')).toHaveText('stale');
  await expect(page.locator('.experiments-table tbody tr')).toHaveCount(2);

  await expect(page.locator('[data-experiment-id="exp-alpha"] td').nth(2)).toHaveText('control: 1, treatment: 1');
  await expect(page.locator('[data-experiment-id="exp-alpha"] td').nth(3)).toHaveText('pass: 1, fail: 1');
  await expect(page.locator('[data-experiment-id="exp-alpha"] td').nth(4)).toHaveText('YES: 1, NO: 1');
  await expect(page.locator('[data-experiment-id="exp-alpha"] td').nth(5)).toHaveText('accepted: 1, rejected: 1');
  await expect(page.locator('[data-experiment-id="exp-alpha"] td').nth(6)).toHaveText('6');
  await expect(page.locator('[data-experiment-id="exp-alpha"] td').nth(7)).toContainText('merge-latency: 0.55');
  await expect(page.locator('[data-experiment-id="exp-alpha"] td').nth(7)).toContainText('review-latency: 0.60');

  await expect(page.locator('[data-experiment-id="exp-beta"] td').nth(2)).toHaveText('variant-b: 1');
  await expect(page.locator('[data-experiment-id="exp-beta"] td').nth(3)).toHaveText('pass: 1');
  await expect(page.locator('[data-experiment-id="exp-beta"] td').nth(4)).toHaveText('UNKNOWN: 1');
  await expect(page.locator('[data-experiment-id="exp-beta"] td').nth(5)).toHaveText('pending: 1');
  await expect(page.locator('[data-experiment-id="exp-beta"] td').nth(6)).toHaveText('4.25');
  await expect(page.locator('[data-experiment-id="exp-beta"] td').nth(7)).toContainText('merge-latency: 0.80');

  await expect(page.locator('.provenance-list li')).toContainText([
    'experiments: experiments-fixture (fixture) — as of 2026-08-29T20:00:00Z',
    'experiment-assignments: assignments-fixture (fixture) — as of 2026-08-29T20:00:00Z',
    'grader-observations: grader-observations-fixture (fixture) — as of 2026-08-29T20:00:00Z',
    'eval-observations: eval-observations-fixture (fixture) — as of 2026-08-29T20:00:00Z',
    'outcomes: outcomes-fixture (fixture) — as of 2026-08-29T20:00:00Z',
    'usage: usage-fixture (fixture) — as of 2026-08-29T20:00:00Z',
    'operational-values: operational-values-fixture (fixture) — as of 2026-08-29T20:00:00Z'
  ]);
});
