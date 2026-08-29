// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderPageSection, renderProvenanceList, renderViewHeader } from '../../src/components/view-chrome.js';

describe('view chrome component helpers', () => {
  it('DLS-SAFE-007 renders focusable labeled page sections with deterministic heading ids', () => {
    const section = renderPageSection('runs', 'Run Status Counts', []);

    expect(section.className).toBe('page-section');
    expect(section.getAttribute('tabindex')).toBe('0');
    expect(section.getAttribute('aria-labelledby')).toBe('runs-run-status-counts-heading');
    expect(section.querySelector('h3')?.id).toBe('runs-run-status-counts-heading');
    expect(section.querySelector('h3')?.textContent).toBe('Run Status Counts');
  });

  it('DLS-PAGE-014 renders provenance list items and the conservative empty fallback', () => {
    const populated = renderProvenanceList([
      {
        sourceName: 'runs',
        sourceId: 'runs-fixture',
        sourceKind: 'fixture',
        asOf: '2026-08-29T20:00:00Z'
      }
    ]);
    const empty = renderProvenanceList([]);

    expect(populated.textContent).toContain('runs: runs-fixture (fixture) — as of 2026-08-29T20:00:00Z');
    expect(empty.textContent).toContain('No source provenance available for this page.');
  });

  it('DLS-VIEW-013 renders reusable source and metadata chrome for custom views', () => {
    const header = renderViewHeader('usage', {
      'as-of': '2026-08-29T20:00:00Z',
      completeness: 'complete',
      freshness: 'fresh'
    });

    expect(header).toHaveLength(2);
    expect(header[0]?.className).toBe('view-source');
    expect(header[0]?.textContent).toBe('Source: usage');
    expect(header[1]?.className).toBe('view-metadata');
    expect(header[1]?.textContent).toBe('As of 2026-08-29T20:00:00Z • completeness complete • freshness fresh');
  });
});
