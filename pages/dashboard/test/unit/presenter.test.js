// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

describe('presenter built-in pages', () => {
  it('DLS-PAGE-007 DLS-PAGE-014 renders built-in experiments page with definitions, observed assignments, grader observations, eval observations, outcomes, usage, operational value, provenance, and independent data state deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'experiments-dashboard',
        title: 'Experiments Dashboard',
        pages: [
          {
            id: 'experiments',
            kind: /** @type {'built-in'} */ ('built-in'),
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

    const rendered = renderDashboard({
      document,
      sources: {
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
      }
    });

    expect(rendered.querySelector('[data-page-name="experiments"]')?.textContent).toContain('Experiment Definitions and Observed Associations');
    expect(rendered.querySelector('[data-page-name="experiments"]')?.textContent).toContain('without implying causation');
    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelectorAll('.experiments-table tbody tr')).toHaveLength(2);

    const alphaRow = rendered.querySelector('[data-experiment-id="exp-alpha"]');
    expect(alphaRow?.textContent).toContain('Experiment Alpha');
    expect(alphaRow?.textContent).toContain('control: 1, treatment: 1');
    expect(alphaRow?.textContent).toContain('pass: 1, fail: 1');
    expect(alphaRow?.textContent).toContain('YES: 1, NO: 1');
    expect(alphaRow?.textContent).toContain('accepted: 1, rejected: 1');
    expect(alphaRow?.textContent).toContain('6');
    expect(alphaRow?.textContent).toContain('merge-latency: 0.55');
    expect(alphaRow?.textContent).toContain('review-latency: 0.60');

    const betaRow = rendered.querySelector('[data-experiment-id="exp-beta"]');
    expect(betaRow?.textContent).toContain('Experiment Beta');
    expect(betaRow?.textContent).toContain('variant-b: 1');
    expect(betaRow?.textContent).toContain('pass: 1');
    expect(betaRow?.textContent).toContain('UNKNOWN: 1');
    expect(betaRow?.textContent).toContain('pending: 1');
    expect(betaRow?.textContent).toContain('4.25');
    expect(betaRow?.textContent).toContain('merge-latency: 0.80');

    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('experiments: experiments-fixture (fixture) — as of 2026-08-29T20:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('experiment-assignments: assignments-fixture (fixture) — as of 2026-08-29T20:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('grader-observations: grader-observations-fixture (fixture) — as of 2026-08-29T20:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('eval-observations: eval-observations-fixture (fixture) — as of 2026-08-29T20:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('outcomes: outcomes-fixture (fixture) — as of 2026-08-29T20:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('usage: usage-fixture (fixture) — as of 2026-08-29T20:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('operational-values: operational-values-fixture (fixture) — as of 2026-08-29T20:00:00Z');
  });
});
