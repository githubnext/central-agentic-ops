// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderDashboard } from '../../src/presenter.js';

const dashboard = JSON.parse(readFileSync(`${process.cwd()}/dashboard.json`, 'utf8'));
const metadata = {
  'source-id': 'github-api-fixture',
  'source-kind': 'fixture',
  'as-of': '2026-09-04T12:00:00Z',
  'retrieved-at': '2026-09-04T12:00:00Z',
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
            'observed-at': '2026-09-04T12:00:00Z',
            operation: 'refresh-activity',
            phase: 'after',
            resource: 'core',
            remaining: 4875,
            limit: 5000,
            'reset-at': '2026-09-04T13:00:00Z',
            'token-type': 'app',
            'cache-hydrated': true,
            'cache-files': 7,
            'cache-folders': 'runs'
          }]
        }
      }
    });
    const link = /** @type {HTMLAnchorElement | null} */ (rendered.querySelector('[data-nav-page-id="github-api"]'));
    link?.click();
    const page = rendered.querySelector('[data-page-id="github-api"]');

    expect(dashboard.dashboard.pages.find((candidate) => candidate.id === 'github-api')).toMatchObject({
      kind: 'custom',
      icon: 'meter'
    });
    expect(page?.querySelector('[data-chart-widget="line"]')).not.toBeNull();
    expect(page?.querySelector('table')?.textContent).toContain('refresh-activity');
    expect(page?.textContent).toContain('app');
    expect(page?.textContent).toContain('runs');
  });
});
