/**
 * Presentation-only reusable UI primitives shared across dashboard components.
 */

import { h } from '../dom.js';

/**
 * @typedef {{
 *   kicker: string,
 *   id: string,
 *   title: string,
 *   description?: string,
 *   summary?: string,
 *   headingTag?: 'h2'|'h3'|'h4'
 * }} SectionHeadingOptions
 */

/**
 * @param {SectionHeadingOptions} options
 * @returns {HTMLElement}
 */
export function renderSectionHeading({
  kicker,
  id,
  title,
  description,
  summary,
  headingTag = 'h3'
}) {
  return h(
    'div',
    { className: 'section-heading' },
    h(
      'div',
      null,
      h('span', { className: 'scope-kicker' }, kicker),
      h(headingTag, { id }, title),
      description ? h('p', null, description) : null
    ),
    summary ? h('strong', null, summary) : null
  );
}

/**
 * @param {Node | string | null} icon
 * @param {string} title
 * @param {string} detail
 * @returns {HTMLElement}
 */
export function renderInlineNotice(icon, title, detail) {
  return h(
    'div',
    { className: 'inline-notice', role: 'note' },
    h('span', null, icon, h('strong', null, title)),
    h('p', null, detail)
  );
}

/**
 * @param {string} label
 * @param {unknown} value
 * @param {string} [detail]
 * @returns {HTMLElement}
 */
export function renderVitalStat(label, value, detail) {
  return h('div', null, h('dt', null, label), h('dd', null, String(value)), detail ? h('p', null, detail) : null);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatUtcDateTime(value) {
  const parsed = Date.parse(value == null ? '' : String(value));
  if (!Number.isFinite(parsed)) return 'Time unavailable';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date(parsed));
}
