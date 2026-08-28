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
function focusedPackageSource(slug) {
  const separator = packageSource.lastIndexOf("@");
  assert.notEqual(separator, -1, "package source must include a ref");
  return `${packageSource.slice(0, separator)}/${slug}${packageSource.slice(separator)}`;
}
const advisoryPackageSource = focusedPackageSource("advisory");
const craPackageSource = focusedPackageSource("eu-cra-compliance");
const advisoryExpectedFiles = [
  ".github/aw/advisory/implementation-status.md",
  ".github/workflows/advisory-package-maintainer.md",
  ".github/workflows/advisory-uk-ai-operational-resilience.md",
  ".github/workflows/advisory.md",
  ".github/workflows/shared/control-precompute.md",
  ".github/workflows/shared/control.md",
];

const expectedFiles = [
  ".github/agents/agentic-workflows.md",
  ".github/skills/agentic-workflows/SKILL.md",
  ".github/skills/create-ops-package/SKILL.md",
  ".github/workflows/ambient-context-agents-md-curator.md",
  ".github/workflows/ambient-context-skills-curator.md",
  ".github/workflows/ambient-context.md",
  ".github/workflows/aw-failures-investigator.md",
  ".github/workflows/aw-failures.md",
  ".github/workflows/aw-maintenance-upgrade.md",
  ".github/workflows/aw-maintenance.md",
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
  ".github/workflows/review-smoke.yml",
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
  try {
    run("git", ["init", "--quiet"], consumer);
    run("gh", [
      "aw",
      "add",
      source,
      "--force",
      "--no-security-scanner",
    ], consumer);
    return consumer;
  } catch (error) {
    rmSync(consumer, { recursive: true, force: true });
    throw error;
  }
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
      ".github/workflows/ambient-context.md",
      ".github/workflows/aw-failures.md",
      ".github/workflows/aw-maintenance.md",
      ".github/workflows/dependabot.md",
      ".github/workflows/optimization.md",
    ],
    "installed package manifest does not match the core package",
  );

  for (const relativePath of repositoryOnlyFiles) {
    assert.ok(!existsSync(join(consumer, relativePath)), `package installed repository-only test asset ${relativePath}`);
  }
  assert.ok(!existsSync(join(consumer, ".github", "workflows", "ops-pages.yml")));
  assert.ok(!existsSync(join(consumer, ".github", "ops-values")));
  assert.ok(!existsSync(join(consumer, ".github", "workflows", "advisory.md")));
  assert.ok(!existsSync(join(consumer, ".github", "aw", "advisory", "implementation-status.md")));
  assert.ok(!existsSync(join(consumer, ".github", "workflows", "eu-cra-compliance.md")));
  assert.ok(!existsSync(join(consumer, ".github", "aw", "eu-cra-compliance", "implementation-status.md")));
}

test("gh aw add installs the core package file contract", { timeout: 180_000 }, () => {
  const consumer = installPackage(packageSource);

  try {
    assertCorePackage(consumer);
  } finally {
    rmSync(consumer, { recursive: true, force: true });
  }
});

test("gh aw add reports the focused EU CRA grader transport blocker", { timeout: 180_000 }, () => {
  assert.throws(
    () => installPackage(craPackageSource),
    /eu-cra-compliance\/\.github\/graders\/eu-cra-compliance-package-maintainer-operational-value\.sh/,
  );
});

test("gh aw add installs the focused Advisory package contract", { timeout: 180_000 }, () => {
  const consumer = installPackage(advisoryPackageSource);

  try {
    for (const relativePath of advisoryExpectedFiles) {
      assert.ok(existsSync(join(consumer, relativePath)), `focused Advisory package omitted ${relativePath}`);
    }
    assert.ok(
      !existsSync(join(consumer, ".github", "workflows", "dependabot.md")),
      "focused Advisory package installed an unrelated orchestrator",
    );

    const packageManifests = readdirSync(join(consumer, ".github", "aw", "packages"));
    assert.equal(packageManifests.length, 1, "expected one focused Advisory package manifest");
    const installedManifest = JSON.parse(readFileSync(
      join(consumer, ".github", "aw", "packages", packageManifests[0]),
      "utf8",
    ));
    assert.deepEqual(
      installedManifest.files.map(({ destination }) => destination).sort(),
      [
        ".github/aw/advisory/implementation-status.md",
        ".github/workflows/advisory-package-maintainer.md",
        ".github/workflows/advisory.md",
      ],
      "focused Advisory package manifest must own its entry workflows and ledger",
    );
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
      ".github/skills/create-ops-package/SKILL.md",
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