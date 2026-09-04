/**
 * Reusable workflow route page composition primitives.
 */

import { h } from '../dom.js';
import { renderLinkTabs } from './tab-nav.js';
import { renderWorkflowIdentity } from './workflow-identity.js';
import { createRouteView } from './route-empty-state.js';
import { rowsFor } from './source-rows.js';
import { parseWorkflowRoute, workflowRouteValue } from './workflow-route.js';

/**
 * @typedef {'insights'|'reports'|'runs'} WorkflowPageView
 */

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {WorkflowPageView} selectedView
 * @param {(args: {
 *   context: import('./ui-elements.js').ElementRenderContext,
 *   route: { repository: string, workflow: string },
 *   workflow: Record<string, unknown>
 * }) => HTMLElement | null} [renderBody]
 * @returns {HTMLElement}
 */
export function renderWorkflowPage(context, selectedView, renderBody) {
  const workflows = rowsFor(context.sources, 'workflows');
  const root = createRouteView({
    rootClassName: selectedView === 'insights' ? 'workflow-runtime' : 'workflow-detail',
    routeParameter: context.routeParameter,
    datasetKey: 'workflow',
    selectMessage: selectedView === 'runs'
      ? 'Select a workflow to view its runs.'
      : selectedView === 'reports'
        ? 'Select a workflow to view its reports.'
        : 'Select a workflow to inspect its runtime.',
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
        detail: workflowRouteAllocation(selectedView, route, workflow, name)
      }));
      return h(
        'div',
        { className: selectedView === 'insights' ? 'workflow-runtime-content' : 'workflow-detail-content' },
        renderWorkflowTabs(selectedView, route, name),
        renderWorkflowIdentity(workflow),
        renderBody?.({ context, route, workflow }) ?? null
      );
    }
  });
  return root;
}

/**
 * @param {WorkflowPageView} selectedView
 * @param {{ repository: string, workflow: string }} route
 * @param {Record<string, unknown>} workflow
 * @param {string} title
 */
function workflowRouteAllocation(selectedView, route, workflow, title) {
  if (selectedView === 'insights') {
    return {
      title,
      description: `Run health, AI Credit usage, and operational value for ${text(workflow.workflow)} in ${route.repository}.`,
      mode: ['review', 'live'].includes(text(workflow['rollout-mode'])) ? text(workflow['rollout-mode']) : '',
      navigationPage: workflow.package ? 'packages' : 'repositories'
    };
  }

  return {
    title,
    description: selectedView === 'runs'
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
  };
}

/**
 * @param {WorkflowPageView} selectedView
 * @param {{ repository: string, workflow: string }} route
 * @param {string} workflowName
 */
function renderWorkflowTabs(selectedView, route, workflowName) {
  const workflowQuery = `?workflow=${encodeURIComponent(workflowRouteValue(route.repository, route.workflow))}`;
  const navigationLabel = selectedView === 'insights' ? workflowName : route.workflow;
  return renderLinkTabs({
    className: 'repository-tabs workflow-tabs',
    ariaLabel: `${navigationLabel} views`,
    tabs: [
      { label: 'Insights', icon: 'graph', href: `#page-workflow-runtime${workflowQuery}`, current: selectedView === 'insights' },
      { label: 'Reports', icon: 'issue', href: `#page-workflow-detail${workflowQuery}`, current: selectedView === 'reports' },
      { label: 'Runs', icon: 'play', href: `#page-workflow-runs${workflowQuery}`, current: selectedView === 'runs' }
    ]
  });
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

/** @param {unknown} value */
function text(value) {
  return value == null ? '' : String(value);
}
