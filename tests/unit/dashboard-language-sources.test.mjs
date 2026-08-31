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
        controlPackage: "package",
        maxAiCredits: 500,
        compiled: true,
        missingWorkers: [],
        workers: [],
      }],
    },
    controlSettings: {
      packages: { package: { mode: "review" } },
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
      rolloutMode: sources.workflows.rows[0]["rollout-mode"],
    },
    {
      package: "Package",
      packageName: "Package",
      maxAiCredits: 500,
      packageAllowance: 500,
      packageWorkerCount: 0,
      inventoryReady: true,
      rolloutMode: "review",
    },
  );
});

test("dashboard source bridge retains unavailable grader records separately from value observations", () => {
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-08-31T12:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [],
      workflows: [],
    },
    usage: { available: true, complete: true, runs: [] },
    operationalValues: {
      records: [
        {
          workflowId: "daily-value",
          workflowPath: ".github/workflows/daily-value.lock.yml",
          runId: 42,
          runUrl: "https://github.com/githubnext/central-agentic-ops/actions/runs/42",
          status: "pass",
          value: 0.8,
          baselineValue: 0.5,
          deltaFromBaseline: 0.3,
          evaluatorDigest: "1234567890abcdef",
          observation: {
            evidenceAt: "2026-08-31T10:00:00Z",
            opportunityKey: "githubnext/central-agentic-ops#42",
            mature: false,
            case: { targetRepo: "githubnext/central-agentic-ops" },
          },
        },
        {
          workflowId: "missing-value",
          workflowPath: ".github/workflows/missing-value.lock.yml",
          repository: "githubnext/central-agentic-ops",
          runId: 43,
          status: "unavailable",
        },
      ],
    },
    report: { generatedAt: "2026-08-31T12:00:00Z", records: [] },
  });

  assert.equal(sources["operational-values"].rows.length, 1);
  assert.equal(sources["grader-observations"].rows.length, 2);
  assert.deepEqual(
    sources["grader-observations"].rows.map((row) => ({
      grader: row.grader,
      status: row.status,
      maturity: row["maturity-status"],
      baseline: row["baseline-value"],
      run: row.run,
      runHref: row["run-link"]?.href,
    })),
    [
      {
        grader: "daily-value",
        status: "pass",
        maturity: "interim",
        baseline: 0.5,
        run: "42",
        runHref: "https://github.com/githubnext/central-agentic-ops/actions/runs/42",
      },
      {
        grader: "missing-value",
        status: "unavailable",
        maturity: "unavailable",
        baseline: undefined,
        run: "43",
        runHref: "https://github.com/githubnext/central-agentic-ops/actions/runs/43",
      },
    ],
  );
});
