import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardLanguageSources } from "../../dashboard/report/dashboard-language-sources.mjs";

test("dashboard source bridge carries package allowance and inventory readiness into workflow rows", () => {
  const workflowPath = ".github/workflows/package.lock.yml";
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-08-30T12:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [{
        repository: "githubnext/central-agentic-ops",
        name: "Package",
        workflows: [{ lockPath: workflowPath }],
      }],
      workflows: [{
        repository: "githubnext/central-agentic-ops",
        path: workflowPath,
        name: "Package",
        role: "orchestrator",
        state: "active",
        runHealth: { runRecords: [] },
      }],
    },
    usage: { available: true, complete: true, runs: [] },
    operationalValues: { records: [] },
    report: { generatedAt: "2026-08-30T12:00:00Z", records: [] },
    inventory: {
      workflows: [{ lockPath: workflowPath, maxAiCredits: 500, compiled: true }],
      bundles: [{
        workflow: ".github/workflows/package.md",
        maxAiCredits: 500,
        compiled: true,
        missingWorkers: [],
        workers: [],
      }],
    },
  });

  assert.deepEqual(
    {
      package: sources.workflows.rows[0].package,
      packageName: sources.workflows.rows[0]["package-name"],
      maxAiCredits: sources.workflows.rows[0]["max-ai-credits"],
      packageAllowance: sources.workflows.rows[0]["package-aic-allowance"],
      packageWorkerCount: sources.workflows.rows[0]["package-worker-count"],
      inventoryReady: sources.workflows.rows[0]["inventory-ready"],
    },
    {
      package: "Package",
      packageName: "Package",
      maxAiCredits: 500,
      packageAllowance: 500,
      packageWorkerCount: 0,
      inventoryReady: true,
    },
  );
});
