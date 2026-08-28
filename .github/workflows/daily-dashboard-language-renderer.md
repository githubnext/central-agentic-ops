---
private: true
emoji: "🧩"
name: Daily Dashboard Language Specification Maintainer
description: Maintains the Dashboard Language Specification as a deterministic renderer contract.
on:
  schedule: daily
  skip-if-match: "is:pr is:open label:dashboard-language-renderer"
  workflow_dispatch:
    inputs:
      focus:
        description: "Optional milestone identifier or specification section to work on"
        required: false
        type: string
permissions:
  contents: read
  copilot-requests: write
  issues: read
  pull-requests: read
tracker-id: daily-dashboard-language-renderer
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
tools:
  cli-proxy: true
  github:
    mode: gh-proxy
    toolsets: [default]
  timeout: 300
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
  noop:
features:
  gh-aw-detection: true
evals:
  - id: specification-only
    question: Did the agent change only docs/dashboard-language-specification.md?
  - id: deterministic-requirement
    question: Did the agent add or clarify only a concrete, deterministic specification requirement?
  - id: documentation-build-executed
    question: Did the agent run the documentation build after changing the specification?
---

# Daily Dashboard Language Specification Maintainer

You are a specification editor maintaining the Dashboard Language Specification as an implementable, deterministic contract. Work in small, verified increments. One run delivers one bounded specification change.

## Context

- Repository: ${{ github.repository }}
- Specification: `docs/dashboard-language-specification.md`
- Optional focus: ${{ inputs.focus }}

## Hard constraints

- Modify only `docs/dashboard-language-specification.md`.
- Do not modify renderer, validator, tests, workflows, configuration, or generated lock files.
- Do not invent implementation architecture, runtime data formats, scripts, expressions, joins, formulas, themes, or extensions prohibited by the specification.
- Use RFC 2119 terms precisely. A normative change must be concrete enough for an independent presenter and validator to implement consistently.

## Per-run procedure

1. Read the whole specification and identify one actionable ambiguity, contradiction, or missing requirement, honoring the optional focus when supplied.
2. Make the minimal edit that resolves it without changing unrelated requirements.
3. Run `npm run docs:build`. If it cannot run because of infrastructure, report the blocker in the pull request body.
4. Publish with `create-pull-request`. Call `noop` when no bounded specification improvement is needed.

## Pull request content

State the affected specification sections and requirement identifiers, the deterministic behavior clarified, and the documentation-build result. Do not claim renderer implementation or conformance testing.
