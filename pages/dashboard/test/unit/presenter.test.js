// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

describe('presenter built-in pages', () => {
  it('DLS-PAGE-004 DLS-PAGE-014 renders built-in repositories page with repository inventory, rankings by run count and AIC, separated operational-value definitions, provenance, and independent data state deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'repositories-dashboard',
        title: 'Repositories Dashboard',
        pages: [
          {
            id: 'repositories',
            kind: /** @type {'built-in'} */ ('built-in'),
            page: 'repositories',
            title: 'Repositories',
            definition: {
              'data-state': {
                availability: true,
                completeness: true,
                freshness: true
              },
              views: [
                { id: 'repositories-source', data: { source: 'repositories' } },
                { id: 'runs-source', data: { source: 'runs' } },
                { id: 'usage-source', data: { source: 'usage' } },
                { id: 'operational-values-source', data: { source: 'operational-values' } }
              ]
            }
          }
        ]
      }
    };

    const rendered = renderDashboard({
      document,
      sources: {
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
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        runs: {
          source: 'runs',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', 'started-at': '2026-08-29T09:00:00Z', 'run-status': 'completed', 'run-conclusion': 'success', 'rollout-mode': 'live', engine: 'gpt', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', 'started-at': '2026-08-29T09:10:00Z', 'run-status': 'completed', 'run-conclusion': 'failure', 'rollout-mode': 'live', engine: 'gpt', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1' },
            { organization: 'github', repository: 'mona-tools', workflow: '.github/workflows/review.yml', run: '2001', 'started-at': '2026-08-29T08:00:00Z', 'run-status': 'completed', 'run-conclusion': 'success', 'rollout-mode': 'review', engine: 'gpt', 'requested-model': 'gpt-4o-mini', 'resolved-model': 'gpt-4o-mini' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '3001', 'started-at': '2026-08-29T07:00:00Z', 'run-status': 'completed', 'run-conclusion': 'success', 'rollout-mode': 'live', engine: 'claude', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.5' }
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
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', invocation: 'u1', engine: 'gpt', 'requested-model': 'gpt-4o', 'resolved-model': 'gpt-4.1', 'rollout-mode': 'live', 'input-tokens': 100, 'output-tokens': 50, 'cache-read-tokens': 20, 'cache-write-tokens': 10, 'reasoning-tokens': 5, aic: 7.5, 'observed-at': '2026-08-29T09:05:00Z' },
            { organization: 'github', repository: 'mona-tools', workflow: '.github/workflows/review.yml', run: '2001', invocation: 'u2', engine: 'gpt', 'requested-model': 'gpt-4o-mini', 'resolved-model': 'gpt-4o-mini', 'rollout-mode': 'review', 'input-tokens': 200, 'output-tokens': 80, 'cache-read-tokens': 40, 'cache-write-tokens': 15, 'reasoning-tokens': 7, aic: 4.5, 'observed-at': '2026-08-29T08:05:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '3001', invocation: 'u3', engine: 'claude', 'requested-model': 'claude-3.5', 'resolved-model': 'claude-3.5', 'rollout-mode': 'live', 'input-tokens': 150, 'output-tokens': 60, 'cache-read-tokens': 30, 'cache-write-tokens': 12, 'reasoning-tokens': 9, aic: 9.25, 'observed-at': '2026-08-29T07:05:00Z' }
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
        },
        'operational-values': {
          source: 'operational-values',
          rows: [
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1001', 'operational-case': 'triage', 'evaluator-digest': 'digest-a', 'rollout-mode': 'live', 'operational-value': 0.75, 'operational-value-definition': 'merge-latency', 'requested-evidence-at': '2026-08-29T09:00:00Z', 'evidence-cutoff': '2026-08-29T09:30:00Z', 'maturity-at': '2026-08-29T10:00:00Z', 'maturity-status': 'accepted', 'delta-from-baseline': 0.2, 'observed-at': '2026-08-29T10:05:00Z' },
            { organization: 'github', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.yml', run: '1002', 'operational-case': 'triage', 'evaluator-digest': 'digest-b', 'rollout-mode': 'live', 'operational-value': 0.65, 'operational-value-definition': 'review-latency', 'requested-evidence-at': '2026-08-29T09:15:00Z', 'evidence-cutoff': '2026-08-29T09:45:00Z', 'maturity-at': '2026-08-29T10:15:00Z', 'maturity-status': 'accepted', 'delta-from-baseline': 0.1, 'observed-at': '2026-08-29T10:20:00Z' },
            { organization: 'octo-org', repository: 'octo-repo', workflow: '.github/workflows/nightly.yml', run: '3001', 'operational-case': 'summaries', 'evaluator-digest': 'digest-c', 'rollout-mode': 'live', 'operational-value': 0.95, 'operational-value-definition': 'merge-latency', 'requested-evidence-at': '2026-08-29T07:00:00Z', 'evidence-cutoff': '2026-08-29T07:30:00Z', 'maturity-at': '2026-08-29T08:00:00Z', 'maturity-status': 'accepted', 'delta-from-baseline': 0.4, 'observed-at': '2026-08-29T08:10:00Z' }
          ],
          metadata: {
            'source-id': 'operational-values-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T19:00:00Z',
            'retrieved-at': '2026-08-29T19:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      }
    });

    expect(rendered.querySelector('[data-page-name="repositories"]')?.textContent).toContain('Repository Inventory and Rankings');
    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelectorAll('.repositories-table tbody tr')).toHaveLength(3);

    const firstRow = rendered.querySelector('.repositories-table tbody tr');
    expect(firstRow?.getAttribute('data-repository-id')).toBe('central-agentic-ops');

    const caoRow = rendered.querySelector('[data-repository-id="central-agentic-ops"]');
    expect(caoRow?.textContent).toContain('Central Agentic Ops');
    expect(caoRow?.textContent).toContain('2');
    expect(caoRow?.textContent).toContain('7.50');
    expect(caoRow?.textContent).toContain('merge-latency: 0.75');
    expect(caoRow?.textContent).toContain('review-latency: 0.65');

    const monaRow = rendered.querySelector('[data-repository-id="mona-tools"]');
    expect(monaRow?.textContent).toContain('4.50');
    expect(monaRow?.textContent).toContain('Unavailable');

    const octoRow = rendered.querySelector('[data-repository-id="octo-repo"]');
    expect(octoRow?.textContent).toContain('9.25');
    expect(octoRow?.textContent).toContain('merge-latency: 0.95');

    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('repositories: repositories-fixture (fixture) — as of 2026-08-29T19:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('operational-values: operational-values-fixture (fixture) — as of 2026-08-29T19:00:00Z');
  });
});
