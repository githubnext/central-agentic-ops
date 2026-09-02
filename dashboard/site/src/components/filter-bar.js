import { h } from '../dom.js';
import { debounce } from '../debounce.js';
import { octicon } from '../octicons.js';

/** @typedef {{ filters: string[], ['time-range']?: string }} FilterBarConfig */
const FILTER_DEBOUNCE_MS = 500;

/**
 * @param {FilterBarConfig} config
 * @param {(filters: Map<string, string[]>) => void} onChange
 * @returns {HTMLElement}
 */
export function renderFilterBar(config, onChange) {
  const filters = /** @type {HTMLInputElement} */ (h('input', {
    type: 'search',
    value: config.filters.join(' '),
    'aria-label': 'Current filters',
    spellcheck: 'false'
  }));
  const count = h('span', { className: 'count-badge' }, String(config.filters.length));
  const applyFilters = debounce(onChange, FILTER_DEBOUNCE_MS);
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
    config['time-range']
      ? h('span', { className: 'scope-period' }, config['time-range'])
      : null
  );
  filters.addEventListener('input', () => {
    const parsed = parseFilters(filters.value);
    const filterCount = [...parsed.values()].reduce((total, values) => total + values.length, 0);
    count.textContent = String(filterCount);
    count.setAttribute('aria-label', `${filterCount} filters`);
    applyFilters(parsed);
  });
  count.setAttribute('aria-label', `${config.filters.length} filters`);
  queueMicrotask(() => onChange(parseFilters(filters.value)));
  return root;
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
