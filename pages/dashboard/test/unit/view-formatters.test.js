import { describe, expect, it } from 'vitest';
import { formatAggregateValue, formatNumber, renderTemplate, resolveThresholdStatus, toNumber } from '../../src/view-formatters.js';

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
    expect(formatNumber(2.5, { name: 'AI Credits', symbol: 'AIC', significant: 1 })).toBe('3 AIC');
    expect(formatNumber(-2.5, { name: 'AI Credits', symbol: 'AIC', significant: 1 })).toBe('-3 AIC');
    expect(formatNumber(1.24, { name: 'Dollars', symbol: 'USD', significant: 0.01 })).toBe('1.24 USD');
    expect(formatAggregateValue(rowsWithUnit(), 'aic', 'sum', toText, {
      name: 'AI Credits',
      symbol: 'AIC',
      significant: 1
    })).toBe('3 AIC');
  });

  it('renders JSON-configured copy templates with plain, suffix, and word substitutions', () => {
    expect(renderTemplate('{{count}} failed run{{count:suffix::s}}', { count: 1 })).toBe('1 failed run');
    expect(renderTemplate('{{count}} failed run{{count:suffix::s}}', { count: 3 })).toBe('3 failed runs');
    expect(renderTemplate('Across {{repositories}} repositor{{repositories:suffix:y:ies}}', { repositories: 1 })).toBe('Across 1 repository');
    expect(renderTemplate('Across {{repositories}} repositor{{repositories:suffix:y:ies}}', { repositories: 3 })).toBe('Across 3 repositories');
    expect(renderTemplate('{{count}} run{{count:suffix::s}} {{status:word:is:are}} pending', { count: 2, status: 2 })).toBe('2 runs are pending');
    expect(renderTemplate('{{missing}} unavailable', {})).toBe(' unavailable');
  });

  function rowsWithUnit() {
    return [{ aic: 1.4 }, { aic: 1.2 }];
  }

  it('resolves an ordered, JSON-configured threshold list to a status label', () => {
    const thresholds = [
      { max: 0.5, status: 'low' },
      { max: 0.8, status: 'medium' },
      { status: 'high' }
    ];

    expect(resolveThresholdStatus(0.2, thresholds)).toBe('low');
    expect(resolveThresholdStatus(0.5, thresholds)).toBe('medium');
    expect(resolveThresholdStatus(0.79, thresholds)).toBe('medium');
    expect(resolveThresholdStatus(0.8, thresholds)).toBe('high');
    expect(resolveThresholdStatus(5, thresholds)).toBe('high');
  });
});
