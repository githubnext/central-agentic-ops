/**
 * Report-style workflow dispatch catalog.
 */

import { h } from '../dom.js';
import { renderStatusBadge } from './badge.js';
import { findLink } from './link-content.js';
import { renderLinkedText } from './linked-text.js';
import { renderTableRegion } from './table-region.js';
import { formatUtcDateTime, renderSectionHeading } from './ui-primitives.js';
import { renderViewSectionChrome } from './view-chrome.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderDispatchCatalog(context) {
  const sourceName = context.sourceNames[0];
  const source = context.sources[sourceName];
  const rows = source?.rows ?? [];
  const headingId = `${context.pageId}-dispatch-catalog-heading`;
  const table = renderTableRegion({
    tableClassName: 'dispatch-table',
    regionClassName: 'dispatch-table-region table-region-static',
    emptyMessage: 'No workflow dispatch events were observed in the current run window.',
    colSpan: 7,
    headCells: ['Started', 'Type', 'Package', 'Workflow', 'Run title', 'Runtime repository', 'Status'],
    bodyRows: rows.map(renderDispatchRow),
    filterLabel: 'Search dispatches',
    filterId: 'dispatches',
    filterPlaceholder: 'Run, package, worker, status, or repository',
    filterFields: [{
      key: 'package-name',
      label: 'Package',
      allLabel: 'All packages',
      columnIndex: 2,
      always: true
    }],
    pageSize: Math.max(rows.length, 1),
    resultNoun: 'dispatch',
    resultNounPlural: 'dispatches'
  });

  return h(
    'section',
    { className: 'page-section dispatch-catalog', tabIndex: 0, 'aria-labelledby': headingId },
    renderSectionHeading({
      kicker: 'Actions activity',
      id: headingId,
      title: context.title,
      description: context.description,
      summary: `${rows.length.toLocaleString('en')} ${rows.length === 1 ? 'dispatch' : 'dispatches'}`,
      headingTag: context.headingTag
    }),
    ...(source?.metadata ? renderViewSectionChrome(source.metadata, context.contextDetails) : []),
    table
  );
}

/** @param {Record<string, unknown>} row */
function renderDispatchRow(row) {
  const startedAt = text(row['started-at']);
  const runLink = findLink(row, 'run-link');
  const started = Number.isFinite(Date.parse(startedAt))
    ? h('time', { dateTime: startedAt }, formatUtcDateTime(startedAt))
    : 'Unavailable';
  const startedContent = runLink
    ? h('a', {
        href: runLink.href,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': runLink.label
      }, started)
    : started;

  return h(
    'tr',
    null,
    h('th', { scope: 'row' }, startedContent),
    h('td', null, text(row['dispatch-type'])),
    h('td', null, text(row['package-name'])),
    h('td', null, renderLinkedText(text(row['workflow-name']), findLink(row, 'workflow-link'))),
    h('td', null, text(row['run-title'])),
    h('td', null, renderLinkedText(text(row['runtime-repository']), findLink(row, 'repository-link'))),
    h('td', null, renderStatusBadge(statusLabel(row.status)))
  );
}

/** @param {unknown} value */
function statusLabel(value) {
  const label = text(value);
  const normalized = label.toLowerCase().replaceAll('_', '-');
  if (normalized === 'action-required') return 'Approval required';
  return label.replaceAll('_', ' ').replaceAll('-', ' ');
}

/** @param {unknown} value */
function text(value) {
  return value == null || value === '' ? 'Unknown' : String(value);
}
