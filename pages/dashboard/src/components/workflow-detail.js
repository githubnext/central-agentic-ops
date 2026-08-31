/**
 * Route-aware workflow reports view.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderModeBadge, renderStatusBadge } from './badge.js';
import { findLink, renderExternalLink } from './link-content.js';
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
  const tabs = [
    ['Insights', 'graph', `#page-workflow-runtime${workflowQuery}`, false],
    ['Reports', 'issue', `#page-${pageId}${workflowQuery}`, true]
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
    link ? renderExternalLink(link) : null
  );
}

/** @param {Array<Record<string, unknown>>} reports */
function renderWorkflowReports(reports) {
  const summary = h('div', { 'aria-live': 'polite', 'aria-atomic': 'true' });
  const body = h('tbody');
  const input = h('input', {
    type: 'search',
    placeholder: 'Filter reports',
    'aria-label': 'Filter reports',
    oninput: (/** @type {Event} */ event) => {
      const query = event.currentTarget instanceof HTMLInputElement
        ? event.currentTarget.value
        : '';
      renderRows(query);
    }
  });
  const section = h(
    'section',
    { className: 'workflow-reports', 'aria-labelledby': 'workflow-reports-heading' },
    h(
      'div',
      { className: 'workflow-reports-search' },
      octicon('issue'),
      input
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
        body
      )
    )
  );

  /** @param {string} query */
  function renderRows(query) {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? reports.filter((report) => searchableReportText(report).includes(normalized))
      : reports;
    const statuses = filtered.map((report) => text(report['outcome-status']).toLowerCase());
    const open = statuses.filter((status) => ['open', 'available', 'published'].includes(status)).length;
    const resolved = statuses.filter((status) => ['closed', 'resolved'].includes(status)).length;
    const other = filtered.length - open - resolved;
    const summaryChildren = [
      h('span', { className: 'workflow-filter-announcement' }, `${filtered.length} report${filtered.length === 1 ? '' : 's'} shown. `),
      h('strong', null, String(open)),
      ' Open',
      h('span', null, h('strong', null, String(resolved)), ' Resolved')
    ];
    if (other > 0) summaryChildren.push(h('span', null, h('strong', null, String(other)), ' Other'));
    summary.replaceChildren(...summaryChildren);
    body.replaceChildren(...(filtered.length > 0
      ? filtered.map(renderWorkflowReport)
      : [h(
        'tr',
        null,
        h(
          'td',
          { colSpan: 5, className: 'empty' },
          reports.length > 0 ? 'No reports match this filter.' : 'No reports have been attributed to this workflow.'
        )
      )]));
  }

  renderRows('');
  return section;
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
    'tr',
    { className: 'workflow-report-row' },
    h(
      'th',
      { scope: 'row' },
      h(
        'div',
        { className: 'workflow-report-primary' },
        h(
          'span',
          { className: 'workflow-report-icon', 'aria-hidden': 'true' },
          octicon(kind === 'noop' ? 'check-circle' : 'issue')
        ),
        h(
          'span',
          { className: 'workflow-report-copy' },
          h('span', { className: 'workflow-report-title' }, titleContent),
          h('span', { className: 'workflow-report-summary', title: summary }, summary)
        )
      )
    ),
    h('td', null, renderStatusBadge(status)),
    h('td', null, renderModeBadge(mode)),
    h('td', null, h('span', { className: 'kind' }, titleCase(kind))),
    updatedAt
      ? h('td', null, h('time', { dateTime: updatedAt }, formatUtcDateTime(updatedAt)))
      : h('td', { className: 'workflow-report-time' }, 'Unknown')
  );
}

/** @param {Record<string, unknown>} report */
function searchableReportText(report) {
  return [
    report['outcome-title'],
    report['outcome-summary'],
    report['outcome-category'],
    report['outcome-status'],
    report['outcome-state'],
    report['rollout-mode']
  ].map(text).join(' ').toLowerCase();
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

/** @param {string} value */
function titleCase(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
