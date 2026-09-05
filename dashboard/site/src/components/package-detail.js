/**
 * Declarative package route element compatibility wrapper.
 */

import { renderPackageRouteView } from './package-route-view.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderPackageNavigation(context) {
  return renderPackageRouteView(context);
}
