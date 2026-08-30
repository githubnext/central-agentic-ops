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

    expect(rendered.textContent).toContain('Average2');
    expect(rendered.textContent).toContain('Mean2');
    expect(rendered.textContent).toContain('Standard deviation0.82');
    expect(rendered.querySelector('svg')?.getAttribute('aria-label')).toBe('Score distribution, 3 values');
  });

  it('summarizes boolean values by true percentage', () => {
    const rendered = renderTableSummaryRow([{
      label: 'Ready',
      type: 'nominal',
      values: [true, false, true, null]
    }]);

    expect(rendered.textContent).toBe('66.7% true');
  });
});
