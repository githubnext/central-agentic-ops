/**
 * Reusable GitHub Primer table region wrapper component.
 */

import { h } from '../dom.js';

/**
 * @typedef {{ key: string, label: string, columnIndex: number }} TableFilterField
 */

const DEFAULT_PAGE_SIZE = 25;

/**
 * @param {{
 *   tableClassName: string,
 *   emptyMessage: string,
 *   colSpan: number,
 *   headCells: string[],
 *   bodyRows: unknown,
 *   filterLabel?: string,
 *   filterId?: string,
 *   filterFields?: TableFilterField[],
 *   pageSize?: number
 * }} options
 * @returns {HTMLElement}
 */
export function renderTableRegion(options) {
  const {
    tableClassName,
    emptyMessage,
    colSpan,
    headCells,
    bodyRows,
    filterLabel,
    filterId,
    filterFields = [],
    pageSize = DEFAULT_PAGE_SIZE
  } = options;
  const rowCount = getBodyRowCount(bodyRows);
  const hasRows = rowCount > 0;
  const facets = getTableFacets(bodyRows, filterFields, rowCount);

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
    ),
    hasRows && filterLabel
      ? h('button', { className: 'table-filter-more', type: 'button', 'data-table-more': '' }, `Show ${pageSize} more`)
      : null
  );

  if (hasRows && filterLabel) {
   enableTableFilter(region, { filterId, pageSize });
  }
  return region;
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
  const rows = [...region.querySelectorAll('tbody > tr')]
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
   for (const row of rows) {
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
