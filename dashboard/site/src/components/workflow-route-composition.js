/**
 * Workflow route composition registry shared by declarative route views.
 */

import { renderWorkflowRuntimeBody } from './workflow-runtime.js';

/**
 * @typedef {'insights'|'reports'|'runs'} WorkflowRouteVariant
 */

/**
 * @typedef {{
 *   variant: WorkflowRouteVariant,
 *   rootClassName: string,
 *   contentClassName: string,
 *   selectMessage: string,
 *   description: string,
 *   navigationPage: 'packages'|'repositories',
 *   breadcrumbs: Array<{ label: string, href: string }> | undefined,
 *   element: string,
 *   bodyRenderer: WorkflowRouteBodyRenderer | undefined
 * }} WorkflowRouteComposition
 */

/**
 * @typedef {(args: {
 *   context: import('./ui-elements.js').ElementRenderContext,
 *   route: { repository: string, workflow: string },
 *   workflow: Record<string, unknown>
 * }) => HTMLElement | null} WorkflowRouteBodyRenderer
 */

const WORKFLOW_ROUTE_COMPOSITIONS = /** @type {Readonly<Record<WorkflowRouteVariant, WorkflowRouteComposition>>} */ ({
  insights: {
    variant: 'insights',
    rootClassName: 'workflow-runtime',
    contentClassName: 'workflow-runtime-content',
    selectMessage: 'Select a workflow to inspect its runtime.',
    description: 'Run health, AI Credit usage, and operational value for {workflow} in {repository}.',
    navigationPage: 'packages',
    breadcrumbs: undefined,
    element: 'workflow-runtime',
    bodyRenderer: ({ context, workflow }) => renderWorkflowRuntimeBody(context, workflow)
  },
  reports: {
    variant: 'reports',
    rootClassName: 'workflow-detail',
    contentClassName: 'workflow-detail-content',
    selectMessage: 'Select a workflow to view its reports.',
    description: 'Durable reports produced by {workflow} in {repository}.',
    navigationPage: 'repositories',
    breadcrumbs: [
      { label: 'Repositories', href: '#page-repositories' },
      { label: '{repository}', href: '#page-repository-detail?repository={repository-encoded}' }
    ],
    element: 'workflow-detail',
    bodyRenderer: () => null
  },
  runs: {
    variant: 'runs',
    rootClassName: 'workflow-detail',
    contentClassName: 'workflow-detail-content',
    selectMessage: 'Select a workflow to view its runs.',
    description: 'Observed runs for {workflow} in {repository}.',
    navigationPage: 'repositories',
    breadcrumbs: [
      { label: 'Repositories', href: '#page-repositories' },
      { label: '{repository}', href: '#page-repository-detail?repository={repository-encoded}' }
    ],
    element: 'workflow-runs',
    bodyRenderer: () => null
  }
});

const DEFAULT_WORKFLOW_ROUTE_COMPOSITION = 'reports';

/**
 * @param {unknown} variant
 * @returns {WorkflowRouteComposition}
 */
export function workflowRouteComposition(variant) {
  const key = typeof variant === 'string' && variant in WORKFLOW_ROUTE_COMPOSITIONS
    ? /** @type {WorkflowRouteVariant} */ (variant)
    : DEFAULT_WORKFLOW_ROUTE_COMPOSITION;
  return WORKFLOW_ROUTE_COMPOSITIONS[key];
}
