import { describe, expect, it } from 'vitest';
import { deriveRuntimeSources } from '../../src/runtime-data.js';

const metadata = {
  'source-id': 'runtime-fixture',
  'source-kind': 'fixture',
  'as-of': '2026-08-30T12:00:00Z',
  'retrieved-at': '2026-08-30T12:01:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

describe('runtime data', () => {
  it('derives reusable signal-list rows independently from presentation', () => {
    const sources = deriveRuntimeSources({
      workflows: {
        source: 'workflows',
        rows: [
          { organization: 'githubnext', repository: 'central-agentic-ops', workflow: '.github/workflows/root.md', 'workflow-name': 'Root', 'workflow-role': 'orchestrator', package: 'ops' },
          { organization: 'githubnext', repository: 'central-agentic-ops', workflow: '.github/workflows/worker.md', 'workflow-name': 'Worker', 'workflow-role': 'worker' }
        ],
        metadata
      },
      runs: {
        source: 'runs',
        rows: [
          { organization: 'githubnext', repository: 'central-agentic-ops', workflow: '.github/workflows/root.md', run: '1', 'run-conclusion': 'action-required' },
          { organization: 'githubnext', repository: 'central-agentic-ops', workflow: '.github/workflows/worker.md', run: '2', 'run-conclusion': 'failure' }
        ],
        metadata
      }
    });

    expect(sources['runtime-signals'].rows.map((row) => row.kind)).toEqual([
      'Run failures',
      'Approval gate',
      'Evidence gap',
      'Evidence gap',
      'Evaluation boundary'
    ]);
    expect(sources['runtime-signals'].rows[0]['navigation-href']).toBe(
      '#page-workflow-runtime?workflow=githubnext%2Fcentral-agentic-ops%3A.github%2Fworkflows%2Fworker.md'
    );
    expect(sources['runtime-signals'].metadata).toBe(metadata);
    expect(sources['runtime-episode-summary'].rows).toEqual([
      { label: 'Root episodes', value: '1' },
      { label: 'Worker attribution', value: '0 / 1' },
      { label: 'Run window', value: 'Complete 24h' },
      { label: 'Repeated coverage', value: 'Unavailable' }
    ]);
    expect(sources['runtime-episodes'].rows).toEqual([
      expect.objectContaining({
        run: '1',
        workflow: 'Root',
        status: 'action-required',
        attribution: 'Root only'
      })
    ]);
    expect(sources['runtime-attribution-gaps'].rows).toEqual([
      expect.objectContaining({
        run: '2',
        workflow: 'Worker',
        status: 'failure',
        evidence: 'No retained root correlation ID'
      })
    ]);
  });

  it('derives JSON-classified workflow_dispatch rows independently from presentation', () => {
    const sources = deriveRuntimeSources({
      workflows: {
        source: 'workflows',
        rows: [
          { organization: 'githubnext', repository: 'control', workflow: 'worker.yml', 'workflow-name': 'Dependency updater', 'workflow-role': 'worker', package: 'dependabot', 'package-name': 'Dependabot' },
          { organization: 'githubnext', repository: 'control', workflow: 'root.yml', 'workflow-name': 'Dependency orchestrator', 'workflow-role': 'orchestrator', package: 'dependabot' },
          { organization: 'githubnext', repository: 'control', workflow: 'standalone.yml', 'workflow-name': 'Standalone task', 'workflow-role': 'standalone' }
        ],
        metadata
      },
      runs: {
        source: 'runs',
        rows: [
          { organization: 'githubnext', repository: 'control', workflow: 'worker.yml', run: '3', event: 'workflow_dispatch', 'run-title': 'Update dependencies', 'started-at': '2026-08-30T07:00:00Z', 'run-conclusion': 'action-required', 'run-link': { relation: 'run', href: 'https://github.com/githubnext/control/actions/runs/3', label: 'Run 3' } },
          { organization: 'githubnext', repository: 'control', workflow: 'root.yml', run: '2', event: 'workflow_dispatch', 'run-conclusion': 'success' },
          { organization: 'githubnext', repository: 'control', workflow: 'standalone.yml', run: '1', event: 'workflow_dispatch', 'run-status': 'in-progress' },
          { organization: 'githubnext', repository: 'control', workflow: 'worker.yml', run: '0', event: 'schedule', 'run-conclusion': 'failure' }
        ],
        metadata
      }
    });

    expect(sources.dispatches.rows).toEqual([
      expect.objectContaining({ 'dispatch-type': 'Package worker', 'package-name': 'Dependabot', 'run-title': 'Update dependencies', status: 'action-required' }),
      expect.objectContaining({ 'dispatch-type': 'Package orchestrator', 'package-name': 'dependabot', 'run-title': 'Run 2', status: 'success' }),
      expect.objectContaining({ 'dispatch-type': 'Standalone workflow', 'package-name': 'Not packaged', 'runtime-repository': 'githubnext/control', status: 'in-progress' })
    ]);
    expect(sources.dispatches.metadata).toBe(metadata);
  });
});
