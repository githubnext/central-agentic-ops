// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

describe('presenter built-in pages', () => {
  it('DLS-PAGE-009 DLS-PAGE-014 renders built-in evals page with distinguishable definitions and observations, observed subject, YES/NO/UNKNOWN result, evaluation model when available, time, provenance, and independent data state deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'evals-dashboard',
        title: 'Evals Dashboard',
        pages: [
          {
            id: 'evals',
            kind: /** @type {'built-in'} */ ('built-in'),
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

    const rendered = renderDashboard({
      document,
      sources: {
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
      }
    });

    const evalsPage = rendered.querySelector('[data-page-name="evals"]');
    expect(evalsPage?.textContent).toContain('Eval Definitions');
    expect(evalsPage?.textContent).toContain('Eval Observations');
    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelectorAll('.evals-definitions-table tbody tr')).toHaveLength(2);
    expect(rendered.querySelectorAll('.eval-observations-table tbody tr')).toHaveLength(3);

    const releaseRiskDefinition = rendered.querySelector('[data-eval-id="release-risk"]');
    expect(releaseRiskDefinition?.textContent).toContain('Release Risk');
    expect(releaseRiskDefinition?.textContent).toContain('Is the release risky?');
    expect(releaseRiskDefinition?.textContent).toContain('gpt-4o');
    expect(releaseRiskDefinition?.textContent).toContain('2');
    expect(releaseRiskDefinition?.textContent).toContain('github / central-agentic-ops / .github/workflows/daily.yml / run 1001');
    expect(releaseRiskDefinition?.textContent).toContain('github / central-agentic-ops / .github/workflows/daily.yml / run 1002');
    expect(releaseRiskDefinition?.textContent).toContain('YES: 1, UNKNOWN: 1');
    expect(releaseRiskDefinition?.textContent).toContain('gpt-4o → gpt-4.1');
    expect(releaseRiskDefinition?.textContent).toContain('2026-08-29T10:10:00Z');

    const docQualityDefinition = rendered.querySelector('[data-eval-id="doc-quality"]');
    expect(docQualityDefinition?.textContent).toContain('Documentation Quality');
    expect(docQualityDefinition?.textContent).toContain('NO: 1');
    expect(docQualityDefinition?.textContent).toContain('claude-3.5 → claude-3.7');

    const releaseRiskYesRow = rendered.querySelector('[data-eval-observation-key="release-risk-1001-0"]');
    expect(releaseRiskYesRow?.textContent).toContain('release-risk');
    expect(releaseRiskYesRow?.textContent).toContain('github / central-agentic-ops / .github/workflows/daily.yml / run 1001');
    expect(releaseRiskYesRow?.textContent).toContain('YES');
    expect(releaseRiskYesRow?.textContent).toContain('gpt-4o');
    expect(releaseRiskYesRow?.textContent).toContain('gpt-4.1');

    const releaseRiskUnknownRow = rendered.querySelector('[data-eval-observation-key="release-risk-1002-1"]');
    expect(releaseRiskUnknownRow?.textContent).toContain('UNKNOWN');
    expect(releaseRiskUnknownRow?.textContent).toContain('unknown');

    const docQualityNoRow = rendered.querySelector('[data-eval-observation-key="doc-quality-2001-2"]');
    expect(docQualityNoRow?.textContent).toContain('NO');
    expect(docQualityNoRow?.textContent).toContain('claude-3.7');

    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('evals: evals-fixture (fixture) — as of 2026-08-29T20:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('eval-observations: eval-observations-fixture (fixture) — as of 2026-08-29T20:00:00Z');
  });
});
