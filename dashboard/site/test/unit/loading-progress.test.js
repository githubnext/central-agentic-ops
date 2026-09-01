import { afterEach, describe, expect, it, vi } from 'vitest';
import { startLoadingProgress } from '../../src/loading-progress.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe('loading progress', () => {
  it('advances in randomized bursts without reaching the end', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    startLoadingProgress(document);
    const bar = document.querySelector('.loading-progress');
    const positions = [];

    for (let index = 0; index < 20; index += 1) {
      vi.advanceTimersByTime(600);
      positions.push(Number.parseFloat(bar?.style.transform.slice(7) ?? '0'));
    }

    expect(positions[0]).toBeGreaterThan(0.08);
    expect(positions.every((position) => position < 0.94)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it('finishes once and removes the bar after its completion transition', () => {
    vi.useFakeTimers();
    const progress = startLoadingProgress(document);
    const bar = document.querySelector('.loading-progress');

    progress.complete();
    progress.complete();

    expect(bar?.classList.contains('loading-progress-complete')).toBe(true);
    expect(bar?.style.transform).toBe('scaleX(1)');
    vi.advanceTimersByTime(240);
    expect(document.querySelector('.loading-progress')).toBeNull();
    expect(document.querySelectorAll('style[data-loading-progress-styles]')).toHaveLength(1);
  });
});
