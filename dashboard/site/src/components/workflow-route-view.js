/**
 * Declarative workflow route view composition primitives.
 */

import { renderWorkflowPage } from './workflow-page.js';
import { renderWorkflowRuntimeBody } from './workflow-runtime.js';

/**
 * @typedef {NonNullable<Parameters<typeof renderWorkflowPage>[1]>} WorkflowRouteBodyRenderer
 */

const ROUTE_VIEW_BODY_ENTRIES = /** @type {Array<[string, WorkflowRouteBodyRenderer]>} */ ([
  ['workflow-runtime-route', ({ context, workflow }) => renderWorkflowRuntimeBody(context, workflow)],
  ['workflow-reports-route', () => null],
  ['workflow-runs-route', () => null]
]);

/** @type {Map<string, WorkflowRouteBodyRenderer>} */
const ROUTE_VIEW_BODIES = new Map(ROUTE_VIEW_BODY_ENTRIES);

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteView(context) {
  const selectedViewId = String(
    context.viewId
      ?? (context.element === 'workflow-runtime'
        ? 'workflow-runtime-route'
        : context.element === 'workflow-runs'
          ? 'workflow-runs-route'
          : 'workflow-reports-route')
  );
  const routeView = renderWorkflowPage(context, ROUTE_VIEW_BODIES.get(selectedViewId));
  return routeView;
}
