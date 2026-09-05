/**
 * Workflow route composition registry shared by declarative route views.
 */

import { WORKFLOW_ROUTE_BODY_RENDERERS } from './workflow-route-bodies.js';
import { selectRouteBody } from './route-view-body.js';

/**
 * @typedef {'insights'|'reports'|'runs'} WorkflowRouteBody
 */

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
 * }} WorkflowRouteBodyComposition
 */

/**
 * @typedef {(args: {
 *   context: import('./ui-elements.js').ElementRenderContext,
 *   route: { repository: string, workflow: string },
 *   workflow: Record<string, unknown>
 * }) => HTMLElement | null} WorkflowRouteBodyRenderer
 */

const WORKFLOW_ROUTE_BODY_COMPOSITIONS = /** @type {Readonly<Record<WorkflowRouteBody, WorkflowRouteBodyComposition>>} */ ({
  insights: {
    rootClassName: 'workflow-runtime',
    contentClassName: 'workflow-runtime-content',
    selectMessage: 'Select a workflow to inspect its runtime.',
    description: 'Run health, AI Credit usage, and operational value for {workflow} in {repository}.',
    navigationPage: 'packages',
    breadcrumbs: undefined,
    currentTab: 'insights',
    bodyRenderer: WORKFLOW_ROUTE_BODY_RENDERERS.insights
  },
  reports: {
    rootClassName: 'workflow-detail',
    contentClassName: 'workflow-detail-content',
    selectMessage: 'Select a workflow to view its reports.',
    description: 'Durable reports produced by {workflow} in {repository}.',
    navigationPage: 'repositories',
    breadcrumbs: [
      { label: 'Repositories', href: '#page-repositories' },
      { label: '{repository}', href: '#page-repository-detail?repository={repository-encoded}' }
    ],
    currentTab: 'reports',
    bodyRenderer: () => null
  },
  runs: {
    rootClassName: 'workflow-detail',
    contentClassName: 'workflow-detail-content',
    selectMessage: 'Select a workflow to view its runs.',
    description: 'Observed runs for {workflow} in {repository}.',
    navigationPage: 'repositories',
    breadcrumbs: [
      { label: 'Repositories', href: '#page-repositories' },
      { label: '{repository}', href: '#page-repository-detail?repository={repository-encoded}' }
    ],
    currentTab: 'runs',
    bodyRenderer: () => null
  }
});

export const DEFAULT_WORKFLOW_ROUTE_BODY = 'reports';
export const WORKFLOW_ROUTE_BODY_VALUES = /** @type {const} */ (['insights', 'reports', 'runs']);
const WORKFLOW_ROUTE_BODY_REGISTRY = {
  defaultBody: /** @type {WorkflowRouteBody} */ (DEFAULT_WORKFLOW_ROUTE_BODY),
  values: WORKFLOW_ROUTE_BODY_COMPOSITIONS,
  /** @param {unknown} value @returns {value is WorkflowRouteBody} */
  isValue: (value) => typeof value === 'string' && WORKFLOW_ROUTE_BODY_VALUES.includes(/** @type {WorkflowRouteBody} */ (value))
};

/**
 * @param {unknown} body
 * @returns {WorkflowRouteBodyComposition}
 */
export function workflowRouteComposition(body) {
  return WORKFLOW_ROUTE_BODY_COMPOSITIONS[selectWorkflowRouteBody(body)];
}

/**
 * @param {unknown} body
 * @returns {WorkflowRouteBody}
 */
export function selectWorkflowRouteBody(body) {
  return selectRouteBody(WORKFLOW_ROUTE_BODY_REGISTRY, body);
}
