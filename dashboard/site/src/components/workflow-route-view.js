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

/** @type {Readonly<Record<string, string>>} */
const ROUTE_VIEW_ELEMENTS = Object.freeze({
  'workflow-runtime-route': 'workflow-runtime',
  'workflow-reports-route': 'workflow-detail',
  'workflow-runs-route': 'workflow-runs'
});

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderWorkflowRouteView(context) {
  const selectedViewId = String(context.viewId ?? 'workflow-reports-route');
  const routeView = renderWorkflowPage(
    {
      ...context,
      element: ROUTE_VIEW_ELEMENTS[selectedViewId] ?? context.element
    },
    ROUTE_VIEW_BODIES.get(selectedViewId)
  );
  return routeView;
}
