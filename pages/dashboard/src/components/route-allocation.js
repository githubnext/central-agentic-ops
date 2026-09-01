/**
 * Shared route allocation dispatch helper.
 */

/**
 * @typedef {{
 *   title: string,
 *   description?: string,
 *   mode?: string,
 *   navigationPage?: string,
 *   breadcrumbs?: Array<{ label: string, href: string }>,
 *   titleLink?: Record<string, unknown> | null
 * }} RouteAllocationDetail
 */

/**
 * Dispatches the shared dashboard route allocation event.
 * @param {HTMLElement} root
 * @param {RouteAllocationDetail} detail
 */
export function dispatchRouteAllocation(root, detail) {
  root.dispatchEvent(new CustomEvent('dashboard-route-allocation', {
    bubbles: true,
    detail
  }));
}
