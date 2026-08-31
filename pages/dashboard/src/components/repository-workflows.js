/**
 * Repository-scoped Agentic Workflow inventory.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderStatusBadge } from './badge.js';
import { formatCountNoun } from './count-formatters.js';
import { findLink } from './link-content.js';
import { renderLinkedText } from './linked-text.js';
import { formatUtcDateTime } from './ui-primitives.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderRepositoryWorkflows(context) {
  const allWorkflows = rowsFor(context.sources, 'workflows');
  const root = h('div', {
    className: 'repository-view',
    'data-route-view': '',
    'data-route-parameter': context.routeParameter
  });
  /** @param {unknown} routeValue */
  const render = (routeValue) => {
    const repository = normalizeRepositoryRoute(routeValue)
      || firstScopedRepository(context.scope);
    const workflows = allWorkflows
      .filter((workflow) => repository && repositoryName(workflow).toLowerCase() === repository.toLowerCase())
      .sort((left, right) => workflowName(left).localeCompare(workflowName(right)));
    const content = renderRepositoryWorkflowContent(context, repository, workflows);
    root.dataset.repository = repository;
    root.replaceChildren(...content.childNodes);
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
 * @param {string} repository
 * @param {Array<Record<string, unknown>>} workflows
 */
function renderRepositoryWorkflowContent(context, repository, workflows) {
  const headingId = `${context.pageId}-repository-workflows-heading`;
  const latest = workflows
    .map((workflow) => String(workflow['observed-at'] ?? ''))
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  const disabled = workflows.filter((workflow) => workflowState(workflow) === 'Disabled').length;
  const repositoryLink = findLink(workflows[0] ?? {}, 'repository-link');
  const actionsHref = repositoryLink
    ? `${(repositoryLink.externalHref ?? repositoryLink.href).replace(/\/+$/, '')}/actions`
    : null;

  return h(
    'div',
    { className: 'repository-view-content' },
    renderRepositoryTabs(context.pageId, repository),
    h(
      'section',
      { className: 'repository-workflow-summary', 'aria-label': 'Repository GitHub Agentic Workflows summary' },
      h(
        'dl',
        { className: 'repository-metrics' },
        h(
          'div',
          null,
          h('dt', null, 'Authored AW workflows'),
          h('dd', null, workflows.length.toLocaleString('en')),
          h('p', null, 'One canonical identity per ', h('code', null, '.md'), ' source')
        ),
        renderWorkflowStatusMetric(workflows)
      )
    ),
    h(
      'section',
      { className: 'repository-workflows', 'aria-labelledby': headingId },
      h(
        'div',
        { className: 'repository-section-heading' },
        h(
          'div',
          null,
          h(context.headingTag, { id: headingId }, context.title),
          h(
            'p',
            null,
            'Authored ',
            h('code', null, '.github/workflows/*.md'),
            ' workflows with managed-package membership shown as metadata. Latest registration update: ',
            latest ? formatUtcDateTime(latest) : 'unknown',
            `. ${formatCountNoun(disabled, 'disabled', 'disabled')}.`
          )
        ),
        actionsHref
          ? h(
            'a',
            { href: actionsHref, 'aria-label': `View ${repository} Actions` },
            'View Actions',
            octicon('external-link')
          )
          : null
      ),
      h(
        'div',
        { className: 'table-region', role: 'region', 'aria-labelledby': headingId, tabIndex: 0 },
        h(
          'table',
          { className: 'repository-workflow-table' },
          h(
            'thead',
            null,
            h('tr', null, ...['Workflow', 'State', 'Updated'].map((label) => h('th', { scope: 'col' }, label)))
          ),
          h(
            'tbody',
            null,
            ...(workflows.length > 0
              ? workflows.map(renderWorkflowRow)
              : [h('tr', null, h('td', { colSpan: 3 }, 'No authored Agentic Workflows were observed for this repository.'))])
          )
        )
      )
    )
  );
}

/**
 * @param {string} pageId
 * @param {string} repository
 */
function renderRepositoryTabs(pageId, repository) {
  const repositoryQuery = repository ? `?repository=${encodeURIComponent(repository)}` : '';
  const tabs = [
    ['Workflows', 'workflow', `#page-${pageId}${repositoryQuery}`, true],
    ['Reports', 'issue', `#page-findings${repositoryQuery}`, false],
    ['Insights', 'graph', `#page-operational-value${repositoryQuery}`, false]
  ];
  return h(
    'nav',
    { className: 'repository-tabs', 'aria-label': `${repository || 'Repository'} views` },
    ...tabs.map(([label, icon, href, current]) => h(
      'a',
      { href, 'aria-current': current ? 'page' : undefined },
      octicon(String(icon)),
      h('span', null, String(label))
    ))
  );
}

/**
 * @param {Array<Record<string, unknown>>} workflows
 */
function renderWorkflowStatusMetric(workflows) {
  const counts = { Active: 0, Disabled: 0, Unknown: 0 };
  for (const workflow of workflows) counts[workflowState(workflow)] += 1;
  const segments = [
    ['Active', counts.Active, 'var(--success)'],
    ['Disabled', counts.Disabled, 'var(--muted)'],
    ['Unknown', counts.Unknown, 'var(--attention)']
  ];
  let offset = 0;
  const stops = workflows.length > 0
    ? segments
      .filter(([, count]) => Number(count) > 0)
      .map(([, count, color]) => {
        const start = offset;
        offset += Number(count) / workflows.length * 100;
        return `${color} ${start.toFixed(3)}% ${offset.toFixed(3)}%`;
      })
      .join(', ')
    : 'var(--neutral-muted) 0 100%';
  const chartLabel = `Workflow status: ${counts.Active} active, ${counts.Disabled} disabled, ${counts.Unknown} unknown`;

  return h(
    'div',
    { className: 'repository-workflow-status' },
    h('dt', null, 'Workflow status'),
    h(
      'dd',
      null,
      h('span', { className: 'repository-status-pie', role: 'img', 'aria-label': chartLabel, style: `background: conic-gradient(${stops})` }),
      h('span', { className: 'repository-status-total' }, h('strong', null, workflows.length.toLocaleString('en')), h('small', null, 'workflows'))
    ),
    h(
      'ul',
      { 'aria-hidden': 'true' },
      ...segments.map(([label, count, color]) => h(
        'li',
        null,
        h('i', { style: `background: ${color}` }),
        h('span', null, String(label)),
        h('strong', null, Number(count).toLocaleString('en'))
      ))
    ),
    h('p', null, 'Current GitHub Actions registration state')
  );
}

/**
 * @param {Record<string, unknown>} workflow
 * @returns {HTMLTableRowElement}
 */
function renderWorkflowRow(workflow) {
  const observedAt = String(workflow['observed-at'] ?? '');
  const link = findLink(workflow, 'workflow-link');
  return /** @type {HTMLTableRowElement} */ (h(
    'tr',
    null,
    h(
      'th',
      { scope: 'row' },
      renderLinkedText(workflowName(workflow), link),
      link
        ? h('a', { className: 'repository-workflow-source', href: link.externalHref ?? link.href }, h('code', null, String(workflow.workflow ?? '')))
        : h('code', { className: 'repository-workflow-source' }, String(workflow.workflow ?? '')),
      h(
        'span',
        { className: 'repository-workflow-badges' },
        ...(workflow.package
          ? [h('a', { href: `#page-package-detail?package=${encodeURIComponent(String(workflow.package))}` }, String(workflow['package-name'] ?? workflow.package))]
          : []),
        h('span', null, titleCase(String(workflow['workflow-role'] ?? 'unknown')))
      )
    ),
    h('td', null, renderStatusBadge(workflowState(workflow))),
    h(
      'td',
      null,
      observedAt && Number.isFinite(Date.parse(observedAt))
        ? h('time', { dateTime: observedAt }, formatUtcDateTime(observedAt))
        : 'Unknown'
    )
  ));
}

/** @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources @param {string} source */
function rowsFor(sources, source) {
  return Array.isArray(sources[source]?.rows) ? sources[source].rows : [];
}

/** @param {Record<string, unknown> | undefined} workflow */
function repositoryName(workflow) {
  if (!workflow) return '';
  const owner = typeof workflow.organization === 'string' && workflow.organization ? `${workflow.organization}/` : '';
  return `${owner}${String(workflow.repository ?? '')}`;
}

/** @param {Record<string, unknown> | undefined} scope */
function firstScopedRepository(scope) {
  const repositories = scope?.repositories;
  return Array.isArray(repositories) && typeof repositories[0] === 'string'
    ? repositories[0]
    : '';
}

/** @param {unknown} value */
function normalizeRepositoryRoute(value) {
  if (typeof value !== 'string') return '';
  const repository = value.trim();
  return /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,98}[A-Za-z0-9])?\/[A-Za-z0-9_.-]{1,100}$/.test(repository)
    ? repository
    : '';
}

/** @param {Record<string, unknown>} workflow */
function workflowName(workflow) {
  return String(workflow['workflow-name'] ?? workflow.workflow ?? 'Unknown workflow');
}

/** @param {Record<string, unknown>} workflow @returns {'Active'|'Disabled'|'Unknown'} */
function workflowState(workflow) {
  if (String(workflow['workflow-active']) === 'true') return 'Active';
  if (String(workflow['workflow-active']) === 'false') return 'Disabled';
  return 'Unknown';
}

/** @param {string} value */
function titleCase(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
