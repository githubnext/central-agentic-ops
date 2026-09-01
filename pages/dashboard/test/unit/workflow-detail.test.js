// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderWorkflowDetail } from '../../src/components/workflow-detail.js';

const metadata = {
  'source-id': 'fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-31T20:00:00Z',
  'retrieved-at': '2026-08-31T20:01:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

function context() {
  return {
    pageId: 'workflow-detail',
    title: 'Workflow reports',
    sourceNames: ['workflows', 'outcomes'],
    contextDetails: [],
    routeParameter: 'workflow',
    headingTag: /** @type {'h3'} */ ('h3'),
    sources: {
      workflows: {
        source: 'workflows',
        metadata,
        rows: [
          {
            organization: 'githubnext',
            repository: 'central-agentic-ops',
            package: 'ambient-context',
            'package-name': 'Ambient Context',
            'package-memberships': [
              { id: 'central-agentic-ops', name: 'Central Agentic Ops' },
              { id: 'ambient-context', name: 'Ambient Context' }
            ],
            workflow: '.github/workflows/ambient-context.md',
            'workflow-name': 'Ambient Context',
            'workflow-role': 'orchestrator',
            'workflow-link': {
              relation: 'workflow',
              href: 'https://github.com/githubnext/central-agentic-ops/blob/HEAD/.github/workflows/ambient-context.md',
              label: 'View Ambient Context',
              'dashboard-href': '#page-workflow-detail?workflow=githubnext%2Fcentral-agentic-ops%3A.github%2Fworkflows%2Fambient-context.md',
              'dashboard-label': 'View Ambient Context workflow dashboard'
            }
          },
          {
            organization: 'other',
            repository: 'repository',
            workflow: '.github/workflows/other.md',
            'workflow-name': 'Other'
          },
          {
            organization: 'githubnext',
            repository: 'central-agentic-ops',
            workflow: '.github/workflows/release@prod.md',
            'workflow-name': 'Release production'
          }
        ]
      },
      outcomes: {
        source: 'outcomes',
        metadata,
        rows: [
          {
            organization: 'customer',
            repository: 'target',
            'runtime-repository': 'githubnext/central-agentic-ops',
            workflow: '.github/workflows/ambient-context.md',
            'safe-output': 'report-closed',
            'outcome-title': 'Closed report',
            'outcome-summary': 'The durable report was resolved.',
            'outcome-category': 'pull-request',
            'outcome-status': 'closed',
            'rollout-mode': 'review',
            'observed-at': '2026-08-31T19:00:00Z'
          },
          {
            organization: 'githubnext',
            repository: 'central-agentic-ops',
            workflow: '.github/workflows/ambient-context.md',
            'safe-output': 'report-open',
            'outcome-title': 'Open report',
            'outcome-summary': 'The durable report is open.',
            'outcome-category': 'issue',
            'outcome-status': 'open',
            'rollout-mode': 'live',
            'observed-at': '2026-08-31T20:00:00Z'
          },
          {
            organization: 'other',
            repository: 'repository',
            workflow: '.github/workflows/other.md',
            'safe-output': 'other-report',
            'outcome-title': 'Other report'
          }
        ]
      }
    }
  };
}

describe('renderWorkflowDetail', () => {
  it('renders the selected workflow identity and attributed reports', () => {
    const host = document.createElement('div');
    const allocation = vi.fn();
    host.addEventListener('dashboard-route-allocation', allocation);
    const rendered = renderWorkflowDetail(context());
    host.append(rendered);

    rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
      detail: {
        parameter: 'workflow',
        value: 'githubnext/central-agentic-ops:.github/workflows/ambient-context.md'
      }
    }));

    expect(rendered.dataset.workflow).toBe('githubnext/central-agentic-ops:.github/workflows/ambient-context.md');
    expect(rendered.querySelector('.workflow-tabs')?.textContent).toBe('InsightsReports');
    expect(rendered.querySelector('.workflow-tabs [aria-current="page"]')?.textContent).toBe('Reports');
    expect(rendered.querySelector('.workflow-tabs a:first-child')?.getAttribute('href')).toBe(
      '#page-workflow-runtime?workflow=githubnext%2Fcentral-agentic-ops%3A.github%2Fworkflows%2Fambient-context.md'
    );
    expect([...rendered.querySelectorAll('.workflow-badges .workflow-badge')].map((badge) => badge.textContent)).toEqual([
      'Orchestrator',
      'Package · Ambient Context',
      'Package · Central Agentic Ops'
    ]);
    expect([...rendered.querySelectorAll('.workflow-badges a')].map((badge) => badge.getAttribute('href'))).toEqual([
      '#page-package-detail?package=ambient-context',
      '#page-package-detail?package=central-agentic-ops'
    ]);
    expect(rendered.querySelector('.workflow-identity > a')?.getAttribute('href')).toBe(
      'https://github.com/githubnext/central-agentic-ops/blob/HEAD/.github/workflows/ambient-context.md'
    );
    expect(rendered.querySelector('.workflow-identity > a')?.textContent).toBe('View authored workflow');
    expect(rendered.querySelector('.workflow-identity > a')?.getAttribute('target')).toBe('_blank');
    expect(rendered.querySelector('.workflow-reports-header')?.textContent).toContain('1 Open1 Resolved');
    expect([...rendered.querySelectorAll('.workflow-report-title')].map((heading) => heading.textContent)).toEqual([
      'Open report',
      'Closed report'
    ]);
    expect(rendered.querySelector('.workflow-report-copy a')?.getAttribute('href')).toBe('#page-outcome-detail?outcome=report-open');
    expect(rendered.querySelector('.workflow-report-row:last-child .status-success')?.textContent).toBe('Closed');
    expect(rendered.textContent).not.toContain('Other report');
    const filter = rendered.querySelector('.workflow-reports-search input');
    expect(filter).toBeInstanceOf(HTMLInputElement);
    if (filter instanceof HTMLInputElement) {
      filter.value = 'closed';
      filter.dispatchEvent(new Event('input'));
    }
    expect(rendered.querySelectorAll('.workflow-report-row')).toHaveLength(1);
    expect(rendered.querySelector('.workflow-reports-header')?.textContent).toContain('0 Open1 Resolved');
    expect(rendered.querySelector('.workflow-reports-header > div')?.getAttribute('aria-live')).toBe('polite');
    expect(allocation).toHaveBeenCalledOnce();
    expect(allocation.mock.calls[0][0].detail).toEqual({
      title: 'Ambient Context',
      description: 'Durable reports produced by .github/workflows/ambient-context.md in githubnext/central-agentic-ops.',
      navigationPage: 'repositories',
      breadcrumbs: [
        { label: 'Repositories', href: '#page-repositories' },
        {
          label: 'githubnext/central-agentic-ops',
          href: '#page-repository-detail?repository=githubnext%2Fcentral-agentic-ops'
        }
      ]
    });
  });

  it('renders explicit empty states for missing and invalid workflow routes', () => {
    const rendered = renderWorkflowDetail(context());
    expect(rendered.textContent).toBe('Select a workflow to view its reports.');

    rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
      detail: { parameter: 'workflow', value: '<invalid>' }
    }));
    expect(rendered.textContent).toBe('Select a workflow to view its reports.');

    rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
      detail: {
        parameter: 'workflow',
        value: 'githubnext/central-agentic-ops:.github/workflows/missing.md'
      }
    }));
    expect(rendered.textContent).toBe('Workflow not found.');

    rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
      detail: {
        parameter: 'workflow',
        value: 'githubnext/central-agentic-ops:.github/workflows/release@prod.md'
      }
    }));
    expect(rendered.textContent).toContain('.github/workflows/release@prod.md');
  });
});
