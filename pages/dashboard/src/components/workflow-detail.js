/**
 * Route-aware workflow reports view.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderReportList as renderSharedReportList } from './report-list.js';
import { renderLinkTabs } from './tab-nav.js';
import { renderWorkflowIdentity } from './workflow-identity.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowDetail(context) {
  const workflows = rowsFor(context.sources, 'workflows');
  const outcomes = rowsFor(context.sources, 'outcomes');
  const root = h('div', {
    className: 'workflow-detail',
    'data-route-view': '',
    'data-route-parameter': context.routeParameter
  });

  /** @param {unknown} routeValue */
  const render = (routeValue) => {
    const route = parseWorkflowRoute(routeValue);
    const workflow = route
      ? workflows.find((candidate) => (
          qualifiedRepository(candidate).toLowerCase() === route.repository.toLowerCase()
          && text(candidate.workflow) === route.workflow
        ))
      : null;
    const reports = workflow
      ? outcomes
        .filter((outcome) => (
          runtimeRepository(outcome).toLowerCase() === route?.repository.toLowerCase()
          && text(outcome.workflow) === route?.workflow
        ))
        .sort((left, right) => timestamp(right) - timestamp(left))
      : [];

    root.dataset.workflow = routeValueFor(route);
    root.replaceChildren(workflow && route
      ? renderWorkflowContent(context, route, workflow, reports)
      : h('p', { className: 'empty' }, route ? 'Workflow not found.' : 'Select a workflow to view its reports.'));

    if (workflow && route) {
      const name = workflowName(workflow);
      root.dispatchEvent(new CustomEvent('dashboard-route-allocation', {
        bubbles: true,
        detail: {
          title: name,
          description: `Durable reports produced by ${route.workflow} in ${route.repository}.`,
          navigationPage: 'repositories',
          breadcrumbs: [
            { label: 'Repositories', href: '#page-repositories' },
            {
              label: route.repository,
              href: `#page-repository-detail?repository=${encodeURIComponent(route.repository)}`
            }
          ]
        }
      }));
    }
  };

  root.addEventListener('dashboard-route-change', (event) => {
    if (!(event instanceof CustomEvent) || event.detail?.parameter !== context.routeParameter) return;
    render(event.detail.value);
  });
  render('');
  return root;
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {{ repository: string, workflow: string }} route
 * @param {Record<string, unknown>} workflow
 * @param {Array<Record<string, unknown>>} reports
 */
function renderWorkflowContent(context, route, workflow, reports) {
  return h(
    'div',
    { className: 'workflow-detail-content' },
    renderWorkflowTabs(context.pageId, route),
    renderWorkflowIdentity(workflow),
    renderWorkflowReports(reports)
  );
}

/**
 * @param {string} pageId
 * @param {{ repository: string, workflow: string }} route
 */
function renderWorkflowTabs(pageId, route) {
  const workflowQuery = `?workflow=${encodeURIComponent(routeValueFor(route))}`;
  return renderLinkTabs({
    className: 'repository-tabs workflow-tabs',
    ariaLabel: `${route.workflow} views`,
    tabs: [
      { label: 'Insights', icon: 'graph', href: `#page-workflow-runtime${workflowQuery}` },
      { label: 'Reports', icon: 'issue', href: `#page-${pageId}${workflowQuery}`, current: true }
    ]
  });
}

/** @param {Array<Record<string, unknown>>} reports */
function renderWorkflowReports(reports) {
  return renderSharedReportList(reports, {
    rowClassName: 'workflow-report-row',
    itemTag: 'tr',
    showMode: true,
    titleClassName: 'workflow-report-title',
    summaryClassName: 'workflow-report-copy',
    headingId: 'workflow-reports-heading',
    headingText: 'Reports',
    filterLabel: 'Filter reports',
    emptyMessage: 'No reports have been attributed to this workflow.',
    noMatchMessage: 'No reports match this filter.',
    countOpenStatuses: ['open', 'available', 'published'],
    countResolvedStatuses: ['closed', 'resolved'],
    renderContainer: ({ search, summary, content }) => h(
      'section',
      { className: 'workflow-reports', 'aria-labelledby': 'workflow-reports-heading' },
      h(
        'div',
        { className: 'workflow-reports-search' },
        octicon('issue'),
        search
      ),
      h(
        'div',
        { className: 'workflow-reports-header' },
        h('h2', { id: 'workflow-reports-heading' }, 'Reports'),
        summary
      ),
      h(
        'div',
        { className: 'workflow-report-table-region', role: 'region', 'aria-labelledby': 'workflow-reports-heading', tabIndex: 0 },
        h(
          'table',
          { className: 'workflow-report-table' },
          h(
            'thead',
            null,
            h('tr', null, ...['Report', 'Status', 'Mode', 'Type', 'Updated'].map((label) => h('th', { scope: 'col' }, label)))
          ),
          content
        )
      )
    ),
    renderContent: (rows, emptyMessage) => h(
      'tbody',
      null,
      ...(rows.length > 0
        ? rows
        : [h('tr', null, h('td', { colSpan: 5, className: 'empty' }, emptyMessage))])
    )
  });
}

/** @param {unknown} value */
function parseWorkflowRoute(value) {
  if (typeof value !== 'string' || value.length > 700) return null;
  const separator = value.indexOf(':');
  if (separator <= 0) return null;
  const repository = value.slice(0, separator);
  const workflow = value.slice(separator + 1);
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,98}[A-Za-z0-9])?\/[A-Za-z0-9_.-]{1,100}$/.test(repository)) return null;
  if (!workflow.startsWith('.github/workflows/') || !workflow.endsWith('.md')) return null;
  if ([...workflow].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127)) return null;
  if (workflow.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) return null;
  return { repository, workflow };
}

/** @param {{ repository: string, workflow: string } | null} route */
function routeValueFor(route) {
  return route ? `${route.repository}:${route.workflow}` : '';
}

/** @param {Record<string, unknown>} row */
function qualifiedRepository(row) {
  const repository = text(row.repository);
  if (repository.includes('/')) return repository;
  const organization = text(row.organization);
  return organization && repository ? `${organization}/${repository}` : repository;
}

/** @param {Record<string, unknown>} outcome */
function runtimeRepository(outcome) {
  return text(outcome['runtime-repository']) || qualifiedRepository(outcome);
}

/** @param {Record<string, unknown>} workflow */
function workflowName(workflow) {
  return text(workflow['workflow-name']) || text(workflow.workflow) || 'Unknown workflow';
}

/** @param {Record<string, unknown>} report */
function timestamp(report) {
  const parsed = Date.parse(text(report['observed-at']) || text(report['published-at']));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources @param {string} source */
function rowsFor(sources, source) {
  return Array.isArray(sources[source]?.rows) ? sources[source].rows : [];
}

/** @param {unknown} value */
function text(value) {
  return value == null ? '' : String(value);
}
