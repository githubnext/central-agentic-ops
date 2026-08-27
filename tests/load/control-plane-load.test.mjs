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
if [[ "$arguments" == "api repos/acme/control --jq .private" ]]; then
  printf 'true\n'
elif [[ "$arguments" == *"contents/.github/workflows/dependabot.md"* ]]; then
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
    printf '{"id":%s,"full_name":"acme/repo-%s","archived":false,"disabled":false,"private":true,"pushed_at":"2026-01-01T00:00:00Z","default_branch":"main"}\n' "$index" "$index"
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
      MAX_SCAN_REPOS: "100000",
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

test("control precompute bounds a 100,000-repository inventory", { timeout: 120_000 }, () => {
  const started = performance.now();
  const run = runPrecompute();

  try {
    assert.equal(run.result.status, 0, run.result.stderr);
    const output = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
    const inventoryCalls = readFileSync(run.logPath, "utf8").trim().split("\n");
    assert.equal(output.total_repositories_scanned, 100000);
    assert.match(output.inventory_version, /^sha256:[0-9a-f]{64}$/);
    assert.equal(output.batch_count, 1);
    assert.equal(output.candidate_repositories.length, 100000);
    assert.equal(output.effective_max_repos, 1000);
    assert.equal(inventoryCalls.length, 1000);
    assert.ok(performance.now() - started < 120_000, "bounded inventory exceeded 120 seconds");
  } finally {
    rmSync(run.temporaryDirectory, { recursive: true, force: true });
  }
});

test("control precompute assigns stable cells and bounded batches", () => {
  const overrides = {
    MAX_SCAN_REPOS: "1000",
    CELL_COUNT: "4",
    CELL_INDEX: "1",
    BATCH_SIZE: "100",
    BATCH_INDEX: "1",
  };
  const first = runPrecompute(overrides);

  try {
    assert.equal(first.result.status, 0, first.result.stderr);
    const firstOutput = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
    assert.equal(firstOutput.inventory_repository_count, 1000);
    assert.equal(firstOutput.cell_repository_count, 250);
    assert.equal(firstOutput.batch_count, 3);
    assert.equal(firstOutput.candidate_repositories.length, 100);
    assert.equal(firstOutput.candidate_repositories[0].id, 401);
    assert.equal(firstOutput.candidate_repositories.at(-1).id, 797);
    assert.ok(firstOutput.candidate_repositories.every(({ id }) => id % 4 === 1));

    const second = runPrecompute({ ...overrides, BATCH_INDEX: "2" });
    try {
      assert.equal(second.result.status, 0, second.result.stderr);
      const secondOutput = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
      assert.equal(secondOutput.inventory_version, firstOutput.inventory_version);
      assert.equal(secondOutput.candidate_repositories.length, 50);
      assert.equal(secondOutput.candidate_repositories[0].id, 801);
      assert.equal(secondOutput.candidate_repositories.at(-1).id, 997);
      assert.notEqual(secondOutput.batch_id, firstOutput.batch_id);
    } finally {
      rmSync(second.temporaryDirectory, { recursive: true, force: true });
    }
  } finally {
    rmSync(first.temporaryDirectory, { recursive: true, force: true });
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