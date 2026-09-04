/**
 * Declarative workflow route view composition primitives.
 */

import { renderWorkflowPage } from './workflow-page.js';
import { renderWorkflowRuntimeBody } from './workflow-runtime.js';

/**
 * @typedef {'insights'|'reports'|'runs'} WorkflowRouteVariant
 */

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteView(context) {
  const variant = workflowRouteVariant(context);
  return renderWorkflowPage(
    context,
    variant,
    variant === 'insights'
      ? ({ context, workflow }) => renderWorkflowRuntimeBody(context, workflow)
      : undefined
  );
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {WorkflowRouteVariant}
 */
function workflowRouteVariant(context) {
  const viewId = String(context.viewId ?? '');
  if (viewId === 'workflow-runs-route') return 'runs';
  if (viewId === 'workflow-runtime-route') return 'insights';
  if (context.pageId === 'workflow-runs') return 'runs';
  if (context.pageId === 'workflow-runtime') return 'insights';
  return 'reports';
}
