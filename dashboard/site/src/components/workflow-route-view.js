/**
 * Declarative workflow route view composition primitives.
 */

import { workflowRouteComposition, workflowRouteLayoutComposition } from './workflow-route-composition.js';
import { renderWorkflowRouteShell } from './workflow-route-shell.js';
import { renderWorkflowRuntimeMetrics, renderWorkflowValueReport } from './workflow-runtime.js';

/**
 * @typedef {(args: {
 *   context: import('./ui-elements.js').ElementRenderContext,
 *   workflow: Record<string, unknown>
 * }) => HTMLElement | null} WorkflowRouteBodyRenderer
 */

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteView(context) {
  const layout = workflowRouteLayoutComposition(context.elementConfig?.layout);
  if (layout) {
    /** @type {WorkflowRouteBodyRenderer} */
    let bodyRenderer = () => null;
    if (context.elementConfig?.layout === 'metrics') {
      bodyRenderer = ({ context: renderContext, workflow }) => renderWorkflowRuntimeMetrics(renderContext, workflow);
    } else if (context.elementConfig?.layout === 'value-report') {
      bodyRenderer = ({ context: renderContext, workflow }) => renderWorkflowValueReport(renderContext, workflow);
    }
    return renderWorkflowRouteShell(context, {
      ...layout,
      bodyRenderer
    });
  }
  return renderWorkflowRouteShell(context, workflowRouteComposition(context.elementConfig?.body));
}
