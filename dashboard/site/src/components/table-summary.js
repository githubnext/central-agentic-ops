/**
 * Observable-inspired table column summaries.
 */

import { h } from '../dom.js';
import { renderHistogram } from './histogram.js';
import { formatCountNoun } from './count-formatters.js';
import { renderDefinitionListRows } from './view-chrome.js';
import { formatMediumUtcDateTime, renderTableSummaryEmpty } from './ui-primitives.js';
import { formatPercent } from '../view-formatters.js';

const RUN_SUMMARY_FIELDS = new Set(['run', 'run-link']);
const RUN_SUMMARY_LABELS = new Set(['run', 'run link', 'workflow run', 'workflow runs']);
const SUMMARY_TYPES = new Set(['boolean', 'nominal', 'ordinal', 'quantitative', 'temporal']);

/**
 * @typedef {{ field?: string, label: string, type?: string, display?: string, values: unknown[] }} TableSummaryColumn
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
 * @returns {HTMLElement | null}
 */
function renderColumnSummary(column) {
  if (column.display === 'outcome-link') {
    return null;
  }
  if (!SUMMARY_TYPES.has(String(column.type ?? ''))) {
    return null;
  }
  const values = column.values.filter((value) => value != null && value !== '');
  if (values.length === 0) {
    return renderTableSummaryEmpty('No values');
  }
  if (column.type === 'boolean' || values.every((value) => typeof value === 'boolean')) {
    const trueCount = values.filter((value) => value === true).length;
    return h(
      'div',
      { className: 'table-summary-boolean' },
      h('strong', null, formatPercent(trueCount / values.length)),
      h('span', null, ' true')
    );
  }
  if (column.type === 'quantitative') {
    const numericValues = values
      .map((value) => typeof value === 'number' ? value : Number(value))
      .filter(Number.isFinite);
    return renderQuantitativeSummary(column.label, numericValues);
  }
  if (column.type === 'temporal') {
    const timestamps = values
      .map((value) => Date.parse(String(value)))
      .filter(Number.isFinite);
    return renderTemporalSummary(timestamps);
  }
  if (shouldRenderCountSummary(column)) {
    return renderCountSummary(values.length);
  }
  if (values.some((value) => typeof value === 'object')) {
    return null;
  }
  return renderCategoricalSummary(values);
}

/**
 * @param {TableSummaryColumn} column
 * @returns {boolean}
 */
function shouldRenderCountSummary(column) {
  const type = String(column.type ?? '');
  if (!['nominal', 'ordinal', 'temporal'].includes(type)) {
    return false;
  }
  const field = String(column.field ?? '').toLocaleLowerCase('en');
  const label = column.label.toLocaleLowerCase('en');
  return RUN_SUMMARY_FIELDS.has(field) || RUN_SUMMARY_LABELS.has(label);
}

/**
 * @param {number} count
 * @returns {HTMLElement}
 */
function renderCountSummary(count) {
  return h(
    'div',
    { className: 'table-summary-count' },
    formatCountNoun(count, 'item', 'items')
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
      h('strong', null, formatPercent(count / values.length))
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
    return renderTableSummaryEmpty('No numeric values');
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
      ...renderDefinitionListRows([
        { label: 'Mean', value: formatStatistic(mean) },
        { label: 'Median', value: formatStatistic(median) },
        { label: 'Standard deviation', value: deviation === null ? 'N/A' : formatStatistic(deviation) }
      ])
    )
  );
}

/**
 * @param {number[]} timestamps
 * @returns {HTMLElement}
 */
function renderTemporalSummary(timestamps) {
  if (timestamps.length === 0) {
    return renderTableSummaryEmpty('No timestamps');
  }
  const start = Math.min(...timestamps);
  const stop = Math.max(...timestamps);
  return h(
    'dl',
    { className: 'table-summary-temporal' },
    ...renderDefinitionListRows([
      { label: 'Start', value: formatTimestamp(start) },
      { label: 'Stop', value: formatTimestamp(stop) },
      { label: 'Duration', value: formatDuration(stop - start) }
    ])
  );
}

/**
 * @param {number} timestamp
 * @returns {string}
 */
function formatTimestamp(timestamp) {
  return formatMediumUtcDateTime(timestamp);
}

/**
 * @param {number} duration
 * @returns {string}
 */
function formatDuration(duration) {
  const seconds = Math.max(0, Math.round(duration / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatStatistic(value) {
  return value.toLocaleString('en', { maximumFractionDigits: 2 });
}
