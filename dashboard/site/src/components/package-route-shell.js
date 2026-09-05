/**
 * Shared package-route shell primitives for declarative composition.
 */

import { h } from '../dom.js';
import { createRouteView } from './route-empty-state.js';
import { renderRouteTabSet } from './route-tab-set.js';
import { rowsFor } from './source-rows.js';
import { normalizePackageRoute, packageModeForRoute, packageNameForRoute } from './package-route-composition.js';

/**
 * @typedef {{
 *   rootClassName: string,
 *   selectMessage: string,
 *   description: string,
 *   currentTab: 'insights'|'workflows'|'dispatches'|'reports',
 *   bodyRenderer: PackageRouteBodyRenderer | undefined
 * }} PackageRouteShellConfig
 */

/**
 * @typedef {(args: {
 *   context: import('./ui-elements.js').ElementRenderContext,
 *   packageId: string,
 *   packageName: string,
 *   workflows: Array<Record<string, unknown>>
 * }) => HTMLElement | null} PackageRouteBodyRenderer
 */

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {PackageRouteShellConfig} config
 * @returns {HTMLElement}
 */
export function renderPackageRouteShell(context, config) {
  const allWorkflows = rowsFor(context.sources, 'workflows');
  const root = createRouteView({
    rootClassName: config.rootClassName,
    routeParameter: context.routeParameter,
    datasetKey: 'package',
    selectMessage: config.selectMessage,
    notFoundMessage: 'Package not found.',
    unavailableMessage: 'Package data is unavailable.',
    isUnavailable: () => context.sources.workflows?.metadata?.availability === 'unavailable',
    hasSelection: (routeValue) => normalizePackageRoute(routeValue).length > 0,
    renderMatched: (routeValue) => {
      const packageId = normalizePackageRoute(routeValue);
      const workflows = allWorkflows
        .filter((workflow) => packageId && String(workflow.package).toLowerCase() === packageId.toLowerCase());
      if (workflows.length === 0) {
        return null;
      }
      const packageName = packageNameForRoute(packageId, workflows);
      root.dispatchEvent(new CustomEvent('dashboard-route-allocation', {
        bubbles: true,
        detail: {
          title: packageName,
          description: config.description.replace('{packageName}', packageName),
          mode: packageModeForRoute(workflows),
          navigationPage: 'packages'
        }
      }));
      return h(
        'div',
        null,
        renderPackageTabs(packageId, packageName, config.currentTab),
        config.bodyRenderer?.({ context, packageId, packageName, workflows }) ?? null
      );
    }
  });
  return root;
}

/**
 * @param {string} packageId
 * @param {string} packageName
 * @param {'insights'|'workflows'|'dispatches'|'reports'} currentTab
 */
function renderPackageTabs(packageId, packageName, currentTab) {
  const packageQuery = `?package=${encodeURIComponent(packageId)}`;
  return renderRouteTabSet({
    className: 'package-tabs',
    ariaLabel: `${packageName} views`,
    currentTab,
    tabs: [
      { id: 'insights', label: 'Insights', icon: 'graph', href: `#page-package-insights${packageQuery}` },
      { id: 'workflows', label: 'Workflows', icon: 'workflow', href: `#page-package-detail${packageQuery}` },
      { id: 'dispatches', label: 'Dispatches', icon: 'play', href: `#page-package-dispatches${packageQuery}` },
      { id: 'reports', label: 'Reports', icon: 'issue', href: `#page-package-reports${packageQuery}` }
    ]
  });
}
