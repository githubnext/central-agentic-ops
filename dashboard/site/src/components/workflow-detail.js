/**
 * Route-aware workflow reports and runs chrome.
 */

import { renderWorkflowPage } from './workflow-page.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowDetail(context) {
  const selectedView = String(context.viewId) === 'workflow-runs-route'
    || context.pageId === 'workflow-runs'
    ? 'runs'
    : 'reports';
  return renderWorkflowPage(
    context,
    selectedView
  );
}
