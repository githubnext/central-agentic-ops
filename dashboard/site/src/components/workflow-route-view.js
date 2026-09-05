/**
 * Declarative workflow route view composition primitives.
 */

import { workflowRouteComposition, workflowRouteLayoutComposition } from './workflow-route-composition.js';
import { renderWorkflowRouteShell } from './workflow-route-shell.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteView(context) {
  const layout = workflowRouteLayoutComposition(context.elementConfig?.layout);
  if (layout) {
    return renderWorkflowRouteShell(context, layout);
  }
  return renderWorkflowRouteShell(context, workflowRouteComposition(context.elementConfig?.body));
}
