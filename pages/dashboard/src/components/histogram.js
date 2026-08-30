/**
 * Compact, reusable SVG histogram.
 */

import { h } from '../dom.js';

const DEFAULT_BIN_COUNT = 10;

/**
 * @param {number[]} values
 * @param {number} [binCount]
 * @returns {{ lower: number, upper: number, count: number }[]}
 */
export function binHistogramValues(values, binCount = DEFAULT_BIN_COUNT) {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return [];

  const minimum = Math.min(...finiteValues);
  const maximum = Math.max(...finiteValues);
  if (minimum === maximum) {
    return [{ lower: minimum, upper: maximum, count: finiteValues.length }];
  }

  const count = Math.max(1, Math.min(Math.floor(binCount), finiteValues.length));
  const step = (maximum - minimum) / count;
  const bins = Array.from({ length: count }, (_, index) => ({
    lower: minimum + (index * step),
    upper: minimum + ((index + 1) * step),
    count: 0
  }));
  for (const value of finiteValues) {
    const index = Math.min(Math.floor((value - minimum) / step), count - 1);
    bins[index].count += 1;
  }
  return bins;
}

/**
 * @param {{
 *   values: number[],
 *   label: string,
 *   width?: number,
 *   height?: number,
 *   binCount?: number
 * }} options
 * @returns {SVGElement}
 */
export function renderHistogram(options) {
  const {
    values,
    label,
    width = 120,
    height = 32,
    binCount = DEFAULT_BIN_COUNT
  } = options;
  const bins = binHistogramValues(values, binCount);
  const maximumCount = Math.max(0, ...bins.map((bin) => bin.count));
  const gap = 1;
  const barWidth = bins.length > 0 ? width / bins.length : width;

  return /** @type {SVGElement} */ (/** @type {unknown} */ (h(
    'svg',
    {
      className: 'table-summary-histogram',
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      'aria-label': label
    },
    h('title', null, label),
    ...bins.map((bin, index) => {
      const barHeight = maximumCount > 0 ? (bin.count / maximumCount) * height : 0;
      return h('rect', {
        x: (index * barWidth) + gap / 2,
        y: height - barHeight,
        width: Math.max(0, barWidth - gap),
        height: barHeight
      });
    })
  )));
}
