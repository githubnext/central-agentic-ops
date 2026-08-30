// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderContextChrome, renderContextList, renderPageSection, renderProvenanceList, renderProvenanceSection, renderSummaryList, renderSummaryRegion, renderTitledRegion, renderViewChrome, renderViewHeader, renderViewSectionChrome } from '../../src/components/view-chrome.js';

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

  it('renders reusable view chrome paragraphs for populated and empty metadata lines', () => {
    const rendered = renderViewChrome([
      'Source: usage',
      'As of 2026-08-29T20:00:00Z • completeness complete • freshness fresh',
      'Additional detail'
    ]);
    const empty = renderViewChrome([]);

    expect(rendered).toHaveLength(3);
    expect(rendered[0]?.className).toBe('view-source');
    expect(rendered[0]?.textContent).toBe('Source: usage');
    expect(rendered[1]?.className).toBe('view-metadata');
    expect(rendered[1]?.textContent).toBe('As of 2026-08-29T20:00:00Z • completeness complete • freshness fresh');
    expect(rendered[2]?.className).toBe('view-metadata');
    expect(rendered[2]?.textContent).toBe('Additional detail');
    expect(empty).toHaveLength(0);
  });

  it('DLS-VIEW-013 renders reusable custom-view context lists including empty input', () => {
    const populated = renderContextList(['Source: usage', 'Scope: {"organization":"github"}']);
    const empty = renderContextList([]);

    expect(populated.className).toBe('view-context');
    expect(populated.querySelectorAll('li')).toHaveLength(2);
    expect(populated.textContent).toContain('Source: usage');
    expect(populated.textContent).toContain('Scope: {"organization":"github"}');
    expect(empty.className).toBe('view-context');
    expect(empty.querySelectorAll('li')).toHaveLength(0);
    expect(empty.textContent).toBe('');
  });

  it('DLS-VIEW-013 renders reusable context chrome around the shared context list', () => {
    const populated = renderContextChrome(['Source: usage', 'Filters: {"status":"open"}']);
    const empty = renderContextChrome([]);

    expect(populated).toHaveLength(1);
    expect(populated[0]?.className).toBe('view-context');
    expect(populated[0]?.querySelectorAll('li')).toHaveLength(2);
    expect(populated[0]?.textContent).toContain('Source: usage');
    expect(populated[0]?.textContent).toContain('Filters: {"status":"open"}');
    expect(empty).toHaveLength(1);
    expect(empty[0]?.className).toBe('view-context');
    expect(empty[0]?.querySelectorAll('li')).toHaveLength(0);
  });

  it('DLS-VIEW-013 renders reusable view section chrome for shared header plus context composition', () => {
    const chrome = renderViewSectionChrome(
      'usage',
      {
        'as-of': '2026-08-29T20:00:00Z',
        completeness: 'complete',
        freshness: 'fresh'
      },
      ['Source: usage', 'Scope: {"organization":"github"}']
    );

    expect(chrome).toHaveLength(3);
    expect(chrome[0]?.className).toBe('view-source');
    expect(chrome[0]?.textContent).toBe('Source: usage');
    expect(chrome[1]?.className).toBe('view-metadata');
    expect(chrome[1]?.textContent).toBe('As of 2026-08-29T20:00:00Z • completeness complete • freshness fresh');
    expect(chrome[2]?.className).toBe('view-context');
    expect(chrome[2]?.textContent).toContain('Scope: {"organization":"github"}');
  });

  it('DLS-SAFE-007 wraps single-content titled regions with the shared page-section markup', () => {
    const region = renderTitledRegion('usage', 'Usage Totals', renderProvenanceList([]));

    expect(region.className).toBe('page-section');
    expect(region.getAttribute('aria-labelledby')).toBe('usage-usage-totals-heading');
    expect(region.querySelector('h3')?.textContent).toBe('Usage Totals');
    expect(region.querySelector('.provenance-list')?.textContent).toContain('No source provenance available for this page.');
  });

  it('DLS-VIEW-013 renders reusable summary lists including empty counts', () => {
    const populated = renderSummaryList('overview-rollout-mode-counts', new Map([
      ['shadow', 2],
      ['full', 1]
    ]));
    const empty = renderSummaryList('run-outcome-counts', new Map());

    expect(populated.className).toBe('overview-rollout-mode-counts');
    expect(populated.querySelectorAll('li')).toHaveLength(2);
    expect(populated.textContent).toContain('shadow: 2');
    expect(populated.textContent).toContain('full: 1');
    expect(empty.className).toBe('run-outcome-counts');
    expect(empty.textContent).toContain('No data available.');
  });

  it('DLS-VIEW-013 renders reusable summary regions including empty counts', () => {
    const populated = renderSummaryRegion('overview', 'Rollout Mode Filtering', 'overview-rollout-mode-counts', new Map([
      ['shadow', 2],
      ['full', 1]
    ]));
    const empty = renderSummaryRegion('runs', 'Outcome Counts', 'run-outcome-counts', new Map());

    expect(populated.className).toBe('page-section');
    expect(populated.getAttribute('aria-labelledby')).toBe('overview-rollout-mode-filtering-heading');
    expect(populated.querySelector('h3')?.textContent).toBe('Rollout Mode Filtering');
    expect(populated.querySelector('ul')?.className).toBe('overview-rollout-mode-counts');
    expect(populated.textContent).toContain('shadow: 2');
    expect(populated.textContent).toContain('full: 1');
    expect(empty.querySelector('ul')?.className).toBe('run-outcome-counts');
    expect(empty.textContent).toContain('No data available.');
  });

  it('DLS-PAGE-014 renders the provenance heading plus list as a reusable section', () => {
    const section = renderProvenanceSection('evals', [
      {
        sourceName: 'evals',
        sourceId: 'evals-fixture',
        sourceKind: 'fixture',
        asOf: '2026-08-29T20:00:00Z'
      }
    ]);

    expect(section.querySelector('h3')?.textContent).toBe('Provenance');
    expect(section.getAttribute('aria-labelledby')).toBe('evals-provenance-heading');
    expect(section.querySelector('.provenance-list')?.textContent).toContain('evals: evals-fixture (fixture) — as of 2026-08-29T20:00:00Z');
  });
});
