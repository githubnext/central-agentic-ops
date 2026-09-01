import { h } from '../dom.js';
import { octicon } from '../octicons.js';

/**
 * @typedef {{ filters: string[], ['time-range']?: string, export?: boolean }} FilterBarConfig
 */

/**
 * @param {string} pageId
 * @param {FilterBarConfig} config
 * @param {Map<string, unknown>} sources
 * @returns {HTMLElement}
 */
export function renderFilterBar(pageId, config, sources) {
  const filterCount = config.filters.length;
  const exportPayload = {
    page: pageId,
    filters: config.filters,
    sources: Object.fromEntries(sources)
  };

  return h(
    'div',
    { className: 'toolbar filter-bar', 'aria-label': 'Dashboard filters' },
    h(
      'div',
      { className: 'filter-control', role: 'group', 'aria-label': 'Current filters' },
      h(
        'span',
        { className: 'scope-label' },
        octicon('issue'),
        h('strong', null, 'Filter'),
        h('span', { className: 'count-badge', 'aria-label': `${filterCount} filters` }, String(filterCount))
      ),
      h('code', null, config.filters.join(' ')),
      h('span', { className: 'search-control', 'aria-hidden': 'true' }, octicon('eye'))
    ),
    config['time-range']
      ? h('span', { className: 'scope-period' }, config['time-range'])
      : null,
    config.export
      ? h(
        'a',
        {
          className: 'export-control',
          href: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportPayload, null, 2))}`,
          download: `${pageId}.json`
        },
        'Export JSON'
      )
      : null
  );
}
