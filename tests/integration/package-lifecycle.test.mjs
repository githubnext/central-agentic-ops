import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const packageSource = process.env.CENTRAL_AGENTIC_OPS_PACKAGE_SOURCE
  || "githubnext/central-agentic-ops@main";
const updateSource = process.env.CENTRAL_AGENTIC_OPS_UPDATE_SOURCE
  || "githubnext/central-agentic-ops@main";

const expectedFiles = [
  ".github/agents/agentic-workflows.md",
  ".github/skills/agentic-workflows/SKILL.md",
  ".github/skills/create-ops-bundle/SKILL.md",
  ".github/workflows/aw-failures-investigator.md",
  ".github/workflows/aw-failures.md",
  ".github/workflows/dependabot-release-train-updater.md",
  ".github/workflows/dependabot.md",
  ".github/workflows/optimization-ai-credit-auditor.md",
  ".github/workflows/optimization-ai-credit-optimizer.md",
  ".github/workflows/optimization.md",
  ".github/workflows/shared/control-precompute.md",
  ".github/workflows/shared/control.md",
  ".github/workflows/shared/review-bundle.md",
  ".github/workflows/shared/target-checkout-read-org-token.md",
];
const repositoryOnlyFiles = [
  ".github/aw/e2e/run-canary.sh",
  ".github/aw/e2e/run-stress.sh",
  ".github/workflows/enterprise-canary.yml",
  ".github/workflows/enterprise-stress.yml",
  ".github/workflows/staged-smoke.yml",
];

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function workflowBody(content) {
  const frontmatterEnd = content.indexOf("\n---\n", 4);
  assert.notEqual(frontmatterEnd, -1, "workflow is missing closing frontmatter");
  return content.slice(frontmatterEnd + 5).trimEnd();
}

function installPackage(source) {
  const consumer = mkdtempSync(join(tmpdir(), "central-agentic-ops-package-"));
  run("git", ["init", "--quiet"], consumer);
  run("gh", [
    "aw",
    "add",
    source,
    "--force",
    "--no-security-scanner",
  ], consumer);
  return consumer;
}

function assertCorePackage(consumer) {
  for (const relativePath of expectedFiles) {
    assert.ok(existsSync(join(consumer, relativePath)), `gh aw add omitted ${relativePath}`);
  }

  const packageManifests = readdirSync(join(consumer, ".github", "aw", "packages"));
  assert.equal(packageManifests.length, 1, "expected one installed package manifest");
  const installedManifest = JSON.parse(readFileSync(
    join(consumer, ".github", "aw", "packages", packageManifests[0]),
    "utf8",
  ));
  assert.deepEqual(
    installedManifest.files.map(({ destination }) => destination).sort(),
    [
      ".github/workflows/aw-failures.md",
      ".github/workflows/dependabot.md",
      ".github/workflows/optimization.md",
    ],
    "installed package manifest does not match the core bundle",
  );

  for (const relativePath of repositoryOnlyFiles) {
    assert.ok(!existsSync(join(consumer, relativePath)), `package installed repository-only test asset ${relativePath}`);
  }
  assert.ok(!existsSync(join(consumer, ".github", "workflows", "ops-pages.yml")));
  assert.ok(!existsSync(join(consumer, ".github", "ops-values")));
}

test("gh aw add installs the core package file contract", { timeout: 180_000 }, () => {
  const consumer = installPackage(packageSource);

  try {
    assertCorePackage(consumer);
  } finally {
    rmSync(consumer, { recursive: true, force: true });
  }
});

test("gh aw update replaces workflows and restores package-owned assets", { timeout: 180_000 }, () => {
  const consumer = installPackage(updateSource);

  try {
    const orchestratorPath = join(consumer, ".github", "workflows", "dependabot.md");
    const orchestrator = readFileSync(orchestratorPath, "utf8");
    writeFileSync(orchestratorPath, `${orchestrator}\n# local integration-test change\n`);

    const removedFiles = [
      ".github/agents/agentic-workflows.md",
      ".github/skills/create-ops-bundle/SKILL.md",
      ".github/workflows/shared/control-precompute.md",
    ];
    for (const relativePath of removedFiles) {
      rmSync(join(consumer, relativePath));
    }

    run("gh", [
      "aw",
      "update",
      "--force",
      "--no-merge",
      "--no-compile",
      "--no-security-scanner",
      "--cool-down",
      "0",
    ], consumer);

    const updatedOrchestrator = readFileSync(orchestratorPath, "utf8");
    assert.ok(
      !updatedOrchestrator.includes("# local integration-test change"),
      "gh aw update retained a local package workflow modification",
    );
    assert.equal(workflowBody(updatedOrchestrator), workflowBody(orchestrator));
    for (const relativePath of removedFiles) {
      assert.ok(existsSync(join(consumer, relativePath)), `gh aw update did not restore ${relativePath}`);
    }
  } finally {
    rmSync(consumer, { recursive: true, force: true });
  }
});