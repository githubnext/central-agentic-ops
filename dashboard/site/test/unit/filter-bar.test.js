// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { relativeTimeWindow, renderFilterBar } from '../../src/components/filter-bar.js';

afterEach(() => {
  document.body.replaceChildren();
  window.history.replaceState(null, '', '/');
});

describe('time-window filter bar', () => {
  it('anchors relative windows to the latest source timestamp', () => {
    expect(relativeTimeWindow('24h', '2026-09-04T12:00:00Z')).toEqual({
      range: '24h',
      start: '2026-09-03T12:00:00.000Z',
      end: '2026-09-04T12:00:00.000Z'
    });
  });

  it('emits preset and custom start/end windows', async () => {
    const onChange = vi.fn();
    const filterBar = renderFilterBar({ filters: [], 'time-range': '24h' }, onChange, {
      id: 'readiness',
      referenceEnd: '2026-09-04T12:00:00Z'
    });
    document.body.append(filterBar);
    await Promise.resolve();

    expect(onChange).toHaveBeenLastCalledWith(new Map(), {
      range: '24h',
      start: '2026-09-03T12:00:00.000Z',
      end: '2026-09-04T12:00:00.000Z'
    });

    const select = /** @type {HTMLSelectElement} */ (filterBar.querySelector('[aria-label="Time window"]'));
    select.value = '6h';
    select.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenLastCalledWith(new Map(), {
      range: '6h',
      start: '2026-09-04T06:00:00.000Z',
      end: '2026-09-04T12:00:00.000Z'
    });

    const start = /** @type {HTMLInputElement} */ (filterBar.querySelector('[aria-label="Window start time"]'));
    const end = /** @type {HTMLInputElement} */ (filterBar.querySelector('[aria-label="Window stop time"]'));
    start.value = '2026-09-04T08:00';
    end.value = '2026-09-04T10:00';
    start.dispatchEvent(new Event('change'));
    [...filterBar.querySelectorAll('button')].find((button) => button.textContent === 'Apply')?.click();

    const selected = onChange.mock.calls.at(-1)?.[1];
    expect(selected.range).toBe('custom');
    expect(Date.parse(selected.end) - Date.parse(selected.start)).toBe(2 * 3_600_000);
    expect(new URLSearchParams(window.location.search).get('readiness.window')).toBe('custom');
  });

  it('toggles the mobile time-window controls from the filter label', () => {
    const filterBar = renderFilterBar({ filters: ['mode:review', 'mode:live'], 'time-range': '24h' }, vi.fn());
    const toggle = filterBar.querySelector('.filter-toggle');

    expect(toggle?.textContent).toContain('Filter');
    expect(toggle?.querySelector('.count-badge')?.textContent).toBe('2');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(filterBar.classList.contains('time-window-expanded')).toBe(false);

    toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(filterBar.classList.contains('time-window-expanded')).toBe(true);

    toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(filterBar.classList.contains('time-window-expanded')).toBe(false);
  });
});