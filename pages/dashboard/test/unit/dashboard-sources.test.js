import { describe, expect, it } from 'vitest';
import { buildDashboardLanguageSources } from '../../../../dashboard/report/dashboard-language-sources.mjs';

describe('dashboard report source bridge', () => {
  it('carries package allowance and inventory readiness into workflow rows', () => {
    const workflowPath = '.github/workflows/package.lock.yml';
    const sources = buildDashboardLanguageSources({
      deployed: {
        generatedAt: '2026-08-30T12:00:00Z',
        discovery: { complete: true },
        runHealth: { available: true, complete: true },
        bundles: [{
          repository: 'githubnext/central-agentic-ops',
          name: 'Package',
          workflows: [{ lockPath: workflowPath }]
        }],
        workflows: [{
          repository: 'githubnext/central-agentic-ops',
          path: workflowPath,
          name: 'Package',
          role: 'orchestrator',
          state: 'active',
          runHealth: { runRecords: [] }
        }]
      },
      usage: { available: true, complete: true, runs: [] },
      operationalValues: { records: [] },
      report: { generatedAt: '2026-08-30T12:00:00Z', records: [] },
      inventory: {
        workflows: [{ lockPath: workflowPath, maxAiCredits: 500, compiled: true }],
        bundles: [{
          workflow: '.github/workflows/package.md',
          maxAiCredits: 500,
          compiled: true,
          missingWorkers: [],
          workers: []
        }]
      }
    });

    expect(sources.workflows.rows).toMatchObject([{
      package: 'Package',
      'package-name': 'Package',
      'max-ai-credits': 500,
      'inventory-ready': true
    }]);
  });
});
