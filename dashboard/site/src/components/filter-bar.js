import { h } from '../dom.js';
import { debounce } from '../debounce.js';
import { dashboardHorizonHours, formatDashboardHorizon } from '../horizon.js';
import { octicon } from '../octicons.js';

/** @typedef {{ filters: string[], ['time-range']?: string }} FilterBarConfig */
/** @typedef {{ range: string, start: string, end: string }} TimeWindow */
const FILTER_DEBOUNCE_MS = 500;
const TIME_RANGE_OPTIONS = ['1h', '6h', '24h', '3d', '1w', '2w', '4w'];
const ALL_RECORDED = 'all';

/**
 * @param {FilterBarConfig} config
 * @param {(filters: Map<string, string[]>, timeWindow?: TimeWindow) => void} onChange
 * @param {{ id?: string, referenceEnd?: string }} [options]
 * @returns {HTMLElement}
 */
export function renderFilterBar(config, onChange, options = {}) {
  const filters = /** @type {HTMLInputElement} */ (h('input', {
    type: 'search',
    value: config.filters.join(' '),
    'aria-label': 'Current filters',
    spellcheck: 'false'
  }));
  const count = h('span', { className: 'count-badge' }, String(config.filters.length));
  const applyFilters = debounce(onChange, FILTER_DEBOUNCE_MS);
  /** @type {ReturnType<typeof renderTimeWindowControl> | null | undefined} */
  let timeControl;
  const emit = () => {
    applyFilters.cancel();
    onChange(parseFilters(filters.value), timeControl?.value());
  };
  timeControl = config['time-range']
    ? renderTimeWindowControl(config['time-range'], options, emit)
    : null;
  const root = h(
    'div',
    { className: 'toolbar filter-bar', 'aria-label': 'Dashboard filters' },
    h(
      'div',
      { className: 'filter-control' },
      h(
        'span',
        { className: 'scope-label' },
        octicon('issue'),
        h('strong', null, 'Filter'),
        count
      ),
      filters,
      h('span', { className: 'search-control', 'aria-hidden': 'true' }, octicon('eye'))
    ),
    timeControl?.element
  );
  filters.addEventListener('input', () => {
    const parsed = parseFilters(filters.value);
    const filterCount = [...parsed.values()].reduce((total, values) => total + values.length, 0);
    count.textContent = String(filterCount);
    count.setAttribute('aria-label', `${filterCount} filters`);
    applyFilters(parsed, timeControl?.value());
  });
  count.setAttribute('aria-label', `${config.filters.length} filters`);
  queueMicrotask(emit);
  return root;
}

/**
 * @param {string} defaultRange
 * @param {{ id?: string, referenceEnd?: string }} options
 * @param {() => void} onChange
 */
function renderTimeWindowControl(defaultRange, options, onChange) {
  const window = globalThis.window;
  const prefix = options.id ? `${options.id}.` : '';
  const parameters = new URLSearchParams(window?.location.search ?? '');
  const persistedRange = parameters.get(`${prefix}window`);
  let range = persistedRange === 'custom' || persistedRange === ALL_RECORDED || TIME_RANGE_OPTIONS.includes(persistedRange ?? '')
    ? /** @type {string} */ (persistedRange)
    : defaultRange;
  if (range === 'All recorded') range = ALL_RECORDED;
  if (!TIME_RANGE_OPTIONS.includes(range) && range !== 'custom' && range !== ALL_RECORDED) range = '1w';
  const initialWindow = relativeTimeWindow(
    range === 'custom' || range === ALL_RECORDED ? defaultRange : range,
    options.referenceEnd
  );
  const persistedStart = parameters.get(`${prefix}start`);
  const persistedEnd = parameters.get(`${prefix}end`);
  if (range === 'custom' && !validTimeWindow(persistedStart, persistedEnd)) range = defaultRange;

  const select = /** @type {HTMLSelectElement} */ (h(
    'select',
    { 'aria-label': 'Time window' },
    ...TIME_RANGE_OPTIONS.map((value) => h('option', { value }, `Last ${formatDashboardHorizon(value)}`)),
    h('option', { value: ALL_RECORDED }, 'All recorded'),
    h('option', { value: 'custom' }, 'Custom range')
  ));
  select.value = range;
  const start = /** @type {HTMLInputElement} */ (h('input', {
    type: 'datetime-local',
    'aria-label': 'Window start time',
    value: localDateTimeValue(range === 'custom' ? persistedStart : initialWindow.start)
  }));
  const end = /** @type {HTMLInputElement} */ (h('input', {
    type: 'datetime-local',
    'aria-label': 'Window stop time',
    value: localDateTimeValue(range === 'custom' ? persistedEnd : initialWindow.end)
  }));
  const applyCustomRange = h('button', { type: 'button' }, 'Apply');

  const value = () => {
    if (select.value === ALL_RECORDED) return undefined;
    if (select.value !== 'custom') return relativeTimeWindow(select.value, options.referenceEnd);
    const customStart = isoDateTimeValue(start.value);
    const customEnd = isoDateTimeValue(end.value);
    return validTimeWindow(customStart, customEnd)
      ? { range: 'custom', start: customStart, end: customEnd }
      : undefined;
  };
  const syncUrl = () => {
    if (!window || !options.id || !['http:', 'https:'].includes(window.location.protocol)) return;
    const current = new URLSearchParams(window.location.search);
    current.set(`${prefix}window`, select.value);
    if (select.value === 'custom') {
      const selected = value();
      if (selected) {
        current.set(`${prefix}start`, selected.start);
        current.set(`${prefix}end`, selected.end);
      }
    } else {
      current.delete(`${prefix}start`);
      current.delete(`${prefix}end`);
    }
    const query = current.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  };
  const updateValidity = () => {
    const invalid = select.value === 'custom' && !value();
    start.setAttribute('aria-invalid', String(invalid));
    end.setAttribute('aria-invalid', String(invalid));
    return !invalid;
  };
  select.addEventListener('change', () => {
    if (select.value !== 'custom') {
      const selected = relativeTimeWindow(select.value, options.referenceEnd);
      start.value = localDateTimeValue(selected.start);
      end.value = localDateTimeValue(selected.end);
    }
    updateValidity();
    syncUrl();
    onChange();
  });
  for (const input of [start, end]) {
    input.addEventListener('change', () => {
      select.value = 'custom';
      updateValidity();
    });
  }
  applyCustomRange.addEventListener('click', () => {
    select.value = 'custom';
    if (!updateValidity()) return;
    syncUrl();
    onChange();
  });

  return {
    element: h(
      'div',
      { className: 'time-window-control', 'aria-label': 'Evidence window' },
      h('label', null, octicon('clock'), h('span', null, 'Window'), select),
      h('label', null, h('span', null, 'Start'), start),
      h('label', null, h('span', null, 'Stop'), end),
      applyCustomRange
    ),
    value
  };
}

/** @param {string} range @param {string | undefined} referenceEnd @returns {TimeWindow} */
export function relativeTimeWindow(range, referenceEnd) {
  const parsedEnd = Date.parse(referenceEnd ?? '');
  const end = Number.isFinite(parsedEnd) ? parsedEnd : Date.now();
  let hours = 7 * 24;
  try {
    hours = dashboardHorizonHours(range);
  } catch {
    hours = dashboardHorizonHours('1w');
  }
  const start = end - hours * 3_600_000;
  return { range, start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

/** @param {string | null | undefined} start @param {string | null | undefined} end */
function validTimeWindow(start, end) {
  const startTime = Date.parse(start ?? '');
  const endTime = Date.parse(end ?? '');
  return Number.isFinite(startTime) && Number.isFinite(endTime) && startTime < endTime;
}

/** @param {string | null | undefined} value */
function localDateTimeValue(value) {
  const instant = Date.parse(value ?? '');
  if (!Number.isFinite(instant)) return '';
  const date = new Date(instant);
  return new Date(instant - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** @param {string} value */
function isoDateTimeValue(value) {
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? new Date(instant).toISOString() : '';
}

/**
 * @param {string} input
 * @returns {Map<string, string[]>}
 */
export function parseFilters(input) {
  /** @type {Map<string, Set<string>>} */
  const parsed = new Map();
  for (const token of input.trim().split(/\s+/)) {
    const separator = token.indexOf(':');
    if (separator < 1 || separator === token.length - 1) continue;
    const field = token.slice(0, separator);
    const value = token.slice(separator + 1);
    const values = parsed.get(field) ?? new Set();
    values.add(value);
    parsed.set(field, values);
  }
  return new Map([...parsed].map(([field, values]) => [field, [...values]]));
}
