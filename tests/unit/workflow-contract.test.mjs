import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { policyCases, userFacingScenarios } from "./workflow-contract.matrix.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const workflowsDirectory = join(root, ".github", "workflows");
const modes = ["review", "live"];

function workflow(name, directory = workflowsDirectory) {
  return readFileSync(join(directory, name), "utf8");
}

function generatedJobs(source) {
  const jobsStart = source.indexOf("\njobs:\n");
  assert.notEqual(jobsStart, -1, "generated workflow has no jobs section");
  const jobsSource = source.slice(jobsStart + 7);
  const matches = [...jobsSource.matchAll(/^  ([A-Za-z0-9_-]+):\n/gm)];

  return new Map(matches.map((match, index) => {
    const block = jobsSource.slice(match.index, matches[index + 1]?.index ?? jobsSource.length);
    const inlineNeeds = /^    needs: ([A-Za-z0-9_-]+)$/m.exec(block);
    const listNeeds = /^    needs:\n((?:      - [A-Za-z0-9_-]+\n)+)/m.exec(block);
    const needs = inlineNeeds
      ? [inlineNeeds[1]]
      : [...(listNeeds?.[1].matchAll(/^      - ([A-Za-z0-9_-]+)$/gm) ?? [])].map((item) => item[1]);

    return [match[1], { block, needs }];
  }));
}

function transitivelyNeeds(jobs, jobName, dependency, visited = new Set()) {
  if (visited.has(jobName)) return false;
  visited.add(jobName);
  const needs = jobs.get(jobName)?.needs ?? [];
  return needs.includes(dependency)
    || needs.some((name) => transitivelyNeeds(jobs, name, dependency, visited));
}

function resolvePolicy({
  eventName,
  configuredMode,
  manualMode,
  manualReviewRepo,
  controlRepository = "acme/control-plane",
  maxRepos,
  rolloutPercent,
  totalRepositories,
  dispatchMax = 1000,
  eligibleWorkers = 1,
  orchestratorCredits = 0,
  workerCreditsPerTarget = 0,
  aggregateCreditLimit = 1100,
  packageEnabled = true,
}) {
  if (packageEnabled === false) {
    return {
      enabled: false,
      safeOutputMode: null,
      safeOutputRepo: "",
      effectiveMaxRepos: 0,
      dispatchAllowed: false,
    };
  }
  if (packageEnabled !== true) {
    throw new TypeError("packageEnabled must be true or false");
  }
  if (!Number.isInteger(maxRepos) || maxRepos < 1 || maxRepos > 1000) {
    throw new RangeError("maxRepos must be an integer from 1 through 1000");
  }
  if (!Number.isInteger(rolloutPercent) || rolloutPercent < 1 || rolloutPercent > 100) {
    throw new RangeError("rolloutPercent must be an integer from 1 through 100");
  }
  if (!Number.isInteger(orchestratorCredits) || orchestratorCredits < 0
    || !Number.isInteger(workerCreditsPerTarget) || workerCreditsPerTarget < 0
    || !Number.isInteger(aggregateCreditLimit) || aggregateCreditLimit < 1) {
    throw new RangeError("AI Credit admission values must be bounded integers");
  }

  const requestedMode = eventName === "workflow_dispatch"
    ? manualMode || "review"
    : configuredMode || "review";
  if (!modes.includes(requestedMode)) {
    throw new RangeError("safeOutputMode must be review or live");
  }
  const safeOutputMode = requestedMode;
  const reviewOutputRepo = manualReviewRepo || controlRepository;
  const percentCap = totalRepositories === 0
    ? 0
    : Math.max(1, Math.ceil(totalRepositories * rolloutPercent / 100));
  const dispatchCap = eligibleWorkers === 0 ? 0 : Math.floor(dispatchMax / eligibleWorkers);
  const creditCap = workerCreditsPerTarget === 0
    ? maxRepos
    : Math.max(0, Math.floor((aggregateCreditLimit - orchestratorCredits) / workerCreditsPerTarget));
  const effectiveMaxRepos = Math.min(maxRepos, percentCap, dispatchCap, creditCap);

  return {
    enabled: packageEnabled,
    safeOutputMode,
    safeOutputRepo: safeOutputMode === "review" ? reviewOutputRepo : "",
    effectiveMaxRepos,
    dispatchAllowed: true,
  };
}

test("all scheduled configurations and manual selections route safely", () => {
  const cases = policyCases();
  const uniqueInputs = new Set(cases.map(({ id, ...values }) => JSON.stringify(values)));

  assert.equal(cases.length, 120);
  assert.equal(cases.filter(({ eventName }) => eventName === "schedule").length, 24);
  assert.equal(cases.filter(({ eventName }) => eventName === "workflow_dispatch").length, 96);
  assert.equal(uniqueInputs.size, cases.length, "matrix contains duplicate policy inputs");

  for (const scenario of cases) {
    const policy = resolvePolicy(scenario);
    const expectedMode = scenario.eventName === "workflow_dispatch"
      ? scenario.manualMode
      : scenario.configuredMode;
    const expectedReviewRepo = scenario.manualReviewRepo || "acme/control-plane";
    const percentageCap = scenario.rolloutPercent === 10 ? 3 : 25;

    assert.equal(policy.enabled, scenario.packageEnabled, scenario.id);
    assert.equal(policy.safeOutputMode, scenario.packageEnabled ? expectedMode : null, scenario.id);
    assert.equal(
      policy.safeOutputRepo,
      scenario.packageEnabled && expectedMode === "review" ? expectedReviewRepo : "",
      scenario.id,
    );
    assert.equal(
      policy.dispatchAllowed,
      scenario.packageEnabled,
      scenario.id,
    );
    assert.equal(
      policy.effectiveMaxRepos,
      scenario.packageEnabled
        ? (scenario.maxRepos ? Math.min(scenario.maxRepos, percentageCap) : percentageCap)
        : 0,
      scenario.id,
    );
  }
});

test("every checked user-facing scenario is backed by the exhaustive matrix", () => {
  const cases = policyCases();
  const groupCounts = Object.groupBy(userFacingScenarios, ({ group }) => group);

  assert.equal(userFacingScenarios.length, 22);
  assert.equal(new Set(userFacingScenarios.map(({ name }) => name)).size, 22);
  assert.equal(groupCounts["Scheduled modes"].length, 4);
  assert.equal(groupCounts["Manual runs"].length, 3);
  assert.equal(groupCounts["Review routing"].length, 4);
  assert.equal(groupCounts["Rollout limits"].length, 7);
  assert.equal(groupCounts["Kill switch"].length, 4);

  for (const scenario of userFacingScenarios) {
    const matrixCase = cases.find(({ id, totalRepositories, ...inputs }) =>
      Object.entries(scenario.inputs).every(([name, value]) => inputs[name] === value)
      && inputs.packageEnabled === (scenario.inputs.packageEnabled ?? true));

    assert.ok(matrixCase, `${scenario.name} is missing from the exhaustive matrix`);
    const policy = resolvePolicy(matrixCase);
    assert.equal(policy.enabled, scenario.inputs.packageEnabled ?? true, scenario.name);
    const { enabled, ...actual } = policy;
    assert.deepEqual(actual, scenario.expected, scenario.name);
  }
});

test("percentage rollout rejects invalid settings and handles an empty organization", () => {
  for (const maxRepos of [0, -1, 1.5, 1001, Number.NaN]) {
    assert.throws(
      () => resolvePolicy({ maxRepos, rolloutPercent: 100, totalRepositories: 10 }),
      RangeError,
    );
  }

  for (const rolloutPercent of [0, 101, 10.5, Number.NaN]) {
    assert.throws(
      () => resolvePolicy({ rolloutPercent, totalRepositories: 10 }),
      RangeError,
    );
  }

  assert.equal(resolvePolicy({ maxRepos: 1, rolloutPercent: 10, totalRepositories: 0 }).effectiveMaxRepos, 0);
  for (const configuredMode of ["unknown", "preview", "preview_only", "staged", "Review", "LIVE", "review "]) {
    assert.throws(() => resolvePolicy({
      eventName: "schedule",
      configuredMode,
      maxRepos: 1,
      rolloutPercent: 100,
      totalRepositories: 25,
    }), RangeError);
  }
  assert.deepEqual(resolvePolicy({
    eventName: "schedule",
    configuredMode: "invalid-but-disabled",
    packageEnabled: false,
    maxRepos: 0,
    rolloutPercent: 0,
    totalRepositories: 25,
  }), {
    enabled: false,
    safeOutputMode: null,
    safeOutputRepo: "",
    effectiveMaxRepos: 0,
    dispatchAllowed: false,
  });
  assert.equal(resolvePolicy({
    eventName: "schedule",
    configuredMode: "",
    maxRepos: 1,
    rolloutPercent: 100,
    totalRepositories: 25,
  }).safeOutputMode, "review");
  assert.equal(resolvePolicy({
    eventName: "workflow_dispatch",
    manualMode: "",
    maxRepos: 1,
    rolloutPercent: 100,
    totalRepositories: 25,
  }).safeOutputMode, "review");
});

test("manual requests run independently of scheduled configuration", () => {
  for (const manualMode of modes) {
    const policy = resolvePolicy({
      eventName: "workflow_dispatch",
      configuredMode: manualMode === "review" ? "live" : "review",
      manualMode,
      manualReviewRepo: manualMode === "review" ? "acme/manual-review" : "",
      maxRepos: 1,
      rolloutPercent: 100,
      totalRepositories: 25,
    });

    assert.equal(policy.enabled, true, manualMode);
    assert.equal(policy.safeOutputMode, manualMode, manualMode);
    assert.equal(policy.dispatchAllowed, true, manualMode);
  }
});

test("enterprise-scale limits remain bounded across inventory sizes", () => {
  const inventorySizes = [0, 1, 2, 10, 99, 100, 999, 1000, 10_000, 1_000_000];
  const rolloutPercents = [1, 2, 10, 33, 50, 99, 100];
  const absoluteCaps = [1, 10, 50, 1000];

  for (const totalRepositories of inventorySizes) {
    for (const rolloutPercent of rolloutPercents) {
      for (const maxRepos of absoluteCaps) {
        const policy = resolvePolicy({
          eventName: "schedule",
          configuredMode: "live",
          maxRepos,
          rolloutPercent,
          totalRepositories,
          dispatchMax: 50,
          eligibleWorkers: 1,
        });
        const percentageCap = totalRepositories === 0
          ? 0
          : Math.max(1, Math.ceil(totalRepositories * rolloutPercent / 100));

        assert.equal(policy.effectiveMaxRepos, Math.min(maxRepos, percentageCap, 50));
        assert.ok(policy.effectiveMaxRepos <= 50);
      }
    }
  }

  assert.equal(resolvePolicy({
    eventName: "schedule",
    configuredMode: "live",
    maxRepos: 1000,
    rolloutPercent: 100,
    totalRepositories: 1_000_000,
    dispatchMax: 20,
    eligibleWorkers: 2,
  }).effectiveMaxRepos, 10, "two workers share the optimization dispatch budget");
  assert.equal(resolvePolicy({
    eventName: "schedule",
    configuredMode: "live",
    maxRepos: 1000,
    rolloutPercent: 100,
    totalRepositories: 1_000_000,
    dispatchMax: 20,
    eligibleWorkers: 0,
  }).effectiveMaxRepos, 0, "disabled workers form a worker-level kill switch");
});

test("enterprise defaults, budgets, timeouts, and concurrency are finite", () => {
  const expected = {
    "uk-ai-advisory.md": { credits: 250, timeout: 15, dispatchMax: 50, workers: 1 },
    "advisory-package-maintainer.md": { credits: 200, timeout: 20 },
    "advisory-uk-ai-operational-resilience.md": { credits: 600, timeout: 30 },
    "ambient-context.md": { credits: 250, timeout: 15, dispatchMax: 20, workers: 2 },
    "aw-maintenance.md": { credits: 250, timeout: 15, dispatchMax: 50, workers: 2 },
    "dependabot.md": { credits: 250, timeout: 15, dispatchMax: 50, workers: 1 },
    "eu-cra-compliance.md": { credits: 200, timeout: 15, dispatchMax: 48, workers: 6 },
    "eu-cra-compliance-package-maintainer.md": { credits: 200, timeout: 20 },
    "optimization.md": { credits: 250, timeout: 15, dispatchMax: 20, workers: 2 },
    "self-care.md": { credits: 200, timeout: 15, dispatchMax: 2, workers: 2 },
    "ambient-context-agents-md-curator.md": { credits: 400, timeout: 25 },
    "ambient-context-skills-curator.md": { credits: 400, timeout: 20 },
    "aw-failures-investigator.md": { credits: 500, timeout: 30 },
    "aw-maintenance-upgrade.md": { credits: 500, timeout: 30 },
    "dependabot-release-train-updater.md": { credits: 600, timeout: 60 },
    "eu-cra-compliance-article-14-reporting-readiness.md": { credits: 150, timeout: 30 },
    "eu-cra-compliance-conformity-release-evidence.md": { credits: 150, timeout: 30 },
    "eu-cra-compliance-scope-classifier.md": { credits: 150, timeout: 25 },
    "eu-cra-compliance-security-requirements-auditor.md": { credits: 150, timeout: 30 },
    "eu-cra-compliance-supply-chain-sbom-auditor.md": { credits: 150, timeout: 30 },
    "eu-cra-compliance-vulnerability-handling-auditor.md": { credits: 150, timeout: 30 },
    "optimization-ai-credit-auditor.md": { credits: 350, timeout: 35 },
    "optimization-ai-credit-optimizer.md": { credits: 500, timeout: 30 },
    "self-care-accessibility-checker.md": { credits: 400, timeout: 30 },
    "self-care-primer-brand-checker.md": { credits: 400, timeout: 25 },
  };

  for (const [name, limits] of Object.entries(expected)) {
    const source = workflow(name);
    assert.match(source, new RegExp(`max-ai-credits: ${limits.credits}`), name);
    assert.match(source, new RegExp(`timeout-minutes: ${limits.timeout}`), name);
    assert.match(source, /concurrency:\n\s+group:.*\n(?:\s+job-discriminator:.*\n)?\s+cancel-in-progress: true/, name);
    assert.doesNotMatch(source, /^\s+(contents|actions|issues|pull-requests): write$/m, name);
    if (limits.dispatchMax) {
      assert.match(source, new RegExp(`dispatch_max: "${limits.dispatchMax}"`), name);
      assert.match(source, new RegExp(`dispatch-workflow:[\\s\\S]*?max: ${limits.dispatchMax}`), name);
      assert.match(source, new RegExp(`orchestrator_credits: "${limits.credits}"`), name);
    }
  }

  const control = workflow("shared/control.md");
  const precompute = workflow("shared/control-precompute.md");
  assert.match(control, /package:\n\s+type: string\n\s+required: true/);
  assert.match(control, /role:\n\s+type: choice\n\s+options: \[orchestrator, worker\]/);
  assert.match(control, /worker:\n\s+type: string\n\s+default: "__none__"/);
  assert.match(precompute, /node "\$resolver" --effective/);
  assert.match(precompute, /contents\/\.github\/central-agentic-ops\.json/);
  assert.match(precompute, /max_repos must be an integer from 1 through 1000/);
  assert.match(precompute, /max_scan_repos must be an integer from 1 through 100000/);
  assert.match(precompute, /control-plane\.scope\.allowed-repositories is invalid/);
  assert.match(precompute, /repo_source="allowed_repos"/);
  assert.match(precompute, /inventory_version/);
  assert.match(precompute, /batch_id/);
  assert.match(precompute, /\.id % \$cell_count/);
  assert.match(precompute, /dispatch_max must be an integer from 1 through 1000/);
  assert.match(precompute, /\(\$dispatch_max \| tonumber\) \/ \$eligible_workers \| floor/);
  assert.match(precompute, /\[\.effective_max_repos, \.monthly_budget_target_cap\] \| min/);
  assert.match(precompute, /monthly_credit_budget must be a non-negative integer/);
  assert.match(precompute, /gh aw logs "\$workflow_id" --start-date "\$month_start" --json -c 1000/);
  assert.doesNotMatch(precompute, /--paginate/);
  assert.doesNotMatch(`${control}\n${precompute}`, /vars\.CENTRAL_AGENTIC_OPS_|repositories: \["\*"\]/);
});

test("workers disable costly daily AIC burn checks", () => {
  const workers = readdirSync(workflowsDirectory)
    .filter((name) => name.endsWith(".md"))
    .map((name) => [name, workflow(name)])
    .filter(([, source]) => /^\s+role: worker$/m.test(source));

  assert.ok(workers.length > 0, "expected at least one worker workflow");

  for (const [name, source] of workers) {
    assert.match(source, /^max-daily-ai-credits: -1$/m, name);
  }
});

test("AI Credit auditor uses gh-aw forecast for cost projections", () => {
  const auditor = workflow("optimization-ai-credit-auditor.md");

  assert.match(auditor, /gh aw forecast \\/);
  assert.match(auditor, /--repo "\$TARGET_REPOSITORY"/);
  assert.match(auditor, /--days 30/);
  assert.match(auditor, /--period month/);
  assert.match(auditor, /--json/);
  assert.match(auditor, /FORECAST_EXIT_CODE=0/);
  assert.match(auditor, /FORECAST_JSON_VALID=false/);
  assert.match(auditor, /weekly_monte_carlo/);
  assert.match(auditor, /monthly_monte_carlo/);
  assert.match(auditor, /1 AIC = \$0\.01 USD/);
  assert.match(auditor, /billing dashboards remain authoritative/);
});

test("aggregate AI Credit admission reduces target fan-out", () => {
  const base = {
    eventName: "schedule",
    configuredMode: "live",
    maxRepos: 50,
    rolloutPercent: 100,
    totalRepositories: 100,
    dispatchMax: 50,
  };

  assert.equal(resolvePolicy({
    ...base,
    orchestratorCredits: 250,
    workerCreditsPerTarget: 600,
    aggregateCreditLimit: 1100,
  }).effectiveMaxRepos, 1);
  assert.equal(resolvePolicy({
    ...base,
    orchestratorCredits: 250,
    workerCreditsPerTarget: 600,
    aggregateCreditLimit: 2050,
  }).effectiveMaxRepos, 3);
  assert.equal(resolvePolicy({
    ...base,
    orchestratorCredits: 250,
    workerCreditsPerTarget: 850,
    aggregateCreditLimit: 250,
  }).effectiveMaxRepos, 0);
});

test("deterministic workflows pin third-party actions by commit SHA", () => {
  for (const relativePath of [
    join(".github", "workflows", "workflow-contracts.yml"),
    join(".github", "workflows", "copilot-setup-steps.yml"),
    join(".github", "workflows", "enterprise-canary.yml"),
    join(".github", "workflows", "enterprise-stress.yml"),
    join(".github", "workflows", "review-smoke.yml"),
    join("dashboard", "dashboard-build.yml"),
    join("dashboard", "dashboard.yml"),
  ]) {
    const source = readFileSync(join(root, relativePath), "utf8");
    for (const action of source.matchAll(/^\s*uses:\s+([^./\s][^@\s]+)@([^\s#]+)/gm)) {
      assert.match(action[2], /^[0-9a-f]{40}$/, `${relativePath}: ${action[1]} is mutable`);
    }
  }
});

test("workflow contracts isolate authenticated package lifecycle checks", () => {
  const packageScripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;
  assert.match(packageScripts["test:integration"], /control-failure\.test\.mjs/);
  assert.doesNotMatch(packageScripts["test:integration"], /package-lifecycle/);
  assert.match(packageScripts["test:package-lifecycle"], /package-lifecycle\.test\.mjs/);
  assert.doesNotMatch(packageScripts.test, /package-lifecycle/);

  const source = workflow("workflow-contracts.yml");
  const jobs = generatedJobs(source);
  const contracts = jobs.get("test")?.block ?? "";
  const packageLifecycle = jobs.get("package-lifecycle")?.block ?? "";

  assert.match(source, /pull_request:\n    paths-ignore:\n      - \.github\/workflows\/cid\.yml\n      - dashboard\/site\/\*\*/);
  assert.match(source, /push:\n    branches: \[main\]\n    paths-ignore:\n      - \.github\/workflows\/cid\.yml\n      - dashboard\/site\/\*\*/);
  assert.match(contracts, /npm run check/);
  assert.doesNotMatch(contracts, /GH_TOKEN|CENTRAL_AGENTIC_OPS_PACKAGE_SOURCE|test:package-lifecycle/);
  assert.match(packageLifecycle, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(packageLifecycle, /CENTRAL_AGENTIC_OPS_PACKAGE_SOURCE:/);
  assert.match(packageLifecycle, /npm run test:package-lifecycle/);
});

test("package manifests exclude repository-only tests", () => {
  for (const relativePath of ["aw.yml", join("advisory", "aw.yml"), join("ambient-context", "aw.yml"), join("aw-maintenance", "aw.yml"), join("dashboard", "aw.yml"), join("dependabot", "aw.yml"), join("eu-cra-compliance", "aw.yml"), join("optimization", "aw.yml"), join("self-care", "aw.yml")]) {
    const manifest = readFileSync(join(root, relativePath), "utf8");
    assert.doesNotMatch(manifest, /(?:review-smoke|enterprise-canary|enterprise-stress|tests\/e2e|\.github\/aw\/e2e)/, relativePath);
  }
});

test("root package provides default control-repository agent context", () => {
  const rootManifest = readFileSync(join(root, "aw.yml"), "utf8");
  const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
  const setupSkill = readFileSync(join(root, ".github", "skills", "setup-central-agentic-ops", "SKILL.md"), "utf8");

  assert.match(rootManifest, /source: AGENTS\.md\n\s+destination: \.github\/aw\/default-AGENTS\.md/);
  assert.match(rootManifest, /type: handoff\n\s+message: If this repository has no root AGENTS\.md, copy \.github\/aw\/default-AGENTS\.md to AGENTS\.md/);
  assert.match(agents, /Catalog source:[\s\S]*never configure this repository as a control plane/);
  assert.match(agents, /Control repository:[\s\S]*explicitly enrolled remote repositories/);
  assert.match(agents, /`review` is the default mode/);
  assert.match(agents, /Never edit them directly; change their Markdown sources and run `gh aw compile`/);
  assert.match(setupSkill, /no root `AGENTS\.md`[\s\S]*create `AGENTS\.md` with exactly that content/);
  assert.match(setupSkill, /preserve it unchanged unless the user explicitly approves a merge/);
});

test("catalog runtime policy resolver delegates to the canonical source", () => {
  const rootManifest = readFileSync(join(root, "aw.yml"), "utf8");
  const policy = JSON.parse(execFileSync(process.execPath, [
    join(root, ".github", "aw", "control-policy", "resolve.mjs"),
    "--effective",
    join(root, ".github", "central-agentic-ops.json"),
  ], {
    encoding: "utf8",
    env: {
      ...process.env,
      CAO_PACKAGE: "dependabot",
      CAO_ROLE: "orchestrator",
      GITHUB_REPOSITORY: "githubnext/central-agentic-ops",
    },
  }));

  assert.equal(policy.authorized, true);
  assert.equal(policy.package, "dependabot");
  assert.match(rootManifest, /source: \.github\/scripts\/control-policy\/resolve\.mjs\n\s+destination: \.github\/aw\/control-policy\/resolve\.mjs/);
});

test("root package directly includes grader-backed workers for dependency packaging", () => {
  const rootManifest = readFileSync(join(root, "aw.yml"), "utf8");
  const importedWorkerIds = [
    "ambient-context-agents-md-curator",
    "dependabot-release-train-updater",
    "optimization-ai-credit-auditor",
    "optimization-ai-credit-optimizer",
  ];

  for (const workflowId of importedWorkerIds) {
    const graderPath = `.github/graders/${workflowId}-operational-value.sh`;
    assert.ok(existsSync(join(root, graderPath)), `${graderPath} must exist`);
    assert.match(workflow(`${workflowId}.md`), new RegExp(`run: ${graderPath.replaceAll(".", "\\.")}`));
    assert.match(rootManifest, new RegExp(`- \\.github/workflows/${workflowId.replaceAll("-", "\\-")}\\.md`));
  }
});

test("compiled workflow locks are not ignored", () => {
  const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
  assert.doesNotMatch(gitignore, /\.lock\.yml/, "compiled workflow locks must not be ignored");

  const workflowIds = readdirSync(workflowsDirectory)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""));
  for (const workflowId of workflowIds) {
    const lockPath = `.github/workflows/${workflowId}.lock.yml`;
    assert.ok(existsSync(join(root, lockPath)), `${lockPath} must be compiled`);
  }
});

test("root CAO workflows defer exclusive Copilot auth selection to add-wizard", () => {
  const rootPackageWorkflowIds = [
    "ambient-context-agents-md-curator",
    "ambient-context-skills-curator",
    "ambient-context",
    "aw-failures-investigator",
    "aw-maintenance-upgrade",
    "aw-maintenance",
    "dependabot-release-train-updater",
    "dependabot",
    "optimization-ai-credit-auditor",
    "optimization-ai-credit-optimizer",
    "optimization",
    "self-care-accessibility-checker",
    "self-care-primer-brand-checker",
    "self-care",
  ];
  const rootManifest = readFileSync(join(root, "aw.yml"), "utf8");

  assert.match(rootManifest, /type: copilot-auth/);
  assert.match(rootManifest, /secret: COPILOT_GITHUB_TOKEN/);
  assert.match(rootManifest, /strategy: prompt-if-actions-auth-unavailable/);

  for (const workflowId of rootPackageWorkflowIds) {
    const source = workflow(`${workflowId}.md`);
    const lock = workflow(`${workflowId}.lock.yml`);

    assert.doesNotMatch(source, /COPILOT_GITHUB_TOKEN/, `${workflowId}.md must remain auth-neutral`);
    assert.doesNotMatch(source, /copilot-requests: write/, `${workflowId}.md must let add-wizard inject organization billing`);
    assert.match(lock, /COPILOT_GITHUB_TOKEN: \$\{\{ secrets\.COPILOT_GITHUB_TOKEN \}\}/, `${workflowId}.lock.yml must compile the neutral PAT path`);
    assert.match(lock, /#   - COPILOT_GITHUB_TOKEN/, `${workflowId}.lock.yml must declare the Copilot PAT secret`);
    assert.doesNotMatch(lock, /copilot-requests: write/, `${workflowId}.lock.yml must not mix auth profiles`);
    assert.doesNotMatch(lock, /secrets\.COPILOT_GITHUB_TOKEN \|\| github\.token/, `${workflowId}.lock.yml must not use runtime auth precedence`);
  }
});

test("compiled workflow expressions do not contain HTML-escaped operators", () => {
  const lockNames = readdirSync(workflowsDirectory).filter((name) => name.endsWith(".lock.yml"));

  for (const lockName of lockNames) {
    const expressions = workflow(lockName).match(/\$\{\{[\s\S]*?\}\}/g) ?? [];
    for (const expression of expressions) {
      assert.doesNotMatch(
        expression,
        /\\+u(?:0026|003c|003e)/i,
        `${lockName} contains an HTML-escaped operator in ${expression}`,
      );
    }
  }
});

test("operational-value graders expose deterministic run-scoped contracts", () => {
  const gradersDirectory = join(root, ".github", "graders");
  const packageGradersDirectory = join(root, ".github", "workflows", "graders");
  const packageMaintainerGrader = "eu-cra-compliance-package-maintainer-operational-value.sh";
  const graders = readdirSync(gradersDirectory).filter((name) => name.endsWith("-operational-value.sh"));
  const packageGraders = readdirSync(packageGradersDirectory).filter((name) => name.endsWith("-operational-value.sh"));
  assert.deepEqual([...graders, ...packageGraders].sort(), [
    "ambient-context-agents-md-curator-operational-value.sh",
    "aw-failures-investigator-operational-value.sh",
    "dependabot-release-train-updater-operational-value.sh",
    "eu-cra-compliance-article-14-reporting-readiness-operational-value.sh",
    "eu-cra-compliance-conformity-release-evidence-operational-value.sh",
    "eu-cra-compliance-package-maintainer-operational-value.sh",
    "eu-cra-compliance-scope-classifier-operational-value.sh",
    "eu-cra-compliance-security-requirements-auditor-operational-value.sh",
    "eu-cra-compliance-supply-chain-sbom-auditor-operational-value.sh",
    "eu-cra-compliance-vulnerability-handling-auditor-operational-value.sh",
    "optimization-ai-credit-auditor-operational-value.sh",
    "optimization-ai-credit-optimizer-operational-value.sh",
  ]);
  assert.deepEqual(packageGraders, [packageMaintainerGrader]);

  for (const name of [...graders, ...packageGraders]) {
    const isPackageMaintainer = name === packageMaintainerGrader;
    const executable = join(isPackageMaintainer ? packageGradersDirectory : gradersDirectory, name);
    const workflowName = name.replace(/-operational-value\.sh$/, ".md");
    const runPath = isPackageMaintainer ? `./graders/${name}` : `.github/graders/${name}`;
    assert.match(
      workflow(workflowName),
      new RegExp(`graders:\\s+operational-value:\\s+run: ${runPath.replaceAll(".", "\\.")}`),
      `${name}: workflow must execute the frozen operational-value evaluator`,
    );
    const definition = JSON.parse(execFileSync(executable, ["--definition"], { encoding: "utf8" }));
    assert.equal(definition.schemaVersion, 4, name);
    assert.equal(definition.grader, "operational-value", name);
    const score = (example) => JSON.parse(execFileSync(executable, ["--metric"], {
      encoding: "utf8",
      input: JSON.stringify(definition.validationExamples[example]),
    }));
    assert.ok(score("targetAttained") > score("targetMissed"), name);
    assert.equal(score("targetMissed"), 0, `${name}: complete missed opportunity`);
    assert.equal(score("missing"), null, `${name}: missing`);
    assert.equal(score("malformed"), null, `${name}: malformed`);
  }

  const dependabotWorker = workflow("dependabot-release-train-updater.md");
  const dependabotEvaluator = readFileSync(join(gradersDirectory, "dependabot-release-train-updater-operational-value.sh"), "utf8");
  const dependabotDefinition = JSON.parse(execFileSync(
    join(gradersDirectory, "dependabot-release-train-updater-operational-value.sh"),
    ["--definition"],
    { encoding: "utf8" },
  ));
  const auditorWorker = workflow("optimization-ai-credit-auditor.md");
  const auditorEvaluator = readFileSync(join(gradersDirectory, "optimization-ai-credit-auditor-operational-value.sh"), "utf8");
  const optimizerWorker = workflow("optimization-ai-credit-optimizer.md");
  const optimizerEvaluator = readFileSync(join(gradersDirectory, "optimization-ai-credit-optimizer-operational-value.sh"), "utf8");
  assert.match(dependabotWorker, /checks: read/);
  assert.match(dependabotWorker, /statuses: read/);
  assert.equal(dependabotDefinition.adoption.commit, "4615c8d8eaf51dab837238dff6fc8248a56194fe");
  assert.equal(dependabotDefinition.primaryMetric.id, "validated-dependency-resolution");
  assert.match(dependabotDefinition.evidence.assignment, /freeze the oldest eligible pull request/);
  assert.match(dependabotEvaluator, /key="dependency-pr:\$\{target_repo\}:\$\{number\}"/);
  assert.doesNotMatch(dependabotEvaluator, /key="dependency-set:.*runId/);
  assert.match(dependabotEvaluator, /diagnostics:\{\}/);
  assert.match(auditorWorker, /window_start: \$windowStart/);
  assert.match(auditorWorker, /window_end: \$windowEnd/);
  assert.match(auditorEvaluator, /workflow_path \/\/ \.workflow_name/);
  assert.match(auditorEvaluator, /evidenceRepo: \.run\.repository/);
  assert.match(optimizerWorker, /GH_REPO: \$\{\{ inputs\.target_repo \}\}/);
  assert.match(optimizerWorker, /for workflow in target\/\.github\/workflows\/\*\.md/);
  assert.match(optimizerWorker, /\$\{TARGET_PREFIX\}__optimization-log\.json/);
  assert.match(optimizerWorker, /"optimizer_run_id":"\$\{\{ github\.run_id \}\}"/);
  assert.match(optimizerEvaluator, /\.optimizer_run_id \| tostring/);
  assert.match(optimizerEvaluator, /target-workflow:\$\{target_repo\}:\$\{workflow\}:\$\{optimizer_run_id\}/);
});

test("review smoke is manual, protected, bounded, and cannot change the target", () => {
  const smoke = workflow("review-smoke.yml");
  const harness = readFileSync(join(root, "tests", "e2e", "run-canary.sh"), "utf8");
  assert.match(smoke, /workflow_dispatch:/);
  assert.doesNotMatch(smoke, /^\s+schedule:/m);
  assert.match(smoke, /actions: write/);
  assert.match(smoke, /timeout-minutes: 75/);
  assert.match(smoke, /environment: central-agentic-ops-review/);
  assert.match(smoke, /SAFE_OUTPUT_MODE: review/);
  assert.match(smoke, /SAFE_OUTPUT_REPO: \$\{\{ inputs\.safe_output_repo \}\}/);
  assert.match(smoke, /bash tests\/e2e\/run-canary\.sh/);
  assert.match(smoke, /group: review-smoke-/);
  assert.match(harness, /max_repos=1/);
  assert.match(harness, /snapshot_repository/);
  assert.match(harness, /review canary mutated target repository state/);
  assert.match(harness, /No correlated worker run was found/);
});

test("enterprise canaries are manual, protected, confirmed, and bounded", () => {
  const canary = workflow("enterprise-canary.yml");
  const stress = workflow("enterprise-stress.yml");
  const canaryHarness = readFileSync(join(root, "tests", "e2e", "run-canary.sh"), "utf8");
  const stressHarness = readFileSync(join(root, "tests", "e2e", "run-stress.sh"), "utf8");

  for (const source of [canary, stress]) {
    assert.match(source, /workflow_dispatch:/);
    assert.doesNotMatch(source, /^\s+schedule:/m);
    assert.match(source, /actions: write/);
    assert.match(source, /timeout-minutes: 120/);
    assert.match(source, /GH_AW_E2E_TOKEN/);
  }

  assert.match(canary, /bash tests\/e2e\/run-canary\.sh/);
  assert.match(stress, /bash tests\/e2e\/run-stress\.sh/);

  assert.match(canary, /options: \[review, live\]/);
  assert.match(canary, /environment: central-agentic-ops-\$\{\{ inputs\.safe_output_mode \}\}/);
  assert.match(canary, /require_output:/);
  assert.match(canaryHarness, /confirmation must be REVIEW/);
  assert.match(canaryHarness, /confirmation must be LIVE/);
  assert.match(canaryHarness, /review canary mutated target repository state/);
  assert.match(canaryHarness, /live canary required an output/);

  assert.match(stress, /environment: central-agentic-ops-\$\{\{ 'stress' \}\}/);
  assert.match(stress, /options: \[2, 3, 5\]/);
  assert.match(stressHarness, /target_repo must use OWNER\/REPO form/);
  assert.match(stressHarness, /STRESS \$TARGET_REPO REVIEW \$SAFE_OUTPUT_REPO \$RUNS/);
  assert.match(stressHarness, /RUNS - 1/);
  assert.match(stressHarness, /safe_output_mode=review/);
  assert.match(stressHarness, /review stress run mutated target repository state/);
});

test("ownership, provenance, and workflow identity fail closed", () => {
  const control = workflow("shared/control.md");
  const precompute = workflow("shared/control-precompute.md");
  const operations = readFileSync(join(root, "docs", "operations.md"), "utf8");

  assert.match(precompute, /validate_repository_owner "target_repo" "\$TARGET_REPO"/);
  assert.match(precompute, /validate_repository_owner "safe_output_repo" "\$SAFE_OUTPUT_REPO"/);
  assert.match(precompute, /outside control-plane\.scope\.allowed-owners/);
  assert.match(precompute, /\.path == \("\.github\/workflows\/" \+ \$worker \+ "\.lock\.yml"\)/);
  assert.doesNotMatch(precompute, /\.name == \$worker|gsub\("-"; " "\)/);
  assert.match(control, /central_repo`: `\$\{\{ github\.repository \}\}`/);
  assert.match(control, /correlation_id/);
  assert.match(control, /Never pass an issue, pull request, discussion, comment, or other item identifier from `target_repo`/);
  assert.match(control, /Treat all target-repository content and metadata.*as untrusted data/);
  assert.match(control, /If `repo_error` is non-empty, select no repositories and dispatch no workers/);
  assert.match(control, /Do not loop, wait for replenishment, or redispatch itself/);
  assert.match(control, /If a dispatch fails or is rate-limited, do not retry it in the same run/);
  assert.match(workflow("optimization-ai-credit-optimizer.md"), /group_by\(\.workflow_path\)/);
  assert.match(workflow("shared/target-checkout-read-org-token.md"), /path: target/);
  assert.match(workflow("optimization-ai-credit-optimizer.lock.yml"), /Checkout \$\{\{ inputs\.target_repo \}\} into target[\s\S]*?path: target/);
  assert.match(workflow("optimization-ai-credit-auditor.md"), /Group by `workflow_path`/);
  for (const name of ["optimization-ai-credit-auditor.md", "optimization-ai-credit-optimizer.md"]) {
    assert.match(workflow(name), /branch-name: "memory\/token-audit-\$\{\{ inputs\.central_repo \}\}-\$\{\{ inputs\.target_repo \}\}"/);
  }
  assert.match(operations, /disable Actions for the repository/);
  assert.match(operations, /Cancel every queued or running orchestrator and worker run/);
  assert.match(operations, /identify and stop every participating control repository/);
});

test("orchestrators emit dedicated bounded dispatcher telemetry", () => {
  const control = workflow("shared/control.md");
  const configuration = readFileSync(join(root, "docs", "configuration.md"), "utf8");
  const operations = readFileSync(join(root, "docs", "operations.md"), "utf8");
  const packageSkill = readFileSync(join(root, ".github", "skills", "create-ops-package", "SKILL.md"), "utf8");

  assert.match(control, /post-steps:[\s\S]*?Emit control-plane dispatcher telemetry/);
  assert.match(control, /github\.aw\.import-inputs\.role == 'orchestrator'/);
  assert.match(control, /otlp\.logSpan\('central-agentic-ops\.dispatcher'/);
  assert.match(control, /central_agentic_ops\.dispatcher\.dispatch_requested_count/);
  assert.match(control, /central_agentic_ops\.dispatcher\.target_count/);
  assert.match(control, /central_agentic_ops\.dispatcher\.workflow_count/);
  assert.match(control, /central_agentic_ops\.dispatcher\.incomplete_count/);
  assert.match(control, /isError: incompleteCount > 0/);
  assert.doesNotMatch(control, /central_agentic_ops\.dispatcher\.(target_repo|workflow_name|control_plane_run_url)/);
  assert.match(configuration, /`GH_AW_DEFAULT_OTLP_ENDPOINT` Actions variable/);
  assert.match(configuration, /configure exporters only; they do not create the dispatcher span/);
  assert.match(configuration, /gh variable set GH_AW_DEFAULT_OTLP_ENDPOINT/);
  assert.match(configuration, /gh secret set GH_AW_DEFAULT_OTLP_HEADERS/);
  assert.match(configuration, /Authorization=Bearer <token>/);
  assert.match(configuration, /`Authorization: <GH_AW_OTEL_SENTRY_AUTHORIZATION>`/);
  assert.match(configuration, /`Authorization: <GH_AW_OTEL_GRAFANA_AUTHORIZATION>`/);
  assert.match(configuration, /`DD-API-KEY: <GH_AW_OTEL_DATADOG_API_KEY or DD_API_KEY>`/);
  assert.match(configuration, /Installed Central Agentic Ops packages do not include these optional provider files by default/);
  assert.match(operations, /`central-agentic-ops\.dispatcher\.run` span/);
  assert.match(operations, /`requested` status records dispatch intent before safe-output handlers call the GitHub API/);
  assert.match(packageSkill, /inherits the dedicated `central-agentic-ops\.dispatcher\.run` OTEL span from `shared\/control\.md`/);
  assert.match(packageSkill, /configure OTLP exporters only/);
});

test("public read-only operation uses the built-in token without widening access", () => {
  const authentication = readFileSync(join(root, "docs", "authentication.md"), "utf8");
  const configuration = readFileSync(join(root, "docs", "configuration.md"), "utf8");
  const control = workflow("shared/control.md");
  const precompute = workflow("shared/control-precompute.md");

  assert.match(precompute, /GH_TOKEN:.*GH_AW_GITHUB_TOKEN.*secrets\.GITHUB_TOKEN/);
  assert.match(precompute, /\{id, full_name, archived, disabled, private, pushed_at, default_branch\}/);
  assert.match(authentication, /App or PAT is not required for a bounded `review` run when every target repository is public/);
  assert.match(authentication, /use `review` mode and keep safe outputs in the current control repository/);
  assert.match(authentication, /configure an App or PAT for private or internal targets, an alternate review repository, or any `live` cross-repository write/);
  assert.match(authentication, /report incomplete and produce no speculative result/);
  assert.match(configuration, /no App or PAT secret is required/);
  assert.match(control, /cannot read target evidence required by the importing workflow, stop that analysis and report it as incomplete/);
  assert.match(control, /do not silently reduce the requested analysis to the subset the token can read/);
});

test("authentication prefers an optional GitHub App and retains bounded fallbacks", () => {
  const authentication = readFileSync(join(root, "docs", "authentication.md"), "utf8");
  const bootstrap = readFileSync(join(root, "docs", "bootstrap-configuration.md"), "utf8");
  const control = workflow("shared/control.md");
  const precompute = workflow("shared/control-precompute.md");

  assert.match(control, /github-app:\n\s+client-id: \$\{\{ secrets\.GH_AW_GITHUB_APP_ID \}\}/);
  assert.match(control, /private-key: \$\{\{ secrets\.GH_AW_GITHUB_APP_PRIVATE_KEY \}\}/);
  assert.match(control, /ignore-if-missing: true/);
  assert.doesNotMatch(control, /repositories: \["\*"\]/);
  assert.match(precompute, /steps\.github-mcp-app-token\.outputs\.token \|\| secrets\.GH_AW_GITHUB_TOKEN \|\| secrets\.GITHUB_TOKEN/);
  assert.match(authentication, /runtime availability precedence, not permission to choose a PAT silently/);
  assert.match(authentication, /A PAT is not a substitute for repository or organization access/);
  assert.match(authentication, /A fine-grained PAT cannot access multiple organizations at once/);
  assert.match(authentication, /including the Checks API/);
  assert.match(authentication, /Obtain explicit confirmation to proceed/);
  assert.match(authentication, /presence of an existing PAT secret, is not consent/);
  assert.match(bootstrap, /Choose Copilot inference authentication independently from target-repository authentication/);
  assert.match(bootstrap, /organization billing first when available[\s\S]*?adds `copilot-requests: write`/);
  assert.match(bootstrap, /root `copilot-auth` action handles only inference/);
  assert.match(bootstrap, /PAT selection only after explicit consent/);
});

test("live workers require target-owned package authority before agent execution", () => {
  const control = workflow("shared/control.md");
  const precompute = workflow("shared/control-precompute.md");

  assert.match(control, /package:\n\s+type: string\n\s+required: true/);
  assert.match(precompute, /validate_live_authority/);
  assert.match(precompute, /commits\/\$default_branch/);
  assert.match(precompute, /contents\/\.github\/central-agentic-ops\.json/);
  assert.match(precompute, /node "\$RESOLVER" --authority/);
  assert.doesNotMatch(precompute, /YAML|central-agentic-ops\.yml/);
  assert.match(precompute, /target assigns live authority for \$BUNDLE to a different control repository/);
  assert.match(precompute, /validate_worker_dispatch\n\s+validate_output_destination\n\s+validate_live_authority\n\s+write_worker_precompute/);

  for (const [name, bundle] of [
    ["uk-ai-advisory.md", "advisory"],
    ["advisory-uk-ai-operational-resilience.md", "advisory"],
    ["ambient-context.md", "ambient-context"],
    ["ambient-context-agents-md-curator.md", "ambient-context"],
    ["ambient-context-skills-curator.md", "ambient-context"],
    ["aw-failures-investigator.md", "aw-maintenance"],
    ["aw-maintenance.md", "aw-maintenance"],
    ["aw-maintenance-upgrade.md", "aw-maintenance"],
    ["dependabot.md", "dependabot"],
    ["dependabot-release-train-updater.md", "dependabot"],
    ["eu-cra-compliance.md", "eu-cra-compliance"],
    ["eu-cra-compliance-article-14-reporting-readiness.md", "eu-cra-compliance"],
    ["eu-cra-compliance-conformity-release-evidence.md", "eu-cra-compliance"],
    ["eu-cra-compliance-scope-classifier.md", "eu-cra-compliance"],
    ["eu-cra-compliance-security-requirements-auditor.md", "eu-cra-compliance"],
    ["eu-cra-compliance-supply-chain-sbom-auditor.md", "eu-cra-compliance"],
    ["eu-cra-compliance-vulnerability-handling-auditor.md", "eu-cra-compliance"],
    ["optimization.md", "optimization"],
    ["optimization-ai-credit-auditor.md", "optimization"],
    ["optimization-ai-credit-optimizer.md", "optimization"],
    ["self-care.md", "self-care"],
    ["self-care-accessibility-checker.md", "self-care"],
    ["self-care-primer-brand-checker.md", "self-care"],
  ]) {
    assert.match(workflow(name), new RegExp(`package: ${bundle}`));
  }
});

test("orchestrators use checked-in policy with independent manual narrowing", () => {
  for (const [name, packageName] of [
    ["uk-ai-advisory.md", "advisory"],
    ["ambient-context.md", "ambient-context"],
    ["aw-maintenance.md", "aw-maintenance"],
    ["dependabot.md", "dependabot"],
    ["eu-cra-compliance.md", "eu-cra-compliance"],
    ["optimization.md", "optimization"],
    ["self-care.md", "self-care"],
  ]) {
    const source = workflow(name);

    assert.match(source, /rollout_percent:\n\s+default: 100\n\s+type: number/);
    assert.match(source, /max_repos:\n\s+default: 1\n\s+type: number/);
    assert.match(source, /safe_output_mode:\n\s+default: "review"\n\s+type: choice/);
    assert.match(source, new RegExp(`package: ${packageName}`));
    assert.match(source, /role: orchestrator/);
    assert.match(source, /environment: central-agentic-ops/);
    assert.doesNotMatch(source, /vars\.CENTRAL_AGENTIC_OPS_|cell_count:|cell_index:|batch_size:|batch_index:/);
  }
});

test("operation workflows optionally load per-operation markdown steering", () => {
  const packageSkill = readFileSync(join(root, ".github", "skills", "create-ops-package", "SKILL.md"), "utf8");

  assert.match(packageSkill, /Every orchestrator and worker prompt must include/);
  assert.match(packageSkill, /\{\{#runtime-import\? \.github\/cao\/<package-slug>\.md\}\}/);

  for (const [name, operation] of [
    ["uk-ai-advisory.md", "advisory"],
    ["advisory-uk-ai-operational-resilience.md", "advisory"],
    ["ambient-context.md", "ambient-context"],
    ["ambient-context-agents-md-curator.md", "ambient-context"],
    ["ambient-context-skills-curator.md", "ambient-context"],
    ["aw-failures-investigator.md", "aw-maintenance"],
    ["aw-maintenance.md", "aw-maintenance"],
    ["aw-maintenance-upgrade.md", "aw-maintenance"],
    ["dependabot.md", "dependabot"],
    ["dependabot-release-train-updater.md", "dependabot"],
    ["eu-cra-compliance.md", "eu-cra-compliance"],
    ["eu-cra-compliance-article-14-reporting-readiness.md", "eu-cra-compliance"],
    ["eu-cra-compliance-conformity-release-evidence.md", "eu-cra-compliance"],
    ["eu-cra-compliance-scope-classifier.md", "eu-cra-compliance"],
    ["eu-cra-compliance-security-requirements-auditor.md", "eu-cra-compliance"],
    ["eu-cra-compliance-supply-chain-sbom-auditor.md", "eu-cra-compliance"],
    ["eu-cra-compliance-vulnerability-handling-auditor.md", "eu-cra-compliance"],
    ["optimization.md", "optimization"],
    ["optimization-ai-credit-auditor.md", "optimization"],
    ["optimization-ai-credit-optimizer.md", "optimization"],
    ["self-care.md", "self-care"],
    ["self-care-accessibility-checker.md", "self-care"],
    ["self-care-primer-brand-checker.md", "self-care"],
  ]) {
    assert.match(
      workflow(name),
      new RegExp(`^\\{\\{#runtime-import\\? \\.github/cao/${operation}\\.md\\}\\}$`, "m"),
    );
  }
});

test("review destinations allow control self-review and isolate other targets", () => {
  const precompute = workflow("shared/control-precompute.md");

  assert.match(precompute, /validate_output_destination/);
  assert.match(precompute, /repository_equal "\$SAFE_OUTPUT_REPO" "\$TARGET_REPO" && \\\n+          ! repository_equal "\$SAFE_OUTPUT_REPO" "\$CENTRAL_REPO"/);
  assert.match(precompute, /review safe_output_repo must differ from target_repo/);
  assert.match(precompute, /live worker safe_output_repo must equal target_repo/);
  assert.match(precompute, /repository_equal "\$SAFE_OUTPUT_REPO" "\$CENTRAL_REPO"; then\n\s+return/);
  assert.match(precompute, /gh api "repos\/\$SAFE_OUTPUT_REPO" --jq '\.private'/);
  assert.match(precompute, /review safe_output_repo must be accessible/);
  assert.match(precompute, /non-central review safe_output_repo must be private/);
});

test("safe-output modes are review and live with a separate package kill switch", () => {
  const control = workflow("shared/control.md");
  const precompute = workflow("shared/control-precompute.md");

  assert.match(precompute, /\.authorized.*!= "true"/);
  assert.match(precompute, /\{type:"noop",message:\$message\}/);
  assert.doesNotMatch(`${control}\n${precompute}`, /preview_only|\bstaged\b/);
});

test("exact package target modes flow through candidate dispatch and reporting", () => {
  const control = workflow("shared/control.md");
  const precompute = workflow("shared/control-precompute.md");

  assert.match(precompute, /CAO_TARGET_REPOSITORY="\$TARGET_REPO"/);
  assert.match(precompute, /\.target_policies\[\$normalized\]\.mode \/\/ \$safe_output_mode/);
  assert.match(precompute, /\.worker_policies\[\$worker\] \/\/ null/);
  assert.match(precompute, /worker disabled by control-plane policy/);
  assert.match(precompute, /map\(\. \+ \{safe_output_mode: repository_mode\(\.full_name\)\}\)/);
  assert.match(control, /treat each candidate's `safe_output_mode` as authoritative for that target/);
  assert.match(control, /start `effective_safe_output_mode` at the selected candidate's `safe_output_mode`/);
  assert.match(control, /when the worker's `max_mode` is `review`, set `effective_safe_output_mode` to `review`/);
  assert.match(control, /never use a worker ceiling to widen a review candidate/);
  assert.match(control, /when `effective_safe_output_mode` is `live`, set `effective_safe_output_repo` to the selected target repository/);
  assert.match(control, /`safe_output_mode`: `effective_safe_output_mode`/);
  assert.match(control, /Selected target modes: <target-to-mode list or none>/);
  assert.match(control, /const effectiveMode = dispatchModes\.size === 0[\s\S]*?: 'mixed';/);
});

test("shared control keeps manual and scheduled routing event-scoped", () => {
  const control = workflow("shared/control.md");
  const precompute = workflow("shared/control-precompute.md");

  for (const name of ["uk-ai-advisory.md", "ambient-context.md", "aw-maintenance.md", "dependabot.md", "eu-cra-compliance.md", "optimization.md", "self-care.md"]) {
    const orchestrator = workflow(name);
    assert.match(orchestrator, /GH_AW_SAFE_OUTPUT_MODE:.*inputs\.safe_output_mode.*\|\| 'review'/);
    assert.match(orchestrator, /REVIEW_OUTPUT_REPO:.*inputs\.safe_output_repo \|\| github\.repository/);
    assert.match(orchestrator, /SAFE_OUTPUT_REPO:.*== 'review'/);
    assert.doesNotMatch(orchestrator, /vars\.CENTRAL_AGENTIC_OPS_/);
  }
  assert.match(control, /requested_mode: \$\{\{ github\.event\.inputs\.safe_output_mode \|\| '' \}\}/);
  assert.match(control, /safe_output_repo: \$\{\{ github\.event\.inputs\.safe_output_repo/);
  assert.doesNotMatch(precompute, /^      SAFE_OUTPUT_REPO:/m);
  assert.doesNotMatch(control, /review_repo/);
  assert.match(control, /requested_rollout_percent: \$\{\{ github\.event\.inputs\.rollout_percent \|\| '' \}\}/);
  assert.match(control, /select no more than `effective_max_repos` repositories/);

  assert.match(precompute, /rollout_percent must be an integer from 1 through 100/);
  assert.match(precompute, /effective_max_repos:/);
  assert.match(precompute, /\(\$rollout_percent \| tonumber\) \/ 100 \| ceil/);
  assert.doesNotMatch(precompute, /ROLLOUT_PERCENT.*(?:eval|curl|gh api)/);
});

test("blank manual reviews target the control repository before discovery", () => {
  const control = workflow("shared/control.md");

  assert.match(
    control,
    /target_repo: \$\{\{ github\.event\.inputs\.target_repo \|\| \(github\.event_name == 'workflow_dispatch' && env\.GH_AW_SAFE_OUTPUT_MODE == 'review' && github\.repository\) \|\| '' \}\}/,
  );
});

test("orchestrators dispatch workers only through safe-output tools", () => {
  const control = workflow("shared/control.md");

  assert.match(control, /call the configured `dispatch-workflow` tool from `<safe-output-tools>`/);
  assert.match(control, /do not use `gh workflow run` or the Actions workflow-dispatch API/);
  assert.match(control, /safeoutputs <tool_name> \./);
  assert.match(control, /never invoke `<tool_name>`, `noop`, or `report_incomplete` as a bare shell command/);
});

test("every worker uses the standard dispatch envelope and safe mode vocabulary", () => {
  const workerNames = [
    ["advisory-uk-ai-operational-resilience.md", "advisory", "uk-ai-operational-resilience"],
    ["ambient-context-agents-md-curator.md", "ambient-context", "agents-md-curator"],
    ["ambient-context-skills-curator.md", "ambient-context", "skills-curator"],
    ["aw-failures-investigator.md", "aw-maintenance", "failures-investigator"],
    ["aw-maintenance-upgrade.md", "aw-maintenance", "upgrade"],
    ["dependabot-release-train-updater.md", "dependabot", "release-train-updater"],
    ["eu-cra-compliance-article-14-reporting-readiness.md", "eu-cra-compliance", "article-14-reporting-readiness"],
    ["eu-cra-compliance-conformity-release-evidence.md", "eu-cra-compliance", "conformity-release-evidence"],
    ["eu-cra-compliance-scope-classifier.md", "eu-cra-compliance", "scope-classifier"],
    ["eu-cra-compliance-security-requirements-auditor.md", "eu-cra-compliance", "security-requirements-auditor"],
    ["eu-cra-compliance-supply-chain-sbom-auditor.md", "eu-cra-compliance", "supply-chain-sbom-auditor"],
    ["eu-cra-compliance-vulnerability-handling-auditor.md", "eu-cra-compliance", "vulnerability-handling-auditor"],
    ["optimization-ai-credit-auditor.md", "optimization", "ai-credit-auditor"],
    ["optimization-ai-credit-optimizer.md", "optimization", "ai-credit-optimizer"],
    ["self-care-accessibility-checker.md", "self-care", "accessibility-checker"],
    ["self-care-primer-brand-checker.md", "self-care", "primer-brand-checker"],
  ];

  for (const [name, packageName, workerName] of workerNames) {
    const source = workflow(name);

    assert.match(source, new RegExp(`package: ${packageName}`));
    assert.match(source, /role: worker/);
    assert.match(source, new RegExp(`worker: ${workerName}`));
    assert.match(source, /environment: central-agentic-ops/);
    for (const input of [
      "target_repo",
      "safe_output_repo",
      "safe_output_mode",
      "correlation_id",
      "central_repo",
      "control_plane_run_url",
    ]) {
      assert.match(source, new RegExp(`^      ${input}:`, "m"), `${name} is missing ${input}`);
    }

    assert.doesNotMatch(source, /^      preview_only:/m);
    assert.doesNotMatch(source, /^\s+staged:/m);
    assert.doesNotMatch(source, /safe_output_mode == 'private'/);
    assert.doesNotMatch(source, /vars\.CENTRAL_AGENTIC_OPS_/);
    assert.match(source, /GH_AW_SAFE_OUTPUT_MODE: \$\{\{ inputs\.safe_output_mode \|\| 'review' \}\}/);
    assert.match(source, /SAFE_OUTPUT_REPO:.*safe_output_mode.*'review'.*safe_output_repo.*github\.repository.*target_repo/);

    for (const line of source.match(/^\s+target-repo:.*$/gm) || []) {
      assert.match(line, /safe_output_mode.*'review'.*safe_output_repo.*github\.repository.*target_repo/);
    }
    for (const line of source.match(/^\s+- repository:.*inputs\.safe_output_repo.*$/gm) || []) {
      assert.match(line, /safe_output_mode.*'review'.*safe_output_repo.*github\.repository.*target_repo/);
    }
  }
});

test("Advisory preserves UK AI guidance and human-review boundaries", () => {
  const orchestrator = workflow("uk-ai-advisory.md");
  const maintainer = workflow("advisory-package-maintainer.md");
  const worker = workflow("advisory-uk-ai-operational-resilience.md");
  const readme = readFileSync(join(root, "advisory", "README.md"), "utf8");

  assert.match(orchestrator, /^name: "UK AI Advisory"$/m);
  assert.match(worker, /^name: "UK AI Advisory \/ Operational Resilience"$/m);
  for (const source of [orchestrator, worker, readme]) {
    assert.match(source, /advisory and non-binding/i);
    assert.match(source, /no guarantee of completeness, correctness, accuracy/i);
    assert.match(source, /human review/i);
  }

  assert.match(orchestrator, /schedule: "daily on weekdays"/);
  assert.match(orchestrator, /workflows: \[advisory-uk-ai-operational-resilience\]/);
  assert.match(orchestrator, /Use bounded two-stage discovery/);
  assert.match(orchestrator, /AI is a threat accelerator, not an eligibility requirement/);
  assert.match(orchestrator, /prolonged inactivity without credible ownership or automated hygiene is a priority signal/);
  assert.match(worker, /https:\/\/www\.gov\.uk\/guidance\/ai-open-code-and-vulnerability-risk-in-the-public-sector/);
  assert.match(worker, /incomplete by design/i);
  assert.match(worker, /do not authorize opening, restricting, hiding, or decommissioning code/i);
  assert.match(worker, /If the guidance, repository metadata, commits, or another required source is inaccessible, stop analysis, call `report_incomplete`/);
  assert.match(worker, /source_access/);
  assert.match(worker, /repository_metadata/);
  assert.match(worker, /visibility: repositoryData\.visibility/);
  assert.match(worker, /open_dependabot_alerts/);
  assert.match(worker, /secret-scanning-alerts: read/);
  assert.match(worker, /job-discriminator: \$\{\{ github\.run_id \}\}/);
  assert.match(worker, /dependency_automation/);
  assert.match(worker, /security_policy/);
  assert.match(worker, /age_days: ageDays\(alert\.created_at\)/);
  assert.match(worker, /secret_type_display_name/);
  assert.doesNotMatch(worker, /alert\.secret\b/);
  assert.match(worker, /Open by default/);
  assert.match(worker, /patch SLAs and remediation capability/);
  assert.match(worker, /rapid response to inbound vulnerability reports/);
  assert.match(worker, /credible attacker, what publication adds to the risk, the realistic path to harm/);
  assert.match(worker, /named re-approval owner and cadence/);
  assert.match(worker, /cap the proposed tier at B/);
  assert.match(worker, /A public repository with no recent commits and no evidence of active ownership or automated hygiene requires a dormancy finding/);
  assert.match(worker, /patch_sla_controls/);
  assert.match(worker, /disclosure_controls/);
  assert.match(worker, /max: 1/);
  assert.match(worker, /close-older-issues: true/);
  assert.match(worker, /## agent: `asset-tier-classifier`/);
  assert.match(worker, /## agent: `control-verifier`/);
  assert.match(worker, /## agent: `ai-risk-scorer`/);
  assert.doesNotMatch(worker, /^graders:/m);

  assert.match(maintainer, /^name: "UK AI Advisory \/ Package Maintainer"$/m);
  assert.match(maintainer, /schedule: weekly/);
  assert.match(maintainer, /safe_output_mode:\n\s+default: review/);
  assert.doesNotMatch(maintainer, /^\s+staged:/m);
  assert.match(maintainer, /original specification and current authoritative GOV\.UK guidance/);
  assert.match(maintainer, /https:\/\/www\.gov\.uk\/guidance\/ai-open-code-and-vulnerability-risk-in-the-public-sector/);
  assert.match(maintainer, /update only the applicable ledger path/i);
  assert.match(maintainer, /allowed-files:\n\s+- "advisory\/implementation-status\.md"\n\s+- "\.github\/aw\/advisory\/implementation-status\.md"/);
  assert.match(maintainer, /draft: true/);
  assert.match(maintainer, /create-issue:[\s\S]*?deduplicate-by-title: true[\s\S]*?max: 1/);
  assert.match(maintainer, /If the authoritative source or a trusted package file cannot be accessed or reconciled, call `report_incomplete`/);
  assert.match(maintainer, /Emit `noop` only after the authoritative source and every trusted file were evaluated successfully/);
  assert.doesNotMatch(maintainer, /shared\/control\.md/);
  assert.doesNotMatch(maintainer, /^graders:/m);

  const ledger = readFileSync(join(root, "advisory", "implementation-status.md"), "utf8");
  assert.match(ledger, /UK-AI-001/);
  assert.match(ledger, /UK-AI-015/);
  assert.match(ledger, /AI is a threat accelerator, not an eligibility requirement/);
  assert.match(ledger, /credible attacker, what publication adds to risk, and the realistic path to harm/);
  assert.match(ledger, /It does not prove that the package, an installed fleet, a repository, or an organization is secure/);
});

test("EU CRA Advisor workflows preserve advisory and human-review boundaries", () => {
  const orchestrator = workflow("eu-cra-compliance.md");
  const maintainer = workflow("eu-cra-compliance-package-maintainer.md");
  const workers = [
    ["eu-cra-compliance-scope-classifier.md", "Scope Classifier"],
    ["eu-cra-compliance-security-requirements-auditor.md", "Security Requirements Auditor"],
    ["eu-cra-compliance-supply-chain-sbom-auditor.md", "Supply Chain SBOM Auditor"],
    ["eu-cra-compliance-vulnerability-handling-auditor.md", "Vulnerability Handling Auditor"],
    ["eu-cra-compliance-article-14-reporting-readiness.md", "Article 14 Reporting Readiness"],
    ["eu-cra-compliance-conformity-release-evidence.md", "Conformity Release Evidence"],
  ];

  assert.match(orchestrator, /^name: "EU CRA Advisor"$/m);
  assert.match(orchestrator, /advisory and non-binding/i);
  assert.match(orchestrator, /no guarantee of completeness, correctness, accuracy, or alignment with the EU Cyber Resilience Act/i);
  assert.match(orchestrator, /must not analyze a target repository for CRA compliance/i);
  assert.match(orchestrator, /Use bounded two-stage discovery/);
  assert.match(orchestrator, /plus at most two alternates per available slot/);
  assert.match(orchestrator, /sum of enabled, useful workers across selected repositories/);
  assert.match(orchestrator, /Keep that total at or below 48/);

  for (const [name, displayName] of [["eu-cra-compliance.md", null], ...workers, ["eu-cra-compliance-package-maintainer.md", "Package Maintainer"]]) {
    const source = workflow(name);
    if (displayName) {
      assert.match(source, new RegExp(`^name: "EU CRA Advisor / ${displayName}"$`, "m"));
    }
    assert.match(source, /engine:\n\s+id: pi\n\s+model: copilot\/gpt-5\.4/);
    assert.match(source, /copilot-requests: write/);
    assert.match(source, /tools:\n\s+cli-proxy: true\n\s+github:\n\s+mode: gh-proxy/);
  }

  for (const [name, displayName] of workers) {
    const source = workflow(name);
    assert.match(source, /Regulation \(EU\) 2024\/2847/);
    assert.match(source, /https:\/\/eur-lex\.europa\.eu\/eli\/reg\/2024\/2847\/oj/);
    assert.match(source, /https:\/\/digital-strategy\.ec\.europa\.eu\/en\/policies\/cyber-resilience-act/);
    assert.match(source, /source:\n\s+instrument: "Regulation \(EU\) 2024\/2847"\n\s+provision: ".+"\n\s+authority: "binding"/);
    assert.match(source, /HUMAN_REVIEW_REQUIRED/);
    assert.match(source, /commercial versus non-commercial FOSS treatment/);
    assert.match(source, /important Class I or Class II classification/);
    assert.match(source, /active exploitation, the severe-incident threshold, reportability/);
    assert.match(source, /Never output `CRA COMPLIANT`, `LEGALLY COMPLIANT`, `CERTIFIED`, or `CE APPROVED`/);
    assert.match(source, /Never (?:submit|notify)/i);
    assert.match(source, /Do not put secrets, personal data, exploit details/);
    assert.match(source, /^graders:\n\s+operational-value:\n\s+run: \.github\/graders\/eu-cra-compliance-.+-operational-value\.sh$/m);
    assert.match(source, /<!-- operational-value: domain=[a-z0-9-]+ target=OWNER\/REPO target-sha=40_HEX_SHA -->/);
    assert.match(source, /### Human Acceptance/);
  }

  assert.match(maintainer, /schedule: daily/);
  assert.match(maintainer, /safe_output_mode:\n\s+default: review/);
  assert.doesNotMatch(maintainer, /^\s+staged:/m);
  assert.match(maintainer, /Systematically account for the complete Act: Articles 1–71, Annexes I–VIII/);
  assert.match(maintainer, /update only the applicable ledger path/i);
  assert.match(maintainer, /allowed-files:\n\s+- "eu-cra-compliance\/implementation-status\.md"\n\s+- "\.github\/aw\/eu-cra-compliance\/implementation-status\.md"/);
  assert.match(maintainer, /draft: true/);
  assert.match(maintainer, /create-issue:[\s\S]*?max: 1/);
  assert.match(maintainer, /deduplicate-by-title: true/);
  assert.match(maintainer, /graders:\n\s+operational-value:\n\s+run: \.\/graders\/eu-cra-compliance-package-maintainer-operational-value\.sh/);
  assert.doesNotMatch(maintainer, /shared\/control\.md/);

  const ledger = readFileSync(join(root, "eu-cra-compliance", "implementation-status.md"), "utf8");
  assert.match(ledger, /Articles 1–12/);
  assert.match(ledger, /CRA-ART-001/);
  assert.match(ledger, /Articles 60–71/);
  assert.match(ledger, /Annexes II–VIII/);
  assert.match(ledger, /CRA-ACTS-001/);
  assert.match(ledger, /`IMPLEMENTED` means a workflow capability exists/);

  const article14 = workflow("eu-cra-compliance-article-14-reporting-readiness.md");
  assert.match(article14, /without undue delay and, in any event, no later than 24 hours/);
  assert.match(article14, /without undue delay and, in any event, no later than 72 hours/);
  assert.match(article14, /no later than 14 days after a corrective or mitigating measure becomes available/);
  assert.match(article14, /no later than one month after submission of the incident notification/);
  assert.match(article14, /vulnerability description, severity and impact, available malicious-actor information/);
  assert.match(article14, /detailed incident description, severity and impact, likely threat type or root cause/);
  assert.match(article14, /never expose sensitive details in the issue/);
  assert.match(article14, /intermediate status report when requested by the CSIRT coordinator/);
  assert.match(article14, /awareness of either an actively exploited vulnerability or a severe incident having an impact on product security/);
  assert.match(article14, /affected users and, where appropriate, all users without undue delay/);
  assert.match(article14, /Do not incorrectly make user communication contingent on completion of a regulatory notification/);
  assert.match(article14, /Do not start or calculate an SLA clock from a guessed timestamp/);
  assert.match(article14, /manufacturer-awareness evidence cannot be determined, report a critical evidence gap/);

  const security = workflow("eu-cra-compliance-security-requirements-auditor.md");
  assert.match(security, /absence of known exploitable vulnerabilities at market placement/);
  assert.doesNotMatch(security, /absence or reduction of known exploitable vulnerabilities/);
  assert.match(security, /leave operational distribution and remediation-process evidence to the vulnerability-handling auditor/);

  const supplyChain = workflow("eu-cra-compliance-supply-chain-sbom-auditor.md");
  assert.match(supplyChain, /machine-readable SBOM covering at least top-level dependencies/);
  assert.match(supplyChain, /Annex I, Part II, point \(1\)/);
  assert.match(supplyChain, /implementation evidence beyond that express minimum/);

  const conformity = workflow("eu-cra-compliance-conformity-release-evidence.md");
  assert.match(conformity, /at least 10 years after market placement or for the support period, whichever is longer/);

  assert.match(ledger, /CRA-ART-014.*reportability requires human review \| IMPLEMENTED \|/);
  assert.match(ledger, /CRA-ART-028-031.*final release require human review \| IMPLEMENTED \|/);
  assert.match(ledger, /CRA-ANNEX-VIII.*Route selection requires human review \| IMPLEMENTED \|/);
});

test("workers reject disabled, malformed, or over-ceiling dispatches before execution", () => {
  const control = workflow("shared/control.md");
  const precompute = workflow("shared/control-precompute.md");

  for (const input of ["worker", "correlation_id", "central_repo", "control_plane_run_url"]) {
    assert.match(control, new RegExp(`${input}:`));
    assert.match(precompute, new RegExp(`${input}:`));
  }
  assert.match(precompute, /Resolve authoritative control policy/);
  assert.match(precompute, /node "\$resolver" --effective/);
  assert.match(precompute, /Central Agentic Ops policy denied this run/);
  assert.match(precompute, /\{type:"noop",message:\$message\}/);
  assert.match(precompute, /CAO_POLICY_AUTHORIZED=false/);
  assert.match(precompute, /validate_worker_dispatch\n\s+validate_output_destination\n\s+validate_live_authority\n\s+write_worker_precompute/);
  assert.match(precompute, /must be review or live/);
  assert.match(precompute, /central_repo must identify the current control repository/);
  assert.match(precompute, /control_plane_run_url must match correlation_id and central_repo/);
  assert.doesNotMatch(`${control}\n${precompute}`, /vars\.CENTRAL_AGENTIC_OPS_/);
});

test("SVG visual audit covers every tracked SVG in both color schemes", () => {
  const source = workflow("svg-visual-audit.md");
  const compiled = workflow("svg-visual-audit.lock.yml");

  assert.match(source, /git ls-files '\*\.svg'/);
  assert.match(source, /colorScheme: "light"/);
  assert.match(source, /colorScheme: "dark"/);
  assert.match(source, /4\.5:1/);
  assert.match(source, /overlap between a `<text>` element and its own descendant `<tspan>`/);
  assert.match(source, /create-check-run:/);
  assert.match(source, /upload-artifact:/);
  assert.match(source, /http:\/\/host\.docker\.internal:4321\//);
  assert.match(source, /- host\.docker\.internal/);
  const proxyBypass = /NO_PROXY: ["']?host\.docker\.internal,localhost,127\.0\.0\.1/;
  assert.match(source, proxyBypass);
  assert.match(compiled, proxyBypass);
  assert.doesNotMatch(source, /^\s+no_proxy:/m);
  assert.doesNotMatch(compiled, /^\s+no_proxy:/m);
  assert.match(source, /Never claim success if any manifest entry was skipped/);
});

test("multi-device docs tester runs daily and covers browser and appearance compatibility", () => {
  const source = workflow("multi-device-docs-tester.md");
  const compiled = workflow("multi-device-docs-tester.lock.yml");

  assert.match(source, /schedule: daily/);
  assert.doesNotMatch(source, /pull_request:|workflow_dispatch:|inputs\.devices/);
  assert.match(compiled, /cron: "\d+ \d+ \* \* \*"  # Friendly format: daily \(scattered\)/);
  assert.doesNotMatch(compiled, /^  pull_request:/m);
  assert.match(source, /playwright@1\.63\.0-alpha-2026-08-05 install --with-deps webkit/);
  assert.match(source, /^      cat > "\$EXPR_GITHUB_WORKSPACE\/\.playwright\/webkit\.config\.json" <<'EOF'\n      \{\}\n      EOF$/m);
  assert.match(source, /for BROWSER in chrome webkit/);
  assert.match(source, /colorScheme: "light"/);
  assert.match(source, /colorScheme: "dark"/);
  assert.match(source, /currentSrc/);
  assert.doesNotMatch(source, /create-check-run:|create_check_run|action_required/);
  assert.match(source, /create-issue:/);
  assert.match(source, /multi-device-docs\/screenshots/);
});

test("SelfCare accessibility checker audits the served docs site with axe-core evidence", () => {
  const source = workflow("self-care-accessibility-checker.md");

  assert.match(source, /^name: "SelfCare \/ Accessibility Checker"$/m);
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /package: self-care/);
  assert.match(source, /worker: accessibility-checker/);
  assert.match(source, /safe_output_mode` is `live`/);
  assert.match(source, /engine:\n\s+id: pi\n\s+model: copilot\/gpt-5\.4/);
  assert.match(source, /playwright:\n\s+mode: cli/);
  assert.match(source, /npm pack axe-core@4\.13\.0/);
  assert.match(source, /WCAG 2\.2 Level AA/);
  assert.match(source, /colorScheme: "light"/);
  assert.match(source, /colorScheme: "dark"/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /create-issue:\n\s+target-repo:.*\n\s+title-prefix: "\[accessibility\] "/);
  assert.match(source, /close-older-key: self-care-accessibility-checker/);
  assert.doesNotMatch(source, /^\s+(create-pull-request|add-comment|create-discussion|push-to-pull-request-branch):/m);
});

test("SelfCare Primer brand checker audits the dashboard against retrieved guidance", () => {
  const source = workflow("self-care-primer-brand-checker.md");
  const compiled = workflow("self-care-primer-brand-checker.lock.yml");

  assert.match(source, /^name: "SelfCare \/ Primer Brand Checker"$/m);
  assert.match(source, /package: self-care/);
  assert.match(source, /worker: primer-brand-checker/);
  assert.match(source, /safe_output_mode` is `live`/);
  assert.match(source, /skip-if-match: 'is:pr is:open in:title "Primer branding"'/);
  assert.match(source, /@primer\/brand-mcp@0\.74\.0/);
  assert.match(source, /cli-proxy: true/);
  assert.match(source, /dashboard\/site\/src\/styles\.js/);
  assert.match(source, /dashboard\/site\/src\/\*\*\/\*\.js/);
  assert.match(source, /npm --prefix dashboard\/site run test:e2e/);
  assert.match(source, /create-pull-request:\n\s+target-repo:.*\n\s+title-prefix: "Primer branding: "\n\s+draft: true/);
  assert.match(source, /If the audit finds no meaningful deviations, call `noop` once/);
  assert.match(compiled, /\\"noop\\":\{\\"max\\":1,\\"report-as-issue\\":\\"false\\"\}/);
});

test("docs diagram generator creates one validated theme-aware SVG pair", () => {
  const source = workflow("docs-explanatory-diagrams.md");

  assert.match(source, /schedule: weekly/);
  assert.match(source, /public\/assets\/\*-light\.svg/);
  assert.match(source, /public\/assets\/\*-dark\.svg/);
  assert.match(source, /data-visual-kind=\"diagram\"/);
  assert.match(source, /check-svg-visual-language\.mjs/);
  assert.match(source, /colorScheme: \"light\"/);
  assert.match(source, /colorScheme: \"dark\"/);
  assert.match(source, /create-pull-request:/);
  assert.match(source, /Call `noop`/);
});

test("CAO dashboard reviewer checks successful documentation deployments", () => {
  const source = workflow("cao-dashboard-review.md");

  assert.match(source, /workflow_run:\n\s+workflows: \["Documentation Pages"\]\n\s+types: \[completed\]\n\s+branches: \[main\]/);
  assert.match(source, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(source, /REPORT_INVENTORY=\/tmp\/gh-aw\/agent\/cao-dashboard-review\/expected-inventory\.json/);
  assert.match(source, /githubnext\.github\.io\/central-agentic-ops\/cao\//);
  assert.match(source, /playwright:\n\s+mode: cli/);
  assert.match(source, /toolsets: \[repos, issues, actions\]/);
  assert.match(source, /githubnext\.github\.io/);
  assert.match(source, /at most the latest 100 runs from the last 24 hours/);
  assert.match(source, /overview, dispatches, packages, repositories, workflows, runs, and coverage routes/);
  assert.match(source, /title-prefix: "\[cao-dashboard\] "/);
  assert.match(source, /close-older-key: cao-dashboard-review/);
  assert.match(source, /If an open issue already describes the same fingerprint, call `noop`/);
  assert.doesNotMatch(source, /^\s+(create-pull-request|add-comment|create-discussion|push-to-pull-request-branch):/m);
});

test("code improvement permits top-level and nested dashboard JavaScript sources", () => {
  const source = workflow("code-improvement.md");

  assert.match(source, /allowed-files:\n\s+- "dashboard\/site\/src\/\*\.js"\n\s+- "dashboard\/site\/src\/\*\*\/\*\.js"\n\s+- "dashboard\/site\/test\/\*\*\/\*\.js"/);
});

test("dashboard authoring corpus workflow generates only validated training examples", () => {
  const source = workflow("dashboard-authoring-corpus.md");
  const dashboardIrSkill = readFileSync(
    join(root, ".github", "skills", "generate-dashboard-ir", "SKILL.md"),
    "utf8",
  );
  const dashboardAuthoringSkill = readFileSync(
    join(root, ".github", "skills", "dashboard-authoring", "SKILL.md"),
    "utf8",
  );

  assert.match(source, /^intent: Improve model reliability/m);
  assert.match(
    source,
    /^skills:\n\s+- \.github\/skills\/dashboard-authoring\n\s+- \.github\/skills\/generate-dashboard-ir$/m,
  );
  assert.match(source, /Use the installed `generate-dashboard-ir` skill/);
  assert.match(source, /npm ci --prefix dashboard\/site --ignore-scripts/);
  assert.match(source, /npm --prefix dashboard\/site run validate:corpus/);
  assert.match(source, /Scope every view to the synthetic workflow with a `workflow` filter/);
  assert.match(source, /Use an attainment-only baseline with null value and cutoff/);
  assert.match(source, /create-pull-request:[\s\S]*?allowed-files:\n\s+- "\.github\/skills\/generate-dashboard-ir\/corpus\/index\.json"\n\s+- "\.github\/skills\/generate-dashboard-ir\/corpus\/examples\/\*\.json"\n\s+- "\.github\/skills\/generate-dashboard-ir\/corpus\/examples\/\*\.dashboard\.yml"/);
  assert.doesNotMatch(source, /allowed-files:\n(?:\s+- .*\n)*\s+- "(?!\.github\/skills\/generate-dashboard-ir\/corpus\/)/);
  assert.match(dashboardIrSkill, /^---\nname: generate-dashboard-ir\n/);
  assert.match(dashboardIrSkill, /specification as the semantic authority/);
  assert.match(dashboardIrSkill, /validator entry point as the syntax and structural validation authority/);
  assert.match(dashboardIrSkill, /Do not introduce a new intermediate language/);
  assert.match(dashboardIrSkill, /Return only the validated complete Dashboard Language YAML document/);
  assert.match(dashboardAuthoringSkill, /Pass the intent and operational-value contract to `generate-dashboard-ir`/);
  assert.match(dashboardAuthoringSkill, /Store an operation package's production Dashboard Language document at `<package>\/dashboard\.json`/);
  assert.match(dashboardAuthoringSkill, /destination is `\.github\/aw\/dashboards\/<package>\.json`/);
  assert.match(dashboardAuthoringSkill, /bundles installed `\.github\/aw\/dashboards\/\*\.json` documents into the single deployed `dashboard\.json`/);
  assert.match(dashboardAuthoringSkill, /Do not add package pages directly to `dashboard\/site\/dashboard\.json`/);
  assert.doesNotMatch(dashboardAuthoringSkill, /Select only the Dashboard Language sources and fields/);
  assert.doesNotMatch(dashboardAuthoringSkill, /corpus\/index\.json/);
  assert.match(dashboardIrSkill, /## Corpus procedure/);
});

test("dashboard CI runs the package quality gates", () => {
  const source = workflow("cid.yml");
  const jobs = generatedJobs(source);
  const lintUnit = jobs.get("lint-unit");
  const playwrightIntegration = jobs.get("playwright-integration");

  assert.match(source, /dashboard\/site\/\*\*/);
  assert.match(source, /working-directory: dashboard\/site/);
  assert.match(source, /cache-dependency-path: dashboard\/site\/package-lock\.json/);
  assert.deepEqual([...jobs.keys()], ["lint-unit", "playwright-integration"]);
  assert.deepEqual(lintUnit.needs, []);
  assert.deepEqual(playwrightIntegration.needs, []);
  for (const command of ["npm run typecheck", "npm run lint", "npm test"]) {
    assert.match(lintUnit.block, new RegExp(`run: ${command.replaceAll(".", "\\.")}`));
  }
  assert.doesNotMatch(lintUnit.block, /playwright|test:e2e/i);
  assert.match(playwrightIntegration.block, /uses: actions\/cache@/);
  assert.match(playwrightIntegration.block, /path: ~\/\.cache\/ms-playwright/);
  assert.match(playwrightIntegration.block, /hashFiles\('dashboard\/site\/package-lock\.json'\)/);
  assert.match(playwrightIntegration.block, /npx playwright install --with-deps chromium/);
  assert.match(playwrightIntegration.block, /run: npm run test:e2e/);
  assert.doesNotMatch(playwrightIntegration.block, /run: npm (?:run (?:typecheck|lint)|test)$/m);
});

test("clean-room compilation emits the expected GitHub Actions settings", { timeout: 120_000 }, () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "central-agentic-ops-test-"));

  try {
    cpSync(join(root, ".github"), join(temporaryRoot, ".github"), { recursive: true });
    cpSync(join(root, "aw.yml"), join(temporaryRoot, "aw.yml"));
    cpSync(join(root, "README.md"), join(temporaryRoot, "README.md"));
    execFileSync("git", ["init", "--quiet"], { cwd: temporaryRoot });

    execFileSync("gh", [
      "aw",
      "compile",
      "--no-check-update",
      "--schedule-seed",
      "githubnext/central-agentic-ops",
    ], { cwd: temporaryRoot, stdio: "pipe" });

    const generatedDirectory = join(temporaryRoot, ".github", "workflows");
    const lockNames = readdirSync(generatedDirectory)
      .filter((name) => name.endsWith(".lock.yml"))
      .sort();
    const packageLockNames = [
      "advisory-uk-ai-operational-resilience.lock.yml",
      "uk-ai-advisory.lock.yml",
      "ambient-context-agents-md-curator.lock.yml",
      "ambient-context-skills-curator.lock.yml",
      "ambient-context.lock.yml",
      "aw-failures-investigator.lock.yml",
      "aw-maintenance-upgrade.lock.yml",
      "aw-maintenance.lock.yml",
      "dependabot-release-train-updater.lock.yml",
      "dependabot.lock.yml",
      "eu-cra-compliance-article-14-reporting-readiness.lock.yml",
      "eu-cra-compliance-conformity-release-evidence.lock.yml",
      "eu-cra-compliance-scope-classifier.lock.yml",
      "eu-cra-compliance-security-requirements-auditor.lock.yml",
      "eu-cra-compliance-supply-chain-sbom-auditor.lock.yml",
      "eu-cra-compliance-vulnerability-handling-auditor.lock.yml",
      "eu-cra-compliance.lock.yml",
      "optimization-ai-credit-auditor.lock.yml",
      "optimization-ai-credit-optimizer.lock.yml",
      "optimization.lock.yml",
      "self-care-accessibility-checker.lock.yml",
      "self-care-primer-brand-checker.lock.yml",
      "self-care.lock.yml",
    ];
    const expectedLockNames = [
      ...packageLockNames,
      "advisory-package-maintainer.lock.yml",
      "cao-dashboard-review.lock.yml",
      "code-improvement.lock.yml",
      "dashboard-authoring-corpus.lock.yml",
      "multi-device-docs-tester.lock.yml",
      "eu-cra-compliance-package-maintainer.lock.yml",
      "docs-explanatory-diagrams.lock.yml",
      "pr-reviewer.lock.yml",
      "svg-visual-audit.lock.yml",
    ].sort();

    assert.deepEqual(lockNames, expectedLockNames);
    for (const name of packageLockNames) {
      const generated = workflow(name, generatedDirectory);

      assert.match(generated, /effective_max_repos/);
      assert.match(generated, /rollout_percent must be an integer from 1 through 100/);
      assert.match(generated, /max_repos must be an integer from 1 through 1000/);
      assert.match(generated, /max_scan_repos must be an integer from 1 through 100000/);
      assert.match(generated, /inventory_version/);
      assert.match(generated, /batch_id/);
      assert.match(generated, /outside control-plane\.scope\.allowed-owners/);
      assert.match(generated, /review safe_output_repo must differ from target_repo/);
      assert.match(generated, /review safe_output_repo must be accessible/);
      assert.match(generated, /non-central review safe_output_repo must be private/);
      assert.match(generated, /live worker safe_output_repo must equal target_repo/);
      assert.match(generated, /target assigns live authority for .+ to a different control repository/);
      assert.match(generated, /\.github\/central-agentic-ops\.json/);
      assert.match(generated, /CAO_POLICY_AUTHORIZED/);
      assert.doesNotMatch(generated, /vars\.CENTRAL_AGENTIC_OPS_|central-agentic-ops\.yml/);
      assert.doesNotMatch(generated, /PREVIEW_ONLY|preview_only/);
      assert.doesNotMatch(generated, /== 'preview'/);
      assert.doesNotMatch(generated, /safe_output_mode == 'private'/);
    }

    const orchestratorGates = new Map([
      ["uk-ai-advisory.lock.yml", "advisory"],
      ["ambient-context.lock.yml", "ambient-context"],
      ["aw-maintenance.lock.yml", "aw-maintenance"],
      ["dependabot.lock.yml", "dependabot"],
      ["eu-cra-compliance.lock.yml", "eu-cra-compliance"],
      ["optimization.lock.yml", "optimization"],
      ["self-care.lock.yml", "self-care"],
    ]);
    for (const [name, packageName] of orchestratorGates) {
      const generated = workflow(name, generatedDirectory);
      assert.match(generated, new RegExp(`BUNDLE: ${packageName}`));
      assert.match(generated, /ROLE: orchestrator/);
      assert.match(generated, /WORKER: __none__/);
      assert.match(generated, /GH_AW_SAFE_OUTPUT_MODE:.*inputs\.safe_output_mode.*\|\| 'review'/);
      assert.match(generated, /REQUESTED_ROLLOUT_PERCENT: \$\{\{ github\.event\.inputs\.rollout_percent \|\| '' \}\}/);
      assert.match(generated, /rollout_percent:\n\s+default: 100\n\s+type: number/);
      assert.match(generated, /timeout-minutes: 15/);
      assert.match(generated, /cancel-in-progress: true/);
      const outputPlaceholder = generated.indexOf("- name: Write agent output placeholder if missing");
      const dispatcherTelemetry = generated.indexOf("name: Emit control-plane dispatcher telemetry");
      const agentArtifact = generated.indexOf("- name: Upload agent artifacts");
      assert.ok(outputPlaceholder < dispatcherTelemetry, `${name} emits dispatcher telemetry before output normalization`);
      assert.ok(dispatcherTelemetry < agentArtifact, `${name} uploads the agent artifact before dispatcher telemetry`);
      assert.match(generated, /otlp\.logSpan\('central-agentic-ops\.dispatcher'/);
    }

    const workerGates = new Map([
      ["advisory-uk-ai-operational-resilience.lock.yml", ["advisory", "uk-ai-operational-resilience"]],
      ["ambient-context-agents-md-curator.lock.yml", ["ambient-context", "agents-md-curator"]],
      ["ambient-context-skills-curator.lock.yml", ["ambient-context", "skills-curator"]],
      ["aw-failures-investigator.lock.yml", ["aw-maintenance", "failures-investigator"]],
      ["aw-maintenance-upgrade.lock.yml", ["aw-maintenance", "upgrade"]],
      ["dependabot-release-train-updater.lock.yml", ["dependabot", "release-train-updater"]],
      ["eu-cra-compliance-article-14-reporting-readiness.lock.yml", ["eu-cra-compliance", "article-14-reporting-readiness"]],
      ["eu-cra-compliance-conformity-release-evidence.lock.yml", ["eu-cra-compliance", "conformity-release-evidence"]],
      ["eu-cra-compliance-scope-classifier.lock.yml", ["eu-cra-compliance", "scope-classifier"]],
      ["eu-cra-compliance-security-requirements-auditor.lock.yml", ["eu-cra-compliance", "security-requirements-auditor"]],
      ["eu-cra-compliance-supply-chain-sbom-auditor.lock.yml", ["eu-cra-compliance", "supply-chain-sbom-auditor"]],
      ["eu-cra-compliance-vulnerability-handling-auditor.lock.yml", ["eu-cra-compliance", "vulnerability-handling-auditor"]],
      ["optimization-ai-credit-auditor.lock.yml", ["optimization", "ai-credit-auditor"]],
      ["optimization-ai-credit-optimizer.lock.yml", ["optimization", "ai-credit-optimizer"]],
      ["self-care-accessibility-checker.lock.yml", ["self-care", "accessibility-checker"]],
      ["self-care-primer-brand-checker.lock.yml", ["self-care", "primer-brand-checker"]],
    ]);
    for (const [name, [packageName, workerName]] of workerGates) {
      const generated = workflow(name, generatedDirectory);
      assert.match(generated, new RegExp(`BUNDLE: ${packageName}`));
      assert.match(generated, /ROLE: worker/);
      assert.match(generated, new RegExp(`WORKER: ${workerName}`));
      assert.match(generated, /GH_AW_SAFE_OUTPUT_MODE: \$\{\{ inputs\.safe_output_mode \|\| 'review' \}\}/);
      assert.match(generated, /SAFE_OUTPUT_REPO:.*safe_output_mode.*'review'.*safe_output_repo.*github\.repository.*inputs\.target_repo/);
      assert.match(generated, /REQUESTED_ROLLOUT_PERCENT: \$\{\{ github\.event\.inputs\.rollout_percent \|\| '' \}\}/);
      assert.match(generated, /GH_AW_SAFE_OUTPUTS_CONFIG:/);
    }

    const generatedReviewBundle = workflow("dependabot-release-train-updater.lock.yml", generatedDirectory);
    assert.match(generatedReviewBundle, /GH_AW_SAFE_OUTPUTS_STAGED/);
    assert.doesNotMatch(generatedReviewBundle, /GH_AW_SAFE_OUTPUTS_STAGED:.*preview_only/);

    const advisoryMaintainer = workflow("advisory-package-maintainer.lock.yml", generatedDirectory);
    assert.match(advisoryMaintainer, /schedule:/);
    assert.match(advisoryMaintainer, /advisory\/implementation-status\.md/);
    assert.match(advisoryMaintainer, /copilot\/gpt-5\.4/);

    const craMaintainer = workflow("eu-cra-compliance-package-maintainer.lock.yml", generatedDirectory);
    assert.match(craMaintainer, /schedule:/);
    assert.match(craMaintainer, /eu-cra-compliance\/implementation-status\.md/);
    assert.match(craMaintainer, /copilot\/gpt-5\.4/);

    const prReviewer = workflow("pr-reviewer.lock.yml", generatedDirectory);
    assert.match(prReviewer, /create_pull_request_review_comment/);
    assert.match(prReviewer, /name: "PR Reviewer \/ Agentic Workflow Validation"/);
    assert.match(prReviewer, /submit_pull_request_review/);
    assert.match(prReviewer, /REQUEST_CHANGES/);
    assert.match(prReviewer, /agenticworkflows/);
    assert.match(prReviewer, /Mount MCP servers as CLIs/);
    assert.doesNotMatch(prReviewer, /go build .*cmd\/gh-aw/);

    const prReviewerSource = workflow("pr-reviewer.md");
    assert.match(prReviewerSource, /types: \[ready_for_review\]/);
    assert.match(prReviewerSource, /agentic-workflows: true/);
    assert.match(prReviewerSource, /cli-proxy: true/);
    assert.match(prReviewerSource, /agentic-workflows compile/);

    const svgVisualAudit = workflow("svg-visual-audit.lock.yml", generatedDirectory);
    assert.match(svgVisualAudit, /name: "SVG Visual Audit"/);
    assert.match(svgVisualAudit, /create_check_run/);
    assert.match(svgVisualAudit, /upload_artifact/);
    assert.match(svgVisualAudit, /http\.server 4321/);

    const docsDiagramGenerator = workflow("docs-explanatory-diagrams.lock.yml", generatedDirectory);
    assert.match(docsDiagramGenerator, /name: "Docs Explanatory Diagram Generator"/);
    assert.match(docsDiagramGenerator, /create_pull_request/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
test("Agent customizations preserve the deterministic dashboard exception", () => {
  const agent = readFileSync(join(root, ".github", "agents", "agentic-workflows.md"), "utf8");
  const agenticWorkflowsSkill = readFileSync(join(root, ".github", "skills", "agentic-workflows", "SKILL.md"), "utf8");
  const packageSkill = readFileSync(join(root, ".github", "skills", "create-ops-package", "SKILL.md"), "utf8");
  const repositoryInstructions = readFileSync(join(root, ".github", "aw", "instructions.md"), "utf8");

  assert.match(agent, /\.github\/aw\/instructions\.md/);
  assert.match(agenticWorkflowsSkill, /\.github\/aw\/instructions\.md/);
  assert.match(packageSkill, /## Deterministic Add-on Exception/);
  assert.match(packageSkill, /site-path/);
  assert.match(repositoryInstructions, /Keep `dashboard\/dashboard-build\.yml` reusable through `workflow_call`/);
  assert.match(repositoryInstructions, /existing Pages site, retain one Pages artifact uploader and deployer/);
  assert.match(repositoryInstructions, /must not add a schedule or another enable variable/);
});

test("README routes zero-to-CAO requests to the setup skill", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const setupSkillPath = join(root, ".github", "skills", "setup-central-agentic-ops", "SKILL.md");
  const setupSkill = readFileSync(setupSkillPath, "utf8");
  const createPackageSkill = readFileSync(join(root, ".github", "skills", "create-ops-package", "SKILL.md"), "utf8");
  const readmeEntry = ".github/skills/setup-central-agentic-ops/SKILL.md";

  assert.ok(readme.split("\n").slice(0, 20).some((line) => line.includes(readmeEntry)));
  assert.ok(existsSync(setupSkillPath));
  assert.match(setupSkill, /^---\nname: setup-central-agentic-ops\n/);
  assert.match(setupSkill, /safe_output_mode=review/);
  assert.match(setupSkill, /Ask these two package questions separately/);
  assert.match(setupSkill, /What do you want CAO to do with the catalog operations installed by the root package/);
  assert.match(setupSkill, /immutable root package installs its core catalog workflows as one unit/);
  assert.match(setupSkill, /Do you also want to create an operation package of your own/);
  assert.match(setupSkill, /plan an explicit handoff to `.github\/skills\/create-ops-package\/SKILL\.md` after step 13/);
  assert.match(setupSkill, /Never silently default the package to Dependabot/);
  assert.match(createPackageSkill, /When invoked from `.github\/skills\/setup-central-agentic-ops\/SKILL\.md`/);
  assert.match(createPackageSkill, /accept the recorded desired outcome and target-repository description/);
  assert.match(createPackageSkill, /Do not repeat the custom-package yes\/no question or restart control-plane setup/);
  assert.match(setupSkill, /Ask which repository the first review run should target/);
  assert.match(setupSkill, /Offer `<organization>\/<control-repository>` as the default/);
  assert.match(setupSkill, /target_repo="<target-owner>\/<target-repository>"/);
  assert.doesNotMatch(setupSkill, /Always target the control repository itself for the first run/);
  assert.match(setupSkill, /cao_ref=\$\(gh api repos\/githubnext\/central-agentic-ops\/commits\/main/);
  assert.match(setupSkill, /\[\[ "\$cao_ref" =~ \^\[0-9a-fA-F\]\{40,64\}\$ \]\]/);
  assert.match(setupSkill, /gh aw add-wizard "githubnext\/central-agentic-ops@\$\{cao_ref\}"/);
  assert.match(setupSkill, /gh aw doctor --repo <organization>\/<control-repository> --dir \./);
  assert.match(setupSkill, /Run `gh aw version`\. Compare it with `min-version` in the root CAO `aw\.yml`/);
  assert.match(setupSkill, /Do not require the catalog maintainer's current local version when the package supports an older release/);
  assert.match(setupSkill, /gh api orgs\/<organization>\/copilot\/billing/);
  assert.match(setupSkill, /organization billing through `copilot-requests: write`[\s\S]*?fine-grained PAT as `COPILOT_GITHUB_TOKEN`/);
  assert.match(setupSkill, /`total_seats: 0`[\s\S]*?HTTP 403/);
  assert.match(setupSkill, /resource owner is the user's personal account[\s\S]*?\*\*Copilot Requests\*\* is \*\*Read\*\*[\s\S]*?active Copilot license/);
  assert.match(setupSkill, /never place it in chat or a command argument/);
  assert.match(setupSkill, /GitHub App or `GH_AW_GITHUB_TOKEN` for target access does not authenticate Copilot inference/);
  assert.match(setupSkill, /wizard adds `copilot-requests: write`[\s\S]*?built-in workflow token[\s\S]*?no `COPILOT_GITHUB_TOKEN` secret is requested/);
  assert.match(setupSkill, /wizard leaves `copilot-requests: write` absent[\s\S]*?only `\$\{\{ secrets\.COPILOT_GITHUB_TOKEN \}\}`/);
  assert.match(setupSkill, /Do not emulate that action by manually rewriting installed workflow permissions or by configuring `COPILOT_GITHUB_TOKEN` separately/);
  assert.match(setupSkill, /If the selected ref predates that config, stop and select a newer reviewed immutable ref/);
  assert.match(setupSkill, /Stop if the installation mixes both profiles/);
  assert.match(setupSkill, /Do not replace `auto` with an explicit model/);
  assert.match(setupSkill, /one immutable source identity keeps repeated package dependencies consistent/);
  assert.match(setupSkill, /package cannot install this file because it is consumer-owned rollout policy/);
  assert.match(setupSkill, /Replace both occurrences of `<target-owner>`[\s\S]*?one occurrence of `<target-repository>`/);
  assert.match(setupSkill, /Do not put `control-owner` or `control-repository` into this policy unless the selected target is the control repository/);
  assert.match(setupSkill, /if \(\/<\[\^>\]\+>\/\.test\(source\)\) throw new Error\('unresolved policy placeholder'\)/);
  const policyTemplate = setupSkill.match(/```json\n([\s\S]*?)\n\s*```/)?.[1];
  assert.ok(policyTemplate, "setup skill must contain a JSON policy template");
  const initialPolicy = JSON.parse(policyTemplate
    .replaceAll("<target-owner>", "acme")
    .replaceAll("<target-repository>", "service")
    .replaceAll("<package-slug>", "dependabot"));
  assert.deepEqual(initialPolicy, {
    version: 1,
    "control-plane": {
      scope: {
        "allowed-owners": ["acme"],
        "allowed-repositories": ["acme/service"],
      },
      packages: {
        dependabot: {},
      },
    },
  });
  assert.match(setupSkill, /"allowed-owners": \["<target-owner>"\]/);
  assert.match(setupSkill, /"allowed-repositories": \["<target-owner>\/<target-repository>"\]/);
  assert.match(setupSkill, /"<package-slug>": \{\}/);
  assert.match(setupSkill, /installed package manifest supplies worker membership/);
  assert.match(setupSkill, /gh aw run <orchestrator-workflow>/);
  assert.match(setupSkill, /Public and private control repositories are supported/);
  assert.match(setupSkill, /policy, workflow runs, operational metadata, and review safe outputs are public/);
  assert.doesNotMatch(setupSkill, /the control repository is public;/);
  assert.match(setupSkill, /Control-repository visibility does not determine target access/);
  assert.match(setupSkill, /use `GITHUB_TOKEN` for control-repository self-review or an exact public target in `review`/);
  assert.match(setupSkill, /require a least-privilege GitHub App before running against a private or internal target/);
  assert.match(setupSkill, /Do not place private target evidence in a public control repository/);
  assert.match(setupSkill, /offer a fine-grained PAT only when an App cannot be obtained[\s\S]*?user explicitly consents/);
  assert.match(setupSkill, /A PAT cannot grant access the user does not already have/);
  assert.match(setupSkill, /Never configure it as the user's control plane/);
});

test("Dashboard package supports embedded and explicit standalone deployment", () => {
  const rootManifest = readFileSync(join(root, "aw.yml"), "utf8");
  const dashboardManifest = readFileSync(join(root, "dashboard", "aw.yml"), "utf8");
  const canonicalPolicyResolver = readFileSync(join(root, ".github", "scripts", "control-policy", "resolve.mjs"), "utf8");
  const dashboardPolicyResolver = readFileSync(join(root, "dashboard", "control-policy", "resolve.mjs"), "utf8");
  const buildWorkflow = readFileSync(join(root, "dashboard", "dashboard-build.yml"), "utf8");
  const deployWorkflow = readFileSync(join(root, "dashboard", "dashboard.yml"), "utf8");
  const aicUsage = readFileSync(join(root, "dashboard", "report", "aic-usage.mjs"), "utf8");
  const deployedWorkflows = readFileSync(join(root, "dashboard", "report", "deployed-workflows.mjs"), "utf8");
  const operationalValues = readFileSync(join(root, "dashboard", "report", "operational-values.mjs"), "utf8");
  const reportAssets = ["aic-usage.mjs", "bundle-dashboards.mjs", "compose-dashboard-documents.mjs", "dashboard-language-sources.mjs", "deployed-workflows.mjs", "inventory.mjs", "operational-value-history.mjs", "operational-values.mjs", "records.mjs"];
  const reportEntrypoints = new Set(reportAssets.filter((assetName) => !["compose-dashboard-documents.mjs", "operational-value-history.mjs"].includes(assetName)));

  assert.doesNotMatch(rootManifest, /dashboard\/dashboard|dashboard-build/);
  assert.match(dashboardManifest, /name: Central Agentic Ops Dashboard/);
  assert.match(dashboardManifest, /source: dashboard\.yml\n\s+destination: \.github\/workflows\/dashboard\.yml\n\s+kind: action-workflow/);
  assert.match(dashboardManifest, /source: dashboard-build\.yml\n\s+destination: \.github\/workflows\/dashboard-build\.yml\n\s+kind: action-workflow/);
  assert.match(dashboardManifest, /source: control-policy\/resolve\.mjs\n\s+destination: \.github\/aw\/control-policy\/resolve\.mjs/);
  assert.equal(dashboardPolicyResolver, canonicalPolicyResolver, "dashboard policy resolver must match its canonical source");
  assert.match(buildWorkflow, /workflow_call:[\s\S]*?site-path:[\s\S]*?default: cao/);
  assert.match(buildWorkflow, /cp -R \.github\/aw\/dashboard\/site\/\. "\$REPORT_OUTPUT\/"/);
  assert.match(buildWorkflow, /bundle-dashboards\.mjs[\s\S]*?"\$REPORT_OUTPUT\/dashboard\.json"[\s\S]*?\.github\/aw\/dashboards/);
  assert.match(buildWorkflow, /REPORT_RECORDS: \$\{\{ runner\.temp \}\}\/dashboard-records\.json/);
  assert.match(buildWorkflow, /REPORT_DASHBOARD_SOURCES: \$\{\{ runner\.temp \}\}\/central-agentic-ops-dashboard\/\$\{\{ inputs\.site-path \}\}\/sources\.json/);
  assert.doesNotMatch(dashboardManifest, /redirects\.mjs/);
  assert.doesNotMatch(buildWorkflow, /legacy dashboard redirects|redirects\.mjs/);
  assert.match(buildWorkflow, /site-path must not be absolute, traverse directories, or end with '\/'/);
  assert.match(buildWorkflow, /actions\/upload-artifact@[0-9a-f]{40}/);
  assert.doesNotMatch(buildWorkflow, /actions\/(?:configure-pages|upload-pages-artifact|deploy-pages)@/);
  assert.doesNotMatch(buildWorkflow, /pages: write|id-token: write/);
  assert.match(deployWorkflow, /uses: \.\/\.github\/workflows\/dashboard-build\.yml/);
  assert.match(deployWorkflow, /site-path: "\."/);
  assert.match(deployWorkflow, /enablement: false/);
  assert.match(deployWorkflow, /pages: write/);
  assert.match(deployWorkflow, /id-token: write/);
  assert.doesNotMatch(deployWorkflow, /schedule:|workflow_run|github\.ref_name/);
  assert.equal((deployWorkflow.match(/actions\/upload-pages-artifact@/g) || []).length, 1);
  assert.equal((deployWorkflow.match(/actions\/deploy-pages@/g) || []).length, 1);
  assert.match(buildWorkflow, /cache: false/);
  assert.match(buildWorkflow, /go clean -cache -modcache/);
  assert.doesNotMatch(buildWorkflow, /pages-aic|REPORT_AIC_CACHE/);
  assert.match(aicUsage, /"--start-date", "-2d", "--cache-before", "-2d"/);
  assert.match(buildWorkflow, /REPORT_VALUE_CACHE: \.cache\/dashboard-operational-values\/observations\.json/);
  assert.match(buildWorkflow, /REPORT_VALUE_REPLAY_CACHE: \.cache\/dashboard-operational-values\/replay/);
  assert.match(buildWorkflow, /actions\/cache\/restore@[0-9a-f]{40}/);
  assert.match(buildWorkflow, /Save operational-value observation cache/);
  assert.match(deployedWorkflows, /const capabilities = await workflowCapabilities\(item\.repository, item\.path\)/);
  assert.match(deployedWorkflows, /const role = workflowRole\(source\)/);
  assert.match(deployedWorkflows, /sourceAvailable: !\/GitHub API 404/);
  assert.match(deployedWorkflows, /run\.conclusion === "action_required"\) current\.actionRequired \+= 1/);
  assert.match(deployedWorkflows, /event: run\.event/);
  assert.doesNotMatch(deployedWorkflows, /\["failure", "timed_out", "startup_failure", "action_required"\]/);
  assert.match(operationalValues, /workflow\.operationalValue !== true/);
  assert.match(operationalValues, /"graders", "operational-value", "report", workflow\.workflowId/);
  assert.match(operationalValues, /fallbackRuns\.filter\(\(selected\) => !cachedRunKeys\.has\(operationalValueRunIdentity\(selected\)\)\)/);
  assert.doesNotMatch(operationalValues, /90 \* 24 \* 60 \* 60 \* 1000/);
  assert.doesNotMatch(operationalValues, /const workerIds = new Set/);
  assert.match(dashboardManifest, /source: site\/index\.html\n\s+destination: \.github\/aw\/dashboard\/site\/index\.html/);
  assert.match(dashboardManifest, /source: site\/dashboard\.json\n\s+destination: \.github\/aw\/dashboard\/site\/dashboard\.json/);
  assert.match(dashboardManifest, /source: site\/src\/presenter\.js\n\s+destination: \.github\/aw\/dashboard\/site\/src\/presenter\.js/);
  for (const assetName of ["data-operations.js", "data-processor.js", "data-worker.js"]) {
    assert.match(dashboardManifest, new RegExp(`source: site/src/${assetName.replace(".", "\\.")}\\n\\s+destination: \\.github/aw/dashboard/site/src/${assetName.replace(".", "\\.")}`));
  }
  for (const assetName of reportAssets) {
    const assetPath = join(root, "dashboard", "report", assetName);
    assert.ok(existsSync(assetPath), `missing report script ${assetName}`);
    assert.match(dashboardManifest, new RegExp(`destination: \\.github/aw/dashboard/report/${assetName.replace(".", "\\.")}`));
    if (reportEntrypoints.has(assetName)) {
      assert.match(buildWorkflow, new RegExp(`\.github/aw/dashboard/report/${assetName.replace(".", "\\.")}`));
    }
    execFileSync(process.execPath, ["--check", assetPath]);
  }
});

test("Documentation Pages embeds this repository's control-plane report", () => {
  const workflowSource = readFileSync(join(root, ".github", "workflows", "documentation-pages.yml"), "utf8");
  const astroConfig = readFileSync(join(root, "astro.config.mjs"), "utf8");

  assert.match(workflowSource, /schedule:\n\s+- cron: "23 5 \* \* \*"/);
  assert.match(workflowSource, /- dashboard\/\*\*/);
  assert.match(workflowSource, /- \.github\/workflows\/\*\.md/);
  assert.match(workflowSource, /- "\*\/aw\.yml"/);
  assert.match(workflowSource, /actions: read/);
  assert.match(workflowSource, /issues: read/);
  assert.match(workflowSource, /pull-requests: read/);
  assert.match(workflowSource, /github\/gh-aw-actions\/setup-cli@bc8c008a419c5b7a29df6f5641edd35fd1c6ea85 # v0\.87\.10/);
  assert.match(workflowSource, /version: v0\.87\.10/);
  assert.match(workflowSource, /ref: ff62cdbec36230acbae869ddb28806e8eca01ea1 # v0\.87\.10/);
  assert.match(workflowSource, /main\.version=v0\.87\.10/);
  assert.match(workflowSource, /Restore AI Credit usage cache/);
  assert.match(workflowSource, /REPORT_AIC_CACHE: \.cache\/documentation-pages-aic/);
  assert.match(workflowSource, /Save AI Credit usage cache/);
  assert.match(workflowSource, /REPORT_ALLOWED_REPOS: \$\{\{ github\.repository \}\}/);
  assert.match(workflowSource, /run: node dashboard\/report\/records\.mjs/);
  assert.match(workflowSource, /REPORT_RECORDS: dist\/cao\/records\.json/);
  assert.match(workflowSource, /REPORT_DASHBOARD_SOURCES: dist\/cao\/sources\.json/);
  assert.doesNotMatch(workflowSource, /legacy dashboard redirects|redirects\.mjs/);
  assert.doesNotMatch(workflowSource, /report\/report\.mjs/);
  assert.match(workflowSource, /path: dist/);
  assert.doesNotMatch(workflowSource, /REPORT_INCLUDE_PRIVATE:\s*true/);
  assert.equal((workflowSource.match(/actions\/deploy-pages@/g) || []).length, 1);
  assert.match(astroConfig, /label: "Control plane status", link: "\/cao\/"/);
});

test("Dashboard inventory links multiline orchestrator worker lists", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "central-agentic-ops-inventory-"));
  const outputPath = join(temporaryRoot, "control-plane.json");
  try {
    execFileSync(process.execPath, [join(root, "dashboard", "report", "inventory.mjs")], {
      env: { ...process.env, REPORT_ROOT: root, REPORT_INVENTORY: outputPath },
    });
    const inventory = JSON.parse(readFileSync(outputPath, "utf8"));
    assert.deepEqual(inventory.bundles.map((bundle) => ({
      id: bundle.id,
      workers: bundle.workers.map((worker) => worker.id),
    })), [
      { id: "ambient-context", workers: ["ambient-context-agents-md-curator", "ambient-context-skills-curator"] },
      { id: "aw-maintenance", workers: ["aw-maintenance-upgrade", "aw-failures-investigator"] },
      { id: "dependabot", workers: ["dependabot-release-train-updater"] },
      {
        id: "eu-cra-compliance",
        workers: [
          "eu-cra-compliance-scope-classifier",
          "eu-cra-compliance-security-requirements-auditor",
          "eu-cra-compliance-supply-chain-sbom-auditor",
          "eu-cra-compliance-vulnerability-handling-auditor",
          "eu-cra-compliance-article-14-reporting-readiness",
          "eu-cra-compliance-conformity-release-evidence",
        ],
      },
      { id: "optimization", workers: ["optimization-ai-credit-auditor", "optimization-ai-credit-optimizer"] },
      { id: "self-care", workers: ["self-care-accessibility-checker", "self-care-primer-brand-checker"] },
      { id: "uk-ai-advisory", workers: ["advisory-uk-ai-operational-resilience"] },
    ]);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
