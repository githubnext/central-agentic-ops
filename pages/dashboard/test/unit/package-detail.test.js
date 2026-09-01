// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderPackageDetail, renderPackageReports } from '../../src/components/package-detail.js';

const metadata = {
  'source-id': 'fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-31T18:00:00Z',
  'retrieved-at': '2026-08-31T18:01:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

const workflows = [
  {
    package: 'ambient-context',
    'package-name': 'Ambient Context',
    workflow: '.github/workflows/ambient-context.md',
    'workflow-name': 'Ambient Context',
    'workflow-role': 'orchestrator',
    'rollout-mode': 'review',
    'workflow-link': {
      relation: 'workflow',
      href: 'https://github.com/githubnext/central-agentic-ops/blob/HEAD/.github/workflows/ambient-context.md',
      label: 'View Ambient Context',
      'dashboard-href': '#page-workflow-runtime?workflow=githubnext%2Fcentral-agentic-ops%3A.github%2Fworkflows%2Fambient-context.md',
      'dashboard-label': 'View Ambient Context workflow dashboard'
    }
  },
  {
    package: 'ambient-context',
    'package-name': 'Ambient Context',
    workflow: '.github/workflows/ambient-context-agents-md-curator.md',
    'workflow-name': 'Ambient Context / AGENTS.md Curator',
    'workflow-role': 'worker',
    'rollout-mode': 'review'
  },
  {
    package: 'other',
    'package-name': 'Other',
    workflow: '.github/workflows/other.md',
    'workflow-name': 'Other',
    'workflow-role': 'orchestrator',
    'rollout-mode': 'live'
  }
];

const outcomes = [
  {
    package: 'ambient-context',
    workflow: '.github/workflows/ambient-context.md',
    'workflow-name': 'Ambient Context',
    'safe-output': 'ambient-issue-1',
    'outcome-title': 'Review ambient context proposal',
    'outcome-summary': 'A review proposal is ready.',
    'outcome-category': 'issue',
    'outcome-state': 'pending',
    'rollout-mode': 'review',
    'observed-at': '2026-08-31T17:00:00Z'
  },
  {
    package: 'ambient-context',
    workflow: '.github/workflows/ambient-context-agents-md-curator.md',
    'workflow-name': 'Ambient Context / AGENTS.md Curator',
    'safe-output': 'ambient-pr-2',
    'outcome-title': 'Reconcile AGENTS.md guidance',
    'outcome-summary': 'Updated durable guidance.',
    'outcome-category': 'pull-request',
    'outcome-status': 'closed',
    'outcome-state': 'lifecycle-close',
    'rollout-mode': 'live',
    'observed-at': '2026-08-30T16:00:00Z'
  },
  {
    package: 'other',
    workflow: '.github/workflows/ambient-context.md',
    'workflow-name': 'Other',
    'safe-output': 'other-1',
    'outcome-title': 'Other package report',
    'outcome-summary': 'Not part of the selected package.',
    'outcome-category': 'issue',
    'outcome-status': 'open',
    'rollout-mode': 'live',
    'observed-at': '2026-08-29T15:00:00Z'
  }
];

function context() {
  return {
    pageId: 'package-detail',
    title: 'Orchestrator and workers',
    sourceNames: ['workflows'],
    contextDetails: [],
    routeParameter: 'package',
    headingTag: /** @type {'h3'} */ ('h3'),
    sources: {
      workflows: { source: 'workflows', metadata, rows: workflows },
      outcomes: { source: 'outcomes', metadata, rows: outcomes }
    }
  };
}

describe('renderPackageDetail', () => {
  it('renders the selected package topology and package tabs', () => {
    const rendered = renderPackageDetail(context());
    rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
      detail: { parameter: 'package', value: 'ambient-context' }
    }));

    expect(rendered.dataset.package).toBe('ambient-context');
    expect(rendered.querySelector('.package-tabs')?.textContent).toBe('InsightsWorkflowsReports');
    expect(rendered.querySelector('.package-tabs [aria-current="page"]')?.getAttribute('href')).toBe('#page-package-detail?package=ambient-context');
    expect(rendered.querySelector('h3')?.textContent).toBe('Orchestrator and workers');
    expect(rendered.querySelectorAll('[data-workflow-role="orchestrator"]')).toHaveLength(1);
    expect(rendered.querySelectorAll('[data-workflow-role="worker"]')).toHaveLength(1);
    expect(rendered.textContent).toContain('Ambient Context / AGENTS.md Curator');
    expect(rendered.textContent).not.toContain('Other');
    expect(rendered.querySelector('[data-workflow-role="orchestrator"] a')?.getAttribute('href')).toBe(
      '#page-workflow-runtime?workflow=githubnext%2Fcentral-agentic-ops%3A.github%2Fworkflows%2Fambient-context.md'
    );
    expect(rendered.querySelector('[data-workflow-role="orchestrator"] a')?.getAttribute('target')).toBeNull();
  });

  it('reallocates package title, description, mode, and parent navigation', () => {
    const host = document.createElement('div');
    const rendered = renderPackageDetail(context());
    host.append(rendered);
    let detail;
    host.addEventListener('dashboard-route-allocation', (event) => {
      if (event instanceof CustomEvent) detail = event.detail;
    });

    rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
      detail: { parameter: 'package', value: 'ambient-context' }
    }));

    expect(detail).toEqual({
      title: 'Ambient Context',
      description: 'Orchestrator and worker workflows in the Ambient Context package.',
      mode: 'review',
      navigationPage: 'packages'
    });
  });

  describe('renderPackageReports', () => {
    it('renders package-scoped reports with mode controls, statuses, and outcome links', () => {
      const rendered = renderPackageReports({ ...context(), pageId: 'package-reports' });
      rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
        detail: { parameter: 'package', value: 'ambient-context' }
      }));

      expect(rendered.querySelector('.package-tabs [aria-current="page"]')?.getAttribute('href')).toBe('#page-package-reports?package=ambient-context');
      expect(rendered.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('All');
      expect(rendered.querySelector('.package-report-columns')?.textContent).toBe('ReportStatusModeTypeUpdated');
      expect(rendered.querySelectorAll('.package-report-row')).toHaveLength(2);
      expect(rendered.querySelector('.package-report-header')?.textContent).toContain('1 Open1 Resolved');
      expect(rendered.querySelector('[data-report-id="ambient-pr-2"] a')?.getAttribute('href')).toBe('#page-outcome-detail?outcome=ambient-pr-2');
      expect(rendered.querySelector('[data-report-id="ambient-pr-2"] .status')?.classList).toContain('status-success');
      expect(rendered.textContent).not.toContain('Other package report');
    });

    it('filters reports by mode and search text', () => {
      const rendered = renderPackageReports({ ...context(), pageId: 'package-reports' });
      rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
        detail: { parameter: 'package', value: 'ambient-context' }
      }));

      const reviewTab = [...rendered.querySelectorAll('[role="tab"]')]
        .find((tab) => tab.textContent === 'Review');
      expect(reviewTab).toBeInstanceOf(HTMLButtonElement);
      reviewTab?.dispatchEvent(new MouseEvent('click'));
      expect(rendered.querySelectorAll('.package-report-row')).toHaveLength(1);
      expect(rendered.textContent).toContain("Review proposals; this is the package's configured mode.");
      expect(rendered.querySelector('.package-report-columns')?.textContent).toBe('ReportStatusTypeUpdated');

      const allTab = [...rendered.querySelectorAll('[role="tab"]')]
        .find((tab) => tab.textContent === 'All');
      allTab?.dispatchEvent(new MouseEvent('click'));
      const search = rendered.querySelector('.package-report-search input');
      expect(search).toBeInstanceOf(HTMLInputElement);
      if (search instanceof HTMLInputElement) {
        search.value = 'reconcile';
        search.dispatchEvent(new Event('input'));
      }
      expect(rendered.querySelector('[data-report-id="ambient-issue-1"]')?.hasAttribute('hidden')).toBe(true);
      expect(rendered.querySelector('[data-report-id="ambient-pr-2"]')?.hasAttribute('hidden')).toBe(false);
    });

    it('reallocates package report identity and renders explicit empty states', () => {
      const host = document.createElement('div');
      const rendered = renderPackageReports({ ...context(), pageId: 'package-reports' });
      host.append(rendered);
      let detail;
      host.addEventListener('dashboard-route-allocation', (event) => {
        if (event instanceof CustomEvent) detail = event.detail;
      });

      rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
        detail: { parameter: 'package', value: 'ambient-context' }
      }));
      expect(detail).toEqual({
        title: 'Ambient Context',
        description: 'Durable reports produced by the Ambient Context package.',
        mode: 'review',
        navigationPage: 'packages'
      });

      rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
        detail: { parameter: 'package', value: 'missing' }
      }));
      expect(rendered.textContent).toBe('Package not found.');

      const unavailableContext = context();
      const unavailable = renderPackageReports({
        ...unavailableContext,
        pageId: 'package-reports',
        sources: {
          ...unavailableContext.sources,
          workflows: {
            ...unavailableContext.sources.workflows,
            metadata: { ...metadata, availability: /** @type {'unavailable'} */ ('unavailable') },
            rows: []
          }
        }
      });
      unavailable.dispatchEvent(new CustomEvent('dashboard-route-change', {
        detail: { parameter: 'package', value: 'ambient-context' }
      }));
      expect(unavailable.textContent).toBe('Package data is unavailable.');
    });
  });

  it('renders explicit empty states for missing and invalid package routes', () => {
    const rendered = renderPackageDetail(context());
    expect(rendered.textContent).toBe('Select a package to view its workflows.');

    rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
      detail: { parameter: 'package', value: '<invalid>' }
    }));
    expect(rendered.textContent).toBe('Select a package to view its workflows.');

    rendered.dispatchEvent(new CustomEvent('dashboard-route-change', {
      detail: { parameter: 'package', value: 'missing' }
    }));
    expect(rendered.textContent).toBe('Package not found.');
  });
});
