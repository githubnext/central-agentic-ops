/**
 * Reusable custom-view and provenance chrome wrapper component.
 */

import { h } from '../dom.js';

/**
 * @typedef {{ 'as-of': string, completeness: string, freshness: string }} ViewChromeMetadata
 */

/**
 * @param {{ sourceName: string | null, metadata: ViewChromeMetadata | null, contextDetails: string[] | null, content: HTMLElement[] }} options
 * @returns {HTMLElement}
 */
export function renderViewChrome(options) {
  const { sourceName, metadata, contextDetails, content } = options;

  return h(
    'div',
    { className: 'view-chrome' },
    ...(sourceName ? [h('p', { className: 'view-source' }, `Source: ${sourceName}`)] : []),
    ...(metadata ? [h('p', { className: 'view-metadata' }, `As of ${metadata['as-of']} • completeness ${metadata.completeness} • freshness ${metadata.freshness}`)] : []),
    ...content,
    ...(contextDetails ? [h('ul', { className: 'view-context' }, contextDetails.map((detail) => h('li', null, detail)))] : [])
  );
}
