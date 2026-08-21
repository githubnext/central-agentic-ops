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
      safe_output_mode:
        default: "staged"
        type: choice
        options:
          - staged
          - review
          - live

imports:
  - uses: shared/control.md
    with:
      role: orchestrator
      rollout_mode: ${{ vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_MODE || 'staged' }}
      rollout_percent: ${{ vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_ROLLOUT_PERCENT || '100' }}
      max_repos: ${{ vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_MAX_REPOS || '1' }}
      max_scan_repos: ${{ vars.CENTRAL_AGENTIC_OPS_MAX_SCAN_REPOS || '1000' }}
      allowed_owners: ${{ vars.CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS || github.repository_owner }}
      dispatch_max: "20"

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

---

# Optimization

## Discovery

For the Optimization package, prefer repositories with Agentic Workflow definitions under `.github/workflows/`, recent agentic workflow runs, AI credit usage, high-turn or high-token runs, repeated warnings or failures, or existing audit/optimization history.

Deprioritize repositories with no Agentic Workflow definitions, no readable workflow logs, no recent agentic workflow activity, or only the optimization monitoring workflows installed without other workflows to improve.

## Workers

- `optimization-ai-credit-auditor`: reads workflow definitions and recent run logs; records AI credit and token snapshots with trend charts.
- `optimization-ai-credit-optimizer`: reads 7-day run aggregates and repo-memory history; publishes recommendations for the highest-impact workflow not recently optimized.
