// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDashboard } from '../../src/renderer.js';

describe('linked text refactor behavior preservation', () => {
  it('preserves workflow-topology and derived-link rendering for affected call sites', () => {
    const document = {
      languageVersion: '0.1.0',
      dashboard: {
        id: 'workflow-topology-links-dashboard',
        title: 'Workflow Topology Links',
        pages: [{ id: 'workflows', kind: /** @type {'built-in'} */ ('built-in'), page: 'workflows', title: 'Workflows' }]
      }
    };

    const rendered = renderDashboard({
      document,
      sources: {
        workflows: {
          source: 'workflows',
          rows: [
            { organization: 'githubnext', repository: 'central-agentic-ops', package: 'dependabot', 'package-name': 'Dependabot', workflow: '.github/workflows/dependabot.yml', 'workflow-name': 'Dependabot', 'workflow-role': 'orchestrator', 'workflow-active': 'true', 'rollout-mode': 'live' },
            { organization: 'github', repository: 'target-service', workflow: '.github/workflows/ci.yml', 'workflow-name': 'CI', 'workflow-role': 'standalone', 'workflow-active': 'true', 'rollout-mode': 'unknown' }
          ],
          metadata: {
            'source-id': 'workflow-topology-links-fixture',
            'source-kind': 'fixture',
            'as-of': '2026-08-30T08:00:00Z',
            'retrieved-at': '2026-08-30T08:01:00Z',
            completeness: 'complete',
            freshness: 'fresh',
            availability: 'available'
          }
        }
      }
    });

    expect(rendered.outerHTML).toContain('class="workflow-topology"');
    expect(rendered.outerHTML).toContain('safe outputs only');
    expect(rendered.outerHTML).toContain('href="https://github.com/githubnext/central-agentic-ops/blob/HEAD/.github/workflows/dependabot.yml"');
    expect(rendered.outerHTML).toContain('href="https://github.com/github/target-service"');
    expect(rendered.outerHTML).toContain('href="https://github.com/github/target-service/blob/HEAD/.github/workflows/ci.yml"');
  });
});
