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
    expect(pie.getAttribute('data-chart-widget')).toBe('pie');
    expect(pie.querySelectorAll('.pie-chart-segment')).toHaveLength(2);
    expect(pie.querySelectorAll('.pie-chart-mark .point-tooltip')).toHaveLength(2);
    expect(pie.querySelector('.pie-chart-mark')?.getAttribute('aria-label')).toBe('2026-08-29: 3');
    expect(pie.querySelector('.pie-chart-tooltip rect')?.getAttribute('width')).toBe('21.25');
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
});
