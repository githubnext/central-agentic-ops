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

describe('GitHub API capacity view', () => {
  it('renders rate-limit trends and cache hydration observations', () => {
    const rendered = renderDashboard({
      document: dashboard,
      sources: {
        'github-api-rate-limits': {
          source: 'github-api-rate-limits',
          metadata,
          rows: [{
            'observed-at': '2026-09-04T10:00:00Z',
            operation: 'refresh-activity',
            phase: 'after',
            resource: 'core',
            remaining: 4875,
            limit: 5000,
            used: 125,
            'remaining-percent': 97.5,
            'reset-at': '2026-09-04T13:00:00Z',
            'token-type': 'app',
            'cache-hydrated': true,
            'cache-entries': 7,
            'cache-folders': 1
          }, {
            'observed-at': '2026-09-04T12:00:00Z',
            operation: 'refresh-activity',
            phase: 'after',
            resource: 'search',
            remaining: 3,
            limit: 30,
            used: 27,
            'remaining-percent': 10,
            'reset-at': '2026-09-04T12:01:00Z',
            'token-type': 'app',
            'cache-hydrated': true,
            'cache-entries': 7,
            'cache-folders': 1
          }, {
            'observed-at': '2026-09-04T11:00:00Z',
            operation: 'refresh-activity',
            phase: 'before',
            resource: 'core',
            remaining: 4900,
            limit: 5000,
            used: 100,
            'remaining-percent': 98,
            'reset-at': '2026-09-04T13:00:00Z',
            'token-type': 'app',
            'cache-hydrated': true,
            'cache-entries': 5,
            'cache-folders': 1
          }, {
            'observed-at': '2026-09-04T11:00:00Z',
            operation: 'refresh-activity',
            phase: 'before',
            resource: 'search',
            remaining: 30,
            limit: 30,
            used: 0,
            'remaining-percent': 100,
            'reset-at': '2026-09-04T12:01:00Z',
            'token-type': 'app',
            'cache-hydrated': true,
            'cache-entries': 5,
            'cache-folders': 1
          }]
        }
      }
    });
    rendered.ownerDocument.defaultView?.history.replaceState(null, '', '/');
    const link = /** @type {HTMLAnchorElement | null} */ (rendered.querySelector('[data-nav-page-id="github-api"]'));
    link?.click();
    const page = rendered.querySelector('[data-page-id="github-api"]');

    expect(link).not.toBeNull();
    expect(page).not.toBeNull();
    const apiPage = dashboard.dashboard.pages.find((/** @type {{ id: string }} */ candidate) => candidate.id === 'github-api');
    expect(apiPage).toMatchObject({
      kind: 'custom',
      icon: 'meter'
    });
    const trend = apiPage?.views.find((/** @type {{ id: string }} */ view) => view.id === 'github-api-remaining-trend');
    const observations = apiPage?.views.find((/** @type {{ id: string }} */ view) => view.id === 'github-api-observations');
    expect(trend).toMatchObject({
      chart: 'line',
      encoding: {
        y: expect.objectContaining({ field: 'remaining-percent', unit: 'percent' }),
        color: expect.objectContaining({ field: 'resource' })
      }
    });
    expect(observations).toMatchObject({ mark: 'table' });
    expect(observations?.encoding.columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'remaining-percent', unit: 'percent' }),
      expect.objectContaining({ field: 'used' })
    ]));
    expect(page?.querySelectorAll('.line-chart-series')).toHaveLength(2);
    expect(page?.querySelector('.dot-chart-point')).toBeNull();
    expect(page?.textContent).toContain('API and cache observations');
    expect(page?.textContent).toContain('API type');
    expect(page?.textContent).toContain('Remaining');
    expect(page?.textContent).toContain('97.5 %');
    expect(page?.textContent).toContain('10.0 %');
  });
});
