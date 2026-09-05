/**
 * Declarative workflow route view composition primitives.
 */

import { workflowRouteComposition } from './workflow-route-composition.js';
import { renderWorkflowRouteShell } from './workflow-route-shell.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteView(context) {
  return renderWorkflowRouteShell(context, workflowRouteComposition(context.elementConfig?.body));
}
