// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

describe('presenter built-in pages', () => {
  it('DLS-PAGE-012 DLS-PAGE-014 renders built-in operational-value page with time-ordered absolute attainment series, definition, operational case, evaluator digest, subject, evidence timing, maturity, baseline delta, evidence links, provenance, and independent data state deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'operational-value-dashboard',
        title: 'Operational Value Dashboard',
        pages: [
          {
            id: 'operational-value',
            kind: /** @type {'built-in'} */ ('built-in'),
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

    const rendered = renderDashboard({
      document,
      sources: {
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
      }
    });

    expect(rendered.querySelector('[data-page-name="operational-value"]')?.textContent).toContain('Operational Value Timeline');
    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelectorAll('.operational-value-table tbody tr')).toHaveLength(2);

    const firstRowText = rendered.querySelector('.operational-value-table tbody tr')?.textContent ?? '';
    expect(firstRowText).toContain('2026-08-28T11:00:00Z');
    expect(firstRowText).toContain('0.71');
    expect(firstRowText).toContain('merge-efficiency');
    expect(firstRowText).toContain('merge-latency');
    expect(firstRowText).toContain('sha256:def456');
    expect(firstRowText).toContain('github');
    expect(firstRowText).toContain('central-agentic-ops');
    expect(firstRowText).toContain('.github/workflows/daily.yml');
    expect(firstRowText).toContain('1002');
    expect(firstRowText).toContain('baseline-live');
    expect(firstRowText).toContain('2026-08-28T09:30:00Z');
    expect(firstRowText).toContain('2026-08-28T10:00:00Z');
    expect(firstRowText).toContain('2026-08-29T12:00:00Z');
    expect(firstRowText).toContain('pending');
    expect(firstRowText).toContain('Unavailable');

    const secondRow = rendered.querySelectorAll('.operational-value-table tbody tr')[1];
    const secondRowText = secondRow?.textContent ?? '';
    expect(secondRowText).toContain('2026-08-29T11:00:00Z');
    expect(secondRowText).toContain('0.83');
    expect(secondRowText).toContain('accepted');
    expect(secondRowText).toContain('0.12');
    expect(secondRow?.querySelector('a')?.getAttribute('href')).toBe('https://example.com/evidence/1001');
    expect(secondRow?.querySelector('a')?.textContent).toBe('Evidence 1001');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('operational-values: operational-values-fixture (fixture) — as of 2026-08-29T19:00:00Z');
  });
});
