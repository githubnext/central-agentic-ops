/**
 * Route-aware workflow reports and runs chrome.
 */

<<<<<<< HEAD
import { renderWorkflowPage } from './workflow-page.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowDetail(context) {
  return renderWorkflowPage(
    context,
    context.pageId === 'workflow-runs' ? 'runs' : 'reports'
  );
}
