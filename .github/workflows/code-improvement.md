---
name: code-improvement
description: Diagnose and fix code or CI issues
intent: Reduce duplicated dashboard UI construction by replacing one evidenced repetition with a reusable, tested component while preserving behavior.
on:
  schedule: weekly
  skip-if-match:
    query: 'is:pr is:open in:title "[dashboard-components] "'
    max: 2
permissions:
  contents: read
  copilot-requests: write
  pull-requests: read
engine: copilot
strict: true
timeout-minutes: 30
concurrency:
  group: "${{ github.workflow }}"
  cancel-in-progress: false
runtimes:
  node:
    version: "24"
network:
  allowed:
    - defaults
    - node
    - chrome
    - playwright
tools:
  github:
    mode: gh-proxy
    toolsets: [pull_requests, repos]
  bash:
    - "*"
safe-outputs:
  create-pull-request:
    title-prefix: "[dashboard-components] "
    labels: [dashboard-component-refactor, ai-generated]
    draft: true
    max: 1
    expires: 14d
    if-no-changes: ignore
    protected-files: fallback-to-issue
    max-patch-files: 20
    allowed-files:
      - "dashboard/aw.yml"
      - "dashboard/site/src/**/*.js"
      - "dashboard/site/test/**/*.js"
  noop:
pre-agent-steps:
  - name: Install dashboard dependencies
    run: npm ci --prefix dashboard/site --ignore-scripts
  - name: Install Chromium
    run: npx --prefix dashboard/site playwright install --with-deps chromium
  - name: Validate dashboard baseline
    run: |
      npm --prefix dashboard/site run typecheck
      npm --prefix dashboard/site run lint
      npm --prefix dashboard/site test
      npm --prefix dashboard/site run test:e2e
      npm --prefix dashboard/site run build
evals:
  - id: operational_value
    question: Does the agent output demonstrate that one duplicated dashboard UI construct was replaced by a reusable component used at two or more call sites?
  - id: duplication_evidenced
    question: Does the agent output identify at least two original call sites for the extracted UI construct?
  - id: behavior_validated
    question: Does the agent output report that the complete dashboard validation suite passed after the change?
  - id: scope_bounded
    question: Does the agent output show that changes stayed within the configured dashboard paths?
---

# Dashboard Component Improvement

Review the JavaScript dashboard code and extract one common UI construct into the existing component library.

## Scope and evidence

1. Read `AGENTS.md`, `.github/aw/instructions.md`, `dashboard/aw.yml`, `dashboard/site/package.json`, and the relevant source and tests before editing.
2. Inspect `dashboard/site/src/` and select exactly one repeated UI construction with at least two concrete call sites. Prefer a small, high-confidence refactor that measurably reduces duplication.
3. Review recent open and closed pull requests with the `[dashboard-components]` title prefix. Do not repeat an open proposal or a recently rejected refactor.
4. Preserve rendered behavior, accessibility semantics, public module APIs, and Dashboard Language behavior. Add or update focused unit and end-to-end coverage when the import graph or rendered output changes.
5. If a new runtime component module is added, update `dashboard/aw.yml` so the catalog package installs it. Treat that manifest change as protected and allow the configured safe output to fall back to an issue for maintainer review.

## Boundaries

- DO NOT modify files outside `dashboard/aw.yml`, `dashboard/site/src/**/*.js`, and `dashboard/site/test/**/*.js`.
- DO NOT modify dependency manifests, lockfiles, CI configuration, generated workflow lock files, agent instructions, dashboard specifications, or report producers.
- DO NOT add dependencies, change product behavior, redesign the interface, broaden the selected refactor, or combine unrelated cleanup.
- DO NOT weaken, remove, or skip tests to make the change pass.
- DO NOT create a pull request unless the repeated construct is evidenced at two or more call sites and the extraction produces clearer reuse without speculative abstraction.
- DO NOT create more than one pull request, merge it, or modify an existing contributor pull request.

## Validation and output

The baseline completed before the agent started. After editing, run all of these from `dashboard/site`:

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run test:e2e`
5. `npm run build`

Review the final diff and scan changed files for secrets. If every command passes, call `create_pull_request` exactly once with a focused draft PR that explains the duplicated call sites, the extracted component boundary, the preserved behavior, and validation results.

Call `noop` with a short reason and make no visible write when no non-duplicate candidate meets the evidence threshold, the baseline or post-change validation fails, evidence is insufficient, or the necessary change exceeds the allowed or protected-file boundary.
