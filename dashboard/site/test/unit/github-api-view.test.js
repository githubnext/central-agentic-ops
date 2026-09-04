// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderDashboard } from '../../src/presenter.js';

const dashboard = JSON.parse(readFileSync(`${process.cwd()}/dashboard.json`, 'utf8'));
const metadata = {
  'source-id': 'github-api-fixture',
  'source-kind': 'fixture',
  'as-of': '2026-09-04T13:00:00Z',
  'retrieved-at': '2026-09-04T13:00:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

/** @param {Record<string, unknown>} [overrides] @returns {Record<string, unknown>} */
function rateLimitRow(overrides = {}) {
  return {
    'observation-id': 'run-1:after:reader:core:2026-09-04T12:00:00Z',
    'operation-execution-id': 'run-1',
    'observed-at': '2026-09-04T12:00:00Z',
    phase: 'after',
    operation: 'refresh-activity',
    outcome: 'success',
    credential: 'reader',
    'credential-type': 'app',
    resource: 'core',
    bucket: 'core · reader',
    'history-series': 'core · reader',
    remaining: 4_875,
    limit: 5_000,
    used: 125,
    'remaining-percent': 97.5,
    'reset-at': '2026-09-04T13:00:00Z',
    'minutes-to-reset': 60,
    'consumed-since-previous': 25,
    'burn-rate-per-minute': 0.417,
    'projected-remaining-at-reset': 4_850,
    'projected-exhaustion-at': '2026-09-12T14:00:00Z',
    'runway-ratio': 195,
    'risk-status': 'healthy',
    'risk-order': 2,
    'is-current': true,
    'attribution-status': 'available',
    'operation-consumed': 25,
    ...overrides
  };
}

/**
 * @param {{
 *   source: string,
 *   metadata: {
 *     'source-id': string,
 *     'source-kind': string,
 *     'as-of': string,
 *     'retrieved-at': string,
 *     completeness: 'complete'|'partial'|'unknown',
 *     freshness: 'fresh'|'stale'|'unknown',
 *     availability: 'available'|'empty'|'unavailable'
 *   },
 *   rows: Array<Record<string, unknown>>
 * }} [rateLimitSource]
 */
function renderApiPage(rateLimitSource = {
  source: 'github-api-rate-limits',
  metadata,
  rows: [
    rateLimitRow({
      'observation-id': 'run-0:after:reader:core:2026-09-04T11:00:00Z',
      'operation-execution-id': 'run-0',
      'observed-at': '2026-09-04T11:00:00Z',
      remaining: 4_900,
      used: 100,
      'remaining-percent': 98,
      'is-current': false
    }),
    rateLimitRow(),
    rateLimitRow({
      'observation-id': 'run-2:after:reader:search:2026-09-04T12:00:00Z',
      'operation-execution-id': 'run-2',
      resource: 'search',
      bucket: 'search · reader',
      'history-series': 'search · reader',
      remaining: 3,
      limit: 30,
      used: 27,
      'remaining-percent': 10,
      'reset-at': '2026-09-04T12:10:00Z',
      'minutes-to-reset': 10,
      'burn-rate-per-minute': null,
      'projected-remaining-at-reset': null,
      'projected-exhaustion-at': null,
      'runway-ratio': null,
      'risk-status': 'warning',
      'risk-order': 1,
      'attribution-status': 'unavailable',
      'operation-consumed': null
    })
  ]
}) {
  const rendered = renderDashboard({
    document: dashboard,
    sources: {
      'github-api-rate-limits': rateLimitSource,
      'github-api-collector-health': {
        source: 'github-api-collector-health',
        metadata,
        rows: [{
          'observed-at': '2026-09-04T12:00:00Z',
          'operation-execution-id': 'run-1',
          phase: 'after',
          operation: 'refresh-activity',
          outcome: 'success',
          credential: 'reader',
          'cache-hydrated': true,
          'cache-bytes': 1_024,
          'cache-entries': 7,
          'cache-folders': 1,
          'rate-limit-error': ''
        }]
      }
    }
  });
  rendered.ownerDocument.defaultView?.history.replaceState(null, '', '/');
  const link = /** @type {HTMLAnchorElement | null} */ (rendered.querySelector('[data-nav-page-id="github-api"]'));
  link?.click();
  return {
    rendered,
    link,
    page: rendered.querySelector('[data-page-id="github-api"]')
  };
}

describe('GitHub API rate-limit dashboard', () => {
  it('renders four essential operational views with accessible capacity evidence', () => {
    const { link, page } = renderApiPage();
    const apiPage = dashboard.dashboard.pages.find((/** @type {{ id: string }} */ candidate) => candidate.id === 'github-api');

    expect(link).not.toBeNull();
    expect(page).not.toBeNull();
    expect(apiPage).toMatchObject({
      kind: 'custom',
      title: 'GitHub API Rate Limits',
      icon: 'meter',
      'filter-bar': {
        filters: ['phase:after'],
        'time-range': '24h'
      }
    });
    expect(apiPage.views.filter((/** @type {{ disclosure?: string }} */ view) => view.disclosure === 'essential')).toHaveLength(4);
    expect(apiPage.views.filter((/** @type {{ disclosure?: string }} */ view) => view.disclosure === 'supplemental')).toHaveLength(4);
    expect(apiPage.views[0]).toMatchObject({
      id: 'github-api-remaining-capacity',
      chart: 'bar',
      table: true
    });
    expect(apiPage.views.find((/** @type {{ id: string }} */ view) => view.id === 'github-api-at-risk')).toMatchObject({
      mark: 'metric',
      encoding: { value: expect.objectContaining({ aggregate: 'count' }) }
    });
    expect(apiPage.views.find((/** @type {{ id: string }} */ view) => view.id === 'github-api-remaining-trend')).toMatchObject({
      chart: 'line',
      table: true,
      encoding: {
        y: expect.objectContaining({ field: 'remaining-percent', unit: 'percent' }),
        color: expect.objectContaining({ field: 'history-series' })
      }
    });
    expect(page?.querySelector('[aria-labelledby="github-api-remaining-capacity-heading"]')
      ?.querySelectorAll('.bar-chart-bar')).toHaveLength(2);
    expect(page?.querySelectorAll('.line-chart-series')).toHaveLength(2);
    expect(page?.textContent).toContain('At-risk buckets');
    expect(page?.textContent).toContain('1');
    expect(page?.textContent).toContain('4875');
    expect(page?.textContent).toContain('5000');
    expect(page?.textContent).toContain('warning');
    expect(page?.textContent).toContain('Last observed (UTC)');
    expect(page?.textContent).toContain('As ofSep 4, 2026, 1:00 PM');
  });

  it('keeps raw quota and collector/cache diagnostics supplemental and distinct', () => {
    const { page } = renderApiPage();
    const supplemental = [...(page?.querySelectorAll('details[data-disclosure="supplemental"]') ?? [])];

    expect(supplemental).toHaveLength(4);
    expect(supplemental.map((view) => view.querySelector('summary')?.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('Raw quota observations'),
      expect.stringContaining('Collector and cache health')
    ]));
    expect(page?.textContent).toContain('Collection completeness, retrieval failures, and activity-cache state');
  });

  it('exposes stale, partial, unavailable, and empty source states without fabricated quota values', () => {
    const stalePartial = {
      source: 'github-api-rate-limits',
      metadata: {
        ...metadata,
        completeness: /** @type {'partial'} */ ('partial'),
        freshness: /** @type {'stale'} */ ('stale'),
        availability: /** @type {'unavailable'} */ ('unavailable')
      },
      rows: []
    };
    const { page } = renderApiPage(stalePartial);

    expect(page?.textContent).toContain('This view is unavailable.');
    expect(page?.textContent).toContain('Affected source: github-api-rate-limits');
    expect(page?.textContent).toContain('partial');
    expect(page?.textContent).toContain('stale');
    expect(page?.textContent).not.toContain('0.0 %');
  });
});
