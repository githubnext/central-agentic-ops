/**
 * Reusable presentation-only chart legend and series helpers for dashboard views.
 */

import { h } from '../dom.js';
import { formatNumber, toNumber } from '../view-formatters.js';
import { pluralSuffix } from './count-formatters.js';
import { binHistogramValues } from './histogram.js';
import { renderSafeLink } from './link-content.js';
import { renderEmptyMessage } from './ui-primitives.js';

const MAX_LINE_POINT_RADIUS = 2.5;
const MIN_LINE_POINT_RADIUS = 0.5;
const MIN_RADIUS_POINT_COUNT = 100;
const MAX_TIMELINE_TICKS = 5;
const SWIMLANE_DEFINITIONS = [
  ['action-required', 'Action required'],
  ['failure', 'Failure'],
  ['cancelled', 'Cancelled'],
  ['skipped', 'Skipped'],
  ['success', 'Success']
];
const SWIMLANE_FAILURES = new Set(['failure', 'startup-failure', 'stale', 'timed-out']);
const CHART_SERIES_COLOR_COUNT = 12;

/**
 * @typedef {{ name: string, className: string }} ChartSeriesDescriptor
 */

/**
 * @typedef {{
 *   x: string,
 *   y: number,
 *   color: string | null,
 *   highlighted?: boolean | null,
 *   key?: string,
 *   category?: string,
 *   link?: { href: string, label: string } | null,
 *   source?: Record<string, unknown>
 * }} ChartPointLike
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
    className: `chart-series-${(index % CHART_SERIES_COLOR_COUNT) + 1}`
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
      const link = links.get(label) ?? null;
      return h(
        'li',
        null,
        h('i', { className: `chart-series-${(index % CHART_SERIES_COLOR_COUNT) + 1}`, 'aria-hidden': 'true' }),
        h('span', null, renderSafeLink(label, link)),
        h('strong', null, formatNumber(value, unit)),
        h('small', null, total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%')
      );
    })
  );
}

/**
 * Renders a declaratively selected chart using normalized dashboard points.
 * @param {string} chartType
 * @param {ChartPointLike[]} points
 * @param {ChartSeriesDescriptor[]} series
 * @param {{ entries: Array<[string, number]>, total: number } | null} [pieSummary]
 * @param {string} [totalLabel]
 * @param {{ name: string, symbol: string, significant: number } | null} [unit]
 * @param {Record<string, unknown> | null} [timeRange]
 * @returns {HTMLElement}
 */
export function renderChartWidget(chartType, points, series, pieSummary = null, totalLabel = 'Total', unit = null, timeRange = null) {
  const pieData = chartType === 'pie' ? pieSummary ?? pieChartEntries(points) : null;
  const entryCount = pieData ? pieData.entries.length : points.length;
  if (entryCount < 2 && chartType !== 'swimlane') {
    return h(
      'div',
      { className: `chart-widget ${chartType}-chart-widget`, 'data-chart-widget': chartType },
      renderEmptyMessage('Not enough data to show this visualization.', { role: 'status' })
    );
  }

  if (chartType === 'pie') {
    const { entries, total } = /** @type {{ entries: Array<[string, number]>, total: number }} */ (pieData);
    let offset = 0;
    return h(
      'div',
      { className: 'chart-widget pie-chart-widget', 'data-chart-widget': 'pie' },
      h(
        'svg',
        { viewBox: '0 0 42 42', role: 'img', 'aria-label': `Pie chart: ${entries.map(([label, value]) => `${label} ${formatNumber(value, unit)}`).join(', ') || 'no data'}` },
        h('circle', { className: 'pie-chart-track', cx: 21, cy: 21, r: 15.9155, fill: 'none', 'stroke-width': 10 }),
        ...entries.map(([label, value], index) => {
          const percent = total > 0 ? (value / total) * 100 : 0;
          const segmentLabel = `${label}: ${formatNumber(value, unit)}`;
          const midpoint = ((offset + (percent / 2)) / 100) * Math.PI * 2 - (Math.PI / 2);
          const tooltipWidth = Math.min(40, Math.max(18, (segmentLabel.length * 1.25) + 5));
          const tooltipX = Math.min(Math.max(21 + (Math.cos(midpoint) * 14) - (tooltipWidth / 2), 1), 41 - tooltipWidth);
          const tooltipY = Math.min(Math.max(21 + (Math.sin(midpoint) * 14) - 9, 1), 34);
          const segment = h('g', {
            className: 'chart-point pie-chart-mark',
            style: `--chart-entry-index: ${index}`,
            tabIndex: 0,
            role: 'img',
            'aria-label': segmentLabel
          },
          h('title', null, segmentLabel),
          h('circle', {
            className: `pie-chart-segment chart-series-${(index % CHART_SERIES_COLOR_COUNT) + 1}`,
            cx: 21,
            cy: 21,
            r: 15.9155,
            fill: 'none',
            'stroke-width': 10,
            'stroke-dasharray': `${percent} ${100 - percent}`,
            'stroke-dashoffset': String(-offset),
            'data-chart-category': label
          }),
          h(
            'g',
            {
              className: 'point-tooltip pie-chart-tooltip',
              transform: `translate(${tooltipX} ${tooltipY})`,
              'aria-hidden': 'true'
            },
            h('rect', { width: tooltipWidth, height: 7, rx: 2 }),
            h('text', {
              x: 2.5,
              y: 4.75,
              ...(tooltipWidth === 40 ? { textLength: 35, lengthAdjust: 'spacingAndGlyphs' } : {})
            }, segmentLabel)
          ));
          const bringTooltipToFront = () => segment.parentNode?.append(segment);
          segment.addEventListener('pointerenter', bringTooltipToFront);
          segment.addEventListener('focus', bringTooltipToFront);
          offset += percent;
          return segment;
        }),
        h('text', { className: 'pie-chart-total-value', x: 21, y: 20, 'text-anchor': 'middle', 'aria-hidden': 'true' }, formatNumber(total, unit, false)),
        h('text', { className: 'pie-chart-total-label', x: 21, y: 25.5, 'text-anchor': 'middle', 'aria-hidden': 'true' }, totalLabel)
      )
    );
  }

  if (chartType === 'histogram') {
    const bins = binHistogramValues(points.map((point) => toNumber(point.y)));
    const maximum = Math.max(...bins.map((bin) => bin.count), 1);
    const barWidth = bins.length > 0 ? 100 / bins.length : 100;
    /** @param {{ lower: number, upper: number }} bin */
    const binLabel = (bin) => {
      const lower = formatNumber(bin.lower, unit);
      const upper = formatNumber(bin.upper, unit);
      return bin.lower === bin.upper ? lower : `${lower}–${upper}`;
    };
    return h(
      'div',
      { className: 'chart-widget histogram-chart-widget', 'data-chart-widget': 'histogram' },
      h(
        'svg',
        { viewBox: '0 0 100 42', role: 'img', 'aria-label': `Histogram with ${bins.length} automatically calculated bins` },
        ...[4, 21, 38].map((y) => h('line', { className: 'histogram-chart-grid', x1: 0, y1: y, x2: 100, y2: y })),
        h('line', { className: 'bar-chart-axis', x1: 0, y1: 38, x2: 100, y2: 38 }),
        ...bins.map((bin, index) => {
          const height = Math.max(1, (bin.count / maximum) * 34);
          const label = `${binLabel(bin)}: ${bin.count} observation${pluralSuffix(bin.count)}`;
          const x = index * barWidth;
          const tooltipX = Math.min(Math.max(x + ((barWidth - 1) / 2) - 21, 1), 57);
          const mark = h('g', {
            className: 'chart-point histogram-chart-mark',
            style: `--chart-entry-index: ${index}`,
            tabIndex: 0,
            role: 'img',
            'aria-label': label
          },
          h('title', null, label),
          h('rect', {
            className: 'histogram-chart-bar chart-series-1',
            x,
            y: 38 - height,
            width: Math.max(0, barWidth - 1),
            height,
            rx: 0.75
          }),
          h(
            'g',
            {
              className: 'point-tooltip histogram-chart-tooltip',
              transform: `translate(${tooltipX} ${Math.max(38 - height - 12, 1)})`,
              'aria-hidden': 'true'
            },
            h('rect', { width: 42, height: 9, rx: 2 }),
            h('text', {
              x: 3,
              y: 6,
              ...(label.length > 22 ? { textLength: 36, lengthAdjust: 'spacingAndGlyphs' } : {})
            }, label)
          ));
          const bringTooltipToFront = () => mark.parentNode?.append(mark);
          mark.addEventListener('pointerenter', bringTooltipToFront);
          mark.addEventListener('focus', bringTooltipToFront);
          return mark;
        })
      ),
      bins.length > 0
        ? h(
          'div',
          { className: 'chart-axis', 'data-chart-axis': 'histogram' },
          h('span', null, formatNumber(bins[0].lower, unit)),
          h('span', null, formatNumber(bins[bins.length - 1].upper, unit))
        )
        : null
    );
  }

  if (chartType === 'line') {
    const groupedSeries = groupChartSeries(points);
    const hasWindowHighlight = points.some((point) => typeof point.highlighted === 'boolean');
    const seriesClassNames = new Map(series.map((item) => [item.name, item.className]));
    const xValues = [...new Set(points.map((point) => point.x))];
    const timelineTicks = lineChartTimelineTicks(xValues);
    const values = points.map((point) => toNumber(point.y));
    const finiteValues = values.filter(Number.isFinite);
    const maximum = Math.max(...finiteValues, 1);
    const pointRadius = lineChartPointRadius(points.length);
    const gridLines = [4, 21, 38].map((y) => h('line', { className: 'line-chart-grid', x1: 0, y1: y, x2: 100, y2: y }));
    const highlightedIndexes = xValues
      .map((value, index) => points.some((point) => point.x === value && point.highlighted) ? index : -1)
      .filter((index) => index >= 0);
    const xStep = xValues.length > 1 ? 100 / (xValues.length - 1) : 100;
    const windowBand = highlightedIndexes.length > 0
      ? {
        start: Math.max(0, (Math.min(...highlightedIndexes) - 0.5) * xStep),
        end: Math.min(100, (Math.max(...highlightedIndexes) + 0.5) * xStep)
      }
      : null;
    return h(
      'div',
      { className: 'chart-widget line-chart-widget', 'data-chart-widget': 'line' },
      h(
        'svg',
        { viewBox: '0 0 100 42', role: 'img', 'aria-label': `Line chart with ${points.length} points` },
        windowBand ? h('rect', {
          className: 'line-chart-window-band',
          x: windowBand.start,
          y: 0,
          width: Math.max(windowBand.end - windowBand.start, 1),
          height: 38,
          'aria-hidden': 'true'
        }) : null,
        ...gridLines,
        h('line', { className: 'line-chart-axis', x1: 0, y1: 38, x2: 100, y2: 38 }),
        ...groupedSeries.flatMap(([seriesName, seriesPoints], seriesIndex) => {
          const seriesClassName = seriesClassNames.get(seriesName) ?? 'chart-series-1';
          const coordinates = seriesPoints.map((point) => {
            const xIndex = xValues.indexOf(point.x);
            const x = xValues.length < 2 ? 50 : (xIndex / (xValues.length - 1)) * 100;
            const y = 38 - (Math.max(0, point.y) / maximum) * 34;
            return { point, x, y };
          });
          return [
            h('polyline', {
              className: `line-chart-series ${seriesClassName}${hasWindowHighlight ? ' line-chart-context' : ''}`,
              style: `--chart-entry-index: ${seriesIndex}`,
              pathLength: 1,
              points: coordinates.map(({ x, y }) => `${x},${y}`).join(' '),
              fill: 'none',
              'data-chart-series': seriesName
            }),
            ...(hasWindowHighlight && coordinates.filter(({ point }) => point.highlighted).length > 1
              ? [h('polyline', {
                className: `line-chart-series line-chart-current ${seriesClassName}`,
                style: `--chart-entry-index: ${seriesIndex}`,
                pathLength: 1,
                points: coordinates.filter(({ point }) => point.highlighted).map(({ x, y }) => `${x},${y}`).join(' '),
                fill: 'none',
                'data-chart-window': 'current'
              })]
              : []),
            ...coordinates.map(({ point, x, y }, pointIndex) => h('g', {
              className: `chart-point${point.highlighted === false ? ' chart-point-context' : point.highlighted ? ' chart-point-current' : ''}`,
              style: `--chart-entry-index: ${pointIndex}`,
              tabIndex: 0,
              role: 'img',
              'aria-label': `${chartPointLabel(point, unit)}${point.highlighted === false ? ' (context)' : point.highlighted ? ' (selected window)' : ''}`
            },
            h('title', null, chartPointLabel(point, unit)),
            h('circle', {
              className: `line-chart-point ${seriesClassName}`,
              cx: x,
              cy: y,
              r: hasWindowHighlight ? 0.65 : pointRadius
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
      hasWindowHighlight
        ? h('div', { className: 'chart-window-key', 'aria-label': 'Chart window key' },
          h('span', { className: 'chart-window-context' }, 'Previous context'),
          h('strong', null, 'Selected window'))
        : null,
      xValues.length > 0
        ? h(
          'div',
          { className: 'chart-axis timeline-chart-axis', 'data-chart-axis': 'line' },
          ...timelineTicks.map((value) => h('span', { title: value }, formatTimelineTick(value)))
        )
        : null
    );
  }

  if (chartType === 'swimlane') {
    return renderSwimlaneChart(points, timeRange);
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
 * @param {ChartPointLike[]} points
 * @param {Record<string, unknown> | null} timeRange
 * @returns {HTMLElement}
 */
function renderSwimlaneChart(points, timeRange) {
  /** @type {Array<ChartPointLike & { lane: string, timestamp: number }>} */
  const plotted = points.flatMap((point) => {
    const timestamp = Date.parse(String(point.x));
    const lane = swimlaneConclusion(point.category ?? point.color);
    return Number.isFinite(timestamp) && lane
      ? [{ ...point, lane, timestamp }]
      : [];
  });
  const observedTimes = plotted.map((point) => point.timestamp);
  let start = Date.parse(String(timeRange?.start ?? ''));
  let end = Date.parse(String(timeRange?.end ?? ''));
  if (!Number.isFinite(start)) start = Math.min(...observedTimes);
  if (!Number.isFinite(end)) end = Math.max(...observedTimes);
  if (start === end) {
    start -= 43_200_000;
    end += 43_200_000;
  }
  const span = Math.max(end - start, 1);
  const counts = Object.fromEntries(SWIMLANE_DEFINITIONS.map(([lane]) => [lane, 0]));
  for (const point of plotted) counts[point.lane] += 1;
  const successes = counts.success;
  const summary = [
    `${plotted.length.toLocaleString('en')} runs`,
    `${plotted.length > 0 ? ((successes / plotted.length) * 100).toFixed(1) : '0.0'}% success`,
    `${counts.failure.toLocaleString('en')} failed`,
    `${counts.skipped.toLocaleString('en')} skipped`,
    `${counts['action-required'].toLocaleString('en')} action required`
  ];
  const ticks = Array.from({ length: 4 }, (_, index) => start + ((span * index) / 3));
  /** @param {number} timestamp */
  const xCoordinate = (timestamp) => 25 + (Math.min(1, Math.max(0, (timestamp - start) / span)) * 92);
  const positioned = plotted.map((point) => ({ point, x: xCoordinate(point.timestamp) }));
  /** @type {Map<string, Array<{ point: ChartPointLike & { lane: string, timestamp: number }, x: number }>>} */
  const collisionGroups = new Map();
  for (const position of positioned) {
    const key = `${position.point.lane}:${position.x.toFixed(1)}`;
    const group = collisionGroups.get(key) ?? [];
    group.push(position);
    collisionGroups.set(key, group);
  }
  for (const group of collisionGroups.values()) {
    group.forEach((position, index) => {
      position.x = Math.min(117, Math.max(25, position.x + ((index - ((group.length - 1) / 2)) * 0.8)));
    });
  }

  return h(
    'div',
    { className: 'chart-widget swimlane-chart-widget', 'data-chart-widget': 'swimlane' },
    h(
      'ul',
      { className: 'swimlane-summary', 'aria-label': 'Run summary' },
      summary.map((value) => h('li', null, value))
    ),
    h(
      'svg',
      {
        viewBox: '0 0 120 62',
        role: 'img',
        'aria-label': `Categorical swimlane timeline with ${plotted.length} workflow runs`
      },
      ...SWIMLANE_DEFINITIONS.flatMap(([lane, label], laneIndex) => {
        const y = 7 + (laneIndex * 10);
        return [
          h('text', { className: 'swimlane-label', x: 23, y: y + 1, 'text-anchor': 'end' }, label),
          h('line', { className: 'swimlane-separator', x1: 25, y1: y, x2: 117, y2: y }),
          ...positioned
            .filter(({ point }) => point.lane === lane)
            .map(({ point, x }) => renderSwimlaneMark(point, x, y))
        ];
      }),
      h('line', { className: 'swimlane-axis', x1: 25, y1: 54, x2: 117, y2: 54 }),
      ...ticks.map((instant, index) => {
        const x = xCoordinate(instant);
        return [
          h('line', { className: 'swimlane-tick', x1: x, y1: 54, x2: x, y2: 56 }),
          h('text', {
            className: 'swimlane-time-label',
            x,
            y: 61,
            'text-anchor': index === 0 ? 'start' : index === ticks.length - 1 ? 'end' : 'middle'
          }, formatSwimlaneAxisTime(instant, span))
        ];
      })
    )
  );
}

/** @param {Record<string, any>} point @param {number} x @param {number} y */
function renderSwimlaneMark(point, x, y) {
  const lines = swimlaneTooltipLines(point);
  const tooltipWidth = 48;
  const tooltipHeight = 3 + (lines.length * 4);
  const tooltipX = Math.min(Math.max(x - (tooltipWidth / 2), 25), 117 - tooltipWidth);
  const tooltipY = y < 27 ? y + 3 : y - tooltipHeight - 3;
  const label = lines.join(', ');
  const mark = h(
    'g',
    {
      className: `chart-point swimlane-mark swimlane-mark-${point.lane}`,
      tabIndex: 0,
      role: 'img',
      'aria-label': label,
      'data-swimlane-lane': point.lane
    },
    h('title', null, lines.join('\n')),
    h('rect', { className: 'swimlane-hit-target', x: x - 1.75, y: y - 3.5, width: 3.5, height: 7 }),
    h('line', { className: 'swimlane-run-mark', x1: x, y1: y - 2.25, x2: x, y2: y + 2.25 }),
    h(
      'g',
      {
        className: 'point-tooltip swimlane-tooltip',
        transform: `translate(${tooltipX} ${tooltipY})`,
        'aria-hidden': 'true'
      },
      h('rect', { width: tooltipWidth, height: tooltipHeight, rx: 1.5 }),
      h('text', { x: 2.5, y: 4 }, lines.map((line, index) => h(
        'tspan',
        { x: 2.5, dy: index === 0 ? 0 : 4 },
        line
      )))
    )
  );
  const bringTooltipToFront = () => mark.parentNode?.append(mark);
  mark.addEventListener('pointerenter', bringTooltipToFront);
  mark.addEventListener('focus', bringTooltipToFront);
  return mark;
}

/** @param {Record<string, any>} point @returns {string[]} */
function swimlaneTooltipLines(point) {
  const source = point.source ?? {};
  const lines = [
    formatSwimlaneTooltipTime(point.timestamp),
    `Conclusion: ${point.lane}`
  ];
  const run = String(source.run ?? '').trim();
  const branch = String(source.branch ?? source.ref ?? source['head-branch'] ?? '').trim();
  const started = Date.parse(String(source['started-at'] ?? ''));
  const ended = Date.parse(String(source['ended-at'] ?? ''));
  if (run) lines.push(`Run #${run}`);
  if (branch) lines.push(`Branch: ${branch}`);
  if (Number.isFinite(started) && Number.isFinite(ended) && ended >= started) {
    lines.push(`Duration: ${formatSwimlaneDuration(ended - started)}`);
  }
  return lines;
}

/** @param {unknown} value @returns {string | null} */
function swimlaneConclusion(value) {
  const conclusion = String(value ?? '').toLowerCase();
  if (SWIMLANE_FAILURES.has(conclusion)) return 'failure';
  return SWIMLANE_DEFINITIONS.some(([lane]) => lane === conclusion) ? conclusion : null;
}

/** @param {number} instant @param {number} span */
function formatSwimlaneAxisTime(instant, span) {
  return new Intl.DateTimeFormat('en', span <= 86_400_000
    ? { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }
    : { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(instant));
}

/** @param {number} instant */
function formatSwimlaneTooltipTime(instant) {
  const parts = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }).formatToParts(new Date(instant));
  /** @param {string} type */
  const value = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('month')} ${value('day')}, ${value('year')} · ${value('hour')}:${value('minute')}:${value('second')}`;
}

/** @param {number} milliseconds */
function formatSwimlaneDuration(milliseconds) {
  const seconds = Math.round(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours ? `${hours}h` : '', minutes ? `${minutes}m` : '', `${remainder}s`].filter(Boolean).join(' ');
}

/**
 * @param {number} pointCount
 * @returns {number}
 */
function lineChartPointRadius(pointCount) {
  const progress = Math.min(1, Math.max(0, (pointCount - 2) / (MIN_RADIUS_POINT_COUNT - 2)));
  return MAX_LINE_POINT_RADIUS - (progress * (MAX_LINE_POINT_RADIUS - MIN_LINE_POINT_RADIUS));
}

/**
 * @param {string[]} values
 * @returns {string[]}
 */
function lineChartTimelineTicks(values) {
  const tickCount = Math.min(values.length, MAX_TIMELINE_TICKS);
  if (tickCount < 2) return values;

  return Array.from(
    { length: tickCount },
    (_, index) => values[Math.round((index / (tickCount - 1)) * (values.length - 1))]
  );
}

/**
 * @param {string} value
 * @returns {string}
 */
function formatTimelineTick(value) {
  if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  const options = value.includes('T')
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC', timeZoneName: 'short' }
    : { month: 'short', day: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat('en', /** @type {Intl.DateTimeFormatOptions} */ (options)).format(date);
}

/**
 * @param {{ x: string, y: number, color: string | null }} point
 * @param {{ name: string, symbol: string, significant: number } | null} [unit]
 * @returns {string}
 */
function chartPointLabel(point, unit = null) {
  return `${point.x}: ${formatNumber(point.y, unit)}${point.color ? `, ${point.color}` : ''}`;
}
