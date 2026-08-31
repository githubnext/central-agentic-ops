/**
 * Observable-inspired table column summaries.
 */

import { h } from '../dom.js';
import { renderHistogram } from './histogram.js';

/**
 * @typedef {{ field?: string, label: string, type?: string, values: unknown[] }} TableSummaryColumn
 */

/**
 * @param {TableSummaryColumn[]} columns
 * @returns {HTMLTableRowElement}
 */
export function renderTableSummaryRow(columns) {
  return /** @type {HTMLTableRowElement} */ (h(
    'tr',
    { className: 'table-summary-row' },
    ...columns.map((column) => h(
      'th',
      { scope: 'col', className: 'table-summary-cell' },
      renderColumnSummary(column)
    ))
  ));
}

/**
 * @param {TableSummaryColumn} column
 * @returns {HTMLElement}
 */
function renderColumnSummary(column) {
  const values = column.values.filter((value) => value != null && value !== '');
  if (values.length === 0) {
    return h('span', { className: 'table-summary-empty' }, 'No values');
  }
  if (column.type === 'boolean' || values.every((value) => typeof value === 'boolean')) {
    const trueCount = values.filter((value) => value === true).length;
    return h(
      'div',
      { className: 'table-summary-boolean' },
      h('strong', null, formatPercentage(trueCount / values.length)),
      h('span', null, ' true')
    );
  }
  if (column.type === 'quantitative') {
    const numericValues = values
      .map((value) => typeof value === 'number' ? value : Number(value))
      .filter(Number.isFinite);
    return renderQuantitativeSummary(column.label, numericValues);
  }
  if (shouldRenderCountSummary(column, values)) {
    return renderCountSummary(values.length);
  }
  return renderCategoricalSummary(values);
}

/**
 * @param {TableSummaryColumn} column
 * @param {unknown[]} values
 * @returns {boolean}
 */
function shouldRenderCountSummary(column, values) {
  const type = String(column.type ?? '');
  if (!['nominal', 'ordinal', 'temporal'].includes(type)) {
    return true;
  }
  if (values.some((value) => typeof value === 'object')) {
    return true;
  }
  const field = String(column.field ?? '').toLocaleLowerCase('en');
  const label = column.label.toLocaleLowerCase('en');
  return field === 'run'
    || field === 'run-link'
    || label === 'run'
    || label === 'run link'
    || label === 'workflow run'
    || label === 'workflow runs';
}

/**
 * @param {number} count
 * @returns {HTMLElement}
 */
function renderCountSummary(count) {
  return h(
    'div',
    { className: 'table-summary-count' },
    h('strong', null, count.toLocaleString('en')),
    h('span', null, ` ${count === 1 ? 'item' : 'items'}`)
  );
}

/**
 * @param {unknown[]} values
 * @returns {HTMLElement}
 */
function renderCategoricalSummary(values) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const value of values) {
    const label = String(value);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const commonValues = [...counts]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3);
  return h(
    'ol',
    { className: 'table-summary-categories', 'aria-label': 'Most common values' },
    ...commonValues.map(([value, count]) => h(
      'li',
      null,
      h('span', { title: value }, value),
      h('strong', null, formatPercentage(count / values.length))
    ))
  );
}

/**
 * @param {string} label
 * @param {number[]} values
 * @returns {HTMLElement}
 */
function renderQuantitativeSummary(label, values) {
  if (values.length === 0) {
    return h('span', { className: 'table-summary-empty' }, 'No numeric values');
  }
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const sortedValues = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sortedValues.length / 2);
  const median = sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle];
  const deviation = values.length > 1
    ? Math.sqrt(
      values.reduce((total, value) => total + ((value - mean) ** 2), 0) / (values.length - 1)
    )
    : null;
  return h(
    'div',
    { className: 'table-summary-quantitative' },
    renderHistogram({
      values,
      label: `${label} distribution, ${values.length.toLocaleString('en')} values`
    }),
    h(
      'dl',
      null,
      h('div', null, h('dt', null, 'Mean'), h('dd', null, formatStatistic(mean))),
      h('div', null, h('dt', null, 'Median'), h('dd', null, formatStatistic(median))),
      h(
        'div',
        null,
        h('dt', null, 'Standard deviation'),
        h('dd', null, deviation === null ? 'N/A' : formatStatistic(deviation))
      )
    )
  );
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatPercentage(value) {
  return value.toLocaleString('en', { style: 'percent', maximumFractionDigits: 1 });
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatStatistic(value) {
  return value.toLocaleString('en', { maximumFractionDigits: 2 });
}
