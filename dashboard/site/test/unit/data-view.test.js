// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDataView } from '../../src/components/data-view.js';

const metadata = {
  'source-id': 'fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-31T00:00:00Z',
  'retrieved-at': '2026-08-31T00:00:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh')
};

describe('data view renderer', () => {
  it('renders a unit-bearing metric selected by the JSON mark', () => {
    const rendered = renderDataView('metric', {
      pageId: 'overview',
      title: 'AI Credits',
      view: {
        mark: 'metric',
        encoding: { value: { field: 'aic', aggregate: 'sum', unit: 'aic' } }
      },
      sourceName: 'usage',
      rows: [{ aic: 1 }, { aic: 2 }],
      metadata,
      contextDetails: [],
      headingTag: 'h3',
      units: {
        aic: {
          name: 'AI Credits',
          symbol: 'AIC',
          significant: 1
        }
      },
      prepareTableRows: () => [],
      buildChartPoints: () => [],
      prepareChartPoints: () => [],
      toText: String
    });

    expect(rendered?.querySelector('[data-metric-value="aic"]')?.textContent).toBe('3 AIC');
  });

  it('returns null for an unsupported JSON mark', () => {
    expect(renderDataView('unsupported', /** @type {any} */ ({}))).toBeNull();
  });

  it('renders workflow run IDs as links whenever a safe run link is available', () => {
    const context = {
      pageId: 'values',
      title: 'Grader ledger',
      view: {
        mark: 'table',
        controls: 'static',
        encoding: { columns: [{ field: 'grader' }, { field: 'run' }] }
      },
      sourceName: 'grader-observations',
      rows: [{
        grader: 'daily-value',
        run: '42',
        'run-link': {
          href: 'https://github.com/githubnext/central-agentic-ops/actions/runs/42',
          label: 'Run 42'
        }
      }],
      metadata,
      contextDetails: [],
      headingTag: /** @type {'h3'} */ ('h3'),
      prepareTableRows: (/** @type {Array<Record<string, unknown>>} */ rows) => rows,
      buildChartPoints: () => [],
      prepareChartPoints: () => [],
      toText: String
    };
    const rendered = renderDataView('table', context);

    const runLink = rendered?.querySelector('tbody td:nth-child(2) a');
    expect(runLink?.textContent).toBe('42');
    expect(runLink?.getAttribute('href')).toBe('https://github.com/githubnext/central-agentic-ops/actions/runs/42');

    const linkedFirstColumn = renderDataView('table', {
      ...context,
      view: {
        ...context.view,
        encoding: {
          href: { field: 'run-link' },
          columns: [{ field: 'run' }, { field: 'grader' }]
        }
      }
    });
    expect(linkedFirstColumn?.querySelectorAll('tbody td:first-child a')).toHaveLength(1);
    expect(linkedFirstColumn?.querySelector('tbody td:first-child a')?.textContent).toBe('42');
  });

  it('omits column summaries when disabled by the JSON view definition', () => {
    const rendered = renderDataView('table', {
      pageId: 'dispatches',
      title: 'Workflow dispatch events',
      view: {
        mark: 'table',
        'column-summaries': false,
        encoding: { columns: [{ field: 'status', type: 'nominal' }] }
      },
      sourceName: 'dispatches',
      rows: [{ status: 'success' }],
      metadata,
      contextDetails: [],
      headingTag: 'h3',
      prepareTableRows: (rows) => rows,
      buildChartPoints: () => [],
      prepareChartPoints: () => [],
      toText: String
    });

    expect(rendered?.querySelector('input[type="search"]')).not.toBeNull();
    expect(rendered?.querySelector('.table-summary-row')).toBeNull();
  });

  it('preserves complete output evidence while marking it for visual ellipsis', () => {
    const evidence = 'Workflow failure evidence with complete diagnostic context';
    const rendered = renderDataView('table', {
      pageId: 'security',
      title: 'Output assurance records',
      view: {
        mark: 'table',
        encoding: {
          columns: [{ field: 'finding-summary', type: 'nominal', display: 'outcome-link' }]
        }
      },
      sourceName: 'findings',
      rows: [{ 'finding-summary': evidence, 'safe-output': 'output-42' }],
      metadata,
      contextDetails: [],
      headingTag: 'h3',
      prepareTableRows: (rows) => rows,
      buildChartPoints: () => [],
      prepareChartPoints: () => [],
      toText: String
    });

    const output = rendered?.querySelector('.table-output-evidence');
    expect(output?.textContent).toBe(evidence);
    expect(output?.querySelector('a')?.getAttribute('title')).toBe(evidence);
  });
});
