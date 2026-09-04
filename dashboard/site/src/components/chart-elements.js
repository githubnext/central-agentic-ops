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
const MAX_INTERACTIVE_LINE_POINTS = 500;
const MAX_RENDERED_LINE_POINTS = 2_000;
const MAX_TIMELINE_TICKS = 5;
const SWIMLANE_START_X = 25;
const SWIMLANE_END_X = 117;
const SWIMLANE_SECTION_WIDTH = 0.8;
const SWIMLANE_DEFINITIONS = [
  ['action-required', 'Action required'],
  ['failure', 'Failure'],
  ['cancelled', 'Cancelled'],
  ['skipped', 'Skipped'],
  ['success', 'Success']
];
const SWIMLANE_FAILURES = new Set(['failure', 'startup-failure', 'stale', 'timed-out']);
const CHART_SERIES_COLOR_COUNT = 12;
const SEMANTIC_SERIES_TERMS = {
  failure: new Set(['denied', 'error', 'errored', 'fail', 'failed', 'failing', 'failure', 'invalid', 'rejected', 'stale', 'timeout', 'unhealthy', 'unsuccessful']),
  success: new Set(['approved', 'complete', 'completed', 'healthy', 'pass', 'passed', 'passing', 'resolved', 'succeed', 'succeeded', 'success', 'successful']),
  waiting: new Set(['awaiting', 'pending', 'queued', 'waiting']),
  attention: new Set(['cancelled', 'canceled', 'degraded', 'warning']),
  neutral: new Set(['disabled', 'dismissed', 'inactive', 'neutral', 'skipped', 'unknown'])
};
const SEMANTIC_SERIES_PHRASES = {
  failure: new Set(['timed out']),
  waiting: new Set(['action required', 'in progress'])
};

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
    className: chartSeriesClassName(name, index)
  }));
}

/**
 * Retains a varied fallback palette while adding a stable semantic color when
 * the series name describes a commonly understood status.
 * @param {string} name
 * @param {number} index
 * @returns {string}
 */
export function chartSeriesClassName(name, index) {
  const paletteClass = `chart-series-${(index % CHART_SERIES_COLOR_COUNT) + 1}`;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const terms = new Set(normalized.split(/\s+/).filter(Boolean));
  let meaning = null;

  if (SEMANTIC_SERIES_PHRASES.failure.has(normalized) || hasMatchingTerm(terms, SEMANTIC_SERIES_TERMS.failure)) {
    meaning = 'failure';
  } else if (
    SEMANTIC_SERIES_PHRASES.waiting.has(normalized)
    || ((terms.has('approval') || terms.has('review')) && (terms.has('required') || terms.has('awaiting') || terms.has('pending') || terms.has('waiting')))
    || hasMatchingTerm(terms, SEMANTIC_SERIES_TERMS.waiting)
  ) {
    meaning = 'waiting';
  } else if (hasMatchingTerm(terms, SEMANTIC_SERIES_TERMS.success)) {
    meaning = 'success';
  } else if (hasMatchingTerm(terms, SEMANTIC_SERIES_TERMS.attention)) {
    meaning = 'attention';
  } else if (hasMatchingTerm(terms, SEMANTIC_SERIES_TERMS.neutral)) {
    meaning = 'neutral';
  }

  return meaning ? `${paletteClass} chart-series-semantic-${meaning}` : paletteClass;
}

/** @param {Set<string>} terms @param {Set<string>} candidates */
function hasMatchingTerm(terms, candidates) {
  for (const term of terms) {
    if (candidates.has(term)) return true;
  }
  return false;
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
        h('i', { className: chartSeriesClassName(label, index), 'aria-hidden': 'true' }),
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
            className: `pie-chart-segment ${chartSeriesClassName(label, index)}`,
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
    const showInteractivePoints = points.length <= MAX_INTERACTIVE_LINE_POINTS;
    const seriesClassNames = new Map(series.map((item) => [item.name, item.className]));
    const xValues = [...new Set(points.map((point) => point.x))];
    const xIndexes = new Map(xValues.map((value, index) => [value, index]));
    const timelineTicks = lineChartTimelineTicks(xValues);
    let maximum = 1;
    for (const point of points) {
      const value = toNumber(point.y);
      if (Number.isFinite(value)) maximum = Math.max(maximum, value);
    }
    const pointRadius = lineChartPointRadius(points.length);
    const gridLines = [4, 21, 38].map((y) => h('line', { className: 'line-chart-grid', x1: 0, y1: y, x2: 100, y2: y }));
    const highlightedIndexes = [...new Set(points.flatMap((point) => {
      const index = point.highlighted ? xIndexes.get(point.x) : undefined;
      return index === undefined ? [] : [index];
    }))];
    const xStep = xValues.length > 1 ? 100 / (xValues.length - 1) : 100;
    const windowBand = highlightedIndexes.length > 0
      ? {
        start: Math.max(0, (Math.min(...highlightedIndexes) - 0.5) * xStep),
        end: Math.min(100, (Math.max(...highlightedIndexes) + 0.5) * xStep)
      }
      : null;
    return h(
      'div',
      {
        className: 'chart-widget line-chart-widget',
        'data-chart-widget': 'line',
        'data-line-rendering': showInteractivePoints ? 'rich' : 'compact'
      },
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
            const xIndex = xIndexes.get(point.x) ?? 0;
            const x = xValues.length < 2 ? 50 : (xIndex / (xValues.length - 1)) * 100;
            const y = 38 - (Math.max(0, toNumber(point.y)) / maximum) * 34;
            return { point, x, y };
          });
          const renderedCoordinates = sampleLineCoordinates(coordinates, MAX_RENDERED_LINE_POINTS);
          const highlightedCoordinates = hasWindowHighlight
            ? sampleLineCoordinates(coordinates.filter(({ point }) => point.highlighted), MAX_RENDERED_LINE_POINTS)
            : [];
          return [
            h('polyline', {
              className: `line-chart-series ${seriesClassName}${hasWindowHighlight ? ' line-chart-context' : ''}`,
              style: `--chart-entry-index: ${seriesIndex}`,
              pathLength: 1,
              points: renderedCoordinates.map(({ x, y }) => `${x},${y}`).join(' '),
              fill: 'none',
              'data-chart-series': seriesName
            }),
            ...(highlightedCoordinates.length > 1
              ? [h('polyline', {
                className: `line-chart-series line-chart-current ${seriesClassName}`,
                style: `--chart-entry-index: ${seriesIndex}`,
                pathLength: 1,
                points: highlightedCoordinates.map(({ x, y }) => `${x},${y}`).join(' '),
                fill: 'none',
                'data-chart-window': 'current'
              })]
              : []),
            ...(showInteractivePoints ? coordinates.map(({ point, x, y }, pointIndex) => h('g', {
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
            ))) : [])
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
 * Keeps line-series SVG output bounded while retaining the first, last, and
 * visual extrema (minimum and maximum SVG y-coordinates) in each bucket.
 * @template T
 * @param {Array<T & { y: number }>} coordinates
 * @param {number} limit
 * @returns {Array<T & { y: number }>}
 */
function sampleLineCoordinates(coordinates, limit) {
  if (coordinates.length <= limit) return coordinates;
  const bucketCount = Math.max(1, Math.floor((limit - 2) / 2));
  const bucketSize = (coordinates.length - 2) / bucketCount;
  const sampled = [coordinates[0]];
  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = 1 + Math.floor(bucket * bucketSize);
    const end = Math.min(coordinates.length - 1, 1 + Math.floor((bucket + 1) * bucketSize));
    let minimumIndex = start;
    let maximumIndex = start;
    for (let index = start + 1; index < end; index += 1) {
      if (coordinates[index].y < coordinates[minimumIndex].y) minimumIndex = index;
      if (coordinates[index].y > coordinates[maximumIndex].y) maximumIndex = index;
    }
    sampled.push(coordinates[Math.min(minimumIndex, maximumIndex)]);
    if (minimumIndex !== maximumIndex) sampled.push(coordinates[Math.max(minimumIndex, maximumIndex)]);
  }
  sampled.push(coordinates[coordinates.length - 1]);
  return sampled;
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
  if (plotted.length === 0) {
    return h(
      'div',
      { className: 'chart-widget swimlane-chart-widget', 'data-chart-widget': 'swimlane' },
      renderEmptyMessage('No workflow runs to show.', { role: 'status' })
    );
  }
  let firstObserved = Number.POSITIVE_INFINITY;
  let lastObserved = Number.NEGATIVE_INFINITY;
  for (const point of plotted) {
    firstObserved = Math.min(firstObserved, point.timestamp);
    lastObserved = Math.max(lastObserved, point.timestamp);
  }
  let start = Date.parse(String(timeRange?.start ?? ''));
  let end = Date.parse(String(timeRange?.end ?? ''));
  if (!Number.isFinite(start)) start = firstObserved;
  if (!Number.isFinite(end)) end = lastObserved;
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
  const xCoordinate = (timestamp) => SWIMLANE_START_X
    + (Math.min(1, Math.max(0, (timestamp - start) / span)) * (SWIMLANE_END_X - SWIMLANE_START_X));
  const sectionsByLane = buildSwimlaneSections(plotted, xCoordinate);

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
          ...(sectionsByLane.get(lane) ?? []).map((section) => renderSwimlaneSection(section, y))
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

/**
 * Coalesces observations into a fixed number of visual buckets per lane, then
 * combines neighboring occupied buckets into contiguous sections.
 * @param {Array<ChartPointLike & { lane: string, timestamp: number }>} points
 * @param {(timestamp: number) => number} xCoordinate
 */
function buildSwimlaneSections(points, xCoordinate) {
  const binCount = Math.ceil((SWIMLANE_END_X - SWIMLANE_START_X) / SWIMLANE_SECTION_WIDTH);
  /** @type {Map<string, Array<{ count: number, first: number, last: number, point: ChartPointLike & { lane: string, timestamp: number } } | null>>} */
  const binsByLane = new Map(SWIMLANE_DEFINITIONS.map(([lane]) => [lane, Array(binCount).fill(null)]));
  for (const point of points) {
    const x = xCoordinate(point.timestamp);
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((x - SWIMLANE_START_X) / SWIMLANE_SECTION_WIDTH)));
    const bins = /** @type {NonNullable<ReturnType<typeof binsByLane.get>>} */ (binsByLane.get(point.lane));
    const bin = bins[index];
    if (bin) {
      bin.count += 1;
      bin.first = Math.min(bin.first, point.timestamp);
      bin.last = Math.max(bin.last, point.timestamp);
    } else {
      bins[index] = { count: 1, first: point.timestamp, last: point.timestamp, point };
    }
  }

  /** @type {Map<string, Array<{ lane: string, x1: number, x2: number, count: number, first: number, last: number, point: ChartPointLike & { lane: string, timestamp: number } }>>} */
  const sectionsByLane = new Map();
  for (const [lane, bins] of binsByLane) {
    /** @type {Array<{ lane: string, x1: number, x2: number, count: number, first: number, last: number, point: ChartPointLike & { lane: string, timestamp: number } }>} */
    const sections = [];
    for (let index = 0; index < bins.length; index += 1) {
      const bin = bins[index];
      if (!bin) continue;
      const previous = sections.at(-1);
      const x1 = SWIMLANE_START_X + (index * SWIMLANE_SECTION_WIDTH);
      const x2 = Math.min(SWIMLANE_END_X, x1 + SWIMLANE_SECTION_WIDTH);
      if (previous && Math.abs(previous.x2 - x1) < 1e-9) {
        previous.x2 = x2;
        previous.count += bin.count;
        previous.first = Math.min(previous.first, bin.first);
        previous.last = Math.max(previous.last, bin.last);
      } else {
        sections.push({ lane, x1, x2, ...bin });
      }
    }
    sectionsByLane.set(lane, sections);
  }
  return sectionsByLane;
}

/** @param {{ lane: string, x1: number, x2: number, count: number, first: number, last: number, point: Record<string, any> }} section @param {number} y */
function renderSwimlaneSection(section, y) {
  const label = section.count === 1
    ? swimlaneTooltipLines(section.point).join(', ')
    : `${section.count.toLocaleString('en')} ${section.lane} runs, ${formatSwimlaneTooltipTime(section.first)} to ${formatSwimlaneTooltipTime(section.last)}`;
  return h('line', {
    className: `chart-point swimlane-mark swimlane-run-mark swimlane-mark-${section.lane}`,
    x1: section.x1,
    y1: y,
    x2: section.x2,
    y2: y,
    tabIndex: 0,
    role: 'img',
    'aria-label': label,
    'data-swimlane-lane': section.lane,
    'data-swimlane-count': section.count
  });
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
