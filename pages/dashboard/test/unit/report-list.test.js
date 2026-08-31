// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderReportList } from '../../src/components/report-list.js';
import { h } from '../../src/dom.js';

const reports = [
  {
    'safe-output': 'report-open',
    'outcome-title': 'Open report',
    'outcome-summary': 'The durable report is open.',
    'outcome-category': 'issue',
    'outcome-status': 'open',
    'rollout-mode': 'live',
    'observed-at': '2026-08-31T20:00:00Z'
  },
  {
    'safe-output': 'report-closed',
    'outcome-title': 'Closed report',
    'outcome-summary': 'The durable report was resolved.',
    'outcome-category': 'pull-request',
    'outcome-status': 'closed',
    'rollout-mode': 'review',
    'observed-at': '2026-08-31T19:00:00Z'
  },
  {
    'outcome-title': 'External report',
    'outcome-summary': 'Falls back to the external issue link when no outcome id exists.',
    'outcome-category': 'issue',
    'outcome-status': 'available',
    'rollout-mode': 'review',
    'observed-at': '2026-08-31T18:00:00Z',
    'issue-link': {
      relation: 'issue',
      href: 'https://github.com/githubnext/central-agentic-ops/issues/1',
      label: 'Open issue'
    }
  }
];

/** @returns {import('../../src/components/report-list.js').ReportListOptions} */
function packageOptions() {
  return {
    rowClassName: 'package-report-row',
    showMode: true,
    headingId: 'package-reports-heading',
    headingText: 'Reports',
    filterLabel: 'Filter reports',
    emptyMessage: 'Package report data is unavailable.',
    noMatchMessage: 'No reports match this filter.',
    countOpenStatuses: ['open', 'available', 'published', 'pending', 'unknown'],
    countResolvedStatuses: ['closed', 'merged', 'resolved', 'complete', 'completed'],
    renderContainer: (/** @type {{ search: HTMLElement, summary: HTMLElement, content: HTMLElement }} */ { search, summary, content }) => h(
      'section',
      { className: 'package-report-list', 'aria-labelledby': 'package-reports-heading' },
      h('label', { className: 'package-report-search' }, search),
      h('div', { className: 'package-report-header' }, h('h2', { id: 'package-reports-heading' }, 'Reports'), summary),
      h('div', { className: 'package-report-columns', 'aria-hidden': 'true' },
        h('span', null, 'Report'),
        h('span', null, 'Status'),
        h('span', null, 'Mode'),
        h('span', null, 'Type'),
        h('span', null, 'Updated')
      ),
      content
    ),
    renderContent: (/** @type {HTMLElement[]} */ rows, /** @type {string} */ emptyMessage) => h(
      'div',
      { className: 'package-report-rows' },
      ...(rows.length > 0 ? rows : [h('p', { className: 'empty' }, emptyMessage)])
    )
  };
}

/** @returns {import('../../src/components/report-list.js').ReportListOptions} */
function workflowOptions() {
  return {
    rowClassName: 'workflow-report-row',
    itemTag: /** @type {'tr'} */ ('tr'),
    showMode: true,
    titleClassName: 'workflow-report-title',
    summaryClassName: 'workflow-report-copy',
    headingId: 'workflow-reports-heading',
    headingText: 'Reports',
    filterLabel: 'Filter reports',
    emptyMessage: 'No reports have been attributed to this workflow.',
    noMatchMessage: 'No reports match this filter.',
    countOpenStatuses: ['open', 'available', 'published'],
    countResolvedStatuses: ['closed', 'resolved'],
    renderContainer: (/** @type {{ search: HTMLElement, summary: HTMLElement, content: HTMLElement }} */ { search, summary, content }) => h(
      'section',
      { className: 'workflow-reports', 'aria-labelledby': 'workflow-reports-heading' },
      h('div', { className: 'workflow-reports-search' }, search),
      h('div', { className: 'workflow-reports-header' }, h('h2', { id: 'workflow-reports-heading' }, 'Reports'), summary),
      h('div', { className: 'workflow-report-table-region' }, h('table', { className: 'workflow-report-table' }, content))
    ),
    renderContent: (/** @type {HTMLElement[]} */ rows, /** @type {string} */ emptyMessage) => h(
      'tbody',
      null,
      ...(rows.length > 0 ? rows : [h('tr', null, h('td', { colSpan: 5, className: 'empty' }, emptyMessage))])
    )
  };
}

describe('renderReportList', () => {
  it('DLS-VIEW-005 renders package-style report cards with summary counts and filter matches', () => {
    const rendered = renderReportList(reports, packageOptions());

    expect(rendered.querySelectorAll('.package-report-row')).toHaveLength(3);
    expect(rendered.querySelector('.package-report-header')?.textContent).toContain('2 Open1 Resolved');
    expect(rendered.querySelector('[data-report-id="report-open"] a')?.getAttribute('href')).toBe('#page-outcome-detail?outcome=report-open');
    expect(rendered.querySelector('.package-report-row:last-child .status')?.classList).toContain('status-attention');

    const search = rendered.querySelector('input');
    expect(search).toBeInstanceOf(HTMLInputElement);
    if (search instanceof HTMLInputElement) {
      search.value = 'closed';
      search.dispatchEvent(new Event('input'));
    }
    expect((/** @type {HTMLElement | null} */ (rendered.querySelector('[data-report-id="report-open"]')))?.hidden).toBe(true);
    expect((/** @type {HTMLElement | null} */ (rendered.querySelector('[data-report-id="report-closed"]')))?.hidden).toBe(false);
    expect(rendered.querySelectorAll('.package-report-row')).toHaveLength(3);
    expect(rendered.querySelector('.package-report-header')?.textContent).toContain('0 Open1 Resolved');
  });

  it('renders workflow-style report tables and preserves empty and no-match states', () => {
    const populated = renderReportList(reports, workflowOptions());
    expect(populated.querySelectorAll('.workflow-report-row')).toHaveLength(3);
    expect(populated.querySelector('.workflow-report-copy a')?.getAttribute('href')).toBe('#page-outcome-detail?outcome=report-open');

    const search = populated.querySelector('input');
    if (search instanceof HTMLInputElement) {
      search.value = 'missing';
      search.dispatchEvent(new Event('input'));
    }
    expect(populated.querySelector('.empty')?.textContent).toBe('No reports match this filter.');

    const empty = renderReportList([], workflowOptions());
    expect(empty.querySelector('.empty')?.textContent).toBe('No reports have been attributed to this workflow.');
    expect(empty.querySelector('input')?.hasAttribute('disabled')).toBe(true);
  });
});
