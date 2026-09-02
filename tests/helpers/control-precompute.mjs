import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function controlPrecomputeScript() {
  return readFileSync(join(root, ".github", "cao", "precompute.sh"), "utf8");
}

export function controlPolicy({
  scope = {},
  inventory = {},
  packagePolicy = {},
  workerPolicy = {},
} = {}) {
  return JSON.stringify({
    version: 1,
    "control-plane": {
      scope: { "allowed-owners": ["acme"], ...scope },
      inventory,
      packages: {
        dependabot: {
          mode: "review",
          "max-repositories": 1,
          "rollout-percent": 100,
          ...packagePolicy,
          ...(workerPolicy === null ? {} : {
            workers: {
              "release-train-updater": {
                workflow: "dependabot-release-train-updater",
                ...workerPolicy,
              },
            },
          }),
        },
      },
    },
  });
}

export function controlEnvironment(overrides = {}) {
  return {
    ...process.env,
    BUNDLE: "dependabot",
    ROLE: "worker",
    WORKER: "release-train-updater",
    TARGET_REPO: "acme/target",
    REQUESTED_MODE: "review",
    REQUESTED_MAX_REPOS: "",
    REQUESTED_ROLLOUT_PERCENT: "",
    DISPATCH_MAX: "1",
    SAFE_OUTPUT_REPO: "acme/control",
    CORRELATION_ID: "123-1",
    CENTRAL_REPO: "acme/control",
    CONTROL_PLANE_RUN_URL: "https://github.com/acme/control/actions/runs/123",
    ORCHESTRATOR_CREDITS: "250",
    WORKER_CREDITS_PER_TARGET: "600",
    AGGREGATE_CREDIT_LIMIT: "1100",
    MONTHLY_CREDIT_BUDGET: "0",
    GITHUB_REPOSITORY: "acme/control",
    GITHUB_SERVER_URL: "https://github.com",
    WORKFLOW_SHA: "1111111111111111111111111111111111111111",
    GITHUB_WORKFLOW_REF: "acme/control/.github/workflows/dependabot.lock.yml@main",
    CONTROL_POLICY: controlPolicy(),
    ...overrides,
  };
}