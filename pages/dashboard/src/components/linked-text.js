/**
 * Reusable presentation-only linked text helpers for dashboard views.
 */

import { h } from '../dom.js';

/**
 * Renders text as an external link when a safe link is available, otherwise as plain text.
 * @param {string} text
 * @param {{ href: string, label: string } | null} link
 * @returns {string | HTMLElement}
 */
export function renderLinkedText(text, link) {
  return link
    ? h('a', { href: link.href, target: '_blank', rel: 'noopener noreferrer', 'aria-label': link.label }, text)
    : text;
}

/**
 * @param {Record<string, string>} entityLinkFields
 * @param {(row: Record<string, unknown>, field: string) => { href: string, label: string } | null} findLink
 * @param {(field: string, value: unknown) => string | HTMLElement} renderTableCellValue
 * @param {(value: unknown) => string} toText
 * @returns {(field: string, value: unknown, row: Record<string, unknown>) => string | HTMLElement}
 */
export function createEntityAwareCellRenderer(entityLinkFields, findLink, renderTableCellValue, toText) {
  /**
   * @param {string} field
   * @param {unknown} value
   * @param {Record<string, unknown>} row
   * @returns {string | HTMLElement}
   */
  return function renderEntityAwareCellValue(field, value, row) {
    const linkField = Object.prototype.hasOwnProperty.call(entityLinkFields, field)
      ? entityLinkFields[/** @type {keyof typeof entityLinkFields} */ (field)]
      : null;
    if (linkField) {
      const link = findLink(row, linkField);
      if (link) {
        return renderLinkedText(toText(value), link);
      }
    }
    return renderTableCellValue(field, value);
  };
}
