---
private: true
emoji: "♻️"
name: Daily Dashboard Component Refactorer
description: Extracts reusable components from the Dashboard Language prototype UI code so the renderer scales with broad feature growth.
on:
  schedule: daily
  skip-if-match: "is:pr is:open label:dashboard-component-refactor"
  workflow_dispatch:
    inputs:
      focus:
        description: "Optional file, page, or component family to inspect for extraction"
        required: false
        type: string
permissions:
  contents: read
  copilot-requests: write
  issues: read
  pull-requests: read
tracker-id: daily-dashboard-component-refactorer
max-turns: 500
max-ai-credits: 1000
model: copilot/gpt-5.4
engine:
  id: pi
strict: true
timeout-minutes: 60
concurrency:
  group: "${{ github.workflow }}"
  cancel-in-progress: false
checkout:
  fetch: ["*"]
  fetch-depth: 0
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
  cli-proxy: true
  github:
    mode: gh-proxy
    toolsets: [default]
  timeout: 300
  playwright:
    mode: mcp
  bash:
    - "*"
safe-outputs:
  create-pull-request:
    title-prefix: "[dashboard-components] "
    labels: [dashboard-component-refactor, ai-generated]
    draft: true
    if-no-changes: warn
    allowed-files:
      - "pages/dashboard/README.md"
      - "pages/dashboard/PLAN.md"
      - "pages/dashboard/**"
  noop:
features:
  gh-aw-detection: true
evals:
  - id: duplication-evidence-gathered
    question: Did the agent inspect the JavaScript under pages/dashboard and cite concrete repeated UI constructs before refactoring?
  - id: single-refactor-delivered
    question: Did the agent deliver one bounded extraction instead of rewriting the whole presenter at once?
  - id: components-reused-at-call-sites
    question: Did the agent replace every duplicated call site it identified with the extracted component or function rather than leaving copies behind?
  - id: behavior-preserved
    question: Did the agent keep rendered output behavior unchanged, demonstrated by passing existing tests without weakening them?
  - id: component-tested-and-documented
    question: Did the extracted component ship with its own unit tests and an updated component inventory in PLAN.md?
  - id: quality-gates-executed
    question: Did the agent run TypeScript type checking, ESLint, Vitest, and browser checks for the refactor?
  - id: existing-dashboard-untouched
    question: Did the agent leave the existing dashboard package under dashboard/ unchanged outside pages/dashboard?
---

# Daily Dashboard Component Refactorer

You are a refactoring engineer for the Dashboard Language prototype in `pages/dashboard/`. Each run inspects the JavaScript there for repeated UI construction, extracts the best remaining opportunity into a reusable component or function, and reuses it at every call site it replaces. One run delivers one bounded, behavior-preserving refactor.

The goal is capacity, not cleanup: the prototype grows one feature slice per day through the Daily Dashboard Language Renderer workflow, so the component library must stay ahead of that growth. Prefer extractions that make the next several feature slices cheaper to build.

## Context

- Repository: ${{ github.repository }}
- Specification: `docs/dashboard-language-specification.md`
- Implementation directory: `pages/dashboard/` (the only directory you may write to)
- Component library: `pages/dashboard/src/components/`
- Plan file: `pages/dashboard/PLAN.md`
- Sibling feature workflow: `.github/workflows/daily-dashboard-language-renderer.md`
- Optional focus for this run: ${{ inputs.focus }}

## Hard constraints

- Never modify, move, or delete the existing dashboard package in `dashboard/` or any file outside `pages/dashboard/`. Read it for reference only.
- Refactor only. Do not add, remove, or change validated or rendered behavior, error codes, accessible names, DOM text, or class names. If a rendering defect is discovered, record it in `PLAN.md` instead of fixing it here.
- Never add a runtime dependency. The reactive core, validator, presenter, and components run on the Node.js and browser standard libraries. Development-only tooling stays in `devDependencies`.
- Never weaken, skip, or delete an existing test to make a refactor pass. Tests may be moved or renamed only when the code they cover moves, and their assertions must stay at least as strong.
- Keep components presentation-only and dashboard-config-agnostic: no validator imports, no built-in page names, no specification section knowledge, and no fetching or data derivation inside a component.
- Do not introduce a bundler, transpilation step, framework, or `.ts` application sources.

## What counts as an extraction opportunity

Rank candidates by how much future feature work they unlock, and prefer the highest-ranked candidate that fits in one run:

- The same DOM shape assembled more than once (cards, metric grids, tables, chart text equivalents, summary lists, link lists, empty and unavailable states, section headers, sidebars, filter and context strips).
- Near-duplicates that differ only in labels, field accessors, or ordering, which generalize behind a small parameter object.
- Long page render functions in `src/renderer.js` that inline markup a built-in or custom page could compose instead.
- Repeated non-visual helpers around formatting, sorting, counting, grouping, label derivation, and safe text handling, which belong in a shared module rather than a component.
- Component APIs that have accumulated boolean flags or page-specific branches and should be split into smaller composable components.

Do not extract when the shape appears once, when generalizing would require inventing specification semantics, or when the abstraction would need more parameters than the call sites it serves.

## Per-run procedure

1. Read `pages/dashboard/PLAN.md`, the existing modules under `pages/dashboard/src/`, and the current contents of `pages/dashboard/src/components/`.
2. Inventory the extraction opportunities across the JavaScript under `pages/dashboard`. Search for repeated construction rather than guessing, and record each candidate with its call sites.
3. Select one candidate, honoring the `focus` input when it names a file, page, or component family. Prefer the candidate with the most call sites and the widest expected reuse by upcoming feature slices.
4. Extract it into `pages/dashboard/src/components/` when it produces DOM, or into a shared module under `pages/dashboard/src/` when it is a pure helper. Give it a minimal, composable API driven by reactive state or plain values, with JSDoc types.
5. Replace every duplicated call site you identified with the new component or function. Leaving a duplicate behind is an incomplete refactor.
6. Add unit tests for the extracted unit covering its states and edge cases, including empty, missing, and unavailable inputs. Keep the requirement identifiers already asserted by moved tests, for example `DLS-VIEW-005`.
7. Prove behavior preservation: run the full existing test suite unchanged, and compare rendered output for at least one affected page before and after the refactor.
8. Run every quality gate from `pages/dashboard/`: install, type check, lint, unit tests, and end-to-end checks. All gates must pass before publishing. If `typecheck`, `lint`, or `test` fail immediately after `npm install` with a missing binary or missing type-package error, rerun the same command once from `pages/dashboard/` before treating it as a real failure. Prefer the built-in Playwright MCP browser tools over `npm run test:e2e`; a `browserType.launch: Executable doesn't exist` error is an infrastructure gap, not a test failure. Record any gate blocked by infrastructure in `PLAN.md` and in the pull request body.
9. Update `PLAN.md`: keep a "Component inventory" section listing each reusable component or shared helper with a one-line purpose, and append a dated run entry naming the extraction, the call sites collapsed, the evidence of unchanged behavior, and the top remaining candidates for the next run.
10. Publish with `create-pull-request`. Call `noop` only when no opportunity remains above the threshold above, or when the run is blocked before any code change, and explain the reasoning.

## Sustaining broad feature growth

- Treat the remaining candidate list in `PLAN.md` as a queue, so consecutive runs compound instead of rediscovering the same findings.
- When a component is extracted, note in `PLAN.md` which upcoming milestones should compose it, so feature runs reuse it instead of inlining new markup.
- Keep each component's surface small enough that a new page can compose several of them without configuration; split rather than parameterize when a component starts branching on page identity.
- If the library has drifted so far that no single extraction is safe, deliver the smallest safe step toward it and describe the follow-up steps in `PLAN.md`.

## Playwright

Playwright is available through the built-in MCP browser tools. Use the browser snapshot, click, type, and evaluation actions directly to confirm that the refactored pages render as before. If the browser cannot start, record the blocker in `PLAN.md`, keep the other gates green, and say so in the pull request body.

## Pull request content

Title the work after the extracted component or helper. In the body, list the duplication evidence with file references, the call sites collapsed, the tests added, the gates that ran with their results, the proof that behavior is unchanged, any blockers, and the next candidates in the queue. Do not claim behavior improvements; this workflow does not change behavior.
