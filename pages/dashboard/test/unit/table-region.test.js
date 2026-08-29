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
});
