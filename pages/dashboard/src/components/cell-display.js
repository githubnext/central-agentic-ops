/**
 * Generic renderer for JSON-selected table cell displays.
 */

import { renderActiveStateBadge, renderModeBadge, renderStatusBadge } from './badge.js';

/**
 * @param {unknown} display
 * @param {unknown} value
 * @param {(value: unknown) => string} toText
 * @returns {string | HTMLElement}
 */
export function renderCellDisplay(display, value, toText) {
  if (display === 'mode') return renderModeBadge(value);
  if (display === 'active-state') return renderActiveStateBadge(value);
  if (display === 'status') return renderStatusBadge(value);
  return toText(value);
}
