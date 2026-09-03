import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardLanguageSources } from "../../dashboard/report/dashboard-language-sources.mjs";

test("dashboard source bridge carries API capacity admission blocks into run rows", () => {
  const workflowPath = ".github/workflows/self-care.lock.yml";
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-09-02T21:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [],
      workflows: [{
        repository: "githubnext/gh-aw-cao",
        path: workflowPath,
        name: "SelfCare",
        state: "active",
        runHealth: { runRecords: [{
          runId: 33682053183,
          status: "completed",
          conclusion: "failure",
          event: "schedule",
          startedAt: "2026-09-02T20:54:26Z",
          updatedAt: "2026-09-02T20:54:39Z",
          admissionStatus: "resource-limited",
          admissionReason: "github-api-capacity-insufficient",
          resource: "github-rest-api",
          resourceResetAt: "2026-09-02T22:04:33.000Z",
          resourceWaitHours: 1.08,
        }] },
      }],
    },
    usage: { available: true, complete: true, runs: [] },
    operationalValues: { records: [] },
    report: { generatedAt: "2026-09-02T21:00:00Z", records: [] },
  });

  assert.deepEqual(
    Object.fromEntries(Object.entries(sources.runs.rows[0]).filter(([key]) => [
      "admission-status", "admission-reason", "resource", "resource-reset-at", "resource-wait-hours",
    ].includes(key))),
    {
      "admission-status": "resource-limited",
      "admission-reason": "github-api-capacity-insufficient",
      resource: "github-rest-api",
      "resource-reset-at": "2026-09-02T22:04:33.000Z",
      "resource-wait-hours": 1.08,
    },
  );
});

test("dashboard source bridge detects rollout mode from run titles with punctuation separators", () => {
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-09-03T06:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [],
      workflows: [{
        repository: "githubnext/gh-aw-cao",
        path: ".github/workflows/review-live.lock.yml",
        name: "Review Live",
        state: "active",
        runHealth: { runRecords: [{
          runId: 99,
          status: "completed",
          conclusion: "success",
          displayTitle: "Review Live: review",
          startedAt: "2026-09-03T05:00:00Z",
          updatedAt: "2026-09-03T05:10:00Z",
        }] },
      }],
    },
    usage: { available: true, complete: true, runs: [] },
    operationalValues: { records: [] },
    report: { generatedAt: "2026-09-03T06:00:00Z", records: [] },
  });

  assert.equal(sources.runs.rows[0]["rollout-mode"], "review");
});

test("dashboard source bridge keeps partial workflow inventory available when discovery is incomplete", () => {
  const input = {
    deployed: {
      generatedAt: "2026-09-03T06:00:00Z",
      discovery: { complete: false },
      runHealth: { available: false, complete: false },
      bundles: [],
      workflows: [{
        repository: "githubnext/gh-aw-cao",
        path: ".github/workflows/self-care.lock.yml",
        name: "SelfCare",
        state: "active",
      }],
    },
    usage: { available: false, complete: false, runs: [] },
    operationalValues: { records: [] },
    report: { generatedAt: "2026-09-03T06:00:00Z", records: [] },
  };

  const partial = buildDashboardLanguageSources(input);
  assert.equal(partial.workflows.rows.length, 1);
  assert.equal(partial.workflows.metadata.availability, "available");
  assert.equal(partial.workflows.metadata.completeness, "partial");

  const unavailable = buildDashboardLanguageSources({
    ...input,
    deployed: { ...input.deployed, workflows: [] },
  });
  assert.equal(unavailable.workflows.rows.length, 0);
  assert.equal(unavailable.workflows.metadata.availability, "unavailable");
  assert.equal(unavailable.workflows.metadata.completeness, "partial");
});

test("dashboard source bridge carries package memberships, allowance, and inventory readiness into workflow rows", () => {
  const workflowPath = ".github/workflows/package.lock.yml";
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-08-30T12:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [{
        repository: "githubnext/gh-aw-cao",
        path: "aw.yml",
        name: "Central Agentic Ops",
        workflows: [{ lockPath: workflowPath }],
      }, {
        repository: "githubnext/gh-aw-cao",
        path: "ambient-context/aw.yml",
        name: "Ambient Context",
        workflows: [{ lockPath: workflowPath }],
      }],
      workflows: [{
        repository: "githubnext/gh-aw-cao",
        path: workflowPath,
        name: "Package",
        role: "orchestrator",
        state: "active",
        ghAwVersion: "v0.88.0",
        updateState: "up-to-date",
        ghAwMetadata: { compiler_version: "v0.88.0", strict: true },
        ghAwManifest: { version: 1, actions: [] },
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
        runtimeRepository: "githubnext/gh-aw-cao",
        workflowPath,
        runUrl: "https://github.com/githubnext/gh-aw-cao/actions/runs/42",
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
      packages: { "ambient-context": { mode: "review", icon: "workflow" } },
    },
  });

  assert.deepEqual(
    {
      package: sources.workflows.rows[0].package,
      packageName: sources.workflows.rows[0]["package-name"],
      packageIcon: sources.workflows.rows[0]["package-icon"],
      packageMemberships: sources.workflows.rows[0]["package-memberships"],
      maxAiCredits: sources.workflows.rows[0]["max-ai-credits"],
      packageAllowance: sources.workflows.rows[0]["package-aic-allowance"],
      packageWorkerCount: sources.workflows.rows[0]["package-worker-count"],
      inventoryReady: sources.workflows.rows[0]["inventory-ready"],
      rolloutMode: sources.workflows.rows[0]["rollout-mode"],
      ghAwVersion: sources.workflows.rows[0]["gh-aw-version"],
      updateState: sources.workflows.rows[0]["gh-aw-update-state"],
      metadata: sources.workflows.rows[0]["gh-aw-metadata"],
      manifest: sources.workflows.rows[0]["gh-aw-manifest"],
    },
    {
      package: "ambient-context",
      packageName: "Ambient Context",
      packageIcon: "workflow",
      packageMemberships: [
        { id: "ambient-context", name: "Ambient Context" },
      ],
      maxAiCredits: 500,
      packageAllowance: 500,
      packageWorkerCount: 0,
      inventoryReady: true,
      rolloutMode: "review",
      ghAwVersion: "v0.88.0",
      updateState: "up-to-date",
      metadata: { compiler_version: "v0.88.0", strict: true },
      manifest: { version: 1, actions: [] },
    },
  );
  assert.equal(sources.outcomes.rows[0]["run-conclusion"], "failure");
});

test("dashboard source bridge maps a legacy manifest-derived package identity to the canonical inventory bundle id", () => {
  const orchestratorPath = ".github/workflows/uk-ai-advisory.lock.yml";
  const workerPath = ".github/workflows/advisory-uk-ai-operational-resilience.lock.yml";
  const standalonePath = ".github/workflows/advisory-package-maintainer.lock.yml";
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-09-02T12:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [{
        repository: "githubnext/gh-aw-cao",
        path: "advisory/aw.yml",
        name: "UK AI Advisory",
        workflows: [
          { lockPath: orchestratorPath },
          { lockPath: workerPath },
          { lockPath: standalonePath },
        ],
      }],
      workflows: [
        { repository: "githubnext/gh-aw-cao", path: orchestratorPath, name: "UK AI Advisory", role: "orchestrator", state: "active" },
        { repository: "githubnext/gh-aw-cao", path: workerPath, name: "Operational Resilience", role: "worker", state: "active" },
        { repository: "githubnext/gh-aw-cao", path: standalonePath, name: "Package Maintainer", state: "active" },
      ],
    },
    usage: { available: true, complete: true, runs: [] },
    operationalValues: { records: [] },
    report: { generatedAt: "2026-09-02T12:00:00Z", records: [] },
    inventory: {
      workflows: [
        { sourcePath: ".github/workflows/uk-ai-advisory.md", lockPath: orchestratorPath, compiled: true },
        { sourcePath: ".github/workflows/advisory-uk-ai-operational-resilience.md", lockPath: workerPath, compiled: true },
      ],
      bundles: [{
        id: "uk-ai-advisory",
        name: "UK AI Advisory",
        workflow: ".github/workflows/uk-ai-advisory.md",
        controlPackage: "advisory",
        maxAiCredits: 250,
        compiled: true,
        missingWorkers: [],
        workers: [{
          id: "advisory-uk-ai-operational-resilience",
          sourcePath: ".github/workflows/advisory-uk-ai-operational-resilience.md",
          lockPath: workerPath,
          maxAiCredits: 600,
          compiled: true,
        }],
      }],
    },
    controlSettings: {
      packages: { advisory: { mode: "review" } },
    },
  });

  const packagesById = new Map(sources.workflows.rows.map((row) => [row.workflow, row.package]));
  assert.equal(packagesById.get(".github/workflows/uk-ai-advisory.md"), "uk-ai-advisory");
  assert.equal(packagesById.get(".github/workflows/advisory-uk-ai-operational-resilience.md"), "uk-ai-advisory");
  assert.equal(packagesById.get(".github/workflows/advisory-package-maintainer.md"), "uk-ai-advisory");
  assert.deepEqual(
    new Set(sources.workflows.rows.map((row) => row.package)),
    new Set(["uk-ai-advisory"]),
  );
});

test("dashboard source bridge carries model and agent metadata into usage and report rows", () => {
  const sources = buildDashboardLanguageSources({
    deployed: {
      generatedAt: "2026-09-02T12:00:00Z",
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      bundles: [],
      workflows: [{
        repository: "githubnext/gh-aw-cao",
        path: ".github/workflows/model-audit.lock.yml",
        name: "Model Audit",
        state: "active",
        runHealth: {
          runRecords: [{
            runId: 42,
            status: "completed",
            conclusion: "success",
            displayTitle: "Model Audit · review",
            engine: "copilot",
            engineVersion: "0.87.9",
            requestedModel: "gpt-5.6-sol",
            resolvedModel: "gpt-5.6-sol",
          }],
        },
      }],
    },
    usage: {
      available: true,
      complete: true,
      runs: [{
        repository: "githubnext/gh-aw-cao",
        runId: 42,
        workflowPath: ".github/workflows/model-audit.lock.yml",
        engine: "copilot",
        engineVersion: "0.87.9",
        requestedModel: "gpt-5.6-sol",
        resolvedModel: "gpt-5.6-sol",
        aic: 12.5,
      }, {
        repository: "githubnext/gh-aw-cao",
        runId: 43,
        workflowPath: ".github/workflows/model-audit.lock.yml",
        engine: "copilot",
        requestedModel: "gpt-5.6-sol",
        resolvedModel: "gpt-5.6-sol",
        aic: null,
      }],
    },
    operationalValues: { records: [] },
    report: {
      generatedAt: "2026-09-02T12:00:00Z",
      records: [{
        id: "model-audit-output",
        repository: "githubnext/gh-aw-cao",
        runtimeRepository: "githubnext/gh-aw-cao",
        workflowPath: ".github/workflows/model-audit.lock.yml",
        runUrl: "https://github.com/githubnext/gh-aw-cao/actions/runs/42",
        engine: "copilot",
        engineVersion: "0.87.9",
        requestedModel: "gpt-5.6-sol",
        resolvedModel: "gpt-5.6-sol",
        mode: "review",
      }],
    },
  });

  assert.deepEqual(
    {
      runEngine: sources.runs.rows[0].engine,
      runVersion: sources.runs.rows[0]["engine-version"],
      usageEngine: sources.usage.rows[0].engine,
      usageVersion: sources.usage.rows[0]["engine-version"],
      usageModel: sources.usage.rows[0]["resolved-model"],
      estimatedUsd: sources.usage.rows[0]["estimated-usd"],
      missingEstimatedUsd: sources.usage.rows[1]["estimated-usd"],
      reportEngine: sources.outcomes.rows[0].engine,
      reportVersion: sources.outcomes.rows[0]["engine-version"],
      reportModel: sources.outcomes.rows[0]["resolved-model"],
    },
    {
      runEngine: "copilot",
      runVersion: "0.87.9",
      usageEngine: "copilot",
      usageVersion: "0.87.9",
      usageModel: "gpt-5.6-sol",
      estimatedUsd: 0.125,
      missingEstimatedUsd: null,
      reportEngine: "copilot",
      reportVersion: "0.87.9",
      reportModel: "gpt-5.6-sol",
    },
  );
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

test("dashboard source bridge exposes rate-limit details for retained records", () => {
  const sources = buildDashboardLanguageSources({
    deployed: {
      includePrivate: true,
      discovery: { complete: true },
      runHealth: { available: true, complete: true },
      workflows: [],
      bundles: [],
    },
    usage: { available: true, complete: true, runs: [] },
    operationalValues: { records: [] },
    inventory: {},
    controlSettings: {},
    report: {
      generatedAt: "2026-09-03T00:00:00Z",
      records: [{ repository: "githubnext/service", updatedAt: "2026-09-02T23:00:00Z" }],
      error: "GitHub API rate limit exceeded",
      errorStatus: 403,
      errorEndpoint: "/repos/githubnext/service/issues",
      rateLimitResetAt: "2026-09-03T01:00:00.000Z",
      snapshotGeneratedAt: "2026-09-02T23:00:00Z",
      snapshotAgeSeconds: 3600,
      stale: true,
    },
  });

  assert.deepEqual(sources["coverage-diagnostics"].rows, [
    {
      kind: "github-api-rate-limit-403",
      title: "Durable output collection unavailable",
      effect: "GitHub API rate limit exceeded",
      endpoint: "/repos/githubnext/service/issues",
      "rate-limit-reset": "2026-09-03T01:00:00.000Z",
      "snapshot-age-seconds": 3600,
    },
    {
      title: "Durable output snapshot is stale",
      effect: "Retained the last successful snapshot from 2026-09-02T23:00:00Z.",
      "snapshot-age-seconds": 3600,
    },
  ]);
  assert.equal(sources.outcomes.metadata.completeness, "partial");
  assert.equal(sources.outcomes.metadata.freshness, "stale");
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
          runUrl: "https://github.com/githubnext/gh-aw-cao/actions/runs/42",
          status: "pass",
          value: 0.8,
          baselineValue: 0.5,
          deltaFromBaseline: 0.3,
          evaluatorDigest: "1234567890abcdef",
          observation: {
            evidenceAt: "2026-08-31T10:00:00Z",
            opportunityKey: "githubnext/gh-aw-cao#42",
            mature: false,
            case: { targetRepo: "githubnext/gh-aw-cao" },
          },
        },
        {
          workflowId: "missing-value",
          workflowPath: ".github/workflows/missing-value.lock.yml",
          repository: "githubnext/gh-aw-cao",
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
        runHref: "https://github.com/githubnext/gh-aw-cao/actions/runs/42",
      },
      {
        grader: "missing-value",
        status: "unavailable",
        maturity: "unavailable",
        baseline: undefined,
        run: "43",
        runHref: "https://github.com/githubnext/gh-aw-cao/actions/runs/43",
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
        repository: "githubnext/gh-aw-cao",
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
        url: "https://github.com/githubnext/gh-aw-cao/pull/1",
        runUrl: "https://github.com/githubnext/gh-aw-cao/actions/runs/1",
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
