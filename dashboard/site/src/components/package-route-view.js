/**
 * Declarative package route view composition primitives.
 */

import { packageRouteComposition } from './package-route-composition.js';
import { renderPackageRouteShell } from './package-route-shell.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderPackageRouteView(context) {
  return renderPackageRouteShell(context, packageRouteComposition(context.elementConfig?.body));
}
