import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { controlSettings, effectivePolicy, parsePolicy } from "../../.github/scripts/control-policy/resolve.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const resolver = join(root, ".github", "scripts", "control-policy", "resolve.mjs");

function validate(policy) {
  return spawnSync(process.execPath, [resolver, "--validate", "-"], {
    cwd: root,
    encoding: "utf8",
    input: policy,
  });
}

function effective(policy, { packageName = "dependabot", role = "orchestrator", worker = "", requestedMode = "" } = {}) {
  try {
    return {
      status: 0,
      stderr: "",
      output: effectivePolicy(parsePolicy(policy), {
        packageName,
        role,
        workerName: worker,
        controlRepository: "acme/control",
        requestedMode,
      }),
    };
  } catch (error) {
    return { status: 1, stderr: `${error.message}\n`, output: undefined };
  }
}

function effectiveWithLimits(policy, requestedMaxRepositories, requestedRolloutPercent) {
  try {
    return {
      status: 0,
      stderr: "",
      output: effectivePolicy(parsePolicy(policy), {
        packageName: "dependabot",
        role: "orchestrator",
        controlRepository: "acme/control",
        requestedMaxRepositories,
        requestedRolloutPercent,
      }),
    };
  } catch (error) {
    return { status: 1, stderr: `${error.message}\n`, output: undefined };
  }
}

const minimalPolicy = JSON.stringify({
  version: 1,
  "control-plane": {
    scope: { "allowed-repositories": ["acme/payments-api", "acme/storefront"] },
    packages: {
      dependabot: {
        mode: "live",
        "max-repositories": 8,
        workers: { "release-train-updater": { "max-mode": "live" } },
      },
    },
  },
});

test("control policy accepts the minimal version 1 control document", () => {
  const result = validate(minimalPolicy);

  assert.equal(result.status, 0, result.stderr);
});

test("control policy applies schema defaults and package values", () => {
  const result = effective(minimalPolicy);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output.authorized, true);
  assert.equal(result.output.safe_output_mode, "live");
  assert.equal(result.output.max_repositories, 8);
  assert.equal(result.output.rollout_percent, 100);
  assert.equal(result.output.monthly_ai_credit_budget, 0);
  assert.deepEqual(result.output.allowed_owners, ["acme"]);
});

test("control policy exposes scope and publishing defaults to deterministic add-ons", () => {
  assert.deepEqual(controlSettings(parsePolicy(minimalPolicy), "acme/control"), {
    allowed_owners: ["acme"],
    allowed_repositories: ["acme/payments-api", "acme/storefront"],
    packages: {
      dependabot: {
        enabled: true,
        mode: "live",
        "max-repositories": 8,
        "rollout-percent": 100,
        "monthly-ai-credit-budget": 0,
      },
    },
    publishing_enabled: false,
    publishing_control_repositories: ["acme/control"],
    publishing_reviewers: [],
  });
});

test("control policy disables packages and workers by absence", () => {
  const absentPackage = effective(minimalPolicy, { packageName: "optimization" });
  const absentWorker = effective(minimalPolicy, {
    role: "worker",
    worker: "release-train-updater",
    packageName: "dependabot",
  });
  const policyWithoutWorker = minimalPolicy.replace(',"workers":{"release-train-updater":{"max-mode":"live"}}', "");
  const undeclaredWorker = effective(policyWithoutWorker, {
    role: "worker",
    worker: "release-train-updater",
  });

  assert.equal(absentPackage.output.reason, "package-undeclared");
  assert.equal(absentWorker.output.authorized, true);
  assert.equal(undeclaredWorker.output.reason, "worker-undeclared");
});

test("control policy intersects package mode, dispatch request, and worker ceiling", () => {
  const reviewRequest = effective(minimalPolicy, {
    role: "worker",
    worker: "release-train-updater",
    requestedMode: "review",
  });
  const reviewCeilingPolicy = minimalPolicy.replace('"max-mode":"live"', '"max-mode":"review"');
  const reviewCeiling = effective(reviewCeilingPolicy, {
    role: "worker",
    worker: "release-train-updater",
  });
  const widening = effective(reviewCeilingPolicy, {
    role: "worker",
    worker: "release-train-updater",
    requestedMode: "live",
  });

  assert.equal(reviewRequest.output.safe_output_mode, "review");
  assert.equal(reviewCeiling.output.safe_output_mode, "review");
  assert.notEqual(widening.status, 0);
  assert.match(widening.stderr, /safe_output_mode exceeds checked-in policy/);
});

test("control policy permits dispatch limits to narrow but not widen policy", () => {
  const narrowed = effectiveWithLimits(minimalPolicy, 3, 50);
  const maxWidening = effectiveWithLimits(minimalPolicy, 9, "");
  const rolloutWidening = effectiveWithLimits(minimalPolicy, "", 101);

  assert.equal(narrowed.output.max_repositories, 3);
  assert.equal(narrowed.output.rollout_percent, 50);
  assert.match(maxWidening.stderr, /max_repositories exceeds checked-in policy/);
  assert.match(rolloutWidening.stderr, /rollout_percent must be an integer in 1..100/);
});

test("control policy accepts target-only authority in the version 1 shape", () => {
  const result = validate(JSON.stringify({
    version: 1,
    "target-authority": { packages: { optimization: { authority: "acme/control" } } },
  }));

  assert.equal(result.status, 0, result.stderr);
});

for (const [name, policy, error] of [
  ["legacy root bundles", '{"version":1,"bundles":{}}', /unknown key policy.bundles/],
  ["future versions", '{"version":2,"control-plane":{}}', /version must be an integer in 1..1/],
  ["unknown nested keys", '{"version":1,"control-plane":{"packages":{"dependabot":{"surprise":true}}}}', /unknown key control-plane.packages.dependabot.surprise/],
  ["duplicate keys", '{"version":1,"version":1,"control-plane":{}}', /duplicate mapping key: version/],
  ["malformed JSON", '{"version":1,}', /invalid policy JSON/],
  ["expressions", '{"version":1,"control-plane":{"scope":{"allowed-owners":["${{ github.repository_owner }}"]}}}', /must not contain a GitHub Actions expression/],
]) {
  test(`control policy rejects ${name}`, () => {
    const result = validate(policy);

    assert.notEqual(result.status, 0, `${name} unexpectedly succeeded`);
    assert.match(result.stderr, error);
  });
}
