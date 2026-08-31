/**
 * Reusable presentation-only chart legend and series helpers for dashboard views.
 */

import { h } from '../dom.js';
import { formatNumber, toNumber } from '../view-formatters.js';

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
    className: `chart-series-${(index % 6) + 1}`
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
 * @param {Map<string, { href: string, label: string }>} [links]
 * @param {{ name: string, symbol: string, significant: number } | null} [unit]
 * @returns {HTMLElement}
 */
export function renderPieLegend(entries, total, links = new Map(), unit = null) {
  return h(
    'ul',
    { className: 'chart-legend chart-legend-pie', 'data-chart-legend': 'visual' },
    entries.map(([label, value], index) => {
      const link = links.get(label);
      return h(
        'li',
        null,
        h('i', { className: `chart-series-${(index % 6) + 1}`, 'aria-hidden': 'true' }),
        h(
          'span',
          null,
          link
          ? h('a', {
              href: link.href,
              target: link.href.startsWith('#') ? undefined : '_blank',
              rel: link.href.startsWith('#') ? undefined : 'noopener noreferrer',
              'aria-label': link.label
            }, label)
            : label
        ),
        h('strong', null, formatNumber(value, unit)),
        h('small', null, total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%')
      );
    })
  );
}

/**
 * Renders a declaratively selected chart using normalized dashboard points.
 * @param {string} chartType
 * @param {Array<{ x: string, y: number, color: string | null }>} points
 * @param {ChartSeriesDescriptor[]} series
 * @param {{ entries: Array<[string, number]>, total: number } | null} [pieSummary]
 * @param {string} [totalLabel]
 * @param {{ name: string, symbol: string, significant: number } | null} [unit]
 * @returns {HTMLElement}
 */
export function renderChartWidget(chartType, points, series, pieSummary = null, totalLabel = 'Total', unit = null) {
  if (chartType === 'pie') {
    const { entries, total } = pieSummary ?? pieChartEntries(points);
    let offset = 0;
    return h(
      'div',
      { className: 'chart-widget pie-chart-widget', 'data-chart-widget': 'pie' },
      h(
        'svg',
        { viewBox: '0 0 42 42', role: 'img', 'aria-label': `Pie chart: ${entries.map(([label, value]) => `${label} ${formatNumber(value, unit)}`).join(', ') || 'no data'}` },
        h('circle', { className: 'pie-chart-track', cx: 21, cy: 21, r: 15.9155, fill: 'none', 'stroke-width': 8 }),
        ...entries.map(([label, value], index) => {
          const percent = total > 0 ? (value / total) * 100 : 0;
          const segment = h('circle', {
            className: `pie-chart-segment chart-series-${(index % 6) + 1}`,
            cx: 21,
            cy: 21,
            r: 15.9155,
            fill: 'none',
            'stroke-width': 8,
            'stroke-dasharray': `${percent} ${100 - percent}`,
            'stroke-dashoffset': String(-offset),
            'data-chart-category': label,
            tabIndex: 0,
            role: 'img',
            'aria-label': `${label}: ${formatNumber(value, unit)}`
          }, h('title', null, `${label}: ${formatNumber(value, unit)}`));
          offset += percent;
          return segment;
        }),
        h('text', { className: 'pie-chart-total-value', x: 21, y: 20, 'text-anchor': 'middle', 'aria-hidden': 'true' }, formatNumber(total, unit, false)),
        h('text', { className: 'pie-chart-total-label', x: 21, y: 25.5, 'text-anchor': 'middle', 'aria-hidden': 'true' }, totalLabel)
      )
    );
  }

  if (chartType === 'line') {
    const groupedSeries = groupChartSeries(points);
    const seriesClassNames = new Map(series.map((item) => [item.name, item.className]));
    const xValues = [...new Set(points.map((point) => point.x))];
    const values = points.map((point) => toNumber(point.y));
    const finiteValues = values.filter(Number.isFinite);
    const maximum = Math.max(...finiteValues, 1);
    const gridLines = [4, 21, 38].map((y) => h('line', { className: 'line-chart-grid', x1: 0, y1: y, x2: 100, y2: y }));
    return h(
      'div',
      { className: 'chart-widget line-chart-widget', 'data-chart-widget': 'line' },
      h(
        'svg',
        { viewBox: '0 0 100 42', role: 'img', 'aria-label': `Line chart with ${points.length} points` },
        ...gridLines,
        h('line', { className: 'line-chart-axis', x1: 0, y1: 38, x2: 100, y2: 38 }),
        ...groupedSeries.flatMap(([seriesName, seriesPoints]) => {
          const seriesClassName = seriesClassNames.get(seriesName) ?? 'chart-series-1';
          const coordinates = seriesPoints.map((point) => {
            const xIndex = xValues.indexOf(point.x);
            const x = xValues.length < 2 ? 50 : (xIndex / (xValues.length - 1)) * 100;
            const y = 38 - (Math.max(0, point.y) / maximum) * 34;
            return { point, x, y };
          });
          return [
            h('polyline', {
              className: `line-chart-series ${seriesClassName}`,
              points: coordinates.map(({ x, y }) => `${x},${y}`).join(' '),
              fill: 'none',
              'data-chart-series': seriesName
            }),
            ...coordinates.map(({ point, x, y }) => h('g', {
              className: 'chart-point',
              tabIndex: 0,
              role: 'img',
              'aria-label': chartPointLabel(point, unit)
            },
            h('title', null, chartPointLabel(point, unit)),
            h('circle', {
              className: `line-chart-point ${seriesClassName}`,
              cx: x,
              cy: y,
              r: 2.5
            }),
            h(
              'g',
              {
                className: 'point-tooltip',
                transform: `translate(${Math.min(Math.max(x - 21, 1), 57)} ${Math.max(y - 12, 1)})`,
                'aria-hidden': 'true'
              },
              h('rect', { width: 42, height: 9, rx: 2 }),
              h('text', { x: 3, y: 6 }, chartPointLabel(point, unit))
            )))
          ];
        })
      ),
      xValues.length > 0
        ? h(
          'div',
          { className: 'chart-axis', 'data-chart-axis': 'line' },
          h('span', null, xValues[0]),
          xValues.length > 1 ? h('span', null, xValues[xValues.length - 1]) : null
        )
        : null
    );
  }

  const finiteValues = points.map((point) => toNumber(point.y)).filter(Number.isFinite);
  const maximum = Math.max(...finiteValues, 1);
  const barWidth = points.length > 0 ? Math.min(14, 80 / points.length) : 14;
  const seriesClassNames = new Map(series.map((item) => [item.name, item.className]));
  return h(
    'div',
    { className: 'chart-widget bar-chart-widget', 'data-chart-widget': 'bar' },
    h(
      'svg',
      { viewBox: '0 0 100 42', role: 'img', 'aria-label': `Bar chart with ${points.length} bars` },
      h('line', { className: 'bar-chart-axis', x1: 0, y1: 38, x2: 100, y2: 38 }),
      ...points.map((point, index) => {
        const x = ((index + 0.5) / Math.max(points.length, 1)) * 100 - (barWidth / 2);
        const height = Math.max(1, (Math.max(0, toNumber(point.y)) / maximum) * 34);
        return h('rect', {
          className: `bar-chart-bar ${seriesClassNames.get(point.color ?? 'value') ?? 'chart-series-1'}`,
          x,
          y: 38 - height,
          width: barWidth,
          height,
          tabIndex: 0,
          role: 'img',
          'aria-label': chartPointLabel(point, unit)
        }, h('title', null, chartPointLabel(point, unit)));
      })
    )
  );
}

/**
 * @param {{ x: string, y: number, color: string | null }} point
 * @param {{ name: string, symbol: string, significant: number } | null} [unit]
 * @returns {string}
 */
function chartPointLabel(point, unit = null) {
  return `${point.x}: ${formatNumber(point.y, unit)}${point.color ? `, ${point.color}` : ''}`;
}
