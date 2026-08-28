import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function controlPrecomputeScript() {
  const source = readFileSync(
    join(root, ".github", "workflows", "shared", "control-precompute.md"),
    "utf8",
  );
  const lines = source.split("\n");
  const scripts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== "    run: |") continue;
    const script = [];
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.startsWith("      ")) {
        script.push(line.slice(6));
      } else if (line.length === 0) {
        script.push("");
      } else {
        index -= 1;
        break;
      }
    }
    scripts.push(script.join("\n"));
  }
  assert.ok(scripts.length > 0, "control precompute run block is missing");
  return scripts.join("\n");
}

export function controlEnvironment(overrides = {}) {
  return {
    ...process.env,
    BUNDLE: "dependabot",
    ROLE: "worker",
    TARGET_REPO: "acme/target",
    ORGANIZATION: "acme",
    MAX_REPOS: "1",
    MAX_SCAN_REPOS: "1000",
    CELL_COUNT: "1",
    CELL_INDEX: "0",
    BATCH_SIZE: "100000",
    BATCH_INDEX: "0",
    ALLOWED_OWNERS: "acme",
    ALLOWED_REPOS: "",
    DISPATCH_MAX: "1",
    ROLLOUT_PERCENT: "100",
    SAFE_OUTPUT_MODE: "review",
    SAFE_OUTPUT_REPO: "acme/control",
    ENABLED: "true",
    WORKER_ENABLED: "true",
    WORKER_MAX_MODE: "review",
    CORRELATION_ID: "123-1",
    CENTRAL_REPO: "acme/control",
    CONTROL_PLANE_RUN_URL: "https://github.com/acme/control/actions/runs/123",
    ORCHESTRATOR_CREDITS: "250",
    WORKER_CREDITS_PER_TARGET: "600",
    AGGREGATE_CREDIT_LIMIT: "1100",
    MONTHLY_CREDIT_BUDGET: "0",
    GITHUB_REPOSITORY: "acme/control",
    GITHUB_SERVER_URL: "https://github.com",
    GITHUB_WORKFLOW_REF: "acme/control/.github/workflows/dependabot.lock.yml@main",
    ...overrides,
  };
}