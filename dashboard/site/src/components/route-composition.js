/**
 * Shared route-bound element composition selection helpers.
 */

/**
 * @template {string} T
 * @param {Readonly<Record<T, unknown>>} compositions
 * @param {unknown} selected
 * @param {T} fallback
 * @returns {unknown}
 */
export function selectNamedComposition(compositions, selected, fallback) {
  const key = typeof selected === 'string' && Object.hasOwn(compositions, selected)
    ? /** @type {T} */ (selected)
    : fallback;
  return compositions[key];
}
