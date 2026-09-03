import assert from "node:assert/strict";
import test from "node:test";
import {
  extractCaoFailureMessage,
  isFailedConclusion,
  runFailureEvidence,
} from "../../activity/failure-evidence.mjs";

test("run failure evidence normalizes API capacity and retains the failed job and step", () => {
  const evidence = runFailureEvidence([{
    id: 42,
    name: "pre_activation",
    conclusion: "failure",
    steps: [{
      name: "CAO admission blocked: GitHub API limited until 2026-09-03T11:48:27.000Z",
      conclusion: "failure",
    }],
  }], Date.parse("2026-09-03T11:23:27.000Z"));

  assert.deepEqual(evidence, {
    admissionStatus: "resource-limited",
    admissionReason: "github-api-capacity-insufficient",
    resource: "github-rest-api",
    resourceResetAt: "2026-09-03T11:48:27.000Z",
    resourceWaitHours: 0.42,
    failureJobId: 42,
    failureJob: "pre_activation",
    failureStep: "CAO admission blocked: GitHub API limited until 2026-09-03T11:48:27.000Z",
  });
});

test("run failure evidence recognizes timed-out jobs", () => {
  assert.equal(isFailedConclusion("timed_out"), true);
  assert.deepEqual(runFailureEvidence([{
    id: 7,
    name: "agent",
    conclusion: "timed_out",
    steps: [{ name: "Execute agent", conclusion: "timed_out" }],
  }]), {
    failureJobId: 7,
    failureJob: "agent",
    failureStep: "Execute agent",
  });
});

test("CAO failure log extraction accepts controlled markers and the historical authority message", () => {
  assert.equal(
    extractCaoFailureMessage("2026-09-03T00:00:00Z [CAO failure] worker is disabled by its control-plane policy\n"),
    "Worker is disabled by its control-plane policy",
  );
  assert.equal(
    extractCaoFailureMessage("live mode requires .github/workflows/cao.json on the target default branch\n##[error]Process completed with exit code 1."),
    "Target authority missing: add .github/workflows/cao.json to the target default branch for live mode",
  );
  assert.equal(extractCaoFailureMessage("token-like arbitrary job output\n##[error]Process completed with exit code 1."), "");
});