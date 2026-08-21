import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { controlEnvironment, controlPrecomputeScript } from "../helpers/control-precompute.mjs";

const script = controlPrecomputeScript();

const failures = [
  ["malformed target repository", { TARGET_REPO: "not-a-repository" }, "target_repo must use owner/repository form"],
  ["disallowed target owner", { TARGET_REPO: "outside/target" }, "target_repo owner is outside CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS"],
  ["disabled worker", { WORKER_ENABLED: "false" }, "worker is disabled by its control-plane policy"],
  ["worker mode ceiling", { SAFE_OUTPUT_MODE: "live", PREVIEW_ONLY: "false" }, "safe_output_mode exceeds the worker_max_mode ceiling"],
  ["inconsistent staged flag", { PREVIEW_ONLY: "false" }, "preview_only is inconsistent with safe_output_mode"],
  ["invalid correlation ID", { CORRELATION_ID: "invalid" }, "correlation_id must identify an orchestrator run and attempt"],
  ["mismatched control repository", { CENTRAL_REPO: "acme/other" }, "central_repo must identify the current control repository"],
  ["mismatched control run URL", { CONTROL_PLANE_RUN_URL: "https://github.com/acme/control/actions/runs/999" }, "control_plane_run_url must match correlation_id and central_repo"],
  ["oversized repository cap", { ROLE: "orchestrator", TARGET_REPO: "", MAX_REPOS: "1001" }, "max_repos must be an integer from 1 through 1000"],
  ["oversized scan cap", { ROLE: "orchestrator", TARGET_REPO: "", MAX_SCAN_REPOS: "10001" }, "max_scan_repos must be an integer from 1 through 10000"],
  ["invalid rollout percentage", { ROLE: "orchestrator", TARGET_REPO: "", ROLLOUT_PERCENT: "0" }, "rollout_percent must be an integer from 1 through 100"],
  ["invalid credit budget", { ROLE: "orchestrator", TARGET_REPO: "", AGGREGATE_CREDIT_LIMIT: "0" }, "AI Credit admission values must be integers"],
];

for (const [name, overrides, expectedError] of failures) {
  test(`control precompute rejects ${name}`, () => {
    const result = spawnSync("bash", ["-c", script], {
      encoding: "utf8",
      env: controlEnvironment(overrides),
    });

    assert.notEqual(result.status, 0, `${name} unexpectedly succeeded`);
    assert.match(result.stderr, new RegExp(expectedError));
  });
}