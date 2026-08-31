// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { formatSummaryCount } from '../../src/components/summary-copy.js';

describe('formatSummaryCount', () => {
  it('formats plural item counts', () => {
    expect(formatSummaryCount(3)).toBe('3 items');
  });

  it('formats singular item counts', () => {
    expect(formatSummaryCount(1)).toBe('1 item');
  });

  it('supports custom summary nouns', () => {
    expect(formatSummaryCount(2, 'signal', 'signals')).toBe('2 signals');
  });
});
