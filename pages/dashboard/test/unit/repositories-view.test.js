import { describe, expect, it } from 'vitest';
import { renderRepositoryActivity, renderRepositoryAicUsage, renderRepositoryScope, summarizeRepositories } from '../../src/components/repositories-view.js';

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
    ]),
    outcomes: source('outcomes', [
      { organization: 'octo', repository: 'quiet', 'safe-output': 'report-1' }
    ]),
    usage: source('usage', [
      { organization: 'octo', repository: 'failing', run: '1', aic: 12 },
      { organization: 'octo', repository: 'active', run: '3', aic: 8 }
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
      reports: 1,
      evaluatedWorkflows: 1
    });

    const rendered = renderRepositoryActivity(context());
    expect(rendered.querySelector('[data-repository="octo/failing"]')?.textContent).toContain('50%');
    expect(rendered.querySelector('[data-repository="octo/failing"] .status-danger')?.textContent).toBe('Needs attention');
    expect(rendered.querySelector('[data-repository="octo/active"] .status-success')?.textContent).toBe('No failures observed');
    expect(rendered.querySelector('[data-repository="octo/quiet"] .status-attention')?.textContent).toBe('Disabled workflows');
  });

  it('renders the configured scope and CAO-style AI Credit summary', () => {
    const viewContext = context();
    const scope = renderRepositoryScope(viewContext);
    const usage = renderRepositoryAicUsage(viewContext);

    expect(scope.textContent).toContain('Repository scope · 3 configured');
    expect(scope.textContent).toContain('Complete Actions run window');
    expect(scope.textContent).toContain('2 artifacts · partial');
    expect(usage.querySelector('[data-chart-widget="pie"] svg')?.getAttribute('aria-label')).toContain('octo/failing 12 AIC');
    expect(usage.textContent).toContain('octo/active');
  });

  it('keeps unavailable run and usage evidence explicit', () => {
    const viewContext = context();
    viewContext.sources.runs.metadata = { ...metadata, availability: 'unavailable', completeness: 'unknown' };
    viewContext.sources.usage.metadata = { ...metadata, availability: 'unavailable', completeness: 'unknown' };

    expect(renderRepositoryScope(viewContext).textContent).toContain('Actions run data unavailable');
    expect(renderRepositoryAicUsage(viewContext).textContent).toContain('AI Credit usage data is unavailable.');
    expect(renderRepositoryActivity(viewContext).textContent).toContain('Unavailable');
  });
});
