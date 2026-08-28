---
name: "Optimization"

run-name: "Optimization · ${{ inputs.target_repo || 'auto' }} · ${{ inputs.safe_output_mode || 'mode' }}"

max-ai-credits: 250
timeout-minutes: 15

concurrency:
  group: "${{ github.workflow }}"
  cancel-in-progress: true

on:
  schedule: "weekly on monday"
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
      cell_count:
        default: 1
        type: number
      cell_index:
        default: 0
        type: number
      batch_size:
        default: 100000
        type: number
      batch_index:
        default: 0
        type: number
      safe_output_mode:
        default: "review"
        type: choice
        options:
          - review
          - live

env:
  CENTRAL_AGENTIC_OPS_PACKAGE_ENABLED: ${{ vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_ENABLED || 'true' }}
  CENTRAL_AGENTIC_OPS_MODE: ${{ vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_MODE || 'review' }}
  GH_AW_SAFE_OUTPUT_MODE: ${{ inputs.safe_output_mode || vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_MODE || 'review' }}
  REVIEW_OUTPUT_REPO: ${{ inputs.safe_output_repo || github.repository }}
  SAFE_OUTPUT_REPO: ${{ (inputs.safe_output_mode || vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_MODE || 'review') == 'review' && (inputs.safe_output_repo || github.repository) || '' }}
  TARGET_REPO: ${{ inputs.target_repo || '' }}

if: (vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_ENABLED || 'true') == 'true'

imports:
  - uses: shared/control.md
    with:
      bundle: optimization
      role: orchestrator
      rollout_percent: ${{ inputs.rollout_percent || vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_ROLLOUT_PERCENT || '100' }}
      max_repos: ${{ inputs.max_repos || vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_MAX_REPOS || '1' }}
      max_scan_repos: ${{ vars.CENTRAL_AGENTIC_OPS_MAX_SCAN_REPOS || '1000' }}
      cell_count: ${{ inputs.cell_count || vars.CENTRAL_AGENTIC_OPS_CELL_COUNT || '1' }}
      cell_index: ${{ inputs.cell_index || vars.CENTRAL_AGENTIC_OPS_CELL_INDEX || '0' }}
      batch_size: ${{ inputs.batch_size || vars.CENTRAL_AGENTIC_OPS_BATCH_SIZE || '100000' }}
      batch_index: ${{ inputs.batch_index || vars.CENTRAL_AGENTIC_OPS_BATCH_INDEX || '0' }}
      allowed_owners: ${{ vars.CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS || github.repository_owner }}
      allowed_repos: ${{ vars.CENTRAL_AGENTIC_OPS_ALLOWED_REPOS || '' }}
      dispatch_max: "20"
      orchestrator_credits: "250"
      worker_credits_per_target: "850"
      aggregate_credit_limit: ${{ vars.CENTRAL_AGENTIC_OPS_MAX_AI_CREDITS_PER_RUN || '1100' }}
      monthly_credit_budget: ${{ vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_MONTHLY_AI_CREDIT_BUDGET || '0' }}

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

source: githubnext/central-agentic-ops@2de9130ff1709fccdacbe5261fd5da71995e6721
---

{{#runtime-import? .github/aw/optimization.md}}

# Optimization

## Discovery

For the Optimization package, prefer repositories with Agentic Workflow definitions under `.github/workflows/`, recent agentic workflow runs, AI credit usage, high-turn or high-token runs, repeated warnings or failures, or existing audit/optimization history.

Deprioritize repositories with no Agentic Workflow definitions, no readable workflow logs, no recent agentic workflow activity, or only the optimization monitoring workflows installed without other workflows to improve.

## Workers

- `optimization-ai-credit-auditor`: reads workflow definitions and recent run logs; records AI credit and token snapshots with trend charts, then uses `gh aw forecast` to report weekly and monthly AIC and estimated USD scenarios.
- `optimization-ai-credit-optimizer`: reads 7-day run aggregates and repo-memory history; publishes recommendations for the highest-impact workflow not recently optimized.
