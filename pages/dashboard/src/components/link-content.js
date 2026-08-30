/**
 * Reusable presentation-only link helpers for dashboard views.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';

/**
 * @typedef {{ href: string, label: string }} SafeLink
 */

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} field
 * @returns {SafeLink | null}
 */
export function findFirstLink(rows, field) {
  for (const row of rows) {
    const link = findLink(row, field);
    if (link) {
      return link;
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} field
 * @returns {SafeLink | null}
 */
export function findLink(row, field) {
  const candidate = row[field];
  if (!isPlainObject(candidate) || typeof candidate.href !== 'string' || typeof candidate.label !== 'string') {
    return null;
  }
  try {
    const url = new URL(candidate.href);
    if (url.protocol !== 'https:' || url.username || url.password || candidate.label.trim().length === 0) {
      return null;
    }
  } catch {
    return null;
  }
  return { href: candidate.href, label: candidate.label };
}

/**
 * @param {SafeLink} link
 * @returns {HTMLElement}
 */
export function renderExternalLink(link) {
  return h('a', {
    href: link.href,
    target: '_blank',
    rel: 'noopener noreferrer',
    'aria-label': link.label
  }, link.label, octicon('external-link'));
}

/**
 * @param {string | HTMLElement} value
 * @param {SafeLink | null} link
 * @returns {string | HTMLElement | Array<string | HTMLElement | null>}
 */
export function renderLinkedValueWithExternalLink(value, link) {
  return link ? [value, ' ', renderExternalLink(link)] : value;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
