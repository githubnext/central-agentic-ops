import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { controlEnvironment, controlPrecomputeScript } from "../helpers/control-precompute.mjs";

const script = controlPrecomputeScript();

const failures = [
  ["malformed target repository", { TARGET_REPO: "not-a-repository" }, "target_repo must use owner/repository form"],
  ["disallowed target owner", { TARGET_REPO: "outside/target" }, "target_repo owner is outside CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS"],
  ["disabled worker", { WORKER_ENABLED: "false" }, "worker is disabled by its control-plane policy"],
  ["worker mode ceiling", { SAFE_OUTPUT_MODE: "live" }, "safe_output_mode exceeds the worker_max_mode ceiling"],
  ["invalid safe-output mode", { SAFE_OUTPUT_MODE: "staged" }, "safe_output_mode must be review or live"],
  ["invalid package kill switch", { ENABLED: "invalid" }, "enabled must be true or false"],
  ["invalid correlation ID", { CORRELATION_ID: "invalid" }, "correlation_id must identify an orchestrator run and attempt"],
  ["mismatched control repository", { CENTRAL_REPO: "acme/other" }, "central_repo must identify the current control repository"],
  ["mismatched control run URL", { CONTROL_PLANE_RUN_URL: "https://github.com/acme/control/actions/runs/999" }, "control_plane_run_url must match correlation_id and central_repo"],
  ["oversized repository cap", { ROLE: "orchestrator", TARGET_REPO: "", MAX_REPOS: "1001" }, "max_repos must be an integer from 1 through 1000"],
  ["oversized scan cap", { ROLE: "orchestrator", TARGET_REPO: "", MAX_SCAN_REPOS: "100001" }, "max_scan_repos must be an integer from 1 through 100000"],
  ["invalid cell count", { ROLE: "orchestrator", TARGET_REPO: "", CELL_COUNT: "0" }, "cell_count must be an integer from 1 through 1000"],
  ["invalid cell index", { ROLE: "orchestrator", TARGET_REPO: "", CELL_COUNT: "4", CELL_INDEX: "4" }, "cell_index must be an integer from 0 through cell_count minus 1"],
  ["oversized batch", { ROLE: "orchestrator", TARGET_REPO: "", BATCH_SIZE: "100001" }, "batch_size must be an integer from 1 through 100000"],
  ["invalid batch index", { ROLE: "orchestrator", TARGET_REPO: "", BATCH_INDEX: "-1" }, "batch_index must be a non-negative integer"],
  ["invalid rollout percentage", { ROLE: "orchestrator", TARGET_REPO: "", ROLLOUT_PERCENT: "0" }, "rollout_percent must be an integer from 1 through 100"],
  ["invalid credit budget", { ROLE: "orchestrator", TARGET_REPO: "", AGGREGATE_CREDIT_LIMIT: "0" }, "AI Credit admission values must be integers"],
];

function runPrecompute(overrides = {}, ghScript = "printf 'true\\n'") {
  const directory = mkdtempSync(join(tmpdir(), "central-ops-precompute-"));
  const gh = join(directory, "gh");
  writeFileSync(gh, `#!/bin/sh
${ghScript}
`);
  chmodSync(gh, 0o755);

  try {
    return spawnSync("bash", ["-c", script], {
      encoding: "utf8",
      env: controlEnvironment({
        PATH: `${directory}:${process.env.PATH}`,
        ...overrides,
      }),
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const [name, overrides, expectedError] of failures) {
  test(`control precompute rejects ${name}`, () => {
    const result = runPrecompute(overrides);

    assert.notEqual(result.status, 0, `${name} unexpectedly succeeded`);
    assert.match(result.stderr, new RegExp(expectedError));
  });
}

test("control precompute disables a package before repository access", () => {
  const result = runPrecompute(
    { ENABLED: "false", TARGET_REPO: "not-a-repository" },
    "echo 'GitHub must not be called for a disabled package' >&2; exit 99",
  );

  assert.equal(result.status, 0, result.stderr);
  const precompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
  assert.equal(precompute.enabled, "false");
  assert.equal(precompute.effective_max_repos, 0);
  assert.deepEqual(precompute.candidate_repositories, []);
});

function runLiveAuthority(authorityContent, overrides = {}) {
  const directory = mkdtempSync(join(tmpdir(), "central-ops-authority-"));
  const gh = join(directory, "gh");
  writeFileSync(gh, `#!/bin/sh
case "$*" in
  *contents/.github/central-agentic-ops.yml*)
    [ "$AUTHORITY_MODE" = "missing" ] && exit 1
    printf '%s' "$AUTHORITY_CONTENT" | base64
    ;;
  *) printf 'main\\n' ;;
esac
`);
  chmodSync(gh, 0o755);

  try {
    return spawnSync("bash", ["-c", script], {
      encoding: "utf8",
      env: controlEnvironment({
        PATH: `${directory}:${process.env.PATH}`,
        SAFE_OUTPUT_MODE: "live",
        WORKER_MAX_MODE: "live",
        AUTHORITY_CONTENT: authorityContent,
        ...overrides,
      }),
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("control precompute accepts matching target-owned live authority", () => {
  const result = runLiveAuthority(`version: 1
bundles:
  dependabot:
    authority: acme/control
`);

  assert.equal(result.status, 0, result.stderr);
  const precompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
  assert.equal(precompute.bundle, "dependabot");
});

test("control precompute rejects a different live authority", () => {
  const result = runLiveAuthority(`version: 1
bundles:
  dependabot:
    authority: acme/other-control
`);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /target assigns live authority for dependabot to a different control repository/);
});

test("control precompute rejects missing target-owned live authority", () => {
  const result = runLiveAuthority("", { AUTHORITY_MODE: "missing" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /live mode requires \.github\/central-agentic-ops\.yml on the target default branch/);
});