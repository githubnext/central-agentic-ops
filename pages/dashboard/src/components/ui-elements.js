/**
 * Registry for JSON-selected dashboard UI elements.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { findLink } from './link-content.js';
import { renderPackagesView } from './packages-view.js';
import { renderPackageNavigation } from './package-detail.js';
import { renderWorkflowDetail } from './workflow-detail.js';
import { renderOutcomeDetail } from './outcome-detail.js';
import { renderSectionHeading } from './ui-primitives.js';
import { renderDefinitionList } from './view-chrome.js';
import { renderWorkflowRuntime } from './workflow-runtime.js';

/**
 * @typedef {{
 *   pageId: string,
 *   title: string,
 *   description?: string,
 *   sourceNames: string[],
 *   sources: Record<string, import('../presenter.js').LogicalSourceInput>,
 *   contextDetails: string[],
 *   scope?: Record<string, unknown>,
 *   routeParameter?: string,
 *   titleLink?: Record<string, unknown>,
 *   headingTag: 'h3'|'h4'
 * }} ElementRenderContext
 */

/** @type {Map<string, (context: ElementRenderContext) => HTMLElement | null>} */
const ELEMENT_RENDERERS = new Map([
  ['domain-attention', renderDomainAttentionElement],
  ['summary-grid', renderSummaryGridElement],
  ['context-summary', renderContextSummaryElement],
  ['signal-list', renderSignalListElement],
  ['package-activity', ({ sources, pageId }) => renderPackagesView(sources, pageId)],
  ['package-detail', (context) => renderPackageNavigation(context, 'workflows')],
  ['package-reports', (context) => renderPackageNavigation(context, 'reports')],
  ['workflow-detail', renderWorkflowDetail],
  ['workflow-runtime', renderWorkflowRuntime],
  ['outcome-detail', renderOutcomeDetail]
]);

const EMPTY_AWARE_ELEMENTS = new Set(['summary-grid', 'context-summary', 'signal-list', 'package-detail', 'package-reports', 'workflow-detail', 'workflow-runtime', 'outcome-detail']);

/**
 * @param {string} name
 * @param {ElementRenderContext} context
 * @returns {HTMLElement | null}
 */
export function renderUiElement(name, context) {
  return ELEMENT_RENDERERS.get(name)?.(context) ?? null;
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function elementHandlesEmptyRows(name) {
  return EMPTY_AWARE_ELEMENTS.has(name);
}

/**
 * @param {ElementRenderContext} context
 */
function renderDomainAttentionElement(context) {
  const rows = rowsFor(context, 'overview-attention-domains');
  const headingId = `${context.pageId}-${slugify(context.title)}-heading`;
  return h(
    'section',
    { className: 'overview-observability', 'aria-labelledby': headingId },
    renderSectionHeading({
      kicker: 'Current decision window',
      id: headingId,
      title: context.title,
      description: context.description,
      headingTag: 'h2'
    }),
    h(
      'div',
      { className: 'attention-domain-grid' },
      ...rows.map((row) => h(
        'a',
        {
          className: `attention-domain-card attention-domain-${stringValue(row.tone)}`,
          href: stringValue(row.href)
        },
        h(
          'header',
          null,
          h('span', { className: 'attention-domain-icon' }, octicon(stringValue(row.icon))),
          h('strong', null, stringValue(row.domain)),
          h('span', { className: 'attention-domain-state' }, stringValue(row.state))
        ),
        h('span', { className: 'attention-domain-value' }, stringValue(row.value)),
        h('p', null, stringValue(row.detail)),
        h('footer', null, 'Open evidence')
      ))
    ),
    h(
      'p',
      { className: 'overview-method-note' },
      h('strong', null, 'State key:'),
      ' Act now is a direct failure; Investigate is a direct control, collection, or attribution signal; Monitor has observations without a direct signal; Unavailable means a required threshold or evidence feed is absent.'
    )
  );
}

/** @param {ElementRenderContext} context */
function renderSummaryGridElement(context) {
  const rows = rowsFor(context, context.sourceNames[0]).map((row) => ({
    label: stringValue(row.label),
    value: stringValue(row.value)
  }));
  return renderDefinitionList('summary-grid', rows);
}

/**
 * @param {ElementRenderContext} context
 */
function renderContextSummaryElement(context) {
  const rows = context.sourceNames
    .flatMap((sourceName) => rowsFor(context, sourceName))
    .filter(isContextSummaryRow);
  return h(
    'dl',
    { className: 'context-summary', 'aria-label': context.title },
    ...rows.map((row) => h(
      'div',
      null,
      h('dt', null, stringValue(row.label)),
      h('dd', null, ...renderContextSummaryValue(row))
    ))
  );
}

/** @param {Record<string, unknown>} row */
function isContextSummaryRow(row) {
  return typeof row.label === 'string'
    && (['string', 'number', 'boolean'].includes(typeof row.value) || Array.isArray(row.items));
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Array<string | HTMLElement | null>}
 */
function renderContextSummaryValue(row) {
  if (!Array.isArray(row.items)) return [stringValue(row.value)];
  return row.items.filter(isPlainObject).flatMap((item, index) => {
    const label = stringValue(item.label);
    const href = safeNavigationHref(item['navigation-href']);
    return [
      index > 0 ? ', ' : null,
      href ? h('a', { href }, label) : label
    ];
  });
}

/** @param {ElementRenderContext} context */
function renderSignalListElement(context) {
  const rows = rowsFor(context, context.sourceNames[0]);
  return h(
    'div',
    { className: 'signal-list-region' },
    context.description ? h('p', { className: 'signal-boundary-note' }, context.description) : null,
    h(
      'ol',
      { className: 'signal-list' },
      ...(rows.length > 0
        ? rows.map((row, index) => renderSignal(row, index))
        : [h(
          'li',
          { className: 'signal-clear' },
          h('span', { className: 'signal-icon' }, octicon('check-circle')),
          h('span', { className: 'signal-copy' }, h('strong', null, 'No signals require attention'))
        )])
    )
  );
}

/**
 * @param {Record<string, unknown>} row
 * @param {number} index
 */
function renderSignal(row, index) {
  const link = findLink(row, 'run-link') ?? findLink(row, 'external-link');
  const navigationHref = safeNavigationHref(row['navigation-href']);
  const navigationPage = stringValue(row['navigation-page']);
  const content = [
    h('span', { className: 'signal-rank', 'aria-hidden': 'true' }, String(index + 1)),
    h('span', { className: 'signal-icon' }, octicon(stringValue(row.icon) || 'issue')),
    h(
      'span',
      { className: 'signal-copy' },
      h('span', null, stringValue(row.kind)),
      h('strong', null, stringValue(row.title)),
      h('small', null, stringValue(row.detail))
    ),
    h(
      'span',
      { className: 'signal-evidence' },
      h('strong', null, stringValue(row.evidence)),
      h('small', null, stringValue(row.action) || 'View details')
    )
  ];
  const className = `signal-item signal-${stringValue(row.tone) || 'informational'}`;
  if (link) {
    return h('li', { className }, h('a', { href: link.href, 'aria-label': link.label }, ...content));
  }
  if (navigationPage) {
    return h('li', { className }, h('a', { href: `#page-${navigationPage}`, dataset: { navPageId: navigationPage } }, ...content));
  }
  if (navigationHref) {
    return h('li', { className }, h('a', { href: navigationHref }, ...content));
  }
  return h('li', { className }, h('div', null, ...content));
}

/** @param {unknown} value */
function safeNavigationHref(value) {
  if (typeof value !== 'string' || !value.startsWith('#')) return null;
  try {
    const url = new URL(value, 'https://dashboard.invalid/');
    return url.origin === 'https://dashboard.invalid' && url.hash === value ? value : null;
  } catch {
    return null;
  }
}

/**
 * @param {ElementRenderContext} context
 * @param {string} sourceName
 */
function rowsFor(context, sourceName) {
  return Array.isArray(context.sources[sourceName]?.rows) ? context.sources[sourceName].rows : [];
}

/**
 * @param {unknown} value
 */
function stringValue(value) {
  return value == null ? '' : String(value);
}

/**
 * @param {string} value
 */
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'element';
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
