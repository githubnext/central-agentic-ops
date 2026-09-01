/**
 * Route-aware workflow reports view.
 */

import { h } from '../dom.js';
import { renderLinkTabs } from './tab-nav.js';
import { renderWorkflowIdentity } from './workflow-identity.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowDetail(context) {
  const workflows = rowsFor(context.sources, 'workflows');
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
    root.dataset.workflow = routeValueFor(route);
    root.replaceChildren(workflow && route
      ? renderWorkflowContent(context, route, workflow)
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
 */
function renderWorkflowContent(context, route, workflow) {
  return h(
    'div',
    { className: 'workflow-detail-content' },
    renderWorkflowTabs(context.pageId, route),
    renderWorkflowIdentity(workflow)
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

/** @param {Record<string, unknown>} workflow */
function workflowName(workflow) {
  return text(workflow['workflow-name']) || text(workflow.workflow) || 'Unknown workflow';
}

/** @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources @param {string} source */
function rowsFor(sources, source) {
  return Array.isArray(sources[source]?.rows) ? sources[source].rows : [];
}

/** @param {unknown} value */
function text(value) {
  return value == null ? '' : String(value);
}
