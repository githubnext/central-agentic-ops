// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { chartSeriesClassName, groupChartSeries, listChartSeries, pieChartEntries, renderChartLegend, renderChartWidget, renderPieLegend } from '../../src/components/chart-elements.js';

describe('chart element helpers', () => {
  it('DLS-SAFE-009 groups chart series deterministically and lists reusable class names', () => {
    const points = [
      { x: '2026-08-29', y: 3, color: 'fail' },
      { x: '2026-08-28', y: 2, color: 'pass' },
      { x: '2026-08-30', y: 1, color: 'fail' },
      { x: '2026-08-27', y: 4, color: null }
    ];

    expect(groupChartSeries(points)).toEqual([
      ['fail', [points[0], points[2]]],
      ['pass', [points[1]]],
      ['value', [points[3]]]
    ]);
    expect(listChartSeries(points)).toEqual([
      { name: 'fail', className: 'chart-series-1 chart-series-semantic-failure' },
      { name: 'pass', className: 'chart-series-2 chart-series-semantic-success' },
      { name: 'value', className: 'chart-series-3' }
    ]);

    const expandedSeries = Array.from({ length: 13 }, (_, index) => ({
      x: String(index),
      y: index,
      color: `series-${String(index).padStart(2, '0')}`
    }));
    expect(listChartSeries(expandedSeries).map(({ className }) => className)).toEqual([
      'chart-series-1',
      'chart-series-2',
      'chart-series-3',
      'chart-series-4',
      'chart-series-5',
      'chart-series-6',
      'chart-series-7',
      'chart-series-8',
      'chart-series-9',
      'chart-series-10',
      'chart-series-11',
      'chart-series-12',
      'chart-series-1'
    ]);
  });

  it('assigns color-blind-safe semantic colors before falling back to the palette', () => {
    expect(chartSeriesClassName('startup-failure', 0)).toBe('chart-series-1 chart-series-semantic-failure');
    expect(chartSeriesClassName('Success', 1)).toBe('chart-series-2 chart-series-semantic-success');
    expect(chartSeriesClassName('waiting for approval', 2)).toBe('chart-series-3 chart-series-semantic-waiting');
    expect(chartSeriesClassName('action_required', 3)).toBe('chart-series-4 chart-series-semantic-waiting');
    expect(chartSeriesClassName('cancelled', 4)).toBe('chart-series-5 chart-series-semantic-attention');
    expect(chartSeriesClassName('skipped', 5)).toBe('chart-series-6 chart-series-semantic-neutral');
    expect(chartSeriesClassName('repository', 6)).toBe('chart-series-7');
  });

  it('DLS-SAFE-009 renders reusable visual chart legends', () => {
    const legend = renderChartLegend([
      { name: 'fail', className: 'chart-series-1' },
      { name: 'pass', className: 'chart-series-2' }
    ], 'line');

    expect(legend.className).toBe('chart-legend chart-legend-line');
    expect(legend.getAttribute('data-chart-legend')).toBe('visual');
    expect(legend.querySelectorAll('li')).toHaveLength(2);
    expect(legend.textContent).toContain('fail');
    expect(legend.textContent).toContain('pass');
  });

  it('DLS-SAFE-009 summarizes pie-chart entries and omits non-positive totals', () => {
    const summary = pieChartEntries([
      { x: 'open', y: 3, color: null },
      { x: 'closed', y: 0, color: null },
      { x: 'open', y: 2, color: null },
      { x: 'missing', y: -1, color: null }
    ]);

    expect(summary).toEqual({
      entries: [['open', 5]],
      total: 5
    });
  });

  it('DLS-SAFE-009 renders reusable pie legends including zero-total fallback percentages', () => {
    const links = new Map([['open', {
      href: 'https://github.com/octo-org/open',
      label: 'View octo-org/open on GitHub'
    }]]);
    const populated = renderPieLegend([
      ['open', 3],
      ['closed', 2]
    ], 5, links);
    const empty = renderPieLegend([], 0);

    expect(populated.className).toBe('chart-legend chart-legend-pie');
    expect(populated.querySelectorAll('li')).toHaveLength(2);
    expect(populated.textContent).toContain('open');
    expect(populated.textContent).toContain('3');
    expect(populated.textContent).toContain('60.0%');
    expect(populated.querySelector('a')?.getAttribute('href')).toBe('https://github.com/octo-org/open');
    expect(populated.querySelector('a')?.getAttribute('aria-label')).toBe('View octo-org/open on GitHub');
    expect(empty.querySelectorAll('li')).toHaveLength(0);

    const expanded = renderPieLegend(
      Array.from({ length: 12 }, (_, index) => [`category-${index}`, index + 1]),
      78
    );
    expect(expanded.querySelector('li:last-child i')?.className).toBe('chart-series-12');

    const semantic = renderPieLegend([
      ['failure', 1],
      ['success', 2],
      ['waiting for approval', 3]
    ], 6);
    expect(semantic.querySelector('li:nth-child(1) i')?.classList.contains('chart-series-semantic-failure')).toBe(true);
    expect(semantic.querySelector('li:nth-child(2) i')?.classList.contains('chart-series-semantic-success')).toBe(true);
    expect(semantic.querySelector('li:nth-child(3) i')?.classList.contains('chart-series-semantic-waiting')).toBe(true);
  });

  it('shows an informative empty state when a chart has fewer than two entries', () => {
    for (const chartType of ['bar', 'histogram', 'line', 'pie']) {
      for (const points of [[], [{ x: 'only', y: 1, color: null }]]) {
        const chart = renderChartWidget(chartType, points, listChartSeries(points));

        expect(chart.getAttribute('data-chart-widget')).toBe(chartType);
        expect(chart.querySelector('svg')).toBeNull();
        expect(chart.querySelector('[role="status"]')?.textContent).toBe('Not enough data to show this visualization.');
      }
    }

    const singleCategoryPie = renderChartWidget('pie', [
      { x: 'only', y: 1, color: null },
      { x: 'only', y: 2, color: null }
    ], []);
    expect(singleCategoryPie.querySelector('[role="status"]')?.textContent).toBe('Not enough data to show this visualization.');
  });

  it('renders categorical workflow runs as accessible swimlanes without connecting marks', () => {
    const points = [
      {
        x: '2026-08-28T08:00:00Z',
        y: Number.NaN,
        category: 'action-required',
        color: 'action-required',
        source: { run: '1840', 'started-at': '2026-08-28T08:00:00Z', 'ended-at': '2026-08-28T08:03:18Z' }
      },
      {
        x: '2026-08-29T12:48:37Z',
        y: Number.NaN,
        category: 'failure',
        color: 'failure',
        source: { run: '1842', 'started-at': '2026-08-29T12:48:37Z', 'ended-at': '2026-08-29T12:51:55Z', branch: 'main' }
      },
      { x: '2026-08-30T08:00:00Z', y: Number.NaN, category: 'cancelled', color: 'cancelled', source: {} },
      { x: '2026-08-30T12:00:00Z', y: Number.NaN, category: 'skipped', color: 'skipped', source: {} },
      { x: '2026-08-31T08:00:00Z', y: Number.NaN, category: 'success', color: 'success', source: {} }
    ];
    const chart = renderChartWidget(
      'swimlane',
      points,
      listChartSeries(points),
      null,
      'Total',
      null,
      { start: '2026-08-28T00:00:00Z', end: '2026-09-01T00:00:00Z' }
    );

    expect(chart.getAttribute('data-chart-widget')).toBe('swimlane');
    expect(chart.querySelectorAll('.swimlane-label')).toHaveLength(5);
    expect([...chart.querySelectorAll('.swimlane-label')].map((label) => label.textContent)).toEqual([
      'Action required',
      'Failure',
      'Cancelled',
      'Skipped',
      'Success'
    ]);
    expect(chart.querySelectorAll('.swimlane-mark')).toHaveLength(5);
    expect(chart.querySelector('polyline')).toBeNull();
    expect(chart.querySelector('.swimlane-summary')?.textContent).toContain('5 runs');
    expect(chart.querySelector('.swimlane-summary')?.textContent).toContain('20.0% success');
    expect(chart.querySelector('.swimlane-mark-failure')?.getAttribute('aria-label')).toContain('Conclusion: failure');
    expect(chart.querySelector('.swimlane-mark-failure')?.getAttribute('aria-label')).toContain('Run #1842');
    expect(chart.querySelector('.swimlane-mark-failure')?.getAttribute('aria-label')).toContain('Branch: main');
    expect(chart.querySelector('.swimlane-mark-failure')?.getAttribute('aria-label')).toContain('Duration: 3m 18s');
    expect(chart.querySelectorAll('.swimlane-mark > *')).toHaveLength(0);
    expect(chart.querySelector('[data-chart-axis="swimlane"]')).toBeNull();
    expect(chart.textContent).toContain('Aug 28');
  });

  it('coalesces dense swimlane observations into bounded contiguous sections', () => {
    const start = Date.parse('2026-08-01T00:00:00Z');
    const points = Array.from({ length: 20_000 }, (_, index) => {
      const lane = ['success', 'failure', 'skipped', 'cancelled', 'action-required'][index % 5];
      return {
        x: new Date(start + index).toISOString(),
        y: Number.NaN,
        category: lane,
        color: lane,
        source: { run: String(index) }
      };
    });
    const chart = renderChartWidget('swimlane', points, [], null, 'Total', null, {
      start: new Date(start).toISOString(),
      end: new Date(start + points.length).toISOString()
    });
    const marks = chart.querySelectorAll('.swimlane-mark');

    expect(marks).toHaveLength(5);
    expect(chart.querySelectorAll('svg *').length).toBeLessThan(30);
    expect(marks[0].getAttribute('data-swimlane-count')).toBe('4000');
    expect(marks[0].getAttribute('aria-label')).toContain('4,000 action-required runs');
  });

  it('renders one swimlane observation without applying the multi-point chart empty state', () => {
    const chart = renderChartWidget('swimlane', [{
      x: '2026-08-31T12:48:37Z',
      y: Number.NaN,
      category: 'success',
      color: 'success',
      source: { run: '1842' }
    }], []);

    expect(chart.querySelectorAll('.swimlane-mark')).toHaveLength(1);
    expect(chart.querySelector('[role="status"]')).toBeNull();
  });

  it('renders an empty swimlane without invalid timeline dates', () => {
    const chart = renderChartWidget('swimlane', [], []);

    expect(chart.getAttribute('data-chart-widget')).toBe('swimlane');
    expect(chart.querySelector('[role="status"]')?.textContent).toBe('No workflow runs to show.');
    expect(chart.querySelector('svg')).toBeNull();
  });

  it('DLS-VIEW-005 DLS-VIEW-006 DLS-VIEW-007 renders JSON-selected chart marks through one generic helper', () => {
    const points = [
      { x: '2026-08-29', y: 3, color: 'success' },
      { x: '2026-08-30', y: 1, color: 'failure' }
    ];
    const series = listChartSeries(points);

    const bar = renderChartWidget('bar', [...points, { x: 'invalid', y: Number.NaN, color: null }], series);
    const line = renderChartWidget('line', points, series);
    const pie = renderChartWidget('pie', points, series);
    const histogram = renderChartWidget('histogram', [
      { x: 'run-1', y: 3, color: null },
      { x: 'run-2', y: 4, color: null },
      { x: 'run-3', y: 4, color: null }
    ], series, null, 'AIC per run', {
      name: 'AI Credits',
      symbol: 'AIC',
      significant: 1
    });
    const unitPie = renderChartWidget('pie', points, series, null, 'Total', {
      name: 'AI Credits',
      symbol: 'AIC',
      significant: 1
    });
    const chartHeight = String(38 - 4);

    expect(bar.getAttribute('data-chart-widget')).toBe('bar');
    expect(bar.querySelectorAll('.bar-chart-bar')).toHaveLength(3);
    expect(bar.querySelector('.bar-chart-bar')?.getAttribute('height')).toBe(chartHeight);
    expect(bar.querySelector('.bar-chart-bar:last-child')?.getAttribute('height')).toBe('1');
    expect(line.getAttribute('data-chart-widget')).toBe('line');
    expect(line.querySelectorAll('.line-chart-series')).toHaveLength(2);
    expect(line.querySelector('.line-chart-series')?.getAttribute('pathLength')).toBe('1');
    expect(line.querySelector('.line-chart-series')?.getAttribute('style')).toContain('--chart-entry-index: 0');
    expect(line.querySelector('.line-chart-point')?.getAttribute('r')).toBe('2.5');
    expect(line.querySelector('.chart-point')?.getAttribute('style')).toContain('--chart-entry-index: 0');
    expect([...line.querySelectorAll('.timeline-chart-axis span')].map((tick) => tick.textContent)).toEqual([
      'Aug 29',
      'Aug 30'
    ]);
    expect(pie.getAttribute('data-chart-widget')).toBe('pie');
    expect(pie.querySelectorAll('.pie-chart-segment')).toHaveLength(2);
    expect(pie.querySelector('.pie-chart-mark')?.getAttribute('style')).toContain('--chart-entry-index: 0');
    expect(pie.querySelector('.pie-chart-track')?.getAttribute('stroke-width')).toBe('10');
    expect(pie.querySelector('.pie-chart-segment')?.getAttribute('stroke-width')).toBe('10');
    expect(pie.querySelectorAll('.pie-chart-mark .point-tooltip')).toHaveLength(2);
    expect(pie.querySelector('.pie-chart-mark')?.getAttribute('aria-label')).toBe('2026-08-29: 3');
    expect(pie.querySelector('.pie-chart-tooltip rect')?.getAttribute('width')).toBe('21.25');
    const firstPieMark = pie.querySelector('.pie-chart-mark');
    firstPieMark?.dispatchEvent(new Event('pointerenter'));
    expect(pie.querySelector('.pie-chart-mark:last-child')).toBe(firstPieMark);
    expect(histogram.getAttribute('data-chart-widget')).toBe('histogram');
    expect(histogram.querySelectorAll('.histogram-chart-bar')).toHaveLength(3);
    expect(histogram.querySelector('.histogram-chart-mark')?.getAttribute('style')).toContain('--chart-entry-index: 0');
    expect(histogram.querySelectorAll('.histogram-chart-mark .point-tooltip')).toHaveLength(3);
    expect(histogram.querySelectorAll('.histogram-chart-grid')).toHaveLength(3);
    expect(histogram.querySelector('.histogram-chart-bar')?.classList.contains('chart-series-1')).toBe(true);
    expect(histogram.querySelector('.histogram-chart-bar')?.getAttribute('rx')).toBe('0.75');
    expect(histogram.querySelector('.histogram-chart-tooltip text')?.getAttribute('lengthAdjust')).toBe('spacingAndGlyphs');
    expect(histogram.querySelector('svg')?.getAttribute('aria-label')).toContain('automatically calculated bins');
    expect(histogram.querySelector('.histogram-chart-mark')?.getAttribute('aria-label')).toContain('AIC');
    const firstHistogramMark = histogram.querySelector('.histogram-chart-mark');
    firstHistogramMark?.dispatchEvent(new Event('pointerenter'));
    expect(histogram.querySelector('.histogram-chart-mark:last-child')).toBe(firstHistogramMark);
    expect(unitPie.querySelector('.pie-chart-mark')?.getAttribute('aria-label')).toBe('2026-08-29: 3 AIC');
    expect(unitPie.querySelector('.pie-chart-total-value')?.textContent).toBe('4');
  });

  it('dims historical line context and emphasizes the selected window', () => {
    const points = [
      { x: '2026-09-03T10:00:00Z', y: 2, color: 'worker', highlighted: false },
      { x: '2026-09-04T10:00:00Z', y: 3, color: 'worker', highlighted: true },
      { x: '2026-09-04T11:00:00Z', y: 4, color: 'worker', highlighted: true }
    ];
    const line = renderChartWidget('line', points, listChartSeries(points));

    expect(line.querySelector('.line-chart-context')).not.toBeNull();
    expect(Number(line.querySelector('.line-chart-window-band')?.getAttribute('width'))).toBeGreaterThan(0);
    expect(line.querySelector('.line-chart-current')?.getAttribute('points')).not.toBe('');
    expect(line.querySelectorAll('.chart-point-context')).toHaveLength(1);
    expect(line.querySelector('.chart-point-context circle')?.getAttribute('r')).toBe('0.65');
    expect(line.querySelector('.chart-point-current circle')?.getAttribute('r')).toBe('0.65');
    expect(line.querySelector('.chart-window-key')?.textContent).toContain('Selected window');
  });

  it('reduces line-chart point radii linearly as the number of points increases', () => {
    /** @param {number} count */
    const renderPoints = (count) => {
      const points = Array.from({ length: count }, (_, index) => ({
        x: String(index),
        y: index,
        color: null
      }));
      return renderChartWidget('line', points, listChartSeries(points));
    };

    expect(renderPoints(2).querySelector('.line-chart-point')?.getAttribute('r')).toBe('2.5');
    expect(renderPoints(51).querySelector('.line-chart-point')?.getAttribute('r')).toBe('1.5');
    expect(renderPoints(100).querySelector('.line-chart-point')?.getAttribute('r')).toBe('0.5');
    expect(renderPoints(150).querySelector('.line-chart-point')?.getAttribute('r')).toBe('0.5');
  });

  it('renders 100,000 line-chart points in bounded time and SVG size', () => {
    const points = Array.from({ length: 100_000 }, (_, index) => ({
      x: new Date(index * 60_000).toISOString(),
      y: index % 1_000,
      color: null
    }));
    const startedAt = performance.now();
    const chart = renderChartWidget('line', points, listChartSeries(points));
    const elapsedMilliseconds = performance.now() - startedAt;
    const renderedPoints = chart.querySelector('.line-chart-series')?.getAttribute('points')?.split(' ') ?? [];

    expect(elapsedMilliseconds).toBeLessThan(1_000);
    expect(chart.getAttribute('data-line-rendering')).toBe('compact');
    expect(renderedPoints.length).toBeLessThanOrEqual(2_000);
    expect(chart.querySelectorAll('.chart-point')).toHaveLength(0);
    expect(chart.querySelectorAll('svg *').length).toBeLessThan(25);
  });

  it('renders a concise, evenly sampled timeline axis while preserving exact values', () => {
    const points = Array.from({ length: 9 }, (_, index) => ({
      x: `2026-09-0${index + 1}T0${index}:15:00Z`,
      y: index,
      color: null
    }));
    const chart = renderChartWidget('line', points, listChartSeries(points));
    const ticks = [...chart.querySelectorAll('.timeline-chart-axis span')];

    expect(ticks.map((tick) => tick.textContent)).toEqual([
      'Sep 1, 00:15 UTC',
      'Sep 3, 02:15 UTC',
      'Sep 5, 04:15 UTC',
      'Sep 7, 06:15 UTC',
      'Sep 9, 08:15 UTC'
    ]);
    expect(ticks.map((tick) => tick.getAttribute('title'))).toEqual([
      points[0].x,
      points[2].x,
      points[4].x,
      points[6].x,
      points[8].x
    ]);
  });
});
