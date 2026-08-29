/**
 * Reusable presentation-only section and metadata chrome helpers for dashboard pages.
 */

import { h } from '../dom.js';

/**
 * @param {string} pageId
 * @param {string} title
 * @param {HTMLElement[]} content
 * @returns {HTMLElement}
 */
export function renderPageSection(pageId, title, content) {
  return h(
    'section',
    {
      className: 'page-section',
      tabIndex: 0,
      'aria-labelledby': `${pageId}-${slugifyText(title)}-heading`
    },
    h('h3', { id: `${pageId}-${slugifyText(title)}-heading` }, title),
    ...content
  );
}

/**
 * @param {string} pageId
 * @param {string} title
 * @param {HTMLElement} content
 * @returns {HTMLElement}
 */
export function renderTitledRegion(pageId, title, content) {
  return renderPageSection(pageId, title, [content]);
}

/**
 * @param {string[]} details
 * @returns {HTMLElement}
 */
export function renderContextList(details) {
  return h('ul', { className: 'view-context' }, details.map((detail) => h('li', null, detail)));
}

/**
 * @param {string} sourceName
 * @param {{ 'as-of': string, completeness: string, freshness: string }} metadata
 * @returns {HTMLElement[]}
 */
export function renderViewHeader(sourceName, metadata) {
  return [
    h('p', { className: 'view-source' }, `Source: ${sourceName}`),
    h('p', { className: 'view-metadata' }, `As of ${metadata['as-of']} • completeness ${metadata.completeness} • freshness ${metadata.freshness}`)
  ];
}

/**
 * @param {Array<{ sourceName: string, sourceId: string, sourceKind: string, asOf: string }>} items
 * @returns {HTMLElement}
 */
export function renderProvenanceList(items) {
  return h(
    'ul',
    { className: 'provenance-list' },
    items.length > 0
      ? items.map((item) => h(
        'li',
        null,
        `${item.sourceName}: ${item.sourceId} (${item.sourceKind}) — as of ${item.asOf}`
      ))
      : [h('li', null, 'No source provenance available for this page.')]
  );
}

/**
 * @param {string} pageId
 * @param {Array<{ sourceName: string, sourceId: string, sourceKind: string, asOf: string }>} items
 * @returns {HTMLElement}
 */
export function renderProvenanceSection(pageId, items) {
  return renderTitledRegion(pageId, 'Provenance', renderProvenanceList(items));
}

/**
 * @param {string} value
 * @returns {string}
 */
function slugifyText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}
