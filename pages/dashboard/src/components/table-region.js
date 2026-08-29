/**
 * Reusable GitHub Primer table region wrapper component.
 */

import { h } from '../dom.js';

/**
 * @param {{ tableClassName: string, emptyMessage: string, colSpan: number, headCells: string[], bodyRows: unknown }} options
 * @returns {HTMLElement}
 */
export function renderTableRegion(options) {
  const { tableClassName, emptyMessage, colSpan, headCells, bodyRows } = options;
  const rowCount = getBodyRowCount(bodyRows);
  const hasRows = rowCount > 0;

  return h(
    'div',
    { className: 'table-region' },
    h(
      'table',
      {
        className: tableClassName,
        ...(tableClassName === 'custom-table' ? { 'data-custom-view-mark': 'table' } : {}),
        ...(tableClassName === 'custom-chart-table' ? { 'data-custom-view-mark': 'chart' } : {})
      },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          ...headCells.map((cell) => h('th', null, cell))
        )
      ),
      h(
        'tbody',
        null,
        hasRows
          ? bodyRows
          : h('tr', null, h('td', { colSpan }, emptyMessage))
      )
    )
  );
}

/**
 * @param {unknown} bodyRows
 * @returns {number}
 */
function getBodyRowCount(bodyRows) {
  if (Array.isArray(bodyRows)) {
    return bodyRows.length;
  }
  if (typeof bodyRows === 'object' && bodyRows !== null && 'items' in bodyRows) {
    const keyedBodyRows = /** @type {{ items?: unknown[] }} */ (bodyRows);
    return Array.isArray(keyedBodyRows.items) ? keyedBodyRows.items.length : 0;
  }
  if (typeof bodyRows === 'object' && bodyRows !== null && 'length' in bodyRows) {
    const collection = /** @type {{ length?: number }} */ (bodyRows);
    return typeof collection.length === 'number' ? collection.length : 0;
  }
  return bodyRows ? 1 : 0;
}
