import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  controlEnvironment,
  controlPolicy,
  controlProgram,
  root,
} from "../helpers/control-precompute.mjs";

const program = controlProgram();

const failures = [
  ["malformed target repository", { TARGET_REPO: "not-a-repository" }, "target_repo must use owner/repository form"],
  ["missing worker target repository", { TARGET_REPO: "" }, "worker target_repo is required"],
  ["disallowed target owner", { TARGET_REPO: "outside/target" }, "target_repo owner is outside control-plane.scope.allowed-owners"],
  ["malformed review repository", { SAFE_OUTPUT_REPO: "not-a-repository" }, "safe_output_repo must use owner/repository form"],
  ["disallowed review owner", { SAFE_OUTPUT_REPO: "outside/review" }, "safe_output_repo owner is outside control-plane.scope.allowed-owners"],
  ["worker mode ceiling", { REQUESTED_MODE: "live", SAFE_OUTPUT_REPO: "acme/target" }, "safe_output_mode exceeds checked-in policy"],
  ["invalid safe-output mode", { REQUESTED_MODE: "staged" }, "safe_output_mode must be review or live"],
  ["invalid correlation ID", { CORRELATION_ID: "invalid" }, "correlation_id must identify an orchestrator run and attempt"],
  ["zero correlation ID", { CORRELATION_ID: "0-0" }, "correlation_id must identify an orchestrator run and attempt"],
  ["mismatched control repository", { CENTRAL_REPO: "acme/other" }, "central_repo must identify the current control repository"],
  ["mismatched control run URL", { CONTROL_PLANE_RUN_URL: "https://github.com/acme/control/actions/runs/999" }, "control_plane_run_url must match correlation_id and central_repo"],
  ["oversized repository request", { ROLE: "orchestrator", TARGET_REPO: "", REQUESTED_MAX_REPOS: "1001" }, "max_repositories must be an integer in 1..1000"],
  ["invalid rollout request", { ROLE: "orchestrator", TARGET_REPO: "", REQUESTED_ROLLOUT_PERCENT: "0" }, "rollout_percent must be an integer in 1..100"],
  ["invalid credit declaration", { ROLE: "orchestrator", TARGET_REPO: "", ORCHESTRATOR_CREDITS: "invalid" }, "AI Credit admission values must be non-negative integers"],
];

const invalidPolicies = [
  ["invalid package kill switch", controlPolicy({ packagePolicy: { enabled: "invalid" } }), "control-plane.packages.dependabot.enabled must be a Boolean"],
  ["invalid worker kill switch", controlPolicy({ workerPolicy: { enabled: "False" } }), "control-plane.packages.dependabot.workers.release-train-updater.enabled must be a Boolean"],
  ["removed worker ceiling", controlPolicy({ workerPolicy: { "max-mode": "preview" } }), "control-plane.packages.dependabot.workers.release-train-updater.max-mode must be review or live"],
  ["oversized scan cap", controlPolicy({ inventory: { "max-scan-repositories": 100001 } }), "control-plane.inventory.max-scan-repositories must be an integer in 1..100000"],
  ["invalid cell count", controlPolicy({ inventory: { "cell-count": 0 } }), "control-plane.inventory.cell-count must be an integer in 1..1000"],
  ["invalid cell index", controlPolicy({ inventory: { "cell-count": 4, "cell-index": 4 } }), "control-plane.inventory.cell-index must be smaller than cell-count"],
  ["oversized batch", controlPolicy({ inventory: { "batch-size": 100001 } }), "control-plane.inventory.batch-size must be an integer in 1..100000"],
  ["invalid batch index", controlPolicy({ inventory: { "batch-index": -1 } }), "control-plane.inventory.batch-index must be an integer in >= 0"],
];

function runPrecompute(overrides = {}, ghScript = "printf 'true\\n'", policy = controlPolicy()) {
  const directory = mkdtempSync(join(tmpdir(), "central-ops-precompute-"));
  const gh = join(directory, "gh");
  const githubEnvironment = join(directory, "github-env");
  const safeOutputs = join(directory, "safe-outputs.jsonl");
  const runnerTemp = join(realpathSync(directory), "runner-temp");
  const admissionDirectory = join(runnerTemp, "cao");
  const admissionEffective = join(admissionDirectory, "effective-policy.json");
  mkdirSync(admissionDirectory, { recursive: true });
  writeFileSync(gh, `#!/bin/sh
${ghScript}
`);
  writeFileSync(githubEnvironment, "");
  writeFileSync(safeOutputs, "");
  chmodSync(gh, 0o755);

  try {
    const env = controlEnvironment({
      PATH: `${directory}:${process.env.PATH}`,
      GITHUB_ENV: githubEnvironment,
      GH_AW_SAFE_OUTPUTS: safeOutputs,
      RUNNER_TEMP: runnerTemp,
      ...overrides,
    });

    const resolve = spawnSync("node", [program, "resolve-policy", "-"], {
      cwd: directory,
      encoding: "utf8",
      input: policy,
      env,
    });
    if (resolve.status !== 0) {
      return resolve;
    }
    writeFileSync(admissionEffective, resolve.stdout);

    return spawnSync("node", [program, "precompute"], {
      cwd: directory,
      encoding: "utf8",
      env,
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

for (const [name, policy, expectedError] of invalidPolicies) {
  test(`control precompute rejects ${name}`, () => {
    const result = runPrecompute({}, undefined, policy);

    assert.notEqual(result.status, 0, `${name} unexpectedly succeeded`);
    assert.match(result.stderr, new RegExp(expectedError));
  });
}

for (const role of ["orchestrator", "worker"]) {
  for (const safeOutputMode of ["review", "live"]) {
    test(`control precompute disables a ${role} in ${safeOutputMode} before validation or repository access`, () => {
      const result = runPrecompute(
        {
          GITHUB_ACTIONS: "true",
          ROLE: role,
          SAFE_OUTPUT_MODE: safeOutputMode,
          TARGET_REPO: "not-a-repository",
          SAFE_OUTPUT_REPO: "also-invalid",
        },
        "echo 'GitHub must not be called for a disabled package' >&2; exit 99",
        controlPolicy({ packagePolicy: { enabled: false } }),
      );

      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, [
        "::group::Central Agentic Ops precompute",
        "[CAO] Precompute skipped because admission was denied.",
        "::endgroup::",
        "",
      ].join("\n"));
      const precompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
      assert.equal(precompute.control_role, role);
      assert.equal(precompute.enabled, false);
      assert.equal(precompute.reason, "package-disabled");
      assert.equal(precompute.effective_max_repos, 0);
      assert.deepEqual(precompute.candidate_repositories, []);
      assert.deepEqual(precompute.worker_workflows, []);
    });
  }
}

test("control precompute disables a worker before review repository access", () => {
  const result = runPrecompute(
    {},
    "echo 'GitHub must not be called for a disabled worker' >&2; exit 99",
    controlPolicy({ workerPolicy: { enabled: false } }),
  );

  assert.equal(result.status, 0, result.stderr);
  const precompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
  assert.equal(precompute.reason, "worker-disabled");
  assert.doesNotMatch(result.stderr, /GitHub must not be called/);
});

test("control precompute loads declared worker workflows from policy", () => {
  const result = runPrecompute({}, undefined, controlPolicy());

  assert.equal(result.status, 0, result.stderr);
  const precompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
  assert.equal(precompute.authorized, true);
  assert.equal(precompute.worker, "release-train-updater");
  assert.equal(precompute.worker_enabled, true);
  assert.equal(precompute.safe_output_mode, "review");
});

for (const safeOutputMode of ["preview", "preview_only", "Review", "LIVE", "review "]) {
  test(`control precompute rejects unsupported mode ${JSON.stringify(safeOutputMode)}`, () => {
    const result = runPrecompute({ REQUESTED_MODE: safeOutputMode });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /safe_output_mode must be review or live/);
  });
}

test("control precompute writes a complete review worker envelope", () => {
  const result = runPrecompute();

  assert.equal(result.status, 0, result.stderr);
  const precompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
  assert.deepEqual(precompute, {
    authorized: true,
    reason: "authorized",
    control_role: "worker",
    package: "dependabot",
    bundle: "dependabot",
    worker: "release-train-updater",
    enabled: true,
    worker_enabled: true,
    worker_max_mode: "review",
    target_repo: "acme/target",
    safe_output_mode: "review",
    safe_output_repo: "acme/control",
    correlation_id: "123-1",
    central_repo: "acme/control",
    control_plane_run_url: "https://github.com/acme/control/actions/runs/123",
    candidate_repositories: [],
    worker_workflows: [],
    policy_source: {
      repository: "acme/control",
      path: ".github/workflows/cao.json",
      sha: "1111111111111111111111111111111111111111",
    },
  });
});

test("control precompute rejects an inaccessible review destination", () => {
  const result = runPrecompute({ SAFE_OUTPUT_REPO: "acme/review" }, "exit 1");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /review safe_output_repo must be accessible/);
});

test("control precompute accepts central self-review without repository metadata", () => {
  const result = runPrecompute({}, "exit 1");

  assert.equal(result.status, 0, result.stderr);
});

test("orchestrator derives its public central review destination without a dispatch envelope", () => {
  const result = runPrecompute(
    {
      ROLE: "orchestrator",
      TARGET_REPO: "",
      CENTRAL_REPO: "",
      REQUESTED_MAX_REPOS: "1001",
    },
    "printf 'false\\n'",
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /max_repositories must be an integer in 1\.\.1000/);
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

test("control precompute fails cleanly as an admission check when GitHub API rate limits are reached mid-run", () => {
  const directory = mkdtempSync(join(tmpdir(), "central-ops-precompute-ratelimit-"));
  const githubOutput = join(directory, "github-output");
  const stepSummary = join(directory, "step-summary");
  writeFileSync(githubOutput, "");
  writeFileSync(stepSummary, "");

  try {
    const result = runPrecompute(
      {
        SAFE_OUTPUT_REPO: "acme/review",
        GITHUB_OUTPUT: githubOutput,
        GITHUB_STEP_SUMMARY: stepSummary,
      },
      `
case "$*" in
  *rate_limit*)
    printf '{"resources":{"core":{"limit":5000,"remaining":3,"reset":9999999999}}}\\n'
    ;;
  *repos/acme/review*)
    echo "gh: API rate limit exceeded for installation. (HTTP 403)" >&2
    exit 1
    ;;
  *) printf 'true\\n' ;;
esac
`,
    );

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stderr, /API rate limit exceeded/);

    const output = Object.fromEntries(
      readFileSync(githubOutput, "utf8")
        .trim()
        .split("\n")
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    );
    assert.equal(output.authorized, "false");
    assert.equal(output.reason, "github-api-capacity-insufficient");
    assert.equal(output.github_api_status, "limited");
    assert.equal(output.github_api_remaining, "3");

    const summary = readFileSync(stepSummary, "utf8");
    assert.match(summary, /GitHub REST API capacity is too low for this run/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function runLiveAuthority(authorityContent, overrides = {}, policy = controlPolicy({
  packagePolicy: { mode: "live" },
  workerPolicy: { "max-mode": "live" },
})) {
  return runPrecompute({
    REQUESTED_MODE: "live",
    SAFE_OUTPUT_REPO: "acme/target",
    AUTHORITY_CONTENT: authorityContent,
    ...overrides,
  }, `
case "$*" in
  *repos/acme/target/contents/.github/workflows/cao.json*)
    [ "$AUTHORITY_MODE" = "missing" ] && exit 1
    printf '%s' "$AUTHORITY_CONTENT" | base64
    ;;
  *repos/acme/target/commits/main*) printf '2222222222222222222222222222222222222222\\n' ;;
  *repos/acme/target*) printf 'main\\n' ;;
  *) printf 'true\\n' ;;
esac
`, policy);
}

test("control precompute accepts matching target-owned live authority", () => {
  const result = runLiveAuthority(JSON.stringify({
    version: 1,
    "target-authority": { packages: { dependabot: { authority: "acme/control" } } },
  }));

  assert.equal(result.status, 0, result.stderr);
  const precompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
  assert.equal(precompute.bundle, "dependabot");
});

test("control precompute resolves live mode from an exact package target", () => {
  const result = runLiveAuthority(JSON.stringify({
    version: 1,
    "target-authority": { packages: { dependabot: { authority: "acme/control" } } },
  }), {}, controlPolicy({
    packagePolicy: {
      mode: "review",
      targets: { "acme/target": { mode: "live" } },
    },
    workerPolicy: { "max-mode": "live" },
  }));

  assert.equal(result.status, 0, result.stderr);
  const precompute = JSON.parse(readFileSync("/tmp/gh-aw/agent/control-precompute.json", "utf8"));
  assert.equal(precompute.safe_output_mode, "live");
  assert.equal(precompute.target_repo, "acme/target");
});

test("control precompute rejects live mode for an unmatched review target", () => {
  const result = runPrecompute({
    REQUESTED_MODE: "live",
    SAFE_OUTPUT_REPO: "acme/target",
  }, undefined, controlPolicy({
    packagePolicy: {
      mode: "review",
      targets: { "acme/other": { mode: "live" } },
    },
    workerPolicy: { "max-mode": "live" },
  }));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /safe_output_mode exceeds checked-in policy/);
});

test("control precompute accepts live authority case-insensitively", () => {
  const result = runLiveAuthority(JSON.stringify({
    version: 1,
    "target-authority": { packages: { dependabot: { authority: "ACME/CONTROL" } } },
  }));

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
  const result = runLiveAuthority(JSON.stringify({
    version: 1,
    "target-authority": { packages: { dependabot: { authority: "acme/control" } } },
  }), { SAFE_OUTPUT_REPO: "acme/other" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /live worker safe_output_repo must equal target_repo/);
});

test("control precompute rejects a different live authority", () => {
  const result = runLiveAuthority(JSON.stringify({
    version: 1,
    "target-authority": { packages: { dependabot: { authority: "acme/other-control" } } },
  }));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /target assigns live authority for dependabot to a different control repository/);
});

for (const [name, authorityContent] of [
  ["empty document", ""],
  ["non-object document", "[]"],
  ["wrong version", '{"version":2,"target-authority":{"packages":{}}}'],
  ["string version", '{"version":"1","target-authority":{"packages":{}}}'],
  ["missing target authority", '{"version":1,"control-plane":{}}'],
  ["missing packages", '{"version":1,"target-authority":{}}'],
  ["non-object packages", '{"version":1,"target-authority":{"packages":[]}}'],
  ["missing package", '{"version":1,"target-authority":{"packages":{"optimization":{"authority":"acme/control"}}}}'],
  ["non-object package", '{"version":1,"target-authority":{"packages":{"dependabot":"acme/control"}}}'],
  ["non-string authority", '{"version":1,"target-authority":{"packages":{"dependabot":{"authority":1}}}}'],
  ["duplicate key", '{"version":1,"version":1,"target-authority":{"packages":{}}}'],
]) {
  test(`control precompute rejects live authority with ${name}`, () => {
    const result = runLiveAuthority(authorityContent);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /target authority file must declare version 1 and target-authority.packages.dependabot.authority/);
  });
}

test("control precompute rejects malformed live authority repository", () => {
  const result = runLiveAuthority(JSON.stringify({
    version: 1,
    "target-authority": { packages: { dependabot: { authority: "not-a-repository" } } },
  }));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /target-authority.packages.dependabot.authority has an invalid value/);
});

test("control precompute rejects missing target-owned live authority", () => {
  const result = runLiveAuthority("", { AUTHORITY_MODE: "missing" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /live mode requires \.github\/workflows\/cao\.json on the target default branch/);
});