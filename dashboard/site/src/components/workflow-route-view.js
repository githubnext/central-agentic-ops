/**
 * Declarative workflow route view composition primitives.
 */

import { renderWorkflowPage } from './workflow-page.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteView(context) {
  return renderWorkflowPage(context);
}
