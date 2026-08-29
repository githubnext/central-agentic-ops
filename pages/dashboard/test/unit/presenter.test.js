// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

describe('presenter built-in pages', () => {
  it('DLS-PAGE-008 DLS-PAGE-014 renders built-in graders page with distinguishable definitions and observations, observed subject, result, score when present, time, provenance, and independent data state deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'graders-dashboard',
        title: 'Graders Dashboard',
        pages: [
          {
            id: 'graders',
            kind: /** @type {'built-in'} */ ('built-in'),
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

    const rendered = renderDashboard({
      document,
      sources: {
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
      }
    });

    const gradersPage = rendered.querySelector('[data-page-name="graders"]');
    expect(gradersPage?.textContent).toContain('Grader Definitions');
    expect(gradersPage?.textContent).toContain('Grader Observations');
    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelectorAll('.graders-definitions-table tbody tr')).toHaveLength(2);
    expect(rendered.querySelectorAll('.grader-observations-table tbody tr')).toHaveLength(3);

    const qualityDefinition = rendered.querySelector('[data-grader-id="quality"]');
    expect(qualityDefinition?.textContent).toContain('Quality Gate');
    expect(qualityDefinition?.textContent).toContain('2');
    expect(qualityDefinition?.textContent).toContain('github / central-agentic-ops / .github/workflows/daily.yml / run 1001');
    expect(qualityDefinition?.textContent).toContain('github / central-agentic-ops / .github/workflows/daily.yml / run 1002');
    expect(qualityDefinition?.textContent).toContain('pass: 1, error: 1');
    expect(qualityDefinition?.textContent).toContain('0.75');
    expect(qualityDefinition?.textContent).toContain('2026-08-29T10:10:00Z');

    const safetyDefinition = rendered.querySelector('[data-grader-id="safety"]');
    expect(safetyDefinition?.textContent).toContain('Safety Gate');
    expect(safetyDefinition?.textContent).toContain('1');
    expect(safetyDefinition?.textContent).toContain('octo-org / octo-repo / .github/workflows/nightly.yml / run 2001');
    expect(safetyDefinition?.textContent).toContain('fail: 1');
    expect(safetyDefinition?.textContent).toContain('0.25');

    const observationRows = rendered.querySelectorAll('.grader-observations-table tbody tr');
    expect(observationRows[0]?.textContent).toContain('quality');
    expect(observationRows[0]?.textContent).toContain('github / central-agentic-ops / .github/workflows/daily.yml / run 1001');
    expect(observationRows[0]?.textContent).toContain('pass');
    expect(observationRows[0]?.textContent).toContain('0.75');
    expect(observationRows[0]?.textContent).toContain('2026-08-29T10:00:00Z');
    expect(observationRows[1]?.textContent).toContain('error');
    expect(observationRows[1]?.textContent).toContain('Unavailable');
    expect(observationRows[2]?.textContent).toContain('fail');
    expect(observationRows[2]?.textContent).toContain('0.25');

    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('graders: graders-fixture (fixture) — as of 2026-08-29T20:00:00Z');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('grader-observations: grader-observations-fixture (fixture) — as of 2026-08-29T20:00:00Z');
  });
});
