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
      '#page-workflow-detail?workflow=githubnext%2Fcentral-agentic-ops%3A.github%2Fworkflows%2Fworker.md'
    );
    expect(sources['runtime-signals'].metadata).toBe(metadata);
  });
});
