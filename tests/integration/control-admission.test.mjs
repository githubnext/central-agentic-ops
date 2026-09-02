import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { controlPolicy, root } from "../helpers/control-precompute.mjs";

const admissionScript = join(root, ".github", "cao", "admit.sh");
const resolver = join(root, ".github", "cao", "resolve.mjs");

function runAdmission({ policy = controlPolicy(), resolverFailure = false } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "central-ops-admission-"));
  const mockGh = join(directory, "gh");
  const policyFile = join(directory, "policy.json");
  const githubOutput = join(directory, "github-output");
  const stepSummary = join(directory, "step-summary");
  writeFileSync(policyFile, policy);
  writeFileSync(githubOutput, "");
  writeFileSync(stepSummary, "");
  writeFileSync(mockGh, `#!/bin/sh
case "$*" in
  *contents/.github/central-agentic-ops.json*)
    base64 < "$MOCK_POLICY_FILE"
    ;;
  *contents/.github/cao/resolve.mjs*)
    [ "$MOCK_RESOLVER_FAILURE" != "true" ] || exit 1
    base64 < "$MOCK_RESOLVER_FILE"
    ;;
  *)
    exit 2
    ;;
esac
`);
  chmodSync(mockGh, 0o755);

  try {
    const result = spawnSync("bash", [admissionScript], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        CAO_PACKAGE: "dependabot",
        CAO_ROLE: "orchestrator",
        GITHUB_OUTPUT: githubOutput,
        GITHUB_REPOSITORY: "acme/control",
        GITHUB_STEP_SUMMARY: stepSummary,
        MOCK_POLICY_FILE: policyFile,
        MOCK_RESOLVER_FAILURE: String(resolverFailure),
        MOCK_RESOLVER_FILE: resolver,
        RUNNER_TEMP: realpathSync(directory),
        WORKFLOW_SHA: "1111111111111111111111111111111111111111",
      },
    });
    return {
      result,
      output: Object.fromEntries(
        readFileSync(githubOutput, "utf8")
          .trim()
          .split("\n")
          .map((line) => {
            const separator = line.indexOf("=");
            return [line.slice(0, separator), line.slice(separator + 1)];
          }),
      ),
      summary: readFileSync(stepSummary, "utf8"),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("CAO admission authorizes a declared package before activation", () => {
  const { result, output, summary } = runAdmission();

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(output, { authorized: "true", reason: "authorized", monthly_credit_budget: "0" });
  assert.match(summary, /Authorized package `dependabot` as `orchestrator`/);
});

test("CAO admission exports the authorized package budget", () => {
  const { result, output } = runAdmission({
    policy: controlPolicy({ packagePolicy: { "monthly-ai-credit-budget": 1200 } }),
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(output, { authorized: "true", reason: "authorized", monthly_credit_budget: "1200" });
});

test("CAO admission denies a disabled package without failing the workflow", () => {
  const { result, output, summary } = runAdmission({
    policy: controlPolicy({ packagePolicy: { enabled: false } }),
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(output, { authorized: "false", reason: "package-disabled", monthly_credit_budget: "0" });
  assert.match(summary, /Skipped package `dependabot` as `orchestrator`: package-disabled/);
});

test("CAO admission fails closed when policy validation fails", () => {
  const { result, output } = runAdmission({ policy: "{" });

  assert.equal(result.status, 0);
  assert.deepEqual(output, {
    authorized: "false",
    reason: "control policy validation failed",
    monthly_credit_budget: "0",
  });
});

test("CAO admission fails closed when the resolver cannot be fetched", () => {
  const { result, output } = runAdmission({ resolverFailure: true });

  assert.equal(result.status, 0);
  assert.deepEqual(output, {
    authorized: "false",
    reason: "cannot read the control policy resolver at github.workflow_sha",
    monthly_credit_budget: "0",
  });
});