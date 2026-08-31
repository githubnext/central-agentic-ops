// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderDashboard } from '../../src/presenter.js';

const authoritativeDashboardDocument = JSON.parse(
  readFileSync(`${process.cwd()}/dashboard.json`, 'utf8')
);

const metadata = {
  'source-id': 'cost-fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-31T05:00:00Z',
  'retrieved-at': '2026-08-31T05:01:00Z',
  completeness: /** @type {'partial'} */ ('partial'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

describe('Cost and efficiency dashboard view', () => {
  it('renders measured usage, evidence boundaries, repository allocation, and evaluation readiness from JSON', () => {
    const rendered = renderDashboard({
      document: authoritativeDashboardDocument,
      sources: {
        usage: {
          source: 'usage',
          rows: [
            { organization: 'githubnext', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.md', run: '101', invocation: 'usage-1', aic: 3.5 },
            { organization: 'githubnext', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.md', run: '101', invocation: 'usage-2', aic: 1.5 },
            { organization: 'octo-org', repository: 'service', workflow: '.github/workflows/review.md', run: '202', invocation: 'usage-3', aic: 4 }
          ],
          metadata
        }
      }
    });

    const page = rendered.querySelector('[data-page-id="cost"]');
    const dashboardPage = authoritativeDashboardDocument.dashboard.pages.find(
      (/** @type {{ id: string }} */ candidate) => candidate.id === 'cost'
    );

    expect(dashboardPage).toMatchObject({ kind: 'custom', icon: 'meter' });
    expect(dashboardPage.views).toHaveLength(4);
    expect(dashboardPage.sections).toMatchObject([
      {
        id: 'measured-usage',
        'count-source': 'cost-signals',
        'count-label': 'boundaries',
        views: ['cost-summary', 'cost-signals']
      }
    ]);
    expect(dashboardPage.views).not.toContainEqual(expect.objectContaining({ element: 'metric-signal-summary' }));
    expect(rendered.querySelector('[data-nav-page-id="cost"] .octicon-meter')).not.toBeNull();
    const filterBar = page?.querySelector('.filter-bar');
    expect(filterBar?.querySelector('.filter-control code')?.textContent).toBe('mode:review mode:live');
    expect(filterBar?.querySelector('.count-badge')?.textContent).toBe('2');
    expect(filterBar?.querySelector('.scope-period')?.textContent).toBe('All recorded');
    const exportLink = filterBar?.querySelector('.export-control');
    expect(exportLink?.getAttribute('download')).toBe('cost.json');
    const exportPayload = JSON.parse(decodeURIComponent(exportLink?.getAttribute('href')?.split(',')[1] ?? ''));
    expect(exportPayload).toMatchObject({
      page: 'cost',
      filters: ['mode:review', 'mode:live'],
      sources: {
        usage: {
          source: 'usage',
          rows: expect.arrayContaining([
            expect.objectContaining({ invocation: 'usage-1', aic: 3.5 })
          ]),
          metadata: expect.objectContaining({ 'source-id': 'cost-fixture' })
        }
      }
    });

    const summary = page?.querySelector('.summary-grid');
    expect(summary?.textContent).toContain('Measured AIC9');
    expect(summary?.textContent).toContain('Measured runs2');
    expect(summary?.textContent).toContain('Measured episode AIC—');
    expect(summary?.textContent).toContain('Episode output yield—');
    expect(page?.textContent).toContain('allocation evidence, not monetary cost');

    const signals = [...(page?.querySelectorAll('.signal-list .signal-item') ?? [])];
    expect(signals).toHaveLength(3);
    expect(signals.map((signal) => signal.querySelector('.signal-copy > span')?.textContent)).toEqual([
      'Usage coverage',
      'Budget boundary',
      'Anomaly boundary'
    ]);
    expect(signals[0]?.textContent).toContain('AI Credit telemetry is partial');
    expect(signals[0]?.querySelector('a')?.getAttribute('href')).toBe('#page-usage');

    expect(page?.querySelectorAll('[data-chart-widget="pie"] [data-chart-category]')).toHaveLength(2);
    expect(page?.querySelector('.pie-chart-total-value')?.textContent).toBe('9');
    expect(page?.querySelector('.readiness-note')?.textContent).toContain('Budget and anomaly verdicts unavailable');
    expect(page?.querySelector('.readiness-note')?.textContent).toContain('qualified historical baseline');
  });

  it('does not report a telemetry coverage boundary for a complete usage source', () => {
    const rendered = renderDashboard({
      document: authoritativeDashboardDocument,
      sources: {
        usage: {
          source: 'usage',
          rows: [
            { organization: 'githubnext', repository: 'central-agentic-ops', workflow: '.github/workflows/daily.md', invocation: 'shared-id', aic: 1 },
            { organization: 'octo-org', repository: 'service', workflow: '.github/workflows/daily.md', invocation: 'shared-id', aic: 1 }
          ],
          metadata: { ...metadata, completeness: /** @type {'complete'} */ ('complete') }
        }
      }
    });

    const page = rendered.querySelector('[data-page-id="cost"]');
    const signals = [...(page?.querySelectorAll('.signal-list .signal-item') ?? [])];
    expect(signals).toHaveLength(2);
    expect(page?.textContent).not.toContain('AI Credit telemetry is partial');
    expect(page?.querySelector('.summary-grid')?.textContent).toContain('Measured AIC2');
    expect(page?.querySelector('.summary-grid')?.textContent).toContain('Measured runs2');
  });
});
