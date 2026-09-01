// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderTableSummaryRow } from '../../src/components/table-summary.js';

describe('renderTableSummaryRow', () => {
  it('summarizes categorical values by frequency and percentage', () => {
    const rendered = renderTableSummaryRow([{
      label: 'Status',
      type: 'nominal',
      values: ['open', 'closed', 'open', 'open']
    }]);

    expect(rendered.querySelectorAll('li')).toHaveLength(2);
    expect(rendered.textContent).toContain('open75%');
    expect(rendered.textContent).toContain('closed25%');
  });

  it('summarizes quantitative values and includes a histogram', () => {
    const rendered = renderTableSummaryRow([{
      label: 'Score',
      type: 'quantitative',
      values: [1, 2, 3]
    }]);

    expect(rendered.textContent).toContain('Mean2');
    expect(rendered.textContent).toContain('Median2');
    expect(rendered.textContent).toContain('Standard deviation1');
    expect(rendered.querySelector('svg')?.getAttribute('aria-label')).toBe('Score distribution, 3 values');
  });

  it('reports an unavailable deviation for a single quantitative value', () => {
    const rendered = renderTableSummaryRow([{
      label: 'Score',
      type: 'quantitative',
      values: [4]
    }]);

    expect(rendered.textContent).toContain('Standard deviationN/A');
  });

  it('auto-detects boolean values and summarizes their true percentage', () => {
    const rendered = renderTableSummaryRow([{
      label: 'Ready',
      type: 'nominal',
      values: [true, false, true, null]
    }]);

    expect(rendered.textContent).toBe('66.7% true');
  });

  it('leaves the summary empty when the column type is unknown', () => {
    const rendered = renderTableSummaryRow([{
      label: 'Unknown',
      values: ['alpha', 'bravo', 'charlie', null]
    }]);

    expect(rendered.querySelector('.table-summary-cell')?.textContent).toBe('');
  });

  it('leaves the summary empty when typed values have unknown meaning', () => {
    const rendered = renderTableSummaryRow([{
      label: 'Details',
      type: 'nominal',
      values: [{ label: 'alpha' }]
    }]);

    expect(rendered.querySelector('.table-summary-cell')?.textContent).toBe('');
  });

  it('summarizes run-like columns and object values by item count', () => {
    const rendered = renderTableSummaryRow([
      {
        field: 'run',
        label: 'Run',
        type: 'nominal',
        values: ['1001', '1002']
      },
      {
        field: 'run-link',
        label: 'Run Link',
        type: 'nominal',
        values: [{ href: 'https://example.com/runs/1', label: 'Run 1' }]
      }
    ]);

    expect([...rendered.querySelectorAll('.table-summary-count')].map((node) => node.textContent)).toEqual([
      '2 items',
      '1 item'
    ]);
    expect(rendered.textContent).not.toContain('[object Object]');
  });
});
