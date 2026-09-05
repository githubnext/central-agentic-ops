/**
 * Declarative workflow route view composition primitives.
 */

import { workflowRouteComposition } from './workflow-route-composition.js';
import { renderWorkflowRouteShell } from './workflow-route-shell.js';
import { renderWorkflowRuntimeMetrics, renderWorkflowValueReport } from './workflow-runtime.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteView(context) {
  if (context.elementConfig?.layout === 'metrics') {
    return renderWorkflowRouteShell(context, {
      ...workflowRouteComposition('insights'),
      bodyRenderer: ({ context, workflow }) => renderWorkflowRuntimeMetrics(context, workflow)
    });
  }
  if (context.elementConfig?.layout === 'value-report') {
    return renderWorkflowRouteShell(context, {
      ...workflowRouteComposition('insights'),
      bodyRenderer: ({ context, workflow }) => renderWorkflowValueReport(context, workflow)
    });
  }
  if (context.elementConfig?.layout === 'identity') {
    return renderWorkflowRouteShell(context, {
      ...workflowRouteComposition('reports'),
      bodyRenderer: () => null
    });
  }
  return renderWorkflowRouteShell(context, workflowRouteComposition(context.elementConfig?.body));
}
