// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderTableRegion } from '../../src/components/table-region.js';
import { h } from '../../src/dom.js';

describe('renderTableRegion', () => {
  it('renders headers and provided body rows', () => {
    const rendered = renderTableRegion({
      tableClassName: 'runs-table',
      emptyMessage: 'No runs available.',
      colSpan: 2,
      headCells: ['Run', 'Status'],
      bodyRows: [
        h('tr', null, h('td', null, '1001'), h('td', null, 'completed'))
      ]
    });

    expect(rendered.querySelectorAll('thead th')).toHaveLength(2);
    expect(rendered.querySelector('thead')?.textContent).toContain('Run');
    expect(rendered.querySelector('tbody')?.textContent).toContain('1001');
    expect(rendered.className).toBe('table-region');
  });

  it('adds reusable data summaries to the table header', () => {
    const rendered = renderTableRegion({
      tableClassName: 'custom-table',
      emptyMessage: 'No rows available.',
      colSpan: 2,
      headCells: ['Status', 'Score'],
      summaryColumns: [
        { label: 'Status', type: 'nominal', values: ['open', 'open', 'closed'] },
        { label: 'Score', type: 'quantitative', values: [1, 2, 3] }
      ],
      bodyRows: [
        h('tr', null, h('td', null, 'open'), h('td', null, '1'))
      ]
    });

    expect(rendered.querySelectorAll('thead tr')).toHaveLength(2);
    expect(rendered.querySelector('.table-summary-categories')?.textContent).toContain('open66.7%');
    expect(rendered.querySelector('.table-summary-histogram')).not.toBeNull();
  });

  it('renders the empty row when no body rows are provided', () => {
    const rendered = renderTableRegion({
      tableClassName: 'findings-table',
      emptyMessage: 'No findings available.',
      colSpan: 3,
      headCells: ['Summary', 'Severity', 'Status'],
      bodyRows: []
    });

    const emptyCell = rendered.querySelector('tbody td');
    expect(emptyCell?.getAttribute('colspan')).toBe('3');
    expect(emptyCell?.textContent).toBe('No findings available.');
  });

  it('preserves custom view data attributes for table and chart variants', () => {
    const table = renderTableRegion({
      tableClassName: 'custom-table',
      emptyMessage: 'No rows available.',
      colSpan: 1,
      headCells: ['Column'],
      bodyRows: []
    });
    const chart = renderTableRegion({
      tableClassName: 'custom-chart-table',
      emptyMessage: 'No points available.',
      colSpan: 2,
      headCells: ['X', 'Y'],
      bodyRows: []
    });

    expect(table.querySelector('table')?.getAttribute('data-custom-view-mark')).toBe('table');
    expect(chart.querySelector('table')?.getAttribute('data-custom-view-mark')).toBe('chart');
  });

  it('accepts keyed-list descriptors as populated body rows', async () => {
    const { keyed } = await import('../../src/dom.js');
    const rendered = renderTableRegion({
      tableClassName: 'evals-definitions-table',
      emptyMessage: 'No eval definitions available.',
      colSpan: 2,
      headCells: ['Eval', 'Results'],
      bodyRows: keyed(
        [{ key: 'release-risk' }],
        /** @param {unknown} item */
        (item) => {
          const keyedItem = /** @type {{ key: string }} */ (item);
          return h('tr', { 'data-key': keyedItem.key }, h('td', null, keyedItem.key), h('td', null, 'YES: 1'));
        },
        /** @param {unknown} item */
        (item) => /** @type {{ key: string }} */ (item).key
      )
    });

    expect(rendered.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(rendered.querySelector('tbody')?.textContent).toContain('release-risk');
    expect(rendered.querySelector('tbody')?.textContent).not.toContain('No eval definitions available.');
  });

  it('filters rows and announces the visible result count', () => {
    const rendered = renderTableRegion({
      tableClassName: 'custom-table',
      emptyMessage: 'No runs available.',
      colSpan: 2,
      headCells: ['Repository', 'Status'],
      filterLabel: 'Filter recent runs',
      bodyRows: [
        h('tr', null, h('td', null, 'alpha'), h('td', null, 'success')),
        h('tr', null, h('td', null, 'bravo'), h('td', null, 'failure'))
      ]
    });

    const input = /** @type {HTMLInputElement} */ (rendered.querySelector('[data-table-filter]'));
    const rows = [...rendered.querySelectorAll('tbody tr')];
    expect(rendered.querySelector('.table-filter-result')?.textContent).toBe('Showing 2 of 2 results');

    input.value = 'failure';
    input.dispatchEvent(new Event('input'));

    expect(rows.map((row) => row.hasAttribute('hidden'))).toEqual([true, false]);
    expect(rendered.querySelector('.table-filter-result')?.textContent).toBe('Showing 1 of 1 result');
  });

  it('ports report-style facets, URL state, and progressive disclosure generically', () => {
    const rows = Array.from({ length: 30 }, (_, index) => h(
      'tr',
      null,
      h('td', null, `workflow-${index + 1}`),
      h('td', null, index % 2 === 0 ? 'review' : 'live')
    ));
    const rendered = renderTableRegion({
      tableClassName: 'custom-table',
      emptyMessage: 'No workflows.',
      colSpan: 2,
      headCells: ['Workflow', 'Mode'],
      bodyRows: rows,
      filterLabel: 'Filter workflows',
      filterId: 'workflow-catalog',
      filterFields: [{ key: 'mode', label: 'Mode', columnIndex: 1 }]
    });
    document.body.append(rendered);

    const mode = /** @type {HTMLSelectElement} */ (rendered.querySelector('[data-table-facet="mode"]'));
    const more = /** @type {HTMLButtonElement} */ (rendered.querySelector('[data-table-more]'));
    expect([...mode.options].map((option) => option.value)).toEqual(['', 'live', 'review']);
    expect(rows.filter((row) => !row.hidden)).toHaveLength(25);
    expect(rendered.querySelector('.table-filter-result')?.textContent).toBe('Showing 25 of 30 results');
    expect(more.hidden).toBe(false);

    more.click();
    expect(rows.filter((row) => !row.hidden)).toHaveLength(30);
    expect(more.hidden).toBe(true);

    mode.value = 'review';
    mode.dispatchEvent(new Event('input'));
    expect(rows.filter((row) => !row.hidden)).toHaveLength(15);
    expect(rendered.querySelector('.table-filter-result')?.textContent).toBe('Showing 15 of 15 results');
    expect(window.location.search).toContain('workflow-catalog.mode=review');

    window.history.replaceState(null, '', '/');
  });
});
