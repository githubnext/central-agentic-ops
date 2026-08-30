/**
 * Reusable GitHub Primer table region wrapper component.
 */

import { h } from '../dom.js';

/**
 * @param {{ tableClassName: string, emptyMessage: string, colSpan: number, headCells: string[], bodyRows: unknown, filterLabel?: string }} options
 * @returns {HTMLElement}
 */
export function renderTableRegion(options) {
  const { tableClassName, emptyMessage, colSpan, headCells, bodyRows, filterLabel } = options;
  const rowCount = getBodyRowCount(bodyRows);
  const hasRows = rowCount > 0;

  const region = h(
    'div',
    { className: 'table-region' },
    hasRows && filterLabel
      ? h(
        'div',
        { className: 'table-filter' },
        h(
          'label',
          null,
          h('span', null, filterLabel),
          h('input', {
            type: 'search',
            placeholder: 'Filter rows',
            'aria-label': filterLabel,
            'data-table-filter': ''
          })
        ),
        h('output', { className: 'table-filter-result', 'aria-live': 'polite' }, formatResultCount(rowCount))
      )
      : null,
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

  if (hasRows && filterLabel) {
    enableTableFilter(region);
  }
  return region;
}

/**
 * @param {HTMLElement} region
 */
function enableTableFilter(region) {
  const input = region.querySelector('[data-table-filter]');
  const output = region.querySelector('.table-filter-result');
  const rows = [...region.querySelectorAll('tbody > tr')];
  if (!(input instanceof HTMLInputElement) || !(output instanceof HTMLOutputElement)) return;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const row of rows) {
      const matches = query.length === 0 || (row.textContent ?? '').toLocaleLowerCase().includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    }
    output.textContent = formatResultCount(visible);
  });
}

/**
 * @param {number} count
 * @returns {string}
 */
function formatResultCount(count) {
  return `${count.toLocaleString('en')} ${count === 1 ? 'result' : 'results'}`;
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
