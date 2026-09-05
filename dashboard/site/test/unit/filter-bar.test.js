// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HORIZON_FILTER_STORAGE_KEY,
  relativeTimeWindow,
  renderFilterBar
} from '../../src/components/filter-bar.js';

afterEach(() => {
  document.body.replaceChildren();
  window.history.replaceState(null, '', '/');
  localStorage.clear();
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
    const filterBar = renderFilterBar({ filters: [] }, onChange, {
      defaultRange: '24h',
      referenceEnd: '2026-09-04T12:00:00Z'
    });
    document.body.append(filterBar);
    await Promise.resolve();

    expect(onChange).toHaveBeenLastCalledWith(new Map([['mode', ['review', 'live', 'unknown']]]), {
      range: '24h',
      start: '2026-09-03T12:00:00.000Z',
      end: '2026-09-04T12:00:00.000Z'
    });

    const select = /** @type {HTMLSelectElement} */ (filterBar.querySelector('[aria-label="Time window"]'));
    select.value = '6h';
    select.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenLastCalledWith(new Map([['mode', ['review', 'live', 'unknown']]]), {
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
    expect(JSON.parse(localStorage.getItem(HORIZON_FILTER_STORAGE_KEY) ?? '{}')).toMatchObject({
      range: 'custom',
      modes: ['review', 'live', 'unknown']
    });
  });

  it('toggles the mobile time-window controls from the filter label', () => {
    const filterBar = renderFilterBar({ filters: [] }, vi.fn(), { defaultRange: '24h' });
    document.body.append(filterBar);
    const toggle = filterBar.querySelector('.filter-toggle');

    expect(toggle?.textContent).toContain('Filter');
    expect(toggle?.querySelector('.count-badge')?.textContent).toBe('3');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(filterBar.classList.contains('time-window-expanded')).toBe(false);

    toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(filterBar.classList.contains('time-window-expanded')).toBe(true);

    filterBar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(filterBar.classList.contains('time-window-expanded')).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it('shares persisted horizon and mode settings across filter bars', async () => {
    const firstChange = vi.fn();
    const first = renderFilterBar({ filters: [] }, firstChange, {
      defaultRange: '24h',
      referenceEnd: '2026-09-04T12:00:00Z'
    });
    document.body.append(first);
    await Promise.resolve();

    const modes = [...first.querySelectorAll('.mode-filter-control input')];
    /** @type {HTMLInputElement} */ (modes[1]).click();
    const select = /** @type {HTMLSelectElement} */ (first.querySelector('[aria-label="Time window"]'));
    select.value = '6h';
    select.dispatchEvent(new Event('change'));

    const secondChange = vi.fn();
    const second = renderFilterBar({ filters: [] }, secondChange, {
      defaultRange: '1w',
      referenceEnd: '2026-09-04T12:00:00Z'
    });
    document.body.append(second);
    await Promise.resolve();

    expect(/** @type {HTMLSelectElement | null} */ (
      second.querySelector('[aria-label="Time window"]')
    )?.value).toBe('6h');
    expect([...second.querySelectorAll('.mode-filter-control input')].map(
      (input) => /** @type {HTMLInputElement} */ (input).checked
    )).toEqual([true, false, true]);
    expect(secondChange).toHaveBeenLastCalledWith(
      new Map([['mode', ['review', 'unknown']]]),
      {
        range: '6h',
        start: '2026-09-04T06:00:00.000Z',
        end: '2026-09-04T12:00:00.000Z'
      }
    );

    for (const input of second.querySelectorAll('.mode-filter-control input')) {
      const checkbox = /** @type {HTMLInputElement} */ (input);
      if (checkbox.checked) checkbox.click();
    }
    expect(secondChange.mock.calls.at(-1)?.[0]).toEqual(new Map([['mode', []]]));
    expect(JSON.parse(localStorage.getItem(HORIZON_FILTER_STORAGE_KEY) ?? '{}').modes).toEqual([]);
  });
});