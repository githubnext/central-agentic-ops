/**
 * Observable-inspired table column summaries.
 */

import { h } from '../dom.js';
import { renderHistogramBins } from './histogram.js';
import { formatCountNoun } from './count-formatters.js';
import { renderDefinitionListRows } from './view-chrome.js';
import { formatMediumUtcDateTime, renderTableSummaryEmpty } from './ui-primitives.js';
import { formatPercent } from '../view-formatters.js';

/**
 * @typedef {import('../table-summary-data.js').TableColumnSummary & { label: string }} RenderableTableColumnSummary
 */

/**
 * @param {RenderableTableColumnSummary[]} columns
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
 * @param {RenderableTableColumnSummary} column
 * @returns {HTMLElement | null}
 */
function renderColumnSummary(column) {
  if (column.kind === 'none') return null;
  if (column.kind === 'empty') return renderTableSummaryEmpty(column.message);
  if (column.kind === 'boolean') {
    return h(
      'div',
      { className: 'table-summary-boolean' },
      h('strong', null, formatPercent(column.ratio)),
      h('span', null, ' true')
    );
  }
  if (column.kind === 'quantitative') {
    return renderQuantitativeSummary(column);
  }
  if (column.kind === 'temporal') {
    return renderTemporalSummary(column.start, column.stop);
  }
  if (column.kind === 'count') {
    return renderCountSummary(column.count);
  }
  return renderCategoricalSummary(column.values);
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
 * @param {Array<{ label: string, ratio: number }>} values
 * @returns {HTMLElement}
 */
function renderCategoricalSummary(values) {
  return h(
    'ol',
    { className: 'table-summary-categories', 'aria-label': 'Most common values' },
    ...values.map((value) => h(
      'li',
      null,
      h('span', { title: value.label }, value.label),
      h('strong', null, formatPercent(value.ratio))
    ))
  );
}

/**
 * @param {Extract<RenderableTableColumnSummary, { kind: 'quantitative' }>} summary
 * @returns {HTMLElement}
 */
function renderQuantitativeSummary(summary) {
  return h(
    'div',
    { className: 'table-summary-quantitative' },
    renderHistogramBins({
      bins: summary.bins,
      label: `${summary.label} distribution, ${summary.count.toLocaleString('en')} values`
    }),
    h(
      'dl',
      null,
      ...renderDefinitionListRows([
        { label: 'Mean', value: formatStatistic(summary.mean) },
        { label: 'Stddev', value: summary.deviation === null ? 'N/A' : formatStatistic(summary.deviation) }
      ])
    )
  );
}

/**
 * @param {number} start
 * @param {number} stop
 * @returns {HTMLElement}
 */
function renderTemporalSummary(start, stop) {
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
