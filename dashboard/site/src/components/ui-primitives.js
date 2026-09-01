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
 * @param {string} label
 * @param {unknown} value
 * @param {string} [detail]
 * @returns {HTMLElement}
 */
export function renderVitalStat(label, value, detail) {
  return h('div', null, h('dt', null, label), h('dd', null, String(value)), detail ? h('p', null, detail) : null);
}

/**
 * Computes the whole-hour span between a metadata object's `coverage-start`
 * and `coverage-end` fields, or `null` when either bound is missing, invalid,
 * or non-increasing.
 * @param {{ 'coverage-start'?: unknown, 'coverage-end'?: unknown } | undefined} metadata
 * @returns {number | null}
 */
export function coverageWindowHours(metadata) {
  const start = Date.parse(String(metadata?.['coverage-start'] ?? ''));
  const end = Date.parse(String(metadata?.['coverage-end'] ?? ''));
  return Number.isFinite(start) && Number.isFinite(end) && end > start
    ? Math.round((end - start) / 3_600_000)
    : null;
}

/**
 * Formats a `Date` or millisecond timestamp as a medium-date, short-time,
 * UTC string (e.g. `Aug 30, 2026, 10:00 AM`). Callers are responsible for
 * validating their input; invalid input renders `Invalid Date`.
 * @param {Date | number} input
 * @returns {string}
 */
export function formatMediumUtcDateTime(input) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(input instanceof Date ? input : new Date(input));
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatUtcDateTime(value) {
  const parsed = Date.parse(value == null ? '' : String(value));
  if (!Number.isFinite(parsed)) return 'Time unavailable';
  return formatMediumUtcDateTime(parsed);
}
