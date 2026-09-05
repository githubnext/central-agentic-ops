/**
 * Shared helpers for route-scoped body composition selected declaratively.
 */

/**
 * @template {string} T
 * @typedef {{
 *   defaultBody: T,
 *   values: Readonly<Record<T, unknown>>,
 *   isValue: (value: unknown) => value is T
 * }} RouteBodyRegistry
 */

/**
 * @template {string} T
 * @param {RouteBodyRegistry<T>} registry
 * @param {unknown} body
 * @returns {T}
 */
export function selectRouteBody(registry, body) {
  return registry.isValue(body) ? body : registry.defaultBody;
}
