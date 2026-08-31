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
  it('renders the metric helper selected by the JSON mark', () => {
    const rendered = renderDataView('metric', {
      pageId: 'overview',
      title: 'Run count',
      view: {
        mark: 'metric',
        encoding: { value: { field: 'run', aggregate: 'count' } }
      },
      sourceName: 'runs',
      rows: [{ run: '1' }, { run: '2' }],
      metadata,
      contextDetails: [],
      headingTag: 'h3',
      prepareTableRows: () => [],
      buildChartPoints: () => [],
      prepareChartPoints: () => [],
      toText: String
    });

    expect(rendered?.querySelector('[data-metric-value="run"]')?.textContent).toBe('2');
  });

  it('returns null for an unsupported JSON mark', () => {
    expect(renderDataView('unsupported', /** @type {any} */ ({}))).toBeNull();
  });
});
