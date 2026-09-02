import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardLanguageSources } from "../../dashboard/report/dashboard-language-sources.mjs";

test("dashboard source bridge carries package memberships, allowance, and inventory readiness into workflow rows", () => {
  const workflowPath = ".github/workflows/package.lock.yml";
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-08-30T12:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [{
        repository: "githubnext/central-agentic-ops",
        path: "aw.yml",
        name: "Central Agentic Ops",
        workflows: [{ lockPath: workflowPath }],
      }, {
        repository: "githubnext/central-agentic-ops",
        path: "ambient-context/aw.yml",
        name: "Ambient Context",
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
    report: {
      generatedAt: "2026-08-30T12:00:00Z",
      records: [{
        id: "ambient-context-output",
        bundle: "ambient-context",
        repository: "githubnext/target",
        runtimeRepository: "githubnext/central-agentic-ops",
        workflowPath,
        runUrl: "https://github.com/githubnext/central-agentic-ops/actions/runs/42",
        conclusion: "failure",
        mode: "review",
      }],
    },
    inventory: {
      workflows: [{ lockPath: workflowPath, maxAiCredits: 500, compiled: true }],
      bundles: [{
        id: "ambient-context",
        name: "Ambient Context",
        workflow: ".github/workflows/package.md",
        controlPackage: "ambient-context",
        maxAiCredits: 500,
        compiled: true,
        missingWorkers: [],
        workers: [],
      }],
    },
    controlSettings: {
      packages: { "ambient-context": { mode: "review" } },
    },
  });

  assert.deepEqual(
    {
      package: sources.workflows.rows[0].package,
      packageName: sources.workflows.rows[0]["package-name"],
      packageMemberships: sources.workflows.rows[0]["package-memberships"],
      maxAiCredits: sources.workflows.rows[0]["max-ai-credits"],
      packageAllowance: sources.workflows.rows[0]["package-aic-allowance"],
      packageWorkerCount: sources.workflows.rows[0]["package-worker-count"],
      inventoryReady: sources.workflows.rows[0]["inventory-ready"],
      rolloutMode: sources.workflows.rows[0]["rollout-mode"],
    },
    {
      package: "ambient-context",
      packageName: "Ambient Context",
      packageMemberships: [
        { id: "ambient-context", name: "Ambient Context" },
      ],
      maxAiCredits: 500,
      packageAllowance: 500,
      packageWorkerCount: 0,
      inventoryReady: true,
      rolloutMode: "review",
    },
  );
  assert.equal(sources.outcomes.rows[0]["run-conclusion"], "failure");
});

test("dashboard source bridge carries canonical coverage diagnostics", () => {
  const input = {
    deployed: {
      generatedAt: "2026-08-31T12:00:00Z",
      includePrivate: false,
      repositoryScope: "organization",
      repositoryCount: 3,
      organizationRepositories: { public: 2, private: 1, internal: 0, total: 3 },
      discovery: { complete: true },
      runHealth: { available: true, complete: true, windowHours: 24 },
      bundles: [],
      workflows: [
        { repository: "githubnext/public", visibility: "public", path: ".github/workflows/public.lock.yml" },
        { repository: "githubnext/unknown", visibility: "unknown", path: ".github/workflows/unknown.lock.yml" },
      ],
    },
    usage: { available: true, complete: false, windowHours: 24, runs: [] },
    operationalValues: { records: [] },
    report: { generatedAt: "2026-08-31T12:00:00Z", records: [] },
    controlSettings: {
      policy_resolution: {
        status: "unavailable",
        reason: "control-plane is required",
      },
    },
  };

  const sources = buildDashboardLanguageSources(input);
  assert.deepEqual(
    {
      runs: {
        start: sources.runs.metadata["coverage-start"],
        end: sources.runs.metadata["coverage-end"],
      },
      usage: {
        start: sources.usage.metadata["coverage-start"],
        end: sources.usage.metadata["coverage-end"],
      },
    },
    {
      runs: { start: "2026-08-30T12:00:00.000Z", end: "2026-08-31T12:00:00Z" },
      usage: { start: "2026-08-30T12:00:00.000Z", end: "2026-08-31T12:00:00Z" },
    },
  );
  assert.deepEqual(sources["coverage-diagnostics"].rows, [
    {
      title: "Control policy resolution unavailable",
      effect: "control-plane is required",
    },
    {
      title: "Private repository discovery is off",
      effect: "Private repositories are excluded from workflow inventory and run-health totals.",
    },
    {
      title: "AIC telemetry is partial",
      effect: "AI Credit totals exclude runs whose usage artifacts could not be collected.",
    },
  ]);
  assert.deepEqual(sources["repository-coverage"].rows, [
    { label: "Discovery scope", value: "Organization" },
    { label: "Repositories in scope", value: "3" },
    { label: "Discovered public", value: "1" },
    { label: "Discovered private", value: "0" },
    { label: "Discovered internal", value: "0" },
    { label: "Unknown visibility", value: "1" },
    { label: "Organization total", value: "3" },
    { label: "Organization public", value: "2" },
    { label: "Organization private", value: "1" },
    { label: "Organization internal", value: "0" },
  ]);
  assert.deepEqual(
    buildDashboardLanguageSources({
      ...input,
      deployed: { ...input.deployed, includePrivate: true },
      usage: { ...input.usage, complete: true },
      controlSettings: { policy_resolution: { status: "available", reason: "" } },
    })["coverage-diagnostics"].rows,
    [],
  );
});

test("dashboard source bridge derives admission gates from resolved control policy", () => {
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-09-02T12:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [],
      workflows: [
        { repository: "acme/control", path: ".github/workflows/operations.lock.yml", name: "Operations", role: "orchestrator", state: "active", runHealth: { runRecords: [] } },
        { repository: "acme/control", path: ".github/workflows/enabled-worker.lock.yml", name: "Enabled worker", role: "worker", state: "active", runHealth: { runRecords: [] } },
        { repository: "acme/control", path: ".github/workflows/disabled-worker.lock.yml", name: "Disabled worker", role: "worker", state: "active", runHealth: { runRecords: [] } },
        { repository: "acme/control", path: ".github/workflows/undeclared-worker.lock.yml", name: "Undeclared worker", role: "worker", state: "active", runHealth: { runRecords: [] } },
        { repository: "acme/control", path: ".github/workflows/disabled-package.lock.yml", name: "Disabled package", role: "orchestrator", state: "active", runHealth: { runRecords: [] } },
        { repository: "acme/control", path: ".github/workflows/undeclared-package.lock.yml", name: "Undeclared package", role: "orchestrator", state: "active", runHealth: { runRecords: [] } },
      ],
    },
    usage: { available: true, complete: true, runs: [] },
    operationalValues: { records: [] },
    report: { generatedAt: "2026-09-02T12:00:00Z", records: [] },
    inventory: {
      workflows: [],
      bundles: [{
        id: "operations",
        name: "Operations",
        workflow: ".github/workflows/operations.md",
        controlPackage: "operations",
        compiled: true,
        missingWorkers: [],
        workers: [
          { id: "enabled-worker", sourcePath: ".github/workflows/enabled-worker.md", lockPath: ".github/workflows/enabled-worker.lock.yml", compiled: true },
          { id: "disabled-worker", sourcePath: ".github/workflows/disabled-worker.md", lockPath: ".github/workflows/disabled-worker.lock.yml", compiled: true },
          { id: "undeclared-worker", sourcePath: ".github/workflows/undeclared-worker.md", lockPath: ".github/workflows/undeclared-worker.lock.yml", compiled: true },
        ],
      }, {
        id: "disabled-package",
        name: "Disabled package",
        workflow: ".github/workflows/disabled-package.md",
        controlPackage: "disabled-package",
        compiled: true,
        missingWorkers: [],
        workers: [],
      }, {
        id: "undeclared-package",
        name: "Undeclared package",
        workflow: ".github/workflows/undeclared-package.md",
        controlPackage: "undeclared-package",
        compiled: true,
        missingWorkers: [],
        workers: [],
      }],
    },
    controlSettings: {
      packages: {
        operations: {
          enabled: true,
          worker_policies: {
            "enabled-worker": { worker: "enabled", enabled: true, max_mode: null },
            "disabled-worker": { worker: "disabled", enabled: false, max_mode: null },
          },
        },
        "disabled-package": {
          enabled: false,
          worker_policies: {},
        },
      },
    },
  });

  assert.deepEqual(sources.workflows.rows.map((row) => ({
    workflow: row.workflow,
    status: row["admission-status"],
    reason: row["admission-reason"],
  })), [
    { workflow: ".github/workflows/operations.md", status: "authorized", reason: "authorized" },
    { workflow: ".github/workflows/enabled-worker.md", status: "authorized", reason: "authorized" },
    { workflow: ".github/workflows/disabled-worker.md", status: "blocked", reason: "worker-disabled" },
    { workflow: ".github/workflows/undeclared-worker.md", status: "blocked", reason: "worker-undeclared" },
    { workflow: ".github/workflows/disabled-package.md", status: "blocked", reason: "package-disabled" },
    { workflow: ".github/workflows/undeclared-package.md", status: "blocked", reason: "package-undeclared" },
  ]);
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

test("dashboard source bridge preserves report observation identity, diagnostics, and historical coverage", () => {
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-09-01T12:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [],
      workflows: [],
    },
    usage: { available: true, complete: true, runs: [] },
    operationalValues: {
      schemaVersion: 1,
      generatedAt: "2026-09-01T11:30:00Z",
      window: {
        startAt: "2026-01-01T00:00:00Z",
        endAt: "2026-09-01T11:00:00Z",
      },
      complete: true,
      definitions: [{
        repository: "github/gh-aw",
        workflowId: "daily-file-diet",
        evaluatorDigest: "1234567890abcdef",
        diagnosticMetrics: [{ id: "repository-health", name: "Repository health", direction: "higher_is_better" }],
      }],
      records: [{
        repository: "github/gh-aw",
        workflowId: "daily-file-diet",
        workflowPath: ".github/workflows/daily-file-diet.lock.yml",
        runId: 42,
        runAttempt: 2,
        runUrl: "https://github.com/github/gh-aw/actions/runs/42",
        status: "pass",
        value: 0.8,
        evaluatorDigest: "1234567890abcdef",
        diagnostics: { "repository-health": 0.65 },
        observation: {
          evidenceAt: "2026-08-31T10:00:00Z",
          evidenceCutoff: "2026-08-31T09:00:00Z",
          opportunityKey: "github/gh-aw#42",
          mature: true,
          case: { targetRepo: "github/gh-aw" },
          provenance: [{ repository: "github/gh-aw", sha: "abc123", path: "pkg/cli" }],
        },
      }],
    },
    report: { generatedAt: "2026-09-01T12:00:00Z", records: [] },
  });

  assert.deepEqual(
    sources["operational-values"].rows[0],
    {
      organization: "github",
      repository: "gh-aw",
      "repository-name": "gh-aw",
      workflow: ".github/workflows/daily-file-diet.md",
      run: "42",
      "run-attempt": 2,
      "observation-id": "github/gh-aw:daily-file-diet:42:2:1234567890abcdef",
      experiment: "",
      "operational-case": "github/gh-aw#42",
      "evaluator-digest": "1234567890abcdef",
      "rollout-mode": "unknown",
      "operational-value": 0.8,
      "operational-value-definition": "daily-file-diet",
      "requested-evidence-at": "2026-08-31T10:00:00Z",
      "evidence-cutoff": "2026-08-31T09:00:00Z",
      "maturity-at": "2026-08-31T10:00:00Z",
      "maturity-status": "matured",
      "baseline-value": undefined,
      "delta-from-baseline": undefined,
      "observed-at": "2026-08-31T10:00:00Z",
      "accepted-evidence-provenance": [{ repository: "github/gh-aw", sha: "abc123", path: "pkg/cli" }],
      diagnostics: { "repository-health": 0.65 },
      "diagnostic-definitions": [{ id: "repository-health", name: "Repository health", direction: "higher_is_better" }],
      "evidence-link": {
        relation: "evidence",
        href: "https://github.com/github/gh-aw/actions/runs/42",
        label: "View run 42",
      },
      "run-link": {
        relation: "run",
        href: "https://github.com/github/gh-aw/actions/runs/42",
        label: "Run 42",
      },
    },
  );
  assert.deepEqual(
    {
      asOf: sources["operational-values"].metadata["as-of"],
      retrievedAt: sources["operational-values"].metadata["retrieved-at"],
      coverageStart: sources["operational-values"].metadata["coverage-start"],
      coverageEnd: sources["operational-values"].metadata["coverage-end"],
      completeness: sources["operational-values"].metadata.completeness,
    },
    {
      asOf: "2026-09-01T11:00:00Z",
      retrievedAt: "2026-09-01T11:30:00Z",
      coverageStart: "2026-01-01T00:00:00Z",
      coverageEnd: "2026-09-01T11:00:00Z",
      completeness: "complete",
    },
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
        number: 1,
        bundle: "daily",
        repository: "githubnext/central-agentic-ops",
        runtimeRepository: "githubnext/control-plane",
        workflowPath: ".github/workflows/daily.lock.yml",
        workflow: "Daily review",
        mode: "live",
        warning: true,
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
      runtimeRepository: sources.outcomes.rows[0]["runtime-repository"],
      package: sources.outcomes.rows[0].package,
      workflowName: sources.outcomes.rows[0]["workflow-name"],
      title: sources.outcomes.rows[0]["outcome-title"],
      number: sources.outcomes.rows[0]["outcome-number"],
      summary: sources.outcomes.rows[0]["outcome-summary"],
      bodyHtml: sources.outcomes.rows[0]["outcome-body-html"],
      category: sources.outcomes.rows[0]["outcome-category"],
      status: sources.outcomes.rows[0]["outcome-status"],
      mode: sources.outcomes.rows[0]["rollout-mode"],
      warning: sources.outcomes.rows[0]["outcome-warning"],
      publishedAt: sources.outcomes.rows[0]["published-at"],
    },
    {
      workflow: ".github/workflows/daily.md",
      runtimeRepository: "githubnext/control-plane",
      package: "daily",
      workflowName: "Daily review",
      title: "Parity verification sweep",
      number: 1,
      summary: "All checks passed.",
      bodyHtml: "<h2>Summary</h2><p>All checks passed.</p>",
      category: "pull-request",
      status: "closed",
      mode: "live",
      warning: "Warning",
      publishedAt: "2026-08-31T10:00:00Z",
    },
  );
});
