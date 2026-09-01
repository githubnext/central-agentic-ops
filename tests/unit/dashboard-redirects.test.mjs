import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { writeLegacyDashboardRedirects } from "../../dashboard/report/redirects.mjs";

test("legacy dashboard URLs redirect to equivalent Dashboard Language routes", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "dashboard-redirects-"));
  try {
    await writeLegacyDashboardRedirects(output, {
      repositories: {
        rows: [{ organization: "acme", repository: "service" }],
      },
      workflows: {
        rows: [{
          organization: "acme",
          repository: "service",
          package: "maintenance",
          workflow: ".github/workflows/maintenance-worker.md",
        }],
      },
      outcomes: {
        rows: [{ "safe-output": "acme/service-issue-7" }],
      },
    });

    const redirects = {
      "runtime/index.html": "../#page-runtime",
      "repositories/acme-service.html": "../#page-repository-detail?repository=acme%2Fservice",
      "repositories/acme-service--workflow--maintenance-worker.html": "../#page-workflow-detail?workflow=acme%2Fservice:.github%2Fworkflows%2Fmaintenance-worker.md",
      "packages/maintenance-reports.html": "../#page-package-reports?package=maintenance",
      "packages/maintenance-reports-live.html": "../?package-report-table.rollout-mode=live#page-package-reports?package=maintenance",
      "outcomes/acme--service-issue-7.html": "../#page-outcome-detail?outcome=acme%2Fservice-issue-7",
    };
    for (const [relativePath, target] of Object.entries(redirects)) {
      assert.match(await readFile(path.join(output, relativePath), "utf8"), new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  } finally {
    await rm(output, { force: true, recursive: true });
  }
});