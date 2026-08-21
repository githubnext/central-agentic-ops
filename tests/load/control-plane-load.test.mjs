import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import test from "node:test";
import { controlEnvironment, controlPrecomputeScript } from "../helpers/control-precompute.mjs";

const script = controlPrecomputeScript();
const workflowSource = `---
safe-outputs:
  dispatch-workflow:
    workflows: [worker]
---
`;

function mockGh(directory) {
  const executable = join(directory, "gh");
  writeFileSync(executable, `#!/bin/bash
set -euo pipefail
arguments="$*"
if [[ "$arguments" == *"contents/.github/workflows/dependabot.md"* ]]; then
  printf '%s\\n' "$CONTROL_SOURCE_B64"
elif [[ "$arguments" == *"actions/workflows?per_page=100"* ]]; then
  printf '%s\\n' '{"id":1,"name":"worker","path":".github/workflows/worker.lock.yml","state":"active"}'
elif [[ "$arguments" == *"/repos?"* ]]; then
  printf '%s\\n' "$arguments" >> "$MOCK_GH_LOG"
  if [[ "\${MOCK_FAIL_INVENTORY:-false}" == "true" ]]; then
    printf 'simulated API rate limit\\n' >&2
    exit 1
  fi
  page=$(printf '%s' "$arguments" | sed -n 's/.*[?&]page=\\([0-9][0-9]*\\).*/\\1/p')
  for item in $(seq 1 100); do
    index=$(( (page - 1) * 100 + item ))
    printf '{"full_name":"acme/repo-%s","archived":false,"disabled":false,"private":true,"pushed_at":"2026-01-01T00:00:00Z","default_branch":"main"}\\n' "$index"
  done
else
  printf 'unexpected gh invocation: %s\\n' "$arguments" >&2
  exit 1
fi
`);
  chmodSync(executable, 0o755);
}

function runPrecompute(overrides = {}) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "central-agentic-ops-load-"));
  const logPath = join(temporaryDirectory, "gh.log");
  mockGh(temporaryDirectory);

  const result = spawnSync("bash", ["-c", script], {
    encoding: "utf8",
    env: controlEnvironment({
      ROLE: "orchestrator",
      TARGET_REPO: "",
      MAX_REPOS: "1000",
      MAX_SCAN_REPOS: "10000",
      DISPATCH_MAX: "1000",
      ROLLOUT_PERCENT: "10",
      WORKER_CREDITS_PER_TARGET: "0",
      CONTROL_SOURCE_B64: Buffer.from(workflowSource).toString("base64"),
      MOCK_GH_LOG: logPath,
      PATH: `${temporaryDirectory}${delimiter}${process.env.PATH}`,
      ...overrides,
    }),
  });

  return { temporaryDirectory, logPath, result };
}

test("control precompute bounds a 10,000-repository inventory", { timeout: 30_000 }, () => {
  const started = performance.now();
  const run = runPrecompute();

  try {
    assert.equal(run.result.status, 0, run.result.stderr);
    const output = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
    const inventoryCalls = readFileSync(run.logPath, "utf8").trim().split("\n");
    assert.equal(output.total_repositories_scanned, 10000);
    assert.equal(output.candidate_repositories.length, 10000);
    assert.equal(output.effective_max_repos, 1000);
    assert.equal(inventoryCalls.length, 100);
    assert.ok(performance.now() - started < 30_000, "bounded inventory exceeded 30 seconds");
  } finally {
    rmSync(run.temporaryDirectory, { recursive: true, force: true });
  }
});

test("control precompute fails inventory closed after bounded API errors", () => {
  const run = runPrecompute({ MOCK_FAIL_INVENTORY: "true" });

  try {
    assert.equal(run.result.status, 0, run.result.stderr);
    const output = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
    const inventoryCalls = readFileSync(run.logPath, "utf8").trim().split("\n");
    assert.equal(output.total_repositories_scanned, 0);
    assert.equal(output.effective_max_repos, 0);
    assert.deepEqual(output.candidate_repositories, []);
    assert.match(output.repo_error, /simulated API rate limit/);
    assert.equal(inventoryCalls.length, 2, "inventory fallback retried beyond organization and user endpoints");
  } finally {
    rmSync(run.temporaryDirectory, { recursive: true, force: true });
  }
});