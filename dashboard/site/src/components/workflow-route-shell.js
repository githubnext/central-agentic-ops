/**
 * Shared workflow-route shell primitives for declarative composition.
 */

import { h } from '../dom.js';
import { text } from './count-formatters.js';
import { renderWorkflowIdentity } from './workflow-identity.js';
import { createRouteView } from './route-empty-state.js';
import { renderRouteTabSet } from './route-tab-set.js';
import { rowsFor } from './source-rows.js';
import { parseWorkflowRoute, workflowRouteValue } from './workflow-route.js';

/**
 * @typedef {{
 *   rootClassName: string,
 *   contentClassName: string,
 *   selectMessage: string,
 *   description: string,
 *   navigationPage: 'packages'|'repositories',
 *   breadcrumbs: Array<{ label: string, href: string }> | undefined,
 *   currentTab: 'insights'|'reports'|'runs',
 *   bodyRenderer: WorkflowRouteBodyRenderer | undefined
 * }} WorkflowRouteShellConfig
 */

/**
 * @typedef {(args: {
 *   context: import('./ui-elements.js').ElementRenderContext,
 *   route: { repository: string, workflow: string },
 *   workflow: Record<string, unknown>
 * }) => HTMLElement | null} WorkflowRouteBodyRenderer
 */

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {WorkflowRouteShellConfig} config
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteShell(context, config) {
  const workflows = rowsFor(context.sources, 'workflows');
  const root = createRouteView({
    rootClassName: config.rootClassName,
    routeParameter: context.routeParameter,
    datasetKey: 'workflow',
    selectMessage: config.selectMessage,
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
        detail: workflowRouteAllocation(config, route, workflow, name)
      }));
      return h(
        'div',
        { className: config.contentClassName },
        renderWorkflowTabs(config.currentTab, route, name),
        renderWorkflowIdentity(workflow),
        config.bodyRenderer?.({ context, route, workflow }) ?? null
      );
    }
  });
  return root;
}

/**
 * @param {WorkflowRouteShellConfig} config
 * @param {{ repository: string, workflow: string }} route
 * @param {Record<string, unknown>} workflow
 * @param {string} title
 */
function workflowRouteAllocation(config, route, workflow, title) {
  return {
    title,
    description: config.description
      .replace('{workflow}', text(workflow.workflow))
      .replace('{repository}', route.repository),
    ...(['review', 'live'].includes(text(workflow['rollout-mode']))
      ? { mode: text(workflow['rollout-mode']) }
      : {}),
    navigationPage: config.navigationPage === 'packages' && workflow.package ? 'packages' : 'repositories',
    ...(config.breadcrumbs
      ? {
          breadcrumbs: config.breadcrumbs.map((crumb) => ({
            label: crumb.label.replace('{repository}', route.repository),
            href: crumb.href.replace('{repository-encoded}', encodeURIComponent(route.repository))
          }))
        }
      : {})
  };
}

/**
 * @param {'insights'|'reports'|'runs'} currentTab
 * @param {{ repository: string, workflow: string }} route
 * @param {string} workflowName
 */
function renderWorkflowTabs(currentTab, route, workflowName) {
  const workflowQuery = `?workflow=${encodeURIComponent(workflowRouteValue(route.repository, route.workflow))}`;
  const navigationLabel = currentTab === 'insights' ? workflowName : route.workflow;
  return renderRouteTabSet({
    className: 'repository-tabs workflow-tabs',
    ariaLabel: `${navigationLabel} views`,
    currentTab,
    tabs: [
      { id: 'insights', label: 'Insights', icon: 'graph', href: `#page-workflow-runtime${workflowQuery}` },
      { id: 'reports', label: 'Reports', icon: 'issue', href: `#page-workflow-detail${workflowQuery}` },
      { id: 'runs', label: 'Runs', icon: 'play', href: `#page-workflow-runs${workflowQuery}` }
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
