// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

describe('presenter built-in pages', () => {
  it('DLS-PAGE-005 DLS-PAGE-014 renders built-in workflows page inventory, active state, rollout mode, run conclusions, outcomes, usage, findings, operational value, and independent data state deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'workflows-dashboard',
        title: 'Workflows Dashboard',
        pages: [
          {
            id: 'workflows',
            kind: /** @type {'built-in'} */ ('built-in'),
            page: 'workflows',
            title: 'Workflows',
            definition: {
              'data-state': {
                availability: true,
                completeness: true,
                freshness: true
              },
              views: [
                { id: 'workflows-source', data: { source: 'workflows' } },
                { id: 'runs-source', data: { source: 'runs' } },
                { id: 'outcomes-source', data: { source: 'outcomes' } },
                { id: 'usage-source', data: { source: 'usage' } },
                { id: 'findings-source', data: { source: 'findings' } },
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
        workflows: {
          source: 'workflows',
          rows: [
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'dashboard.yml',
              'workflow-active': 'true',
              'rollout-mode': 'review'
            },
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'release.yml',
              'workflow-active': 'false',
              'rollout-mode': 'live'
            }
          ],
          metadata: {
            'source-id': 'workflows-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        runs: {
          source: 'runs',
          rows: [
            {
              workflow: 'dashboard.yml',
              run: '1001',
              'run-conclusion': 'success'
            },
            {
              workflow: 'dashboard.yml',
              run: '1002',
              'run-conclusion': 'failure'
            },
            {
              workflow: 'release.yml',
              run: '1003',
              'run-conclusion': 'success'
            }
          ],
          metadata: {
            'source-id': 'runs-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        outcomes: {
          source: 'outcomes',
          rows: [
            { workflow: 'dashboard.yml', 'outcome-state': 'accepted' },
            { workflow: 'dashboard.yml', 'outcome-state': 'pending' },
            { workflow: 'release.yml', 'outcome-state': 'rejected' }
          ],
          metadata: {
            'source-id': 'outcomes-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        },
        usage: {
          source: 'usage',
          rows: [
            { workflow: 'dashboard.yml', aic: 3 },
            { workflow: 'dashboard.yml', aic: 2 },
            { workflow: 'release.yml', aic: 5 }
          ],
          metadata: {
            'source-id': 'usage-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        findings: {
          source: 'findings',
          rows: [
            { workflow: 'dashboard.yml', finding: 'f-1' },
            { workflow: 'release.yml', finding: 'f-2' },
            { workflow: 'release.yml', finding: 'f-3' }
          ],
          metadata: {
            'source-id': 'findings-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        },
        'operational-values': {
          source: 'operational-values',
          rows: [
            { workflow: 'dashboard.yml', 'operational-value': 0.8 },
            { workflow: 'release.yml', 'operational-value': 0.4 }
          ],
          metadata: {
            'source-id': 'operational-values-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      }
    });

    expect(rendered.querySelector('[data-page-name="workflows"]')?.textContent).toContain('dashboard.yml');
    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelectorAll('.workflows-table tbody tr')).toHaveLength(2);
    expect(rendered.querySelector('.workflows-table tbody tr')?.textContent).toContain('dashboard.yml');
    expect(rendered.querySelector('.workflows-table tbody tr')?.textContent).toContain('true');
    expect(rendered.querySelector('.workflows-table tbody tr')?.textContent).toContain('review');
    expect(rendered.querySelector('.workflows-table tbody tr')?.textContent).toContain('2');
    expect(rendered.querySelector('.workflows-table tbody tr')?.textContent).toContain('success: 1, failure: 1');
    expect(rendered.querySelector('.workflows-table tbody tr')?.textContent).toContain('5');
    expect(rendered.querySelectorAll('.workflows-table tbody tr')[1]?.textContent).toContain('release.yml');
    expect(rendered.querySelectorAll('.workflows-table tbody tr')[1]?.textContent).toContain('false');
    expect(rendered.querySelectorAll('.workflows-table tbody tr')[1]?.textContent).toContain('live');
    expect(rendered.querySelectorAll('.workflows-table tbody tr')[1]?.textContent).toContain('1');
    expect(rendered.querySelectorAll('.workflows-table tbody tr')[1]?.textContent).toContain('success: 1');
  });

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
    expect(rendered.querySelector('.runs-table a')?.getAttribute('href')).toBe('https://example.com/runs/1001');
  });

  it('DLS-PRES-001 renders GitHub Primer brand-aligned app shell, sidebar navigation, octicons, and metric badges', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'primer-dashboard',
        title: 'Primer Dashboard',
        pages: [
          {
            id: 'workflows',
            kind: /** @type {'built-in'} */ ('built-in'),
            page: 'workflows',
            title: 'Workflows',
            definition: {
              views: [
                { id: 'workflows-source', data: { source: 'workflows' } }
              ]
            }
          },
          {
            id: 'runs',
            kind: /** @type {'built-in'} */ ('built-in'),
            page: 'runs',
            title: 'Runs'
          }
        ]
      }
    };

    const rendered = renderDashboard({
      document,
      sources: {
        workflows: {
          source: 'workflows',
          rows: [
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'dashboard.yml',
              'workflow-active': 'true',
              'rollout-mode': 'live'
            }
          ],
          metadata: {
            'source-id': 'workflows-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T13:00:00Z',
            'retrieved-at': '2026-08-29T13:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      }
    });

    expect(rendered.querySelector('style')?.textContent).toContain('--canvas');
    expect(rendered.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(rendered.querySelector('.app-shell')).not.toBeNull();
    expect(rendered.querySelector('.org-sidebar')).not.toBeNull();
    expect(rendered.querySelector('.sidebar-brand-mark')).not.toBeNull();
    expect(rendered.querySelectorAll('.primary-nav .nav-item')).toHaveLength(2);
    expect(rendered.querySelector('.primary-nav .nav-item.active')?.getAttribute('data-nav-page-id')).toBe('workflows');
    expect(rendered.querySelector('.octicon-workflow')).not.toBeNull();
    expect(rendered.querySelector('.octicon-play')).not.toBeNull();
    expect(rendered.querySelector('.breadcrumb')?.textContent).toContain('Primer Dashboard');
    expect(rendered.querySelector('.status-success')?.textContent).toBe('available');
    expect(rendered.querySelector('.mode-live')?.textContent).toBe('live');
    expect(rendered.querySelector('.report-footer')?.textContent).toContain('GitHub Primer');
  });

  it('DLS-PAGE-013 DLS-PAGE-014 renders built-in findings page summary, severity, status, scope, time, and available issue, pull-request, and run links deterministically', () => {
    /** @type {import('../../src/presenter.js').PresentationInput['document']} */
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'findings-dashboard',
        title: 'Findings Dashboard',
        pages: [
          {
            id: 'findings',
            kind: /** @type {'built-in'} */ ('built-in'),
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

    const rendered = renderDashboard({
      document,
      sources: {
        findings: {
          source: 'findings',
          rows: [
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'dashboard.yml',
              finding: 'f-100',
              'finding-summary': 'Unsafe shell interpolation in generated script',
              'finding-severity': 'high',
              'finding-status': 'open',
              'observed-at': '2026-08-29T15:00:00Z',
              'issue-link': {
                relation: 'issue',
                href: 'https://example.com/issues/42',
                label: 'Issue 42'
              },
              'pull-request-link': {
                relation: 'pull-request',
                href: 'https://example.com/pull/7',
                label: 'Pull Request 7'
              },
              'run-link': {
                relation: 'run',
                href: 'https://example.com/runs/1001',
                label: 'Run 1001'
              }
            },
            {
              organization: 'githubnext',
              repository: 'central-agentic-ops',
              workflow: 'release.yml',
              finding: 'f-101',
              'finding-summary': 'Missing provenance on partial dataset',
              'finding-severity': 'low',
              'finding-status': 'resolved',
              'observed-at': '2026-08-29T16:00:00Z'
            }
          ],
          metadata: {
            'source-id': 'findings-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-29T16:30:00Z',
            'retrieved-at': '2026-08-29T16:31:00Z',
            completeness: 'partial',
            freshness: 'stale',
            availability: 'available'
          }
        }
      }
    });

    expect(rendered.querySelector('[data-page-name="findings"]')?.textContent).toContain('Unsafe shell interpolation in generated script');
    expect(rendered.querySelector('[data-state-axis="availability"]')?.textContent).toBe('available');
    expect(rendered.querySelector('[data-state-axis="completeness"]')?.textContent).toBe('partial');
    expect(rendered.querySelector('[data-state-axis="freshness"]')?.textContent).toBe('stale');
    expect(rendered.querySelector('.finding-severity-counts')?.textContent).toContain('high: 1');
    expect(rendered.querySelector('.finding-severity-counts')?.textContent).toContain('low: 1');
    expect(rendered.querySelector('.finding-status-counts')?.textContent).toContain('open: 1');
    expect(rendered.querySelector('.finding-status-counts')?.textContent).toContain('resolved: 1');
    expect(rendered.querySelectorAll('.findings-table tbody tr')).toHaveLength(2);
    expect(rendered.querySelector('.findings-table tbody tr')?.textContent).toContain('githubnext');
    expect(rendered.querySelector('.findings-table tbody tr')?.textContent).toContain('central-agentic-ops');
    expect(rendered.querySelector('.findings-table tbody tr')?.textContent).toContain('dashboard.yml');
    expect(rendered.querySelector('.findings-table tbody tr')?.textContent).toContain('Issue 42');
    expect(rendered.querySelector('.findings-table tbody tr')?.textContent).toContain('Pull Request 7');
    expect(rendered.querySelector('.findings-table tbody tr')?.textContent).toContain('Run 1001');
    expect(rendered.querySelectorAll('.findings-table tbody tr')[1]?.textContent).toContain('Unavailable');
    expect(rendered.querySelector('.provenance-list')?.textContent).toContain('findings: findings-fixture (fixture) — as of 2026-08-29T16:30:00Z');
  });
});
