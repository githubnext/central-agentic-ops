// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/presenter.js';

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
const authoritativeDashboard = JSON.parse(
  readFileSync(resolve(fixtureDirectory, '../../dashboard.json'), 'utf8')
);

const metadata = {
  'source-id': 'runtime-fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-30T12:00:00Z',
  'retrieved-at': '2026-08-30T12:01:00Z',
  'coverage-start': '2026-08-29T12:00:00Z',
  'coverage-end': '2026-08-30T12:00:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

describe('Runtime dashboard view', () => {
  it('keeps Runtime and its execution views in the authoritative dashboard.json', () => {
    const runtimePage = authoritativeDashboard.dashboard.pages.find(
      (/** @type {{ id: string }} */ page) => page.id === 'runtime'
    );

    expect(runtimePage).toMatchObject({
      id: 'runtime',
      kind: 'custom',
      title: 'Runtime',
      views: [
        {
          id: 'runtime-needs-attention',
          element: 'execution-signal-list'
        },
        {
          id: 'runtime-execution-episodes',
          element: 'execution-episodes'
        }
      ]
    });
  });

  it('renders declarative triage signals and root-only execution episodes', () => {
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'runtime-dashboard',
        title: 'Runtime dashboard',
        pages: [{
          id: 'runtime',
          kind: /** @type {'custom'} */ ('custom'),
          title: 'Runtime',
          views: [
            { id: 'attention', title: 'Needs attention', data: { sources: ['workflows', 'runs', 'outcomes', 'findings'] }, mark: 'element', element: 'execution-signal-list' },
            { id: 'episodes', title: 'Execution episodes', data: { sources: ['workflows', 'runs', 'outcomes', 'usage'] }, mark: 'element', element: 'execution-episodes' }
          ]
        }]
      }
    };
    const sources = {
      workflows: {
        source: 'workflows',
        rows: [
          { organization: 'githubnext', repository: 'central-agentic-ops', package: 'dependabot', 'package-name': 'Dependabot', workflow: '.github/workflows/dependabot.md', 'workflow-name': 'Dependabot', 'workflow-role': 'orchestrator' },
          { organization: 'githubnext', repository: 'central-agentic-ops', package: 'dependabot', 'package-name': 'Dependabot', workflow: '.github/workflows/dependabot-worker.md', 'workflow-name': 'Dependabot worker', 'workflow-role': 'worker' }
        ],
        metadata
      },
      runs: {
        source: 'runs',
        rows: [
          { organization: 'githubnext', repository: 'central-agentic-ops', workflow: '.github/workflows/dependabot.md', run: '10', 'run-title': 'Dependabot review', 'started-at': '2026-08-30T10:00:00Z', 'ended-at': '2026-08-30T10:05:00Z', 'run-status': 'completed', 'run-conclusion': 'action-required', 'run-link': { relation: 'run', href: 'https://github.com/githubnext/central-agentic-ops/actions/runs/10', label: 'View run 10' } },
          { organization: 'githubnext', repository: 'central-agentic-ops', workflow: '.github/workflows/dependabot-worker.md', run: '11', 'run-title': 'Update train', 'started-at': '2026-08-30T10:01:00Z', 'ended-at': '2026-08-30T10:04:00Z', 'run-status': 'completed', 'run-conclusion': 'failure', 'run-link': { relation: 'run', href: 'https://github.com/githubnext/central-agentic-ops/actions/runs/11', label: 'View run 11' } }
        ],
        metadata
      },
      outcomes: { source: 'outcomes', rows: [], metadata },
      findings: { source: 'findings', rows: [], metadata },
      usage: { source: 'usage', rows: [], metadata }
    };

    const rendered = renderDashboard({ document, sources });

    expect(rendered.querySelector('[data-nav-page-id="runtime"]')).not.toBeNull();
    const attention = rendered.querySelector('.workflow-attention')?.textContent;
    expect(attention).toContain('Approval gate');
    expect(attention).toContain('Run failures');
    expect(attention).toContain('1 worker dispatch lacks episode evidence');
    expect(attention).toContain('1 root episode has no correlated worker attempt or output');
    expect(rendered.querySelector('.episode-vitals')?.textContent).toContain('0 / 1');
    const repeatedCoverage = [...rendered.querySelectorAll('.episode-vitals > div')]
      .find((node) => node.querySelector('dt')?.textContent === 'Repeated coverage');
    expect(repeatedCoverage?.querySelector('dd')?.textContent).toBe('—');
    expect(repeatedCoverage?.querySelector('p')?.textContent).toBe('requires exact episode attribution');
    expect(rendered.querySelectorAll('.episode-record')).toHaveLength(1);
    expect(rendered.querySelector('.episode-record')?.textContent).toContain('Dependabot review');
    const unavailableMeasures = [...rendered.querySelectorAll('.episode-measures > div')]
      .filter((node) => ['Observed targets', 'Attributed workers', 'Output yield'].includes(node.querySelector('dt')?.textContent ?? ''));
    expect(unavailableMeasures.map((node) => node.querySelector('dd')?.textContent)).toEqual(['—', '—', '—']);
    expect(rendered.querySelector('.episode-record footer')?.textContent).toContain('No-action attempts unavailable');
    expect(rendered.querySelector('.episode-attribution-gap')?.textContent).toContain('1 worker dispatch lacks episode evidence');
  });
});
