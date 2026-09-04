/**
 * Reusable workflow route page composition primitives.
 */

import { h } from '../dom.js';
import { renderLinkTabs } from './tab-nav.js';
import { renderWorkflowIdentity } from './workflow-identity.js';
import { createRouteView } from './route-empty-state.js';
import { rowsFor } from './source-rows.js';
import { parseWorkflowRoute, workflowRouteValue } from './workflow-route.js';
import { workflowRouteComposition } from './workflow-route-composition.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowPage(context) {
  const workflows = rowsFor(context.sources, 'workflows');
  const composition = workflowRouteComposition(context.viewId);
  const root = createRouteView({
    rootClassName: composition.rootClassName,
    routeParameter: context.routeParameter,
    datasetKey: 'workflow',
    selectMessage: composition.selectMessage,
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
        detail: workflowRouteAllocation(composition, route, workflow, name)
      }));
      return h(
        'div',
        { className: composition.contentClassName },
        renderWorkflowTabs(composition.variant, route, name),
        renderWorkflowIdentity(workflow),
        composition.bodyRenderer?.({ context, route, workflow }) ?? null
      );
    }
  });
  return root;
}

/**
 * @param {import('./workflow-route-composition.js').WorkflowRouteComposition} composition
 * @param {{ repository: string, workflow: string }} route
 * @param {Record<string, unknown>} workflow
 * @param {string} title
 */
function workflowRouteAllocation(composition, route, workflow, title) {
  return {
    title,
    description: composition.description
      .replace('{workflow}', text(workflow.workflow))
      .replace('{repository}', route.repository),
    ...(['review', 'live'].includes(text(workflow['rollout-mode']))
      ? { mode: text(workflow['rollout-mode']) }
      : {}),
    navigationPage: composition.navigationPage === 'packages' && workflow.package ? 'packages' : 'repositories',
    ...(composition.breadcrumbs
      ? {
          breadcrumbs: composition.breadcrumbs.map((crumb) => ({
            label: crumb.label.replace('{repository}', route.repository),
            href: crumb.href.replace('{repository-encoded}', encodeURIComponent(route.repository))
          }))
        }
      : {})
  };
}

/**
 * @param {import('./workflow-route-composition.js').WorkflowRouteVariant} selectedView
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
