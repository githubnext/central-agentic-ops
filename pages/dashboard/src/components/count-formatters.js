/**
 * Shared presentation-only count and pluralization helpers.
 */

/**
 * Formats a count for UI text.
 * @param {unknown} value
 * @returns {string}
 */
export function formatCount(value) {
  return new Intl.NumberFormat('en').format(Number(value) || 0);
}

/**
 * Formats a count with a singular/plural noun.
 * @param {unknown} value
 * @param {string} singular
 * @param {string} plural
 * @returns {string}
 */
export function formatCountNoun(value, singular, plural) {
  const count = Number(value) || 0;
  return `${formatCount(count)} ${count === 1 ? singular : plural}`;
}
