/**
 * Reusable presentation-only section and metadata chrome helpers for dashboard pages.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderStatusBadge } from './badge.js';
import { renderSectionHeading } from './ui-primitives.js';
import { titleCase } from './count-formatters.js';

/**
 * @param {string} pageId
 * @param {string} title
 * @param {HTMLElement[]} content
 * @param {'h3'|'h4'} [headingTag]
 * @returns {HTMLElement}
 */
export function renderPageSection(pageId, title, content, headingTag = 'h3') {
  const headingId = `${pageId}-${slugifyText(title)}-heading`;
  return h(
    'section',
    {
      className: 'page-section',
      tabIndex: 0,
      'aria-labelledby': headingId
    },
    h(headingTag, { id: headingId }, title),
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
 * @param {string} pageId
 * @param {string} title
 * @param {string} listClassName
 * @param {Map<string, number>} counts
 * @returns {HTMLElement}
 */
export function renderSummaryRegion(pageId, title, listClassName, counts) {
  return renderTitledRegion(pageId, title, renderSummaryList(listClassName, counts));
}

/**
 * @param {string} listClassName
 * @param {Map<string, number>} counts
 * @returns {HTMLElement}
 */
export function renderSummaryList(listClassName, counts) {
  const entries = [...counts.entries()];
  return h(
    'ul',
    { className: listClassName },
    entries.length > 0
      ? entries.map(([name, count]) => h('li', null, `${name}: ${count}`))
      : [h('li', null, 'No data available.')]
  );
}

/**
 * @param {string[]} details
 * @returns {HTMLElement}
 */
export function renderContextList(details) {
  return h('ul', { className: 'view-context' }, details.map((detail) => h('li', null, detail)));
}

/**
 * @param {string} className
 * @param {Array<Record<string, unknown>>} rows
 * @returns {HTMLElement}
 */
export function renderDefinitionList(className, rows) {
  return h('dl', { className }, ...renderDefinitionListRows(rows));
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {HTMLElement[]}
 */
export function renderDefinitionListRows(rows) {
  return rows.map((row) => h(
    'div',
    null,
    h('dt', null, String(row.label ?? '')),
    h('dd', null, String(row.value ?? ''))
  ));
}

/**
 * @param {string[]} contextDetails
 * @returns {HTMLElement[]}
 */
export function renderContextChrome(contextDetails) {
  return contextDetails.length > 0 ? [renderContextList(contextDetails)] : [];
}

/**
 * @param {{ 'as-of': string, completeness: string, freshness: string }} metadata
 * @returns {HTMLElement[]}
 */
export function renderViewHeader(metadata) {
  return [h(
    'dl',
    { className: 'view-metadata view-metadata-summary', 'aria-label': 'Data status' },
    h(
      'div',
      null,
      h('dt', null, octicon('clock'), 'As of'),
      h('dd', null, h('time', { dateTime: metadata['as-of'] }, metadata['as-of']))
    ),
    h(
      'div',
      null,
      h('dt', null, octicon('checklist'), 'Completeness'),
      h('dd', null, renderStatusBadge(metadata.completeness))
    ),
    h(
      'div',
      null,
      h('dt', null, octicon('pulse'), 'Freshness'),
      h('dd', null, renderStatusBadge(metadata.freshness))
    )
  )];
}

/**
 * @param {string[]} lines
 * @returns {HTMLElement[]}
 */
export function renderViewChrome(lines) {
  return lines.map((line) => h('p', { className: 'view-metadata' }, line));
}

/**
 * @param {{ 'as-of': string, completeness: string, freshness: string }} metadata
 * @param {string[]} contextDetails
 * @returns {HTMLElement[]}
 */
export function renderViewSectionChrome(metadata, contextDetails) {
  return [...renderViewHeader(metadata), ...renderContextChrome(contextDetails)];
}

/**
 * @param {'available'|'empty'|'unavailable'} availability
 * @returns {string}
 */
export function customViewAvailabilityMessage(availability) {
  return availability === 'available'
    ? 'Data available.'
    : availability === 'empty'
      ? 'No observations matched the effective context.'
      : 'This view is unavailable.';
}

/**
 * @param {string | null} sourceName
 * @param {string[]} contextDetails
 * @returns {HTMLElement[]}
 */
export function renderCustomViewStateDetails(sourceName, contextDetails) {
  const details = [];
  if (sourceName) {
    details.push(h('p', { className: 'view-source' }, `Affected source: ${sourceName}`));
  }
  details.push(...renderContextChrome(contextDetails));
  return details;
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
 * @param {string} title
 * @param {Node} content
 * @param {'h2'|'h3'|'h4'} [headingTag]
 * @returns {HTMLElement}
 */
export function renderMetadataSection(title, content, headingTag = 'h2') {
  return h('section', null, h(headingTag, null, title), content);
}

/**
 * @param {string} headingId
 * @param {string} heading
 * @param {Node[]} body
 * @param {{
 *   sectionClassName?: string,
 *   headingTag?: 'h2'|'h3'|'h4',
 *   bodyClassName?: string,
 *   bodyAttributes?: Record<string, unknown>
 * }} [options]
 * @returns {HTMLElement}
 */
export function renderTitledBodySection(headingId, heading, body, options = {}) {
  const {
    sectionClassName,
    headingTag = 'h3',
    bodyClassName,
    bodyAttributes = {}
  } = options;
  const bodyProps = bodyClassName ? { ...bodyAttributes, className: bodyClassName } : bodyAttributes;
  const headingProps = headingId ? { id: headingId } : null;
  return h(
    'section',
    sectionClassName ? { className: sectionClassName } : null,
    h(headingTag, headingProps, heading),
    h('div', bodyProps, ...body)
  );
}

/**
 * @param {string} pageId
 * @param {{ id: string, title?: string, description?: string, layout: 'full'|'wide'|'narrow', views: string[], ['count-source']?: string, ['count-label']?: string }} section
 * @param {number | null} count
 * @returns {HTMLElement}
 */
export function renderLayoutSectionChrome(pageId, section, count) {
  const title = section.title ?? titleCase(section.id);
  const headingId = `${pageId}-${section.id}-layout-heading`;
  const sectionHeading = renderSectionHeading({
    kicker: titleCase(section.id),
    id: headingId,
    title,
    description: section.description
  });
  return h(
    'header',
    { className: 'layout-section-header' },
    sectionHeading,
    count !== null && section['count-label']
      ? h('strong', null, `${count.toLocaleString('en')} ${section['count-label']}`)
      : null
  );
}

/**
 * @param {string} value
 * @returns {string}
 */
function slugifyText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}

