/**
 * Reusable durable-report list and table renderers for package and workflow views.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderModeBadge, renderStatusBadge } from './badge.js';
import { findLink } from './link-content.js';
import { formatUtcDateTime } from './ui-primitives.js';

/**
 * @typedef {{
 *   rowClassName: string,
 *   showMode: boolean,
 *   itemTag?: 'article'|'tr',
 *   titleClassName?: string,
 *   summaryClassName?: string,
 *   emptyClassName?: string,
 *   headingId: string,
 *   headingText: string,
 *   filterLabel: string,
 *   emptyMessage: string,
 *   noMatchMessage: string,
 *   countOpenStatuses: string[],
 *   countResolvedStatuses: string[],
 *   getItemTimestampLabel?: (report: Record<string, unknown>) => string,
 *   renderContainer: (parts: {
 *     search: HTMLElement,
 *     summary: HTMLElement,
 *     content: HTMLElement,
 *     rows: number
 *   }) => HTMLElement,
 *   renderContent: (rows: HTMLElement[], emptyMessage: string) => HTMLElement
 * }} ReportListOptions
 */

/**
 * @param {Array<Record<string, unknown>>} reports
 * @param {ReportListOptions} options
 * @returns {HTMLElement}
 */
export function renderReportList(reports, options) {
  const summary = h('div', { 'aria-live': 'polite', 'aria-atomic': 'true' });
  const content = options.renderContent([], options.emptyMessage);
  const search = /** @type {HTMLInputElement} */ (h('input', {
    type: 'search',
    placeholder: options.filterLabel,
    'aria-label': options.filterLabel,
    disabled: reports.length === 0
  }));
  const section = options.renderContainer({
    search,
    summary,
    content,
    rows: reports.length
  });

  /** @param {string} query */
  function applyFilter(query) {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? reports.filter((report) => searchableReportText(report).includes(normalized))
      : reports;
    summary.replaceChildren(...renderSummaryChildren(filtered, options));
    const filteredRows = filtered.map((report) => renderReportItem(report, options));
    const rows = reports.length > 0 && filtered.length < reports.length && options.itemTag !== 'tr'
      ? reports.map((report) => {
        const row = renderReportItem(report, options);
        row.hidden = !filtered.includes(report);
        return row;
      })
      : filteredRows;
    content.replaceChildren(...options.renderContent(
      rows,
      reports.length > 0 ? options.noMatchMessage : options.emptyMessage
    ).childNodes);
  }

  search.addEventListener('input', () => {
    applyFilter(search.value);
  });

  applyFilter('');
  return section;
}

/**
 * @param {Array<Record<string, unknown>>} reports
 * @param {ReportListOptions} options
 * @returns {Array<HTMLElement|string>}
 */
function renderSummaryChildren(reports, options) {
  const statuses = reports.map((report) => reportStatus(report).toLowerCase());
  const open = statuses.filter((status) => options.countOpenStatuses.includes(status)).length;
  const resolved = statuses.filter((status) => options.countResolvedStatuses.includes(status)).length;
  const other = reports.length - open - resolved;
  const children = [
    h('span', { className: 'workflow-filter-announcement' }, `${reports.length} report${reports.length === 1 ? '' : 's'} shown. `),
    h('strong', null, String(open)),
    ' Open',
    h('span', null, h('strong', null, String(resolved)), ' Resolved')
  ];
  if (other > 0) children.push(h('span', null, h('strong', null, String(other)), ' Other'));
  return children;
}

/**
 * @param {Record<string, unknown>} report
 * @param {ReportListOptions} options
 * @returns {HTMLElement}
 */
function renderReportItem(report, options) {
  const outcomeId = text(report['safe-output']);
  const title = text(report['outcome-title']) || outcomeId || 'Untitled report';
  const summary = text(report['outcome-summary']) || 'No report summary was provided.';
  const kind = titleCase(text(report['outcome-category']) || 'unknown');
  const status = titleCase(reportStatus(report));
  const mode = titleCase(text(report['rollout-mode']) || 'unknown');
  const updatedAt = text(report['observed-at']) || text(report['published-at']);
  const titleLink = outcomeId
    ? h('a', { href: `#page-outcome-detail?outcome=${encodeURIComponent(outcomeId)}`, title }, title)
    : reportSourceLink(report, title);
  const statusBadge = renderStatusBadge(status);
  if (status.toLowerCase() === 'available') {
    statusBadge.classList.remove('status-success');
    statusBadge.classList.add('status-attention');
  }
  statusBadge.setAttribute('aria-label', `Status: ${status}`);
  const modeBadge = renderModeBadge(mode);
  modeBadge.setAttribute('aria-label', `Mode: ${mode}`);
  const timeLabel = options.getItemTimestampLabel?.(report) ?? `Updated: ${formatUtcDateTime(updatedAt)}`;

  if (options.itemTag === 'tr') {
    return h(
      'tr',
      { className: options.rowClassName },
      h(
        'th',
        { scope: 'row' },
        h(
          'div',
          { className: 'workflow-report-primary' },
          h(
            'span',
            { className: 'workflow-report-icon', 'aria-hidden': 'true' },
            octicon(kind === 'Noop' ? 'check-circle' : 'issue')
          ),
          h(
            'span',
            { className: options.summaryClassName ?? 'workflow-report-copy' },
            h('span', { className: options.titleClassName ?? 'workflow-report-title' }, titleLink),
            h('span', { className: 'workflow-report-summary', title: summary }, summary)
          )
        )
      ),
      h('td', null, statusBadge),
      options.showMode ? h('td', null, modeBadge) : null,
      h('td', null, h('span', { className: 'kind' }, kind)),
      updatedAt
        ? h('td', null, h('time', { dateTime: updatedAt, 'aria-label': timeLabel }, formatUtcDateTime(updatedAt)))
        : h('td', { className: 'workflow-report-time' }, 'Unknown')
    );
  }

  return h(
    'article',
    { className: options.rowClassName, dataset: { reportId: outcomeId } },
    h('div', { className: 'package-report-icon', 'aria-hidden': 'true' }, octicon(kind === 'Noop' ? 'check-circle' : 'issue')),
    h(
      'div',
      { className: options.summaryClassName ?? 'package-report-copy' },
      h('h3', null, titleLink),
      h('p', { title: summary }, summary)
    ),
    statusBadge,
    options.showMode ? modeBadge : null,
    h('span', { className: 'kind', 'aria-label': `Type: ${kind}` }, kind),
    h('time', { dateTime: updatedAt, 'aria-label': timeLabel }, formatUtcDateTime(updatedAt))
  );
}

/** @param {Record<string, unknown>} report */
function reportStatus(report) {
  return text(report['outcome-status']) || text(report['outcome-state']) || 'unknown';
}

/** @param {Record<string, unknown>} report @param {string} title */
function reportSourceLink(report, title) {
  const sourceLink = findLink(report, 'external-link')
    ?? findLink(report, 'issue-link')
    ?? findLink(report, 'pull-request-link');
  return sourceLink
    ? h('a', { href: sourceLink.href, title, target: '_blank', rel: 'noopener noreferrer' }, title)
    : h('span', { title }, title);
}

/** @param {Record<string, unknown>} report */
function searchableReportText(report) {
  return [
    report['outcome-title'],
    report['outcome-summary'],
    report['outcome-category'],
    report['outcome-status'],
    report['outcome-state'],
    report['rollout-mode']
  ].map(text).join(' ').toLowerCase();
}

/** @param {unknown} value */
function text(value) {
  return value == null ? '' : String(value);
}

/** @param {string} value */
function titleCase(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
