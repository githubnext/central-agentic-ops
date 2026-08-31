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
    expect(dashboardPage.views).toHaveLength(3);
    expect(rendered.querySelector('[data-nav-page-id="cost"] .octicon-meter')).not.toBeNull();

    const summary = page?.querySelector('.domain-summary');
    expect(summary?.textContent).toContain('Measured AIC9');
    expect(summary?.textContent).toContain('Measured runs2');
    expect(summary?.textContent).toContain('Measured episode AIC—');
    expect(summary?.textContent).toContain('Episode output yield—');
    expect(page?.querySelector('.domain-boundary-note')?.textContent).toContain('allocation evidence, not monetary cost');

    const signals = [...(page?.querySelectorAll('.workflow-attention-list .signal-item') ?? [])];
    expect(signals).toHaveLength(3);
    expect(signals.map((signal) => signal.querySelector('.signal-copy > span')?.textContent)).toEqual([
      'Usage coverage',
      'Budget boundary',
      'Anomaly boundary'
    ]);
    expect(signals[0]?.textContent).toContain('AI Credit telemetry is partial');
    expect(signals[0]?.querySelector('a')?.getAttribute('href')).toBe('#page-usage');

    expect(page?.querySelectorAll('[data-chart-widget="pie"] [data-chart-category]')).toHaveLength(2);
    expect(page?.querySelector('.pie-chart-total-value')?.textContent).toBe('9 AIC');
    expect(page?.querySelector('.readiness-note')?.textContent).toContain('Budget and anomaly verdicts unavailable');
    expect(page?.querySelector('.readiness-note')?.textContent).toContain('qualified historical baseline');
  });

  it('does not report a telemetry coverage boundary for a complete usage source', () => {
    const rendered = renderDashboard({
      document: authoritativeDashboardDocument,
      sources: {
        usage: {
          source: 'usage',
          rows: [],
          metadata: { ...metadata, completeness: /** @type {'complete'} */ ('complete') }
        }
      }
    });

    const page = rendered.querySelector('[data-page-id="cost"]');
    const signals = [...(page?.querySelectorAll('.workflow-attention-list .signal-item') ?? [])];
    expect(signals).toHaveLength(2);
    expect(page?.textContent).not.toContain('AI Credit telemetry is partial');
    expect(page?.querySelector('.domain-summary')?.textContent).toContain('Measured AIC0');
  });
});
