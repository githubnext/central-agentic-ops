/**
 * Reusable GitHub Primer table region wrapper component.
 */

import { h } from '../dom.js';
import { renderTableSummaryRow } from './table-summary.js';

/**
 * @typedef {{ key: string, label: string, columnIndex: number }} TableFilterField
 */

const DEFAULT_PAGE_SIZE = 25;

/**
 * Renders a table inside a bounded-height scroll region. Column sorting is enabled
 * by default whenever `filterLabel` is provided, and can be forced with `sortable`.
 *
 * @param {{
 *   tableClassName: string,
 *   regionClassName?: string,
 *   emptyMessage: string,
 *   colSpan: number,
 *   headCells: string[],
 *   summaryColumns?: import('./table-summary.js').TableSummaryColumn[],
 *   bodyRows: unknown,
 *   filterLabel?: string,
 *   filterId?: string,
 *   filterFields?: TableFilterField[],
 *   pageSize?: number,
 *   sortable?: boolean
 * }} options
 * @returns {HTMLElement}
 */
export function renderTableRegion(options) {
  const {
    tableClassName,
    regionClassName,
    emptyMessage,
    colSpan,
    headCells,
    summaryColumns = [],
    bodyRows,
    filterLabel,
    filterId,
    filterFields = [],
    pageSize = DEFAULT_PAGE_SIZE
  } = options;
  const rowCount = getBodyRowCount(bodyRows);
  const hasRows = rowCount > 0;
  const facets = getTableFacets(bodyRows, filterFields, rowCount);
  const sortable = options.sortable ?? Boolean(filterLabel);
  const interactive = hasRows && Boolean(filterLabel);

  const region = h(
    'div',
    { className: `table-region${regionClassName ? ` ${regionClassName}` : ''}` },
    interactive
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
            'data-table-filter': ''
          })
        ),
        ...facets.map((facet) => h(
          'label',
          { className: 'table-filter-facet' },
          h('span', null, facet.label),
          h(
            'select',
            { 'data-table-facet': facet.key, 'data-table-column-index': String(facet.columnIndex) },
            h('option', { value: '' }, `All ${facet.label.toLocaleLowerCase('en')}`),
            ...facet.values.map((value) => h('option', { value }, value))
          )
        )),
        h('output', { className: 'table-filter-result', 'aria-live': 'polite' }, formatResultCount(Math.min(rowCount, pageSize), rowCount))
      )
      : null,
    h(
      'div',
      {
        className: 'table-scroll',
        tabIndex: 0,
        ...(filterLabel ? { role: 'region', 'aria-label': `${filterLabel} results` } : {})
      },
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
            ...headCells.map((cell, columnIndex) => (hasRows && sortable
              ? h(
                'th',
                { scope: 'col', 'aria-sort': 'none' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'table-sort',
                    'data-table-sort': String(columnIndex)
                  },
                  cell
                )
              )
              : h('th', { scope: 'col' }, cell)))
          ),
          summaryColumns.length > 0 ? renderTableSummaryRow(summaryColumns) : null
        ),
        h(
          'tbody',
          null,
          hasRows
            ? bodyRows
            : h('tr', null, h('td', { colSpan }, emptyMessage))
        )
      )
    ),
    interactive
      ? h('button', { className: 'table-filter-more', type: 'button', 'data-table-more': '' }, `Show ${pageSize} more`)
      : null
  );

  if (hasRows && sortable) {
    enableTableSort(region);
  }
  if (interactive) {
    enableTableFilter(region, { filterId, pageSize });
  }
  return region;
}

/**
 * Enables click-to-sort on column headers, cycling ascending then descending.
 *
 * @param {HTMLElement} region
 */
function enableTableSort(region) {
  const body = region.querySelector('tbody');
  if (!(body instanceof HTMLTableSectionElement)) return;
  const headers = [...region.querySelectorAll('th[aria-sort]')]
    .filter((header) => header instanceof HTMLTableCellElement);

  for (const header of headers) {
    const control = header.querySelector('[data-table-sort]');
    if (!(control instanceof HTMLButtonElement)) continue;
    const columnIndex = Number(control.dataset.tableSort);
    control.addEventListener('click', () => {
      const direction = header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
      for (const other of headers) other.setAttribute('aria-sort', 'none');
      header.setAttribute('aria-sort', direction);
      const sorted = [...body.rows].sort((left, right) => compareCells(
        cellText(left, columnIndex),
        cellText(right, columnIndex)
      ));
      if (direction === 'descending') sorted.reverse();
      for (const row of sorted) body.append(row);
      region.dispatchEvent(new Event('table-sorted'));
    });
  }
}

/**
 * @param {HTMLTableRowElement} row
 * @param {number} columnIndex
 * @returns {string}
 */
function cellText(row, columnIndex) {
  return row.cells[columnIndex]?.textContent?.trim() ?? '';
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
function compareCells(left, right) {
  if (left === right) return 0;
  if (left === '') return 1;
  if (right === '') return -1;
  const leftNumber = Number(left.replace(/,/g, ''));
  const rightNumber = Number(right.replace(/,/g, ''));
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
  const leftDate = Date.parse(left);
  const rightDate = Date.parse(right);
  if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) return leftDate - rightDate;
  return left.localeCompare(right);
}

/**
 * @param {HTMLElement} region
 * @param {{ filterId?: string, pageSize: number }} options
 */
function enableTableFilter(region, options) {
  const input = region.querySelector('[data-table-filter]');
  const output = region.querySelector('.table-filter-result');
  const more = region.querySelector('[data-table-more]');
  const facets = [...region.querySelectorAll('[data-table-facet]')]
   .filter((facet) => facet instanceof HTMLSelectElement);
  const currentRows = () => [...region.querySelectorAll('tbody > tr')]
   .filter((row) => row instanceof HTMLTableRowElement);
  if (
   !(input instanceof HTMLInputElement)
   || !(output instanceof HTMLOutputElement)
   || !(more instanceof HTMLButtonElement)
  ) return;

  const window = region.ownerDocument.defaultView;
  const parameters = new URLSearchParams(window?.location.search ?? '');
  /** @param {string} name */
  const parameterName = (name) => options.filterId ? `${options.filterId}.${name}` : null;
  const queryParameter = parameterName('q');
  if (queryParameter) input.value = parameters.get(queryParameter) ?? '';
  for (const facet of facets) {
   const facetParameter = parameterName(facet.dataset.tableFacet ?? '');
   const value = facetParameter ? parameters.get(facetParameter) : null;
   if (value && [...facet.options].some((option) => option.value === value)) {
     facet.value = value;
   }
  }

  let limit = options.pageSize;
  const apply = (reset = false) => {
   if (reset) limit = options.pageSize;
   const query = input.value.trim().toLocaleLowerCase('en');
   let matched = 0;
   let shown = 0;
   for (const row of currentRows()) {
     const matchesSearch = query.length === 0
       || (row.textContent ?? '').toLocaleLowerCase('en').includes(query);
     const matchesFacets = facets.every((facet) => {
       const columnIndex = Number(facet.dataset.tableColumnIndex);
       const cellValue = row.cells[columnIndex]?.textContent?.trim() ?? '';
       return facet.value === '' || cellValue === facet.value;
     });
     const matches = matchesSearch && matchesFacets;
     if (matches) matched += 1;
     const visible = matches && shown < limit;
     row.hidden = !visible;
     if (visible) shown += 1;
   }
   output.textContent = formatResultCount(shown, matched);
   more.hidden = shown >= matched;
  };

  const syncUrl = () => {
   if (!window || !options.filterId || !['http:', 'https:'].includes(window.location.protocol)) return;
   const currentParameters = new URLSearchParams(window.location.search);
   const values = [
     ['q', input.value.trim()],
     ...facets.map((facet) => [facet.dataset.tableFacet ?? '', facet.value])
   ];
   for (const [name, value] of values) {
     const key = parameterName(name);
     if (!key) continue;
     if (value) currentParameters.set(key, value);
     else currentParameters.delete(key);
   }
   const query = currentParameters.toString();
   window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  };

  for (const control of [input, ...facets]) {
   control.addEventListener('input', () => {
     syncUrl();
     apply(true);
   });
  }
  more.addEventListener('click', () => {
   limit += options.pageSize;
   apply();
  });
  region.addEventListener('table-sorted', () => apply());
  apply();
}

/**
 * @param {number} shown
 * @param {number} matched
 * @returns {string}
 */
function formatResultCount(shown, matched) {
  return `Showing ${shown.toLocaleString('en')} of ${matched.toLocaleString('en')} ${matched === 1 ? 'result' : 'results'}`;
}

/**
 * @param {unknown} bodyRows
 * @param {TableFilterField[]} filterFields
 * @param {number} rowCount
 * @returns {Array<TableFilterField & { values: string[] }>}
 */
function getTableFacets(bodyRows, filterFields, rowCount) {
  if (!Array.isArray(bodyRows)) return [];
  return filterFields.flatMap((field) => {
   const values = [...new Set(bodyRows
     .map((row) => row instanceof HTMLTableRowElement
       ? row.cells[field.columnIndex]?.textContent?.trim() ?? ''
       : '')
     .filter(Boolean))]
     .sort((left, right) => left.localeCompare(right));
   return values.length > 1 && values.length < rowCount && values.length <= 10
     ? [{ ...field, values }]
     : [];
  });
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
