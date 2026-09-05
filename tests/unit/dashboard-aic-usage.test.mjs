import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("AI Credit usage collection preserves workflow data payloads", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "dashboard-aic-usage-"));
  const bin = path.join(root, "bin");
  const inventoryPath = path.join(root, "deployed-workflows.json");
  const outputPath = path.join(root, "aic-usage.json");
  const cachePath = path.join(root, "cache");
  await mkdir(bin);
  await mkdir(path.join(cachePath, "run-42"), { recursive: true });
  await writeFile(path.join(cachePath, "run-42", "run_summary.json"), JSON.stringify({
    cli_version: "0.88.0",
    mcp_failures: [],
  }));
  await writeFile(inventoryPath, JSON.stringify({
    runHealth: { windowHours: 24 },
    workflows: [{
      repository: "githubnext/gh-aw-cao",
      path: ".github/workflows/data.lock.yml",
      name: "Data",
      runHealth: {
        runIds: [42],
        runRecords: [{ runId: 42, conclusion: "success" }],
      },
    }],
  }));
  const ghPath = path.join(bin, "gh");
  await writeFile(ghPath, `#!/usr/bin/env node
process.stdout.write(JSON.stringify({
  runs: [{
    database_id: 42,
    aic: 2.5,
    safe_items_count: 4,
    noop_count: 1,
    missing_data_count: 2,
    missing_tool_count: 3,
    report_incomplete_count: 1,
    data: { findings: [{ severity: "high", total: 3 }] }
  }]
}));
`);
  await chmod(ghPath, 0o755);

  try {
    await execFileAsync(process.execPath, [
      path.resolve("dashboard/report/aic-usage.mjs"),
    ], {
      cwd: path.resolve("."),
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        REPORT_DEPLOYED_WORKFLOWS: inventoryPath,
        REPORT_AIC_USAGE: outputPath,
        REPORT_AIC_CACHE: cachePath,
      },
    });
    const usage = JSON.parse(await readFile(outputPath, "utf8"));
    assert.equal(usage.schemaVersion, 3);
    assert.equal(usage.mcpAvailable, false);
    assert.equal(usage.mcpComplete, true);
    assert.deepEqual(usage.runs[0].data, {
      findings: [{ severity: "high", total: 3 }],
    });
    assert.deepEqual({
      safeItemsCount: usage.runs[0].safeItemsCount,
      noopCount: usage.runs[0].noopCount,
      missingDataCount: usage.runs[0].missingDataCount,
      missingToolCount: usage.runs[0].missingToolCount,
      reportIncompleteCount: usage.runs[0].reportIncompleteCount,
    }, {
      safeItemsCount: 4,
      noopCount: 1,
      missingDataCount: 2,
      missingToolCount: 3,
      reportIncompleteCount: 1,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
