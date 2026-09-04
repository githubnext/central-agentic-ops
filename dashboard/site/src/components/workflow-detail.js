/**
 * Route-aware workflow reports and runs chrome.
 */

import { renderWorkflowRouteView } from './workflow-route-view.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowDetail(context) {
  return renderWorkflowRouteView({
    ...context,
    viewId: context.viewId ?? (context.pageId === 'workflow-runs' ? 'workflow-runs-route' : 'workflow-reports-route')
  });
}
