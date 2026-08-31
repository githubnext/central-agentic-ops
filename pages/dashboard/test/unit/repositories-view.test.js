import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderRepositoryScope } from '../../src/components/repositories-view.js';
import { deriveRepositorySources, summarizeRepositories } from '../../src/repository-data.js';

const dashboard = JSON.parse(readFileSync(`${process.cwd()}/dashboard.json`, 'utf8'));

/** @type {import('../../src/presenter.js').SourceMetadata} */
const metadata = {
  'source-id': 'fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-31T18:00:00Z',
  'retrieved-at': '2026-08-31T18:01:00Z',
  completeness: 'complete',
  freshness: 'fresh',
  availability: 'available'
};

/**
 * @param {string} name
 * @param {Array<Record<string, unknown>>} rows
 * @param {Partial<import('../../src/presenter.js').SourceMetadata>} [overrides]
 */
function source(name, rows, overrides = {}) {
  return { source: name, rows, metadata: { ...metadata, ...overrides } };
}

function sources() {
  return {
    repositories: source('repositories', [
      { organization: 'octo', repository: 'quiet' },
      { organization: 'octo', repository: 'failing' },
      { organization: 'octo', repository: 'active' }
    ]),
    workflows: source('workflows', [
      { organization: 'octo', repository: 'failing', workflow: 'one', 'workflow-active': 'true' },
      { organization: 'octo', repository: 'failing', workflow: 'two', 'workflow-active': 'true' },
      { organization: 'octo', repository: 'active', workflow: 'three', 'workflow-active': 'true' },
      { organization: 'octo', repository: 'quiet', workflow: 'four', 'workflow-active': 'false' }
    ]),
    runs: source('runs', [
      { organization: 'octo', repository: 'failing', run: '1', 'run-conclusion': 'failure' },
      { organization: 'octo', repository: 'failing', run: '1', 'run-conclusion': 'failure' },
      { organization: 'octo', repository: 'failing', run: '2', 'run-conclusion': 'success' },
      { organization: 'octo', repository: 'active', run: '3', 'run-conclusion': 'success' }
    ], { 'coverage-start': '2026-08-30T18:00:00Z', 'coverage-end': '2026-08-31T18:00:00Z' }),
    outcomes: source('outcomes', [
      { organization: 'octo', repository: 'quiet', 'safe-output': 'report-1' }
    ]),
    usage: source('usage', [
      { organization: 'octo', repository: 'failing', run: '1', aic: 12 },
      { organization: 'octo', repository: 'active', run: '3', aic: 8 },
      { organization: 'octo', repository: 'usage-only', run: '4', aic: 100 }
    ], { completeness: 'partial' }),
    'operational-values': source('operational-values', [
      { organization: 'octo', repository: 'quiet', workflow: 'four', 'operational-value': 0.8, 'evaluator-digest': 'sha256:1' },
      { organization: 'octo', repository: 'quiet', workflow: 'four', 'operational-value': 0.9, 'evaluator-digest': 'sha256:1' }
    ])
  };
}

function context() {
  return {
    pageId: 'repositories',
    title: 'Repositories',
    description: 'Repository health.',
    sourceNames: ['repositories', 'workflows', 'runs', 'outcomes', 'usage', 'operational-values'],
    sources: sources(),
    contextDetails: [],
    headingTag: /** @type {'h3'} */ ('h3')
  };
}

describe('repositories view', () => {
  it('aggregates repository activity using report ordering and status precedence', () => {
    const summaries = summarizeRepositories(sources());

    expect(summaries.map((summary) => summary.repository)).toEqual([
      'octo/failing',
      'octo/active',
      'octo/quiet'
    ]);
    expect(summaries[0]).toMatchObject({
      workflows: 2,
      runs: 2,
      failed: 1,
      aic: 12
    });
    expect(summaries[2]).toMatchObject({
      disabled: 1,
      reports: 1
    });
    expect(summaries[2].evaluatedWorkflowKeys.size).toBe(1);

    const activity = deriveRepositorySources(sources())['repository-activity'];
    expect(activity.rows).toEqual([
      expect.objectContaining({
        repository: 'octo/failing',
        workflows: 2,
        runs: 2,
        'failure-summary': '50% · 1 failed',
        status: 'Needs attention'
      }),
      expect.objectContaining({
        repository: 'octo/active',
        status: 'No failures observed'
      }),
      expect.objectContaining({
        repository: 'octo/quiet',
        status: 'Disabled workflows'
      })
    ]);
  });

  it('renders the configured scope and declares AI Credit usage as a generic chart', () => {
    const viewContext = context();
    const scope = renderRepositoryScope(viewContext);
    const repositoriesPage = dashboard.dashboard.pages.find(
      (/** @type {{ id: string }} */ page) => page.id === 'repositories'
    );
    const usage = repositoriesPage.definition.views.find(
      (/** @type {{ id: string }} */ view) => view.id === 'repositories-by-aic'
    );
    const activity = repositoriesPage.definition.views.find(
      (/** @type {{ id: string }} */ view) => view.id === 'repositories-activity'
    );

    expect(scope.textContent).toContain('Repository scope · 3 configured');
    expect(scope.textContent).toContain('Complete 24-hour Actions run window');
    expect(scope.textContent).toContain('3 artifacts · partial');
    expect(usage).toMatchObject({
      data: { source: 'usage' },
      mark: 'chart',
      chart: 'pie',
      encoding: {
        x: { field: 'repository' },
        y: { field: 'aic', aggregate: 'sum', as: 'total-aic', unit: 'aic' },
        href: { field: 'repository-link' }
      }
    });
    expect(activity).toMatchObject({
      data: { source: 'repository-activity' },
      mark: 'table',
      controls: 'static',
      encoding: {
        columns: [
          { field: 'repository' },
          { field: 'workflows' },
          { field: 'reports' },
          { field: 'evaluated-workflows' },
          { field: 'runs' },
          { field: 'failure-summary' },
          { field: 'aic' },
          { field: 'status', display: 'status' }
        ],
        href: { field: 'repository-link' }
      }
    });
  });

  it('keeps unavailable run and usage evidence explicit', () => {
    const viewContext = context();
    viewContext.sources.runs.metadata = { ...metadata, availability: 'unavailable', completeness: 'unknown' };
    viewContext.sources.usage.metadata = { ...metadata, availability: 'unavailable', completeness: 'unknown' };
    expect(renderRepositoryScope(viewContext).textContent).toContain('Actions run data unavailable');
    expect(deriveRepositorySources(viewContext.sources)['repository-activity'].rows[0]).toMatchObject({
      runs: null,
      'failure-summary': 'Unavailable'
    });
  });
});
