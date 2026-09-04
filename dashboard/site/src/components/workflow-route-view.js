/**
 * Declarative workflow route view composition primitives.
 */

import { renderWorkflowPage } from './workflow-page.js';
import { renderWorkflowRuntimeBody } from './workflow-runtime.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteView(context) {
  const routeView = renderWorkflowPage(
    context,
    context.element === 'workflow-runtime'
      ? ({ context, workflow }) => renderWorkflowRuntimeBody(context, workflow)
      : undefined
  );
  return routeView;
}
