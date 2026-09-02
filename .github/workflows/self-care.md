---
name: "SelfCare"

run-name: "${{ github.event_name == 'schedule' && 'SelfCare · scheduled' || format('SelfCare · {0} · {1}', inputs.target_repo || github.repository, inputs.safe_output_mode || 'review') }}"

max-ai-credits: 200
timeout-minutes: 15

concurrency:
  group: "${{ github.workflow }}"
  cancel-in-progress: true

on:
  schedule: every 20 minutes
  workflow_dispatch:
    inputs:
      target_repo:
        type: string
      safe_output_repo:
        type: string
      max_repos:
        default: 1
        type: number
      rollout_percent:
        default: 100
        type: number
      safe_output_mode:
        default: "review"
        type: choice
        options:
          - review
          - live

env:
  GH_AW_SAFE_OUTPUT_MODE: ${{ inputs.safe_output_mode || 'review' }}
  REVIEW_OUTPUT_REPO: ${{ inputs.safe_output_repo || github.repository }}
  SAFE_OUTPUT_REPO: ${{ (inputs.safe_output_mode || 'review') == 'review' && (inputs.safe_output_repo || github.repository) || '' }}
  TARGET_REPO: ${{ inputs.target_repo || '' }}

environment: central-agentic-ops

imports:
  - uses: shared/control.md
    with:
      package: self-care
      role: orchestrator
      dispatch_max: "3"
      orchestrator_credits: "200"
      worker_credits_per_target: "800"

permissions:
  contents: read
  actions: read

strict: true

tools:
  github:
    mode: remote
    min-integrity: approved
    toolsets: [repos, actions]

network:
  allowed:
    - defaults
    - github

safe-outputs:
  dispatch-workflow:
    workflows: [self-care-accessibility-checker, self-care-code-improvement, self-care-primer-brand-checker]
    max: 3
  threat-detection: false

source: githubnext/central-agentic-ops@a4b937e2ee4e540d3ccce1377f8943315670f33d
---

{{#runtime-import? .github/cao/self-care.md}}

# SelfCare

## Discovery

This operation is exclusively for `githubnext/central-agentic-ops`. Select that repository only when its precomputed candidate mode is `live`. Treat every other repository and every non-live candidate as ineligible, regardless of apparent need, and record the skip reason in the standard report.

The single eligible repository contains the documentation site and dashboard maintained by the three workers. Do not discover, rank, or dispatch work to any other repository.

## Workers

- `self-care-accessibility-checker`: audits the rendered documentation site with axe-core, keyboard traversal, and browser evidence, then publishes one prioritized accessibility issue.
- `self-care-code-improvement`: extracts one evidenced duplicated dashboard UI construct into a tested reusable component and opens one focused draft pull request.
- `self-care-primer-brand-checker`: audits the dashboard against retrieved Primer brand guidance and opens one focused draft pull request when an evidenced presentational fix is available.

Dispatch all three enabled workers for the selected repository. Never dispatch a worker in review mode or for another repository.

## Completion

Finish with the standard orchestrator report inherited from `shared/control.md`. Preserve `Scope`, `Repository Decisions`, `Workers`, `Dispatches`, and `Outcome`, including every standard field. Use exact precomputed totals for repositories scanned and distinguish eligible, selected, skipped, and deferred repositories. Use `0`, `none`, or `not applicable` for every empty field.

In `Outcome`, additionally state whether the sole authorized live target was selected and whether all three SelfCare workers were dispatched.
