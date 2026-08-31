/**
 * Registry for JSON-selected dashboard UI elements.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { formatNumber } from '../view-formatters.js';
import { renderModeBadge } from './badge.js';
import { renderDispatchCatalog } from './dispatch-catalog.js';
import { renderPackagesView } from './packages-view.js';
import { renderRepositoryWorkflows } from './repository-workflows.js';
import { renderWorkflowTopology } from './workflow-topology.js';

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
 *   headingTag: 'h3'|'h4'
 * }} ElementRenderContext
 */

/** @type {Map<string, (context: ElementRenderContext) => HTMLElement | null>} */
const ELEMENT_RENDERERS = new Map([
  ['status-summary', renderStatusSummaryElement],
  ['meter-list', renderMeterListElement],
  ['attention-list', renderAttentionListElement],
  ['record-cards', renderRecordCardsElement],
  ['package-activity', ({ sources, pageId }) => renderPackagesView(sources, pageId)],
  ['dispatch-catalog', renderDispatchCatalog],
  ['repository-workflows', renderRepositoryWorkflows],
  ['workflow-topology', ({ pageId, title, sourceNames, sources, contextDetails, headingTag }) => {
    const sourceName = sourceNames[0];
    const source = sources[sourceName];
    if (!source) return null;
    return renderWorkflowTopology(pageId, title, sourceName, source.rows, source.metadata, contextDetails, headingTag);
  }]
]);

const EMPTY_AWARE_ELEMENTS = new Set(['status-summary', 'meter-list', 'attention-list', 'record-cards', 'dispatch-catalog', 'repository-workflows']);

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
function renderStatusSummaryElement(context) {
  const status = firstRow(context, 'overview-status');
  const vitals = rowsFor(context, 'overview-vitals');
  const segments = rowsFor(context, 'overview-execution-health');
  if (!status) return null;
  const headingId = `${context.pageId}-${slugify(context.title)}-heading`;
  return h(
    'section',
    {
      className: `control-plane-status ${stringValue(status['status-class'])}`,
      'aria-labelledby': headingId
    },
    h(
      'header',
      null,
      h(
        'div',
        { className: 'control-plane-heading' },
        h('span', { className: 'control-plane-state-icon' }, octicon(stringValue(status['status-icon']) || 'issue')),
        h(
          'div',
          null,
          h('span', { className: 'scope-kicker' }, `Control plane · ${stringValue(status.scope)}`),
          h('h3', { id: headingId }, stringValue(status['status-label']) || context.title),
          h('p', null, stringValue(status['status-copy']))
        )
      )
    ),
    h(
      'dl',
      { className: 'control-plane-vitals' },
      ...vitals.map((row) => renderVital(stringValue(row.label), stringValue(row.value), stringValue(row.detail), stringValue(row.className)))
    ),
    renderExecutionHealth(segments, stringValue(status['coverage-label']))
  );
}

/**
 * @param {ElementRenderContext} context
 */
function renderMeterListElement(context) {
  const rows = rowsFor(context, 'overview-package-utilization');
  const headingId = `${context.pageId}-${slugify(context.title)}-heading`;
  return h(
    'section',
    { className: 'package-aic-utilization', 'aria-labelledby': headingId },
    h(
      'header',
      null,
      h('span', { className: 'scope-kicker' }, 'Control plane'),
      h('h3', { id: headingId }, context.title),
      context.description ? h('p', null, context.description) : null
    ),
    h(
      'div',
      { className: 'utilization-grid' },
      ...(rows.length > 0
        ? rows.map(renderMeterItem)
        : [h('p', { className: 'empty' }, 'No packages with a configured AIC allowance were observed.')])
    )
  );
}

/**
 * @param {ElementRenderContext} context
 */
function renderAttentionListElement(context) {
  const rows = rowsFor(context, 'overview-attention');
  const headingId = `${context.pageId}-${slugify(context.title)}-heading`;
  return h(
    'section',
    { className: 'attention-panel', 'aria-labelledby': headingId },
    h(
      'header',
      null,
      h('div', null, h('span', { className: 'scope-kicker' }, 'Act now'), h('h3', { id: headingId }, context.title)),
      h('span', { className: 'attention-count', 'aria-label': `${rows.length} attention items` }, String(rows.length))
    ),
    h(
      'ul',
      { className: 'attention-list' },
      ...(rows.length > 0
        ? rows.map((row) => h(
          'li',
          { className: `attention-item attention-${stringValue(row.tone)}` },
          h('span', { className: 'attention-icon' }, octicon(stringValue(row.icon) || 'issue')),
          h('div', null, h('strong', null, stringValue(row.title)), h('p', null, stringValue(row.detail)))
        ))
        : [h(
          'li',
          { className: 'attention-item attention-success' },
          h('span', { className: 'attention-icon' }, octicon('check-circle')),
          h('div', null, h('strong', null, 'No immediate action required'), h('p', null, 'No failures, approval gates, disabled workflows, or coverage gaps were observed.'))
        )])
    )
  );
}

/**
 * @param {ElementRenderContext} context
 */
function renderRecordCardsElement(context) {
  const rows = rowsFor(context, 'overview-managed-packages');
  const headingId = `${context.pageId}-${slugify(context.title)}-heading`;
  return h(
    'section',
    { className: 'managed-packages', 'aria-labelledby': headingId },
    h(
      'header',
      null,
      h('span', { className: 'scope-kicker' }, 'Control plane'),
      h('h3', { id: headingId }, context.title)
    ),
    h(
      'div',
      { className: 'managed-package-list' },
      ...(rows.length > 0
        ? rows.map((row) => h(
          'article',
          { className: 'managed-package-card', dataset: { packageId: stringValue(row.package) } },
          h(
            'header',
            null,
            h('div', null, h('span', { className: 'managed-package-icon' }, octicon('package')), h('h4', null, stringValue(row.title))),
            renderModeBadge(row.mode)
          ),
          h(
            'dl',
            null,
            renderPackageDetail('Workers', row.workers),
            renderPackageDetail('AIC allowance', formatOptionalNumber(row['aic-allowance'])),
            renderPackageDetail('Inventory', row.inventory, stringValue(row['inventory-state']))
          )
        ))
        : [h('p', { className: 'empty' }, 'No managed packages observed.')])
    )
  );
}

/**
 * @param {Record<string, unknown>} row
 */
function renderMeterItem(row) {
  const percent = Number(row['meter-percent']);
  const meterPercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  return h(
    'article',
    { className: `utilization-item utilization-${stringValue(row.status)}`, dataset: { packageId: stringValue(row.package) } },
    h('header', null, h('span', null, stringValue(row.title)), h('strong', null, stringValue(row.value))),
    h(
      'div',
      { className: 'utilization-track', role: 'img', 'aria-label': stringValue(row['aria-label']) },
      h('span', { style: `width: ${meterPercent.toFixed(2).replace(/\.00$/, '')}%;` })
    ),
    h('p', null, stringValue(row.detail))
  );
}

/**
 * @param {string} label
 * @param {unknown} value
 * @param {string} detail
 * @param {string} className
 */
function renderVital(label, value, detail, className = '') {
  return h('div', { className }, h('dt', null, label), h('dd', null, String(value)), h('p', null, detail));
}

/**
 * @param {Array<Record<string, unknown>>} segments
 * @param {string} coverage
 */
function renderExecutionHealth(segments, coverage) {
  const total = Number(segments[0]?.total ?? 0);
  const ariaLabel = segments.map((row) => `${row.value} ${row.label}`).join(', ');
  return h(
    'div',
    { className: 'execution-health' },
    h(
      'div',
      { className: 'execution-health-heading' },
      h('strong', null, '24-hour execution health'),
      h('span', null, coverage, ' · ', h('a', { href: '#page-runs', dataset: { navPageId: 'runs' } }, 'View all runs'))
    ),
    h(
      'div',
      { className: 'execution-track', role: 'img', 'aria-label': ariaLabel },
      ...segments.map((row) => h('span', {
        className: stringValue(row.className),
        style: `width: ${total > 0 ? (Number(row.value) / total * 100).toFixed(3) : '0'}%`
      }))
    ),
    h(
      'ul',
      { className: 'execution-legend' },
      ...segments.map((row) => h(
        'li',
        null,
        h('span', { className: stringValue(row.className).replace('execution-', 'legend-') }),
        titleCase(stringValue(row.label)),
        h('strong', null, String(row.value))
      ))
    )
  );
}

/**
 * @param {ElementRenderContext} context
 * @param {string} sourceName
 */
function rowsFor(context, sourceName) {
  return Array.isArray(context.sources[sourceName]?.rows) ? context.sources[sourceName].rows : [];
}

/**
 * @param {ElementRenderContext} context
 * @param {string} sourceName
 */
function firstRow(context, sourceName) {
  return rowsFor(context, sourceName)[0] ?? null;
}

/**
 * @param {string} label
 * @param {unknown} value
 * @param {string} [className]
 */
function renderPackageDetail(label, value, className = '') {
  return h('div', null, h('dt', null, label), h('dd', { className }, String(value)));
}

/**
 * @param {unknown} value
 */
function stringValue(value) {
  return value == null ? '' : String(value);
}

/**
 * @param {unknown} value
 */
function formatOptionalNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? formatNumber(value) : '—';
}

/**
 * @param {string} value
 */
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'element';
}

/**
 * @param {string} value
 */
function titleCase(value) {
  return value
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
