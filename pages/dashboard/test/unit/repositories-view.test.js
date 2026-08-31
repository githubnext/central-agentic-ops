// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderRepositoriesView } from '../../src/components/repositories-view.js';

const metadata = (overrides = {}) => ({
  'source-id': 'repositories-view-fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-29T20:00:00Z',
  'retrieved-at': '2026-08-29T20:01:00Z',
  'coverage-start': '2026-08-28T20:00:00Z',
  'coverage-end': '2026-08-29T20:00:00Z',
  completeness: 'complete',
  freshness: 'fresh',
  availability: 'available',
  ...overrides
});

const source = (name, rows, metadataOverrides = {}) => ({
  source: name,
  rows,
  metadata: metadata(metadataOverrides)
});

describe('repositories view', () => {
  it('renders configured scope, top-five AIC distribution, and repository activity aggregated across canonical sources', () => {
    const repositories = ['alpha', 'beta', 'charlie', 'delta', 'echo', 'foxtrot'];
    const repositoryRows = repositories.map((repository) => ({
      organization: 'octo-org',
      repository,
      'repository-link': {
        relation: 'repository',
        href: `https://github.com/octo-org/${repository}`,
        label: `View octo-org/${repository} on GitHub`
      }
    }));
    const rendered = renderRepositoriesView({
      repositories: source('repositories', repositoryRows),
      workflows: source('workflows', [
        { organization: 'octo-org', repository: 'alpha', workflow: '.github/workflows/one.md', 'workflow-active': 'true' },
        { organization: 'octo-org', repository: 'alpha', workflow: '.github/workflows/two.md', 'workflow-active': 'false' },
        { organization: 'octo-org', repository: 'beta', workflow: '.github/workflows/one.md', 'workflow-active': 'true' }
      ]),
      runs: source('runs', [
        { organization: 'octo-org', repository: 'alpha', run: '1', 'run-conclusion': 'failure' },
        { organization: 'octo-org', repository: 'alpha', run: '2', 'run-conclusion': 'success' },
        { organization: 'octo-org', repository: 'beta', run: '3', 'run-conclusion': 'action-required' }
      ]),
      outcomes: source('outcomes', [
        { organization: 'octo-org', repository: 'alpha', workflow: '.github/workflows/one.md', 'safe-output': 'report-1' },
        { organization: 'octo-org', repository: 'alpha', workflow: '.github/workflows/two.md', 'safe-output': 'report-2' }
      ]),
      usage: source('usage', [
        ...repositories.map((repository, index) => ({
          organization: 'octo-org',
          repository,
          workflow: '.github/workflows/one.md',
          run: String(index + 1),
          invocation: `usage-${index + 1}`,
          aic: 60 - index * 10
        })),
        { organization: 'octo-org', repository: 'alpha', run: '1', invocation: 'usage-1', aic: 60 },
        { organization: 'octo-org', repository: 'unconfigured', run: '7', invocation: 'usage-7', aic: 5 }
      ], { completeness: 'partial' }),
      'operational-values': source('operational-values', [
        { organization: 'octo-org', repository: 'alpha', workflow: '.github/workflows/one.md', 'operational-value': 0.8 },
        { organization: 'octo-org', repository: 'alpha', workflow: '.github/workflows/one.md', 'operational-value': 0.9 }
      ])
    });

    expect(rendered.querySelector('.repository-scope-context')?.textContent).toContain('Repository scope · 6 configured');
    expect(rendered.querySelector('.repository-scope-context')?.textContent).toContain('Complete 24-hour Actions run window');
    expect(rendered.querySelector('.repository-scope-context')?.textContent).toContain('7 artifacts · partial');
    expect(rendered.querySelectorAll('.pie-chart-segment')).toHaveLength(6);
    expect(rendered.querySelector('.chart-legend-pie')?.textContent).toContain('Other');
    expect(rendered.querySelector('.pie-chart-total-value')?.textContent).toBe('155');
    expect(rendered.querySelectorAll('.repository-activity-table tbody tr')).toHaveLength(7);

    const alpha = rendered.querySelector('[data-repository="octo-org/alpha"]');
    expect(alpha?.textContent).toContain('octo-org/alpha');
    expect(alpha?.textContent).toContain('2');
    expect(alpha?.textContent).toContain('50%');
    expect(alpha?.textContent).toContain('60');
    expect(alpha?.textContent).toContain('Needs attention');
    expect(alpha?.querySelector('th a')?.getAttribute('href')).toBe('#page-repository-detail?repository=octo-org%2Falpha');
    expect(alpha?.querySelector('th a')?.getAttribute('data-nav-page-id')).toBe('repository-detail');

    const beta = rendered.querySelector('[data-repository="octo-org/beta"]');
    expect(beta?.textContent).toContain('Approval required');
    expect(rendered.querySelector('[data-nav-page-id="workflows"]')?.textContent).toBe('Search all workflows');
  });

  it('shows unavailable run and usage states without claiming observed values', () => {
    const rendered = renderRepositoriesView({
      repositories: source('repositories', [{ organization: 'octo-org', repository: 'alpha' }]),
      workflows: source('workflows', []),
      runs: source('runs', [], { availability: 'unavailable', completeness: 'unknown' }),
      outcomes: source('outcomes', []),
      usage: source('usage', [], { availability: 'unavailable', completeness: 'unknown' }),
      'operational-values': source('operational-values', [])
    });

    expect(rendered.querySelector('.repository-scope-context')?.textContent).toContain('Actions run data unavailable');
    expect(rendered.querySelector('.repository-scope-context')?.textContent).toContain('AIC coverageUnavailable');
    expect(rendered.querySelector('.repository-aic-panel')?.textContent).toContain('AI Credit usage artifacts are unavailable');
    expect(rendered.querySelector('[data-repository="octo-org/alpha"]')?.textContent).toContain('Unavailable');
    expect(rendered.querySelector('[data-repository="octo-org/alpha"]')?.textContent).toContain('—');
  });
});
