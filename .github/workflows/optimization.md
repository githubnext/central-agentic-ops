---
name: "Optimization"

run-name: "${{ github.event_name == 'schedule' && 'Optimization · scheduled' || format('Optimization · {0} · {1}', inputs.target_repo || 'discovery', inputs.safe_output_mode || 'review') }}"

max-ai-credits: 250
timeout-minutes: 15

concurrency:
  group: "${{ github.workflow }}"
  job-discriminator: ${{ github.run_id }}
  cancel-in-progress: true

on:
  schedule: "hourly"
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
  permissions:
    contents: read
    actions: read

jobs:
  pre-activation:
    outputs:
      cao_authorized: ${{ steps.cao_admission.outputs.authorized == 'true' && steps.cao_precompute.outputs.authorized != 'false' }}
      cao_reason: ${{ steps.cao_precompute.outputs.reason || steps.cao_admission.outputs.reason }}

env:
  GH_AW_SAFE_OUTPUT_MODE: ${{ inputs.safe_output_mode || 'review' }}
  REVIEW_OUTPUT_REPO: ${{ inputs.safe_output_repo || github.repository }}
  SAFE_OUTPUT_REPO: ${{ (inputs.safe_output_mode || 'review') == 'review' && (inputs.safe_output_repo || github.repository) || '' }}
  TARGET_REPO: ${{ inputs.target_repo || '' }}

environment: central-agentic-ops

if: needs.pre_activation.outputs.cao_authorized == 'true'

imports:
  - uses: shared/cao.md
    with:
      package: optimization
      role: orchestrator
      dispatch_max: "20"
      orchestrator_credits: "250"
      worker_credits_per_target: "850"

permissions:
  contents: read
  actions: read
  copilot-requests: write

strict: true

tools:
  github:
    mode: remote
    toolsets: [repos, actions]

network:
  allowed:
    - defaults
    - github

safe-outputs:
  dispatch-workflow:
    workflows: [optimization-ai-credit-auditor, optimization-ai-credit-optimizer]
    max: 20
  threat-detection: false

source: githubnext/gh-aw-cao@2de9130ff1709fccdacbe5261fd5da71995e6721
---

{{#runtime-import? .github/cao/optimization.md}}

# Optimization

## Discovery

For the Optimization package, prefer repositories with Agentic Workflow definitions under `.github/workflows/`, recent agentic workflow runs, AI credit usage, high-turn or high-token runs, repeated warnings or failures, or existing audit/optimization history.

Deprioritize repositories with no Agentic Workflow definitions, no readable workflow logs, no recent agentic workflow activity, or only the optimization monitoring workflows installed without other workflows to improve.

## Workers

- `optimization-ai-credit-auditor`: reads workflow definitions and recent run logs; records AI credit and token snapshots with trend charts, then uses `gh aw forecast` to report weekly and monthly AIC and estimated USD scenarios.
- `optimization-ai-credit-optimizer`: reads 7-day run aggregates and repo-memory history; publishes recommendations for the highest-impact workflow not recently optimized.
