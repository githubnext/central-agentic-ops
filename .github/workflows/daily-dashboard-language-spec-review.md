---
private: true
emoji: "📊"
name: Daily Dashboard Language Specification Review
description: Reviews the Dashboard Language Specification and incrementally replaces hard-coded production views with declarative JSON and reusable UI elements.
intent: Reduce page-specific dashboard code by expressing user-visible views through the Dashboard Language and reusable, configuration-driven UI primitives.
on:
  schedule: daily
  skip-if-match: "is:pr is:open label:dashboard-language-renderer"
  workflow_dispatch:
    inputs:
      focus:
        description: "Optional specification section, page, view, or component family to inspect"
        required: false
        type: string
permissions:
  contents: read
  copilot-requests: write
  issues: read
  pull-requests: read
engine:
  id: pi
  model: copilot/gpt-5.4
tracker-id: daily-dashboard-language-spec-review
max-turns: 500
max-ai-credits: 1000
concurrency:
  group: "${{ github.workflow }}"
  cancel-in-progress: false
  job-discriminator: "${{ github.run_id }}"
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
    mode: cli
    version: "0.1.18"
  bash:
    - "*"
safe-outputs:
  create-pull-request:
    title-prefix: "[dashboard-language] "
    labels: [dashboard-language-renderer, ai-generated]
    draft: true
    if-no-changes: warn
    allowed-files:
      - "docs/dashboard-language-specification.md"
      - "dashboard/site/**"
  create-issue:
    title-prefix: "[dashboard-language-spec] "
    labels: [cookie]
    close-older-issues: true
    close-older-key: dashboard-language-spec-review
    max: 1
    expires: 7d
  noop:
timeout-minutes: 60
strict: true
evals:
 - id: implementation-inspected
   question: Did the agent inspect dashboard.json and the JavaScript under dashboard/site to identify concrete page-specific view or UI construction?
 - id: declarative-refactor-delivered
   question: Did the agent move one bounded hard-coded view increment into Dashboard Language JSON and reusable custom-view UI primitives?
 - id: language-and-implementation-aligned
   question: Did the agent update the specification, validator, presenter, and tests together when new declarative vocabulary was required?
 - id: quality-gates-executed
   question: Did the agent run the dashboard build, type checking, lint, unit tests, and browser checks?
 - id: bounded-safe-output
   question: Did the agent create one focused pull request, create one recommendation issue only when blocked on a normative decision, or report a no-op when no actionable candidate remained?
---

# Daily Dashboard Language Specification Review

You are a specification reviewer and refactoring engineer for the Dashboard Language Specification and its production renderer. Each run delivers at most one bounded increment that replaces page-specific view code with declarative JSON and reusable custom-view UI elements.

## Context

- Repository: ${{ github.repository }}
- Specification: `docs/dashboard-language-specification.md`
- Producer contracts: `dashboard/report/records.mjs`, `dashboard/report/dashboard-language-sources.mjs`, and their sibling collectors
- Production implementation: `dashboard/site/`
- Declarative dashboard document: `dashboard/site/dashboard.json`
- Incremental plan: `dashboard/site/PLAN.md`
- Optional focus for this run: ${{ inputs.focus }}

## Scope

Review `docs/dashboard-language-specification.md` against the producer contracts under `dashboard/report/` and the production renderer under `dashboard/site/`. Treat producer schemas as evidence of source semantics, not as a normative presentation model. Treat the specification as the renderer contract and `dashboard/site/dashboard.json` as the authoritative declarative document.

Write only to `docs/dashboard-language-specification.md` and `dashboard/site/`. Never modify collectors, source adapters, package manifests, or workflow builders. Never add a runtime dependency, weaken a test, invent unspecified semantics, or replace a specialized view with a less expressive generic rendering.

## Inspect the implementation

Read `dashboard/site/PLAN.md`, `dashboard/site/dashboard.json`, and all relevant modules under `dashboard/site/src/` before selecting work. Inspect relevant producer modules under `dashboard/report/` when source availability, completeness, coverage, provenance, topology, usage, or maturity semantics control the view.

Use targeted searches and bounded line-range reads; do not load whole large files or reread the specification. Keep each edit call small and single-purpose.

Inventory concrete remaining hard-coded view construction, including:

- branches or registries keyed by a built-in page or view identifier;
- JavaScript that fixes a page's fields, labels, ordering, layout, filtering, or composition;
- named element renderers used by only one page when the same result can be composed from common custom-view elements; and
- repeated DOM or interaction patterns that should be a dashboard-agnostic component under `dashboard/site/src/components/`.

Do not classify generic interpretation, validation, formatting, source derivation, or reusable presentation primitives as hard-coded merely because they are implemented in JavaScript.

## Select one increment

Choose the highest-value candidate that fits in one run, honoring the optional focus. Prefer a view that can already be represented by the language. Move its page-specific fields and composition into `dashboard.json`, then render it through existing generic custom-view marks and common UI elements.

When the candidate requires a missing reusable presentation primitive, add the smallest dashboard-agnostic component and make it selectable through declarative custom-view configuration. Components must not branch on page or view identity.

When the language cannot express a required semantic, make the smallest coherent language increment: update the normative specification, validator, `dashboard.json`, generic presenter or component, fixtures, and requirement-named tests together. Do not add implementation-local JSON vocabulary without documenting its portable semantics.

For the selected view, verify that the declarative document defines source grain, filtering, aggregation, grouping or series, mark or element, encoding, ordering or limiting, data state, links, and accessibility semantics without renderer guesses. Preserve visible behavior, accessible names, safe-link handling, empty and unavailable states, and deterministic output.

## Validate and publish

Add or update tests that prove the selected view is declared in JSON, is rendered by generic code, and no longer depends on page-specific JavaScript. Update `PLAN.md` with the completed migration and next candidates.

Run every quality gate from `dashboard/site/`: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`. Do not publish when a code-controlled gate fails. Record an infrastructure-only browser blocker in `PLAN.md` and the pull request body.

## Decision

Publish exactly one safe output:

- Call `create-pull-request` when one bounded, tested declarative refactor is complete.
- Create exactly one issue only when a specific normative contradiction or policy decision prevents a safe implementation. Write it as a W3C Working Draft recommendation using `###` headings only, affected requirement IDs, observed ambiguity, precise RFC 2119 language, renderer and validator consequences, and concise acceptance criteria.
- Call `noop` when no actionable hard-coded view remains, the optional focus is already declarative, or evidence is insufficient.

In a pull request body, name the migrated view, the removed hard-coded branch or composition, the JSON vocabulary and shared UI primitives used, specification requirement IDs affected, validation results, and the next candidate. Do not claim broader parity or conformance than the tests demonstrate.
