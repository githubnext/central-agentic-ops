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

test("dashboard source bridge carries outcome detail content and presentation metadata", () => {
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-08-31T12:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [],
      workflows: [],
    },
    usage: { available: true, complete: true, runs: [] },
    operationalValues: { records: [] },
    report: {
      generatedAt: "2026-08-31T12:00:00Z",
      records: [{
        id: "outcome-1",
        bundle: "daily",
        repository: "githubnext/central-agentic-ops",
        workflowPath: ".github/workflows/daily.lock.yml",
        workflow: "Daily review",
        mode: "live",
        kind: "pull-request",
        state: "closed",
        title: "Parity verification sweep",
        summary: "All checks passed.",
        bodyHtml: "<h2>Summary</h2><p>All checks passed.</p>",
        createdAt: "2026-08-31T10:00:00Z",
        updatedAt: "2026-08-31T11:00:00Z",
        url: "https://github.com/githubnext/central-agentic-ops/pull/1",
        runUrl: "https://github.com/githubnext/central-agentic-ops/actions/runs/1",
      }],
    },
  });

  assert.deepEqual(
    {
      workflow: sources.outcomes.rows[0].workflow,
      package: sources.outcomes.rows[0].package,
      workflowName: sources.outcomes.rows[0]["workflow-name"],
      title: sources.outcomes.rows[0]["outcome-title"],
      summary: sources.outcomes.rows[0]["outcome-summary"],
      bodyHtml: sources.outcomes.rows[0]["outcome-body-html"],
      category: sources.outcomes.rows[0]["outcome-category"],
      status: sources.outcomes.rows[0]["outcome-status"],
      mode: sources.outcomes.rows[0]["rollout-mode"],
      publishedAt: sources.outcomes.rows[0]["published-at"],
    },
    {
      workflow: ".github/workflows/daily.md",
      package: "daily",
      workflowName: "Daily review",
      title: "Parity verification sweep",
      summary: "All checks passed.",
      bodyHtml: "<h2>Summary</h2><p>All checks passed.</p>",
      category: "pull-request",
      status: "closed",
      mode: "live",
      publishedAt: "2026-08-31T10:00:00Z",
    },
  );
});
