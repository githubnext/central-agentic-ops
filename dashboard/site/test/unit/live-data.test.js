import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("live Dashboard Language sources", () => {
  it("loads generated sources progressively and requires an explicit fixture opt-in", () => {
    const preview = readFileSync(resolve("index.html"), "utf8");

    expect(preview.indexOf('fetch("./dashboard.json")')).toBeLessThan(preview.indexOf('fetch("./sources.json")'));
    expect(preview).toContain('renderSources({}, "loading")');
    expect(preview).toContain("dashboard-loading-skeleton");
    expect(preview).toContain("startLoadingProgress(document)");
    expect(preview).toContain("loadingProgress.complete()");
    expect(preview).toContain('fetch("./sources.json")');
    expect(preview).toContain('readCachedSources(window.indexedDB, cacheKey)');
    expect(preview).toContain('renderSources(cachedSources, "cached")');
    expect(preview).toContain("writeCachedSources(window.indexedDB, cacheKey, sources)");
    expect(preview).toContain("dashboard = renderSources(sources)");
    expect(preview).toContain('has("fixtures")');
    expect(preview).toContain("throw new Error(`Unable to load sources.json:");
    expect(preview).toContain("Unable to load live dashboard data:");
    expect(preview).not.toContain("Retain the illustrative fixture data");
  });

  it("maps the operations report inputs into canonical logical sources", () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "dashboard-language-sources-"));
    const inputs = {
      deployed: {
        generatedAt: "2026-08-30T12:00:00Z",
        discovery: { complete: true },
        runHealth: { available: true, complete: true, windowHours: 24 },
        bundles: [{
          repository: "githubnext/central-agentic-ops",
          path: "dependabot/aw.yml",
          name: "Dependabot",
          workflows: [{ lockPath: ".github/workflows/dependabot.lock.yml" }],
        }],
        workflows: [{
          repository: "githubnext/central-agentic-ops",
          path: ".github/workflows/dependabot.lock.yml",
          name: "Dependabot",
          role: "orchestrator",
          state: "active",
          updatedAt: "2026-08-30T11:00:00Z",
          runHealth: {
            runRecords: [{
              runId: 42,
              status: "completed",
              conclusion: "action_required",
              event: "workflow_dispatch",
              startedAt: "2026-08-30T10:00:00Z",
              updatedAt: "2026-08-30T10:05:00Z",
              displayTitle: "Dependabot · review",
            }],
          },
        }],
      },
      usage: {
        generatedAt: "2026-08-30T12:00:00Z",
        available: true,
        complete: true,
        runs: [{
          repository: "githubnext/central-agentic-ops",
          runId: 42,
          workflowPath: ".github/workflows/dependabot.lock.yml",
          mode: "review",
          createdAt: "2026-08-30T10:00:00Z",
          aic: 2.5,
        }],
      },
      operationalValues: {
        records: [{
          repository: "githubnext/central-agentic-ops",
          workflowId: "dependabot",
          workflowPath: ".github/workflows/dependabot.lock.yml",
          runId: 42,
          runUrl: "https://github.com/githubnext/central-agentic-ops/actions/runs/42",
          status: "pass",
          value: 0.75,
          deltaFromBaseline: 0.1,
          evaluatorDigest: "sha256:test",
          observation: {
            opportunityKey: "release-train",
            evidenceAt: "2026-08-30T10:05:00Z",
            maturesAt: "2026-09-01T10:05:00Z",
            mature: false,
            subject: { repository: "githubnext/central-agentic-ops" },
          },
        }],
      },
      report: {
        generatedAt: "2026-08-30T12:00:00Z",
        records: [{
          id: "githubnext/central-agentic-ops-issue-1",
          kind: "issue",
          state: "open",
          title: "Dependabot report",
          summary: "A release train needs attention.",
          repository: "githubnext/central-agentic-ops",
          workflowPath: ".github/workflows/dependabot.lock.yml",
          runUrl: "https://github.com/githubnext/central-agentic-ops/actions/runs/42",
          url: "https://github.com/githubnext/central-agentic-ops/issues/1",
          updatedAt: "2026-08-30T10:06:00Z",
          warning: true,
          conclusion: "failure",
        }],
      },
      inventory: {
        workflows: [],
        bundles: [{
          workflow: ".github/workflows/dependabot.md",
          compiled: false,
          missingWorkers: ["dependabot-worker"],
          workers: [],
        }],
      },
      controlSettings: {
        packages: {
          dependabot: { mode: "review" },
        },
      },
    };
    for (const [name, value] of Object.entries(inputs)) {
      writeFileSync(join(temporaryDirectory, `${name}.json`), JSON.stringify(value));
    }
    const output = join(temporaryDirectory, "sources.json");
    try {
      execFileSync(process.execPath, [
        resolve("../../dashboard/report/dashboard-language-sources.mjs"),
      ], {
        env: {
          ...process.env,
          REPORT_DEPLOYED_WORKFLOWS: join(temporaryDirectory, "deployed.json"),
          REPORT_AIC_USAGE: join(temporaryDirectory, "usage.json"),
          REPORT_OPERATIONAL_VALUES: join(temporaryDirectory, "operationalValues.json"),
          REPORT_RECORDS: join(temporaryDirectory, "report.json"),
          REPORT_INVENTORY: join(temporaryDirectory, "inventory.json"),
          REPORT_CONTROL_SETTINGS: join(temporaryDirectory, "controlSettings.json"),
          REPORT_DASHBOARD_SOURCES: output,
        },
      });
      const sources = JSON.parse(readFileSync(output, "utf8"));

      expect(sources.workflows.rows[0]).toMatchObject({
        organization: "githubnext",
        repository: "central-agentic-ops",
        package: "dependabot",
        "package-inventory-warnings": 2,
        "workflow-active": "true",
        "rollout-mode": "review",
      });
      expect(sources.runs.rows[0]).toMatchObject({
        run: "42",
        event: "workflow_dispatch",
        "run-title": "Dependabot · review",
        "run-status": "completed",
        "run-conclusion": "action-required",
        "rollout-mode": "review",
      });
      expect(sources.runs.metadata).toMatchObject({
        "coverage-start": "2026-08-29T12:00:00.000Z",
        "coverage-end": "2026-08-30T12:00:00Z",
      });
      expect(sources.usage.rows[0]).toMatchObject({ run: "42", aic: 2.5 });
      expect(sources.findings.rows[0]).toMatchObject({
        finding: "githubnext/central-agentic-ops-issue-1",
        "finding-kind": "authored-warning",
        "finding-severity": "medium",
        "finding-status": "open",
      });
      expect(sources.outcomes.rows[0]["outcome-state"]).toBe("pending");
      expect(sources.outcomes.rows[0]["run-conclusion"]).toBe("failure");
      expect(sources["operational-values"].rows[0]).toMatchObject({
        "operational-value": 0.75,
        "operational-value-definition": "dependabot",
        "maturity-status": "interim",
      });
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
