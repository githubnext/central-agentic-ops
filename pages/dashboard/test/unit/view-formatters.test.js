import { describe, expect, it } from 'vitest';
import { formatAggregateValue, formatNumber, toNumber } from '../../src/view-formatters.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function toText(value) {
  return value == null || value === '' ? 'unknown' : String(value);
}

describe('view formatter helpers', () => {
  it('DLS-VIEW-013 formats aggregate metric values for count, distinct-count, sum, mean, min, max, and default field access', () => {
    const rows = [
      { aic: 12, repository: 'repo-a', score: 1.5 },
      { aic: 18, repository: 'repo-b', score: 2.5 },
      { aic: null, repository: 'repo-a', score: 3 }
    ];

    expect(formatAggregateValue(rows, 'aic', 'count', toText)).toBe('2');
    expect(formatAggregateValue(rows, 'repository', 'distinct-count', toText)).toBe('2');
    expect(formatAggregateValue(rows, 'aic', 'sum', toText)).toBe('30');
    expect(formatAggregateValue(rows, 'score', 'mean', toText)).toBe('2.33');
    expect(formatAggregateValue(rows, 'score', 'min', toText)).toBe('1.50');
    expect(formatAggregateValue(rows, 'score', 'max', toText)).toBe('3');
    expect(formatAggregateValue(rows, 'repository', 'none', toText)).toBe('repo-a');
  });

  it('DLS-VIEW-013 formats aggregate metric edge cases for missing fields, empty rows, and non-numeric values', () => {
    expect(formatAggregateValue([], 'aic', 'sum', toText)).toBe('0');
    expect(formatAggregateValue([], 'aic', 'mean', toText)).toBe('Unavailable');
    expect(formatAggregateValue([], 'aic', 'none', toText)).toBe('Unavailable');
    expect(formatAggregateValue([{ aic: 'bad' }], 'aic', 'mean', toText)).toBe('0');
    expect(formatAggregateValue([{ repository: '' }], 'repository', 'distinct-count', toText)).toBe('1');
    expect(formatAggregateValue([{ repository: 'repo-a' }], null, 'count', toText)).toBe('Unavailable');
  });

  it('formats shared numeric helpers deterministically', () => {
    expect(toNumber(12)).toBe(12);
    expect(toNumber('12')).toBe(0);
    expect(formatNumber(2)).toBe('2');
    expect(formatNumber(2.5)).toBe('2.50');
  });
});
