/**
 * Reusable presentation-only chart legend and series helpers for dashboard views.
 */

import { h } from '../dom.js';
import { formatNumber } from '../view-formatters.js';

/**
 * @typedef {{ name: string, className: string }} ChartSeriesDescriptor
 */

/**
 * @typedef {{ x: string, y: number, color: string | null }} ChartPointLike
 */

/**
 * @param {ChartPointLike[]} points
 * @returns {Array<[string, ChartPointLike[]]>}
 */
export function groupChartSeries(points) {
  const grouped = new Map();
  for (const point of points) {
    const name = point.color ?? 'value';
    const series = grouped.get(name) ?? [];
    series.push(point);
    grouped.set(name, series);
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
}

/**
 * @param {ChartPointLike[]} points
 * @returns {ChartSeriesDescriptor[]}
 */
export function listChartSeries(points) {
  return groupChartSeries(points).map(([name], index) => ({
    name,
    className: `chart-series-${(index % 5) + 1}`
  }));
}

/**
 * @param {ChartSeriesDescriptor[]} series
 * @param {string} chartType
 * @returns {HTMLElement}
 */
export function renderChartLegend(series, chartType) {
  return h(
    'ul',
    { className: `chart-legend chart-legend-${chartType}`, 'data-chart-legend': 'visual' },
    series.map((item) => h(
      'li',
      null,
      h('i', { className: item.className, 'aria-hidden': 'true' }),
      h('span', null, item.name)
    ))
  );
}

/**
 * @param {ChartPointLike[]} points
 * @returns {{ entries: Array<[string, number]>, total: number }}
 */
export function pieChartEntries(points) {
  const totals = new Map();
  for (const point of points) {
    const category = point.x;
    totals.set(category, (totals.get(category) ?? 0) + point.y);
  }
  const entries = [...totals.entries()].filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  return { entries, total };
}

/**
 * @param {Array<[string, number]>} entries
 * @param {number} total
 * @returns {HTMLElement}
 */
export function renderPieLegend(entries, total) {
  return h(
    'ul',
    { className: 'chart-legend chart-legend-pie', 'data-chart-legend': 'visual' },
    entries.map(([label, value], index) => h(
      'li',
      null,
      h('i', { className: `chart-series-${(index % 5) + 1}`, 'aria-hidden': 'true' }),
      h('span', null, label),
      h('strong', null, formatNumber(value)),
      h('small', null, total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%')
    ))
  );
}
