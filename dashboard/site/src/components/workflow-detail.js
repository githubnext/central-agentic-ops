/**
 * Route-aware workflow reports view.
 */

import { h } from '../dom.js';
import { renderLinkTabs } from './tab-nav.js';
import { renderWorkflowIdentity } from './workflow-identity.js';
import { createRouteView } from './route-empty-state.js';
import { parseWorkflowRoute, workflowRouteValue } from './workflow-route.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowDetail(context) {
  const workflows = rowsFor(context.sources, 'workflows');
  const showingRuns = context.pageId === 'workflow-runs';
  const root = createRouteView({
    rootClassName: 'workflow-detail',
    routeParameter: context.routeParameter,
    datasetKey: 'workflow',
    selectMessage: showingRuns ? 'Select a workflow to view its runs.' : 'Select a workflow to view its reports.',
    notFoundMessage: 'Workflow not found.',
    hasSelection: (routeValue) => parseWorkflowRoute(routeValue) !== null,
    renderMatched: (routeValue) => {
      const route = parseWorkflowRoute(routeValue);
      const workflow = route
        ? workflows.find((candidate) => (
            qualifiedRepository(candidate).toLowerCase() === route.repository.toLowerCase()
            && text(candidate.workflow) === route.workflow
          ))
        : null;
      if (!workflow || !route) return null;
      const name = workflowName(workflow);
      root.dispatchEvent(new CustomEvent('dashboard-route-allocation', {
        bubbles: true,
        detail: {
          title: name,
          description: showingRuns
            ? `Observed runs for ${route.workflow} in ${route.repository}.`
            : `Durable reports produced by ${route.workflow} in ${route.repository}.`,
          ...(['review', 'live'].includes(text(workflow['rollout-mode']))
            ? { mode: text(workflow['rollout-mode']) }
            : {}),
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
      return renderWorkflowContent(context, route, workflow);
    }
  });
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
  const showingRuns = pageId === 'workflow-runs';
  return renderLinkTabs({
    className: 'repository-tabs workflow-tabs',
    ariaLabel: `${route.workflow} views`,
    tabs: [
      { label: 'Insights', icon: 'graph', href: `#page-workflow-runtime${workflowQuery}` },
      {
        label: 'Reports',
        icon: 'issue',
        href: `#page-workflow-detail${workflowQuery}`,
        current: pageId === 'workflow-detail'
      },
      {
        label: 'Runs',
        icon: 'play',
        href: `#page-workflow-runs${workflowQuery}`,
        current: showingRuns
      }
    ]
  });
}

/** @param {{ repository: string, workflow: string } | null} route */
function routeValueFor(route) {
  return route ? workflowRouteValue(route.repository, route.workflow) : '';
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
