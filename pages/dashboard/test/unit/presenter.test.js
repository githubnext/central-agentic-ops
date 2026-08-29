// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

describe('presenter built-in pages', () => {
  it('DLS-PAGE-006 DLS-PAGE-014 renders built-in runs page counts, rows, links, and independent data state deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'runs-dashboard',
        title: 'Runs Dashboard',
        pages: [
          {
            id: 'runs',
            kind: /** @type {'built-in'} */ ('built-in'),
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

    const rendered = renderDashboard({
      document,
      sources: {
        runs: {
          source: 'runs',
          rows: [
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'dashboard.yml',
              run: '1001',
              'run-status': 'completed',
              'run-conclusion': 'success',
              'rollout-mode': 'review',
              engine: 'github-actions',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1-mini',
              'started-at': '2026-08-29T12:00:00Z',
              'run-link': {
                relation: 'run',
                href: 'https://example.com/runs/1001',
                label: 'Run 1001'
              }
            },
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'dashboard.yml',
              run: '1002',
              'run-status': 'in-progress',
              'run-conclusion': 'unknown',
              'rollout-mode': 'live',
              engine: 'github-actions',
              'requested-model': 'gpt-4.1',
              'resolved-model': 'gpt-4.1',
              'started-at': '2026-08-29T12:05:00Z'
            }
          ],
          metadata: {
            'source-id': 'runs-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T12:10:00Z',
            'retrieved-at': '2026-08-29T12:11:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        outcomes: {
          source: 'outcomes',
          rows: [
            { run: '1001', 'outcome-state': 'accepted' },
            { run: '1001', 'outcome-state': 'pending' }
          ],
          metadata: {
            'source-id': 'outcomes-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T12:10:00Z',
            'retrieved-at': '2026-08-29T12:11:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        }
      }
    });

    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelector('.run-status-counts')?.textContent).toContain('completed: 1');
    expect(rendered.querySelector('.run-status-counts')?.textContent).toContain('in-progress: 1');
    expect(rendered.querySelector('.run-conclusion-counts')?.textContent).toContain('success: 1');
    expect(rendered.querySelector('.run-outcome-counts')?.textContent).toContain('accepted: 1');
    expect(rendered.querySelector('.run-outcome-counts')?.textContent).toContain('pending: 1');
    expect(rendered.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(rendered.querySelector('tbody tr')?.textContent).toContain('Run 1001');
    expect(rendered.querySelector('tbody tr')?.textContent).toContain('2');
    expect(rendered.querySelectorAll('tbody tr')[1]?.textContent).toContain('Unavailable');
    expect(rendered.querySelector('a')?.getAttribute('href')).toBe('https://example.com/runs/1001');
  });
});
