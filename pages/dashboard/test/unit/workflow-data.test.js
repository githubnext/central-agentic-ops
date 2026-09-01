import { describe, expect, it } from 'vitest';
import { deriveWorkflowSources } from '../../src/workflow-data.js';

const metadata = {
  'source-id': 'workflow-fixture',
  'source-kind': 'fixture',
  'as-of': '2026-09-01T00:00:00Z',
  'retrieved-at': '2026-09-01T00:01:00Z',
  completeness: /** @type {'complete'} */ ('complete'),
  freshness: /** @type {'fresh'} */ ('fresh'),
  availability: /** @type {'available'} */ ('available')
};

describe('deriveWorkflowSources', () => {
  it('emits summary, packaged, and standalone rows for declarative topology views', () => {
    const sources = deriveWorkflowSources({
      workflows: {
        source: 'workflows',
        metadata,
        rows: [
          workflow({ workflow: 'worker.md', 'workflow-name': 'Worker', 'workflow-role': 'worker' }),
          workflow({ workflow: 'root.md', 'workflow-name': 'Root', 'workflow-role': 'orchestrator' }),
          workflow({
            package: undefined,
            'package-name': undefined,
            repository: 'target',
            workflow: 'local.md',
            'workflow-name': 'Local',
            'workflow-role': 'standalone'
          })
        ]
      }
    });

    expect(sources['workflow-topology-summary'].rows).toEqual([
      { label: 'Packages', value: '1' },
      { label: 'Package workflows', value: '2' },
      { label: 'Standalone workflows', value: '1' }
    ]);
    expect(sources['packaged-workflows'].rows.map((row) => row['workflow-role'])).toEqual(['orchestrator', 'worker']);
    expect(sources['packaged-workflows'].rows[0]).toEqual(expect.objectContaining({
      'package-name': 'Dependabot',
      repository: 'githubnext/control',
      workflow: 'root.md'
    }));
    expect(sources['packaged-workflows'].rows[0]['package-link']).toEqual(expect.objectContaining({
      'dashboard-href': '#page-operational-value?package=dependabot'
    }));
    expect(sources['standalone-workflows'].rows).toEqual([
      expect.objectContaining({ repository: 'githubnext/target', workflow: 'local.md' })
    ]);
    expect(sources['packaged-workflows'].metadata).toBe(metadata);
  });

  it('does not present a bare organization as a qualified repository', () => {
    const sources = deriveWorkflowSources({
      workflows: {
        source: 'workflows',
        metadata,
        rows: [workflow({
          package: undefined,
          'package-name': undefined,
          repository: '',
          workflow: 'local.md',
          'workflow-name': 'Local',
          'workflow-role': 'standalone'
        })]
      }
    });

    expect(sources['standalone-workflows'].rows[0].repository).toBe('unknown');
  });
});

/** @param {Record<string, unknown>} overrides */
function workflow(overrides) {
  return {
    organization: 'githubnext',
    repository: 'control',
    package: 'dependabot',
    'package-name': 'Dependabot',
    'workflow-active': 'true',
    'rollout-mode': 'review',
    'repository-link': {
      relation: 'repository',
      href: 'https://github.com/githubnext/control',
      label: 'View control'
    },
    'workflow-link': {
      relation: 'workflow',
      href: `https://github.com/githubnext/control/blob/HEAD/${String(overrides.workflow)}`,
      label: `View ${String(overrides['workflow-name'])}`
    },
    ...overrides
  };
}
