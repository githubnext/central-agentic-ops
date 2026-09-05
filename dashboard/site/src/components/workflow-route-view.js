/**
 * Declarative workflow route view composition primitives.
 */

import { renderWorkflowRouteBody } from './workflow-route-shell.js';
import { selectWorkflowRouteBody } from './workflow-route-composition.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteView(context) {
  const body = selectWorkflowRouteBody(context.elementConfig?.body);
  return renderWorkflowRouteBody(context, body);
}
