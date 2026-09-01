/**
 * Presentation-only summary text helpers shared across dashboard components.
 */

/**
 * @param {number} count
 * @param {string} [singular]
 * @param {string} [plural]
 * @returns {string}
 */
export function formatSummaryCount(count, singular = 'item', plural = 'items') {
  return `${count.toLocaleString('en')} ${count === 1 ? singular : plural}`;
}
