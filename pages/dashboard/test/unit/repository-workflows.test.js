// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderRepositoryWorkflows } from '../../src/components/repository-workflows.js';

const metadata = {
  'source-id': 'fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-30T08:00:00Z',
  'retrieved-at': '2026-08-30T08:01:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

/** @param {Array<Record<string, unknown>>} workflows */
function context(workflows) {
  return {
    pageId: 'repository-detail',
    title: 'Agentic workflows',
    sourceNames: ['workflows'],
    contextDetails: [],
    scope: { repositories: ['github/gh-aw'] },
    headingTag: /** @type {'h3'} */ ('h3'),
    sources: {
      workflows: { source: 'workflows', metadata, rows: workflows }
    }
  };
}

describe('renderRepositoryWorkflows', () => {
  it('renders the repository workflow summary, tabs, Actions link, and inventory', () => {
    const rendered = renderRepositoryWorkflows(context([
      {
        organization: 'github',
        repository: 'gh-aw',
        package: 'maintenance',
        'package-name': 'Maintenance',
        'package-memberships': [
          { id: 'platform', name: 'Platform' },
          { id: 'maintenance', name: 'Maintenance' }
        ],
        workflow: '.github/workflows/upgrade.md',
        'workflow-name': 'Upgrade',
        'workflow-role': 'worker',
        'workflow-active': 'false',
        'observed-at': '2026-08-29T10:00:00Z',
        'repository-link': {
          relation: 'repository',
          href: 'https://github.com/github/gh-aw',
          label: 'View github/gh-aw',
          'dashboard-href': '#page-repository-detail?repository=github%2Fgh-aw',
          'dashboard-label': 'View github/gh-aw repository dashboard'
        },
        'workflow-link': {
          relation: 'workflow',
          href: 'https://github.com/github/gh-aw/blob/HEAD/.github/workflows/upgrade.md',
          label: 'View Upgrade',
          'dashboard-href': '#page-workflow-detail?workflow=github%2Fgh-aw%3A.github%2Fworkflows%2Fupgrade.md',
          'dashboard-label': 'View Upgrade workflow dashboard'
        }
      },
      {
        organization: 'github',
        repository: 'gh-aw',
        workflow: '.github/workflows/failure-investigator.md',
        'workflow-name': 'Failure Investigator',
        'workflow-role': 'standalone',
        'workflow-active': 'true',
        'observed-at': '2026-08-28T10:00:00Z',
        'repository-link': {
          relation: 'repository',
          href: 'https://github.com/github/gh-aw',
          label: 'View github/gh-aw',
          'dashboard-href': '#page-repository-detail?repository=github%2Fgh-aw',
          'dashboard-label': 'View github/gh-aw repository dashboard'
        },
        'workflow-link': {
          relation: 'workflow',
          href: 'https://github.com/github/gh-aw/blob/HEAD/.github/workflows/failure-investigator.md',
          label: 'View Failure Investigator',
          'dashboard-href': '#page-workflow-detail?workflow=github%2Fgh-aw%3A.github%2Fworkflows%2Ffailure-investigator.md',
          'dashboard-label': 'View Failure Investigator workflow dashboard'
        }
      }
    ]));

    expect(rendered.dataset.repository).toBe('github/gh-aw');
    expect(rendered.querySelector('.repository-tabs')?.textContent).toBe('WorkflowsReportsInsights');
    expect(rendered.querySelector('.repository-tabs [aria-current="page"]')?.textContent).toBe('Workflows');
    expect(rendered.querySelector('.repository-metrics')?.textContent).toContain('2');
    expect(rendered.querySelector('.repository-status-pie')?.getAttribute('aria-label')).toBe('Workflow status: 1 active, 1 disabled, 0 unknown');
    expect(rendered.querySelector('.repository-section-heading > a')?.getAttribute('href')).toBe('https://github.com/github/gh-aw/actions');
    expect([...rendered.querySelectorAll('tbody th')].map((cell) => cell.textContent)).toEqual([
      'Failure Investigator.github/workflows/failure-investigator.mdStandalone',
      'Upgrade.github/workflows/upgrade.mdWorkerPackage · MaintenancePackage · Platform'
    ]);
    expect([...rendered.querySelectorAll('tbody td:first-of-type')].map((cell) => cell.textContent)).toEqual(['Active', 'Disabled']);
    expect([...rendered.querySelectorAll('.repository-workflow-badges .workflow-badge')].map((badge) => badge.textContent)).toEqual([
      'Standalone',
      'Worker',
      'Package · Maintenance',
      'Package · Platform'
    ]);
    expect([...rendered.querySelectorAll('.repository-workflow-badges a')].map((badge) => badge.getAttribute('href'))).toEqual([
      '#page-package-detail?package=maintenance',
      '#page-package-detail?package=platform'
    ]);
    expect([...rendered.querySelectorAll('.repository-workflow-source')].map((link) => link.getAttribute('href'))).toEqual([
      '#page-workflow-detail?workflow=github%2Fgh-aw%3A.github%2Fworkflows%2Ffailure-investigator.md',
      '#page-workflow-detail?workflow=github%2Fgh-aw%3A.github%2Fworkflows%2Fupgrade.md'
    ]);
    expect(rendered.textContent).toContain('Latest registration update: Aug 29, 2026, 10:00 AM. 1 disabled.');
  });

  it('keeps the summary and empty inventory visible when no workflows are observed', () => {
    const rendered = renderRepositoryWorkflows(context([]));

    expect(rendered.dataset.repository).toBe('github/gh-aw');
    expect(rendered.querySelector('.repository-tabs')?.getAttribute('aria-label')).toBe('github/gh-aw views');
    expect(rendered.querySelector('.repository-status-pie')?.getAttribute('aria-label')).toBe('Workflow status: 0 active, 0 disabled, 0 unknown');
    expect(rendered.querySelector('tbody td')?.textContent).toBe('No authored Agentic Workflows were observed for this repository.');
    expect(rendered.querySelector('.repository-section-heading > a')).toBeNull();
  });

  it('reallocates the view when its declared route parameter changes', () => {
    const routedContext = {
      ...context([
        { organization: 'github', repository: 'gh-aw', workflow: 'one.md', 'workflow-name': 'One', 'workflow-active': 'true' },
        { organization: 'octo-org', repository: 'octo-repo', workflow: 'two.md', 'workflow-name': 'Two', 'workflow-active': 'true' }
      ]),
      scope: undefined,
      routeParameter: 'repository'
    };
    const rendered = renderRepositoryWorkflows(routedContext);
    let allocation;
    rendered.addEventListener('dashboard-route-allocation', (event) => {
      if (event instanceof CustomEvent) allocation = event.detail;
    });
    expect(rendered.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(rendered.querySelector('tbody')?.textContent).not.toContain('One');
    expect(rendered.querySelector('tbody')?.textContent).not.toContain('Two');

    rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
      detail: { parameter: 'repository', value: 'octo-org/octo-repo' }
    }));

    expect(rendered.dataset.repository).toBe('octo-org/octo-repo');
    expect(allocation).toEqual({ title: 'octo-org/octo-repo', navigationPage: 'repositories' });
    expect(rendered.querySelector('tbody')?.textContent).toContain('Two');
    expect(rendered.querySelector('tbody')?.textContent).not.toContain('One');
  });
});
