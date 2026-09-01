// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { formatCount, formatCountNoun } from '../../src/components/count-formatters.js';

describe('count formatters', () => {
  it('formats counts for UI text', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1200)).toBe('1,200');
    expect(formatCount('7')).toBe('7');
    expect(formatCount(undefined)).toBe('0');
  });

  it('formats singular and plural count nouns for reusable UI copy', () => {
    expect(formatCountNoun(1, 'signal', 'signals')).toBe('1 signal');
    expect(formatCountNoun(2, 'signal', 'signals')).toBe('2 signals');
    expect(formatCountNoun(1, 'worker dispatch lacks', 'worker dispatches lack')).toBe('1 worker dispatch lacks');
    expect(formatCountNoun(3, 'worker dispatch lacks', 'worker dispatches lack')).toBe('3 worker dispatches lack');
    expect(formatCountNoun(undefined, 'workflow', 'workflows')).toBe('0 workflows');
  });
});
