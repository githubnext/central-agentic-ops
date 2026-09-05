/**
 * Workflow route composition registry shared by declarative route views.
 */

import { renderWorkflowRuntimeBody } from './workflow-runtime.js';

/**
 * @typedef {'insights'|'reports'|'runs'} WorkflowRouteBody
 */

/**
 * @typedef {'identity'|'metrics'|'value-report'} WorkflowRouteLayout
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
    bodyRenderer: ({ context, workflow }) => renderWorkflowRuntimeBody(context, workflow)
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

const DEFAULT_WORKFLOW_ROUTE_BODY = 'reports';

/**
 * @param {unknown} body
 * @returns {WorkflowRouteBodyComposition}
 */
export function workflowRouteComposition(body) {
  const key = typeof body === 'string' && Object.hasOwn(WORKFLOW_ROUTE_BODY_COMPOSITIONS, body)
    ? /** @type {WorkflowRouteBody} */ (body)
    : DEFAULT_WORKFLOW_ROUTE_BODY;
  return WORKFLOW_ROUTE_BODY_COMPOSITIONS[key];
}

const WORKFLOW_ROUTE_LAYOUT_COMPOSITIONS = /** @type {Readonly<Record<WorkflowRouteLayout, Pick<WorkflowRouteBodyComposition, 'rootClassName'|'contentClassName'|'selectMessage'|'description'|'navigationPage'|'breadcrumbs'|'currentTab'>>>} */ ({
  identity: {
    rootClassName: 'workflow-detail',
    contentClassName: 'workflow-detail-content',
    selectMessage: 'Select a workflow to inspect it.',
    description: 'Workflow identity for {workflow} in {repository}.',
    navigationPage: 'repositories',
    breadcrumbs: [
      { label: 'Repositories', href: '#page-repositories' },
      { label: '{repository}', href: '#page-repository-detail?repository={repository-encoded}' }
    ],
    currentTab: 'reports'
  },
  metrics: {
    rootClassName: 'workflow-runtime',
    contentClassName: 'workflow-runtime-content',
    selectMessage: 'Select a workflow to inspect its runtime.',
    description: 'Run health and AI Credit usage for {workflow} in {repository}.',
    navigationPage: 'packages',
    breadcrumbs: undefined,
    currentTab: 'insights'
  },
  'value-report': {
    rootClassName: 'workflow-runtime',
    contentClassName: 'workflow-runtime-content',
    selectMessage: 'Select a workflow to inspect its operational value.',
    description: 'Operational value for {workflow} in {repository}.',
    navigationPage: 'packages',
    breadcrumbs: undefined,
    currentTab: 'insights'
  }
});

/**
 * @param {unknown} layout
 * @returns {Pick<WorkflowRouteBodyComposition, 'rootClassName'|'contentClassName'|'selectMessage'|'description'|'navigationPage'|'breadcrumbs'|'currentTab'> | null}
 */
export function workflowRouteLayoutComposition(layout) {
  if (typeof layout !== 'string' || !Object.hasOwn(WORKFLOW_ROUTE_LAYOUT_COMPOSITIONS, layout)) return null;
  return WORKFLOW_ROUTE_LAYOUT_COMPOSITIONS[/** @type {WorkflowRouteLayout} */ (layout)];
}
