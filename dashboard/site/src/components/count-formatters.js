/**
 * Shared presentation-only count and pluralization helpers.
 */

/**
 * Converts a kebab-case identifier into title-cased display text.
 * @param {string} value
 * @returns {string}
 */
export function titleCase(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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

/**
 * Returns the regular English plural suffix ('' or 's') for a count, for
 * inline pluralization of nouns that only need a trailing "s".
 * @param {unknown} value
 * @returns {string}
 */
export function pluralSuffix(value) {
  return Number(value) === 1 ? '' : 's';
}
