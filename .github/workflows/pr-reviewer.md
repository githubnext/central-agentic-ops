---
description: "Reviews pull requests that change workflow contracts by compiling and validating all agentic workflow validators."
name: "PR Reviewer / Agentic Workflow Validation"
on:
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review]
    paths:
      - ".github/workflows/**/*.md"
      - ".github/workflows/workflow-contracts.yml"
      - "aw.yml"
      - "package.json"
      - "package-lock.json"
      - "tests/**/*.mjs"
  workflow_dispatch:
max-ai-credits: 350
timeout-minutes: 45
run-name: "PR workflow review · #${{ github.event.pull_request.number || github.run_number }}"
concurrency:
  group: "${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}"
  cancel-in-progress: true
permissions:
  contents: read
  pull-requests: read
  copilot-requests: write
strict: true
tools:
  github:
    mode: remote
    min-integrity: approved
    toolsets: [pull_requests, repos]
network:
  allowed:
    - defaults
    - github
    - node
    - go
steps:
  - name: Checkout repository
    uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
    with:
      persist-credentials: false
  - name: Setup Node.js
    uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
    with:
      node-version: 24
      cache: npm
  - name: Install dependencies
    run: npm ci
  - name: Checkout validator-capable gh-aw
    uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
    with:
      repository: github/gh-aw
      ref: 5cd744cc263a9d1ec5660fbf5604eaceb6f83430
      path: .cache/gh-aw
      persist-credentials: false
  - name: Setup Go
    uses: actions/setup-go@b7ad1dad31e06c5925ef5d2fc7ad053ef454303e # v7.0.0
    with:
      go-version-file: .cache/gh-aw/go.mod
      cache-dependency-path: .cache/gh-aw/go.sum
  - name: Run all validator commands
    shell: bash
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    run: |
      set -euo pipefail
      cd .cache/gh-aw
      go build -ldflags "-s -w -X main.version=v0.87.6" -o gh-aw ./cmd/gh-aw
      gh extension remove aw || true
      gh extension install .
      cd "$GITHUB_WORKSPACE"

      mkdir -p /tmp/gh-aw/agent/pr-reviewer
      SUMMARY=/tmp/gh-aw/agent/pr-reviewer/validator-summary.json

      run_cmd() {
        local name="$1"
        shift
        local log_file="/tmp/gh-aw/agent/pr-reviewer/${name}.log"
        set +e
        "$@" >"$log_file" 2>&1
        local status=$?
        set -e
        jq --arg name "$name" --arg log "$log_file" --argjson status "$status" \
          '.checks += [{name: $name, status: $status, log: $log}]' \
          "$SUMMARY" > "${SUMMARY}.tmp"
        mv "${SUMMARY}.tmp" "$SUMMARY"
      }

      printf '{"checks":[]}\n' > "$SUMMARY"
      run_cmd test_unit npm run test:unit
      run_cmd test_integration npm run test:integration
      run_cmd test_load npm run test:load
      run_cmd compile_validate gh aw compile --validate --no-emit --no-check-update --schedule-seed githubnext/central-agentic-ops
      run_cmd docs_build npm run docs:build

      jq '
        .failed = ([.checks[] | select(.status != 0)] | length) |
        .passed = ([.checks[] | select(.status == 0)] | length)
      ' "$SUMMARY" > "${SUMMARY}.tmp"
      mv "${SUMMARY}.tmp" "$SUMMARY"
safe-outputs:
  submit-pull-request-review:
    max: 1
    allowed-events: [COMMENT, REQUEST_CHANGES]
---

# PR Reviewer / Agentic Workflow Validation

Review this pull request as a workflow-validator reviewer.

## Required execution policy

1. Read `/tmp/gh-aw/agent/pr-reviewer/validator-summary.json`.
2. Confirm every listed validator command ran.
3. For each failed command, read the paired log file and extract concrete failing checks or stack traces.
4. Submit exactly one pull request review:
   - Use `REQUEST_CHANGES` if any validator failed.
   - Use `COMMENT` if all validators passed.

## Validation contract

Treat these commands as the full validator contract for this repository:

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:load`
- `gh aw compile --validate --no-emit --no-check-update --schedule-seed githubnext/central-agentic-ops`
- `npm run docs:build`

## Review output rules

- Keep the review concise and factual.
- Report each validator status (`pass`/`fail`) in a checklist.
- For failures, include only actionable details from logs.
- Do not approve the pull request.
- Do not use emoji in error text.
