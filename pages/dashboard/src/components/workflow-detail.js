/**
 * Route-aware workflow reports view.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderModeBadge, renderStatusBadge } from './badge.js';
import { findLink } from './link-content.js';
import { formatUtcDateTime } from './ui-primitives.js';

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
          qualifiedRepository(outcome).toLowerCase() === route?.repository.toLowerCase()
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
  const tabs = [
    ['Reports', 'issue', `#page-${pageId}${workflowQuery}`, true],
    ['Insights', 'graph', `#page-operational-value${workflowQuery}`, false]
  ];
  return h(
    'nav',
    { className: 'repository-tabs workflow-tabs', 'aria-label': `${route.workflow} views` },
    ...tabs.map(([label, icon, href, current]) => h(
      'a',
      { href, 'aria-current': current ? 'page' : undefined },
      octicon(String(icon)),
      h('span', null, String(label))
    ))
  );
}

/** @param {Record<string, unknown>} workflow */
function renderWorkflowIdentity(workflow) {
  const link = findLink(workflow, 'workflow-link');
  const externalHref = link?.externalHref ?? link?.href;
  const packageId = text(workflow.package);
  const packageName = text(workflow['package-name']) || titleCase(packageId);
  const role = text(workflow['workflow-role']) || 'unknown';
  return h(
    'section',
    { className: 'workflow-identity', 'aria-label': 'Workflow identity' },
    h(
      'div',
      null,
      h(
        'span',
        { className: 'workflow-badges' },
        h('span', { className: `workflow-badge workflow-badge-${role}` }, titleCase(role)),
        packageId
          ? h(
            'a',
            {
              className: 'workflow-badge workflow-badge-package',
              href: `#page-package-detail?package=${encodeURIComponent(packageId)}`
            },
            `Package · ${packageName}`
          )
          : null
      ),
      h('p', null, h('code', null, text(workflow.workflow)))
    ),
    externalHref
      ? h(
        'a',
        {
          href: externalHref,
          target: '_blank',
          rel: 'noopener noreferrer'
        },
        'View authored workflow',
        octicon('external-link')
      )
      : null
  );
}

/** @param {Array<Record<string, unknown>>} reports */
function renderWorkflowReports(reports) {
  const open = reports.filter((report) => ['open', 'available', 'published'].includes(text(report['outcome-status']).toLowerCase())).length;
  const resolved = reports.length - open;
  return h(
    'section',
    { className: 'workflow-reports', 'aria-labelledby': 'workflow-reports-heading' },
    h(
      'div',
      { className: 'workflow-reports-search', 'aria-hidden': 'true' },
      octicon('issue'),
      h('span', null, 'Filter reports')
    ),
    h(
      'div',
      { className: 'workflow-reports-header' },
      h('h2', { id: 'workflow-reports-heading' }, 'Reports'),
      h(
        'div',
        null,
        h('strong', null, String(open)),
        ' Open',
        h('span', null, h('strong', null, String(resolved)), ' Resolved')
      )
    ),
    h(
      'div',
      { className: 'workflow-report-columns', 'aria-hidden': 'true' },
      ...['Report', 'Status', 'Mode', 'Type', 'Updated'].map((label) => h('span', null, label))
    ),
    h(
      'div',
      { className: 'workflow-report-rows' },
      ...(reports.length > 0
        ? reports.map(renderWorkflowReport)
        : [h('p', { className: 'empty' }, 'No reports have been attributed to this workflow.')])
    )
  );
}

/** @param {Record<string, unknown>} report */
function renderWorkflowReport(report) {
  const outcomeId = text(report['safe-output']);
  const title = text(report['outcome-title']) || outcomeId || 'Untitled report';
  const summary = text(report['outcome-summary']) || 'No report summary was provided.';
  const kind = text(report['outcome-category']) || 'unknown';
  const status = titleCase(text(report['outcome-status']) || text(report['outcome-state']) || 'unknown');
  const mode = titleCase(text(report['rollout-mode']) || 'unknown');
  const updatedAt = text(report['observed-at']) || text(report['published-at']);
  const titleContent = outcomeId
    ? h('a', { href: `#page-outcome-detail?outcome=${encodeURIComponent(outcomeId)}`, title }, title)
    : title;
  return h(
    'article',
    { className: 'workflow-report-row' },
    h(
      'div',
      { className: 'workflow-report-icon', 'aria-hidden': 'true' },
      octicon(kind === 'noop' ? 'check-circle' : 'issue')
    ),
    h(
      'div',
      { className: 'workflow-report-copy' },
      h('h3', null, titleContent),
      h('p', { title: summary }, summary)
    ),
    renderStatusBadge(status),
    renderModeBadge(mode),
    h('span', { className: 'kind' }, titleCase(kind)),
    updatedAt
      ? h('time', { dateTime: updatedAt }, formatUtcDateTime(updatedAt))
      : h('span', { className: 'workflow-report-time' }, 'Unknown')
  );
}

/** @param {unknown} value */
function parseWorkflowRoute(value) {
  if (typeof value !== 'string' || value.length > 700) return null;
  const separator = value.indexOf(':');
  if (separator <= 0) return null;
  const repository = value.slice(0, separator);
  const workflow = value.slice(separator + 1);
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,98}[A-Za-z0-9])?\/[A-Za-z0-9_.-]{1,100}$/.test(repository)) return null;
  if (!/^\.github\/workflows\/[A-Za-z0-9_.-]+\.md$/.test(workflow)) return null;
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

/** @param {string} value */
function titleCase(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
