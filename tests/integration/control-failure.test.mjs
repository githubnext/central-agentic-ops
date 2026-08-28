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
  ["missing worker target repository", { TARGET_REPO: "" }, "worker target_repo is required"],
  ["disallowed target owner", { TARGET_REPO: "outside/target" }, "target_repo owner is outside CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS"],
  ["malformed review repository", { SAFE_OUTPUT_REPO: "not-a-repository" }, "safe_output_repo must use owner/repository form"],
  ["disallowed review owner", { SAFE_OUTPUT_REPO: "outside/review" }, "safe_output_repo owner is outside CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS"],
  ["disabled worker", { WORKER_ENABLED: "false" }, "worker is disabled by its control-plane policy"],
  ["worker mode ceiling", { SAFE_OUTPUT_MODE: "live", SAFE_OUTPUT_REPO: "acme/target" }, "safe_output_mode exceeds the worker_max_mode ceiling"],
  ["invalid worker kill switch", { WORKER_ENABLED: "False" }, "worker_enabled must be true or false"],
  ["removed worker ceiling", { WORKER_MAX_MODE: "preview" }, "worker_max_mode must be review or live"],
  ["invalid safe-output mode", { SAFE_OUTPUT_MODE: "staged" }, "safe_output_mode must be review or live"],
  ["invalid package kill switch", { ENABLED: "invalid" }, "enabled must be true or false"],
  ["invalid correlation ID", { CORRELATION_ID: "invalid" }, "correlation_id must identify an orchestrator run and attempt"],
  ["zero correlation ID", { CORRELATION_ID: "0-0" }, "correlation_id must identify an orchestrator run and attempt"],
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

for (const role of ["orchestrator", "worker"]) {
  for (const safeOutputMode of ["review", "live"]) {
    test(`control precompute disables a ${role} in ${safeOutputMode} before validation or repository access`, () => {
      const result = runPrecompute(
        {
          ENABLED: "false",
          ROLE: role,
          SAFE_OUTPUT_MODE: safeOutputMode,
          TARGET_REPO: "not-a-repository",
          SAFE_OUTPUT_REPO: "also-invalid",
        },
        "echo 'GitHub must not be called for a disabled package' >&2; exit 99",
      );

      assert.equal(result.status, 0, result.stderr);
      const precompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
      const dispatchPrecompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/dispatch-precompute.json", "utf8"));
      assert.deepEqual(precompute, dispatchPrecompute);
      assert.equal(precompute.control_role, role);
      assert.equal(precompute.enabled, "false");
      assert.equal(precompute.effective_max_repos, 0);
      assert.deepEqual(precompute.candidate_repositories, []);
      assert.deepEqual(precompute.worker_workflows, []);
    });
  }
}

test("control precompute disables a worker before review repository access", () => {
  const result = runPrecompute(
    { WORKER_ENABLED: "false" },
    "echo 'GitHub must not be called for a disabled worker' >&2; exit 99",
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /worker is disabled by its control-plane policy/);
  assert.doesNotMatch(result.stderr, /GitHub must not be called/);
});

for (const safeOutputMode of ["preview", "preview_only", "Review", "LIVE", "review "]) {
  test(`control precompute rejects unsupported mode ${JSON.stringify(safeOutputMode)}`, () => {
    const result = runPrecompute({ SAFE_OUTPUT_MODE: safeOutputMode });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /safe_output_mode must be review or live/);
  });
}

test("control precompute writes a complete mirrored review worker envelope", () => {
  const result = runPrecompute();

  assert.equal(result.status, 0, result.stderr);
  const precompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
  const dispatchPrecompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/dispatch-precompute.json", "utf8"));
  assert.deepEqual(precompute, dispatchPrecompute);
  assert.deepEqual(precompute, {
    control_role: "worker",
    bundle: "dependabot",
    enabled: "true",
    worker_enabled: "true",
    worker_max_mode: "review",
    target_repo: "acme/target",
    safe_output_mode: "review",
    safe_output_repo: "acme/control",
    correlation_id: "123-1",
    central_repo: "acme/control",
    control_plane_run_url: "https://github.com/acme/control/actions/runs/123",
    candidate_repositories: [],
    worker_workflows: [],
  });
});

test("control precompute rejects an inaccessible review destination", () => {
  const result = runPrecompute({}, "exit 1");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /review safe_output_repo must be accessible/);
});

test("control precompute accepts a public central review destination", () => {
  const result = runPrecompute({}, "printf 'false\\n'");

  assert.equal(result.status, 0, result.stderr);
});

test("orchestrator derives its public central review destination without a dispatch envelope", () => {
  const result = runPrecompute(
    {
      ROLE: "orchestrator",
      TARGET_REPO: "",
      CENTRAL_REPO: "",
      MAX_REPOS: "1001",
    },
    "printf 'false\\n'",
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /max_repos must be an integer from 1 through 1000/);
  assert.doesNotMatch(result.stderr, /non-central review safe_output_repo must be private/);
});

test("control precompute rejects a public non-central review destination", () => {
  const result = runPrecompute(
    { SAFE_OUTPUT_REPO: "acme/review" },
    "printf 'false\\n'",
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /non-central review safe_output_repo must be private/);
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
        SAFE_OUTPUT_REPO: "acme/target",
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

test("control precompute accepts live authority case-insensitively", () => {
  const result = runLiveAuthority(`version: 1
bundles:
  dependabot:
    authority: ACME/CONTROL
`);

  assert.equal(result.status, 0, result.stderr);
});

for (const targetRepo of ["acme/control", "ACME/CONTROL"]) {
  test(`control precompute accepts control repository self-review for ${targetRepo}`, () => {
    const result = runPrecompute({ TARGET_REPO: targetRepo });

    assert.equal(result.status, 0, result.stderr);
  });
}

for (const safeOutputRepo of ["acme/target", "ACME/TARGET"]) {
  test(`control precompute rejects review destination ${safeOutputRepo} when it is the target`, () => {
    const result = runPrecompute({ SAFE_OUTPUT_REPO: safeOutputRepo });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /review safe_output_repo must differ from target_repo/);
  });
}

test("control precompute binds live worker output to the authorized target", () => {
  const result = runLiveAuthority(`version: 1
bundles:
  dependabot:
    authority: acme/control
`, { SAFE_OUTPUT_REPO: "acme/other" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /live worker safe_output_repo must equal target_repo/);
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

for (const [name, authorityContent] of [
  ["empty document", ""],
  ["non-object document", "- dependabot\n"],
  ["wrong version", "version: 2\nbundles: {}\n"],
  ["string version", "version: '1'\nbundles: {}\n"],
  ["missing bundles", "version: 1\n"],
  ["non-object bundles", "version: 1\nbundles: []\n"],
  ["missing package", "version: 1\nbundles:\n  optimization:\n    authority: acme/control\n"],
  ["non-object package", "version: 1\nbundles:\n  dependabot: acme/control\n"],
  ["non-string authority", "version: 1\nbundles:\n  dependabot:\n    authority: 1\n"],
  ["YAML alias", "version: 1\ndefaults: &defaults\n  authority: acme/control\nbundles:\n  dependabot: *defaults\n"],
]) {
  test(`control precompute rejects live authority with ${name}`, () => {
    const result = runLiveAuthority(authorityContent);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /target authority file must declare version 1 and bundles.dependabot.authority/);
  });
}

test("control precompute rejects malformed live authority repository", () => {
  const result = runLiveAuthority(`version: 1
bundles:
  dependabot:
    authority: not-a-repository
`);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /bundles.dependabot.authority must use owner\/repository form/);
});

test("control precompute rejects missing target-owned live authority", () => {
  const result = runLiveAuthority("", { AUTHORITY_MODE: "missing" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /live mode requires \.github\/central-agentic-ops\.yml on the target default branch/);
});