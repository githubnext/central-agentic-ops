// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { groupChartSeries, listChartSeries, pieChartEntries, renderChartLegend, renderChartWidget, renderPieLegend } from '../../src/components/chart-elements.js';

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
      { name: 'fail', className: 'chart-series-1' },
      { name: 'pass', className: 'chart-series-2' },
      { name: 'value', className: 'chart-series-3' }
    ]);
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
    expect(line.querySelector('.line-chart-point')?.getAttribute('r')).toBe('2.5');
    expect([...line.querySelectorAll('.timeline-chart-axis span')].map((tick) => tick.textContent)).toEqual([
      'Aug 29',
      'Aug 30'
    ]);
    expect(pie.getAttribute('data-chart-widget')).toBe('pie');
    expect(pie.querySelectorAll('.pie-chart-segment')).toHaveLength(2);
    expect(pie.querySelectorAll('.pie-chart-mark .point-tooltip')).toHaveLength(2);
    expect(pie.querySelector('.pie-chart-mark')?.getAttribute('aria-label')).toBe('2026-08-29: 3');
    expect(pie.querySelector('.pie-chart-tooltip rect')?.getAttribute('width')).toBe('21.25');
    const firstPieMark = pie.querySelector('.pie-chart-mark');
    firstPieMark?.dispatchEvent(new Event('pointerenter'));
    expect(pie.querySelector('.pie-chart-mark:last-child')).toBe(firstPieMark);
    expect(histogram.getAttribute('data-chart-widget')).toBe('histogram');
    expect(histogram.querySelectorAll('.histogram-chart-bar')).toHaveLength(3);
    expect(histogram.querySelectorAll('.histogram-chart-mark .point-tooltip')).toHaveLength(3);
    expect(histogram.querySelector('.histogram-chart-bar')?.classList.contains('chart-series-1')).toBe(true);
    expect(histogram.querySelector('.histogram-chart-tooltip text')?.getAttribute('lengthAdjust')).toBe('spacingAndGlyphs');
    expect(histogram.querySelector('svg')?.getAttribute('aria-label')).toContain('automatically calculated bins');
    expect(histogram.querySelector('.histogram-chart-mark')?.getAttribute('aria-label')).toContain('AIC');
    expect(unitPie.querySelector('.pie-chart-mark')?.getAttribute('aria-label')).toBe('2026-08-29: 3 AIC');
    expect(unitPie.querySelector('.pie-chart-total-value')?.textContent).toBe('4');
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
