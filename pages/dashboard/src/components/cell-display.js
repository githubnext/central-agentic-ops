/**
 * Generic renderer for JSON-selected table cell displays.
 */

import { renderActiveStateBadge, renderModeBadge, renderStatusBadge } from './badge.js';
import { formatNumber } from '../view-formatters.js';

/**
 * @param {unknown} display
 * @param {unknown} value
 * @param {(value: unknown) => string} toText
 * @param {{ name: string, symbol: string, significant: number } | null} [unit]
 * @returns {string | HTMLElement}
 */
export function renderCellDisplay(display, value, toText, unit = null) {
  if (display === 'mode') return renderModeBadge(value);
  if (display === 'active-state') return renderActiveStateBadge(value);
  if (display === 'status') return renderStatusBadge(value);
  if (unit && typeof value === 'number' && Number.isFinite(value)) return formatNumber(value, unit);
  return toText(value);
}
