---
name: "UK AI Advisory"

run-name: "UK AI Advisory · ${{ inputs.target_repo || 'auto' }} · ${{ inputs.safe_output_mode || 'mode' }}"

max-ai-credits: 250
timeout-minutes: 15

concurrency:
  group: "${{ github.workflow }}"
  cancel-in-progress: true

on:
  schedule: "daily on weekdays"
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
  CENTRAL_AGENTIC_OPS_PACKAGE_ENABLED: ${{ vars.CENTRAL_AGENTIC_OPS_ADVISORY_ENABLED || 'true' }}
  CENTRAL_AGENTIC_OPS_MODE: ${{ vars.CENTRAL_AGENTIC_OPS_ADVISORY_MODE || 'review' }}
  GH_AW_SAFE_OUTPUT_MODE: ${{ inputs.safe_output_mode || vars.CENTRAL_AGENTIC_OPS_ADVISORY_MODE || 'review' }}
  REVIEW_OUTPUT_REPO: ${{ inputs.safe_output_repo || github.repository }}
  SAFE_OUTPUT_REPO: ${{ (inputs.safe_output_mode || vars.CENTRAL_AGENTIC_OPS_ADVISORY_MODE || 'review') == 'review' && (inputs.safe_output_repo || github.repository) || '' }}
  TARGET_REPO: ${{ inputs.target_repo || '' }}

if: (vars.CENTRAL_AGENTIC_OPS_ADVISORY_ENABLED || 'true') == 'true'

imports:
  - uses: shared/control.md
    with:
      bundle: advisory
      role: orchestrator
      rollout_percent: ${{ inputs.rollout_percent || vars.CENTRAL_AGENTIC_OPS_ADVISORY_ROLLOUT_PERCENT || '100' }}
      max_repos: ${{ inputs.max_repos || vars.CENTRAL_AGENTIC_OPS_ADVISORY_MAX_REPOS || '1' }}
      max_scan_repos: ${{ vars.CENTRAL_AGENTIC_OPS_MAX_SCAN_REPOS || '1000' }}
      cell_count: ${{ inputs.cell_count || vars.CENTRAL_AGENTIC_OPS_CELL_COUNT || '1' }}
      cell_index: ${{ inputs.cell_index || vars.CENTRAL_AGENTIC_OPS_CELL_INDEX || '0' }}
      batch_size: ${{ inputs.batch_size || vars.CENTRAL_AGENTIC_OPS_BATCH_SIZE || '100000' }}
      batch_index: ${{ inputs.batch_index || vars.CENTRAL_AGENTIC_OPS_BATCH_INDEX || '0' }}
      allowed_owners: ${{ vars.CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS || github.repository_owner }}
      allowed_repos: ${{ vars.CENTRAL_AGENTIC_OPS_ALLOWED_REPOS || '' }}
      dispatch_max: "50"
      orchestrator_credits: "250"
      worker_credits_per_target: "600"
      aggregate_credit_limit: ${{ vars.CENTRAL_AGENTIC_OPS_MAX_AI_CREDITS_PER_RUN || '1100' }}
      monthly_credit_budget: ${{ vars.CENTRAL_AGENTIC_OPS_ADVISORY_MONTHLY_AI_CREDIT_BUDGET || '0' }}

permissions:
  contents: read
  actions: read
  copilot-requests: write
  issues: read
  pull-requests: read
  security-events: read
  vulnerability-alerts: read

engine:
  id: pi
  model: copilot/gpt-5.4

strict: true

tools:
  cli-proxy: true
  github:
    mode: gh-proxy
    toolsets: [repos, issues, pull_requests, actions, dependabot, code_security, security_advisories]

network:
  allowed:
    - defaults
    - github

safe-outputs:
  dispatch-workflow:
    workflows: [advisory-uk-ai-operational-resilience]
    max: 50
---

{{#runtime-import? .github/cao/advisory.md}}

<!-- Advisory outputs are advisory and non-binding. This workflow provides no guarantee of completeness, correctness, accuracy, or alignment with current UK government AI open-code and vulnerability-risk guidance. -->

# UK AI Advisory

UK AI Advisory, a non-binding package orchestrator for applying UK public-sector AI open-code and vulnerability-risk guidance across organization repositories. It provides no security assessment, accreditation, authorization, or guarantee of completeness. Select and rank repositories only; the worker owns repository analysis and every finding requires human review against current authoritative guidance.

## Discovery

Read `/tmp/gh-aw/agent/control-precompute.json` first and use its candidates and limits as authoritative. An explicit `target_repo` takes precedence within the shared control-plane rules.

Rank repositories by observed evidence that an operational-resilience advisory would be useful:

1. UK public-sector ownership, procurement, delivery, or service documentation for published or publicly accessible code and systems.
2. Public repositories, documented public source locations, and code intended for reuse, transparency, external scrutiny, or avoidance of supplier lock-in.
3. Security-sensitive commits, vulnerability alerts, exposed-secret alerts, dependency updates, material runtime and deployment changes, or AI-assisted attack surfaces that may shorten the discovery-to-exploit window.
4. Missing or weak evidence of ownership, secure-by-design development, automated dependency and vulnerability hygiene, patch SLAs, inbound vulnerability reporting, observability, incident response, rollback, and recovery. For public repositories, prolonged inactivity without credible ownership or automated hygiene is a priority signal, not a reason to skip.
5. Existing `[advisory:uk-ai-resilience]` reports whose evidence is stale after material repository changes.

Exclude archived or disabled repositories and repositories that the configured credential cannot read. Deprioritize repositories with no observed UK public-sector or published-code relevance, or an equivalent current advisory with no material change. AI is a threat accelerator, not an eligibility requirement. Missing metadata is not evidence that a repository is in or out of scope.

Use bounded two-stage discovery. Rank the complete precomputed batch using trusted metadata, then inspect only the strongest candidates needed to fill `effective_max_repos`, plus at most two alternates per available slot. Prefer cheap repository-tree, topic, release, package, workflow, security-policy, and existing-report checks. Stop once selected targets and defensible alternates are established.

## Workers

- `advisory-uk-ai-operational-resilience`: assesses one selected repository against current UK government AI open-code and vulnerability-risk guidance, focusing on recent changes, control evidence, operational resilience, proposed risk tiers, and prioritized remediation.

Dispatch once per selected repository. Do not analyze target repositories in the orchestrator and do not fan out by commit, alert, asset, control, or remediation item.

## Completion

Finish with the standard `## Orchestrator Report` inherited from `shared/control.md`. Preserve every standard heading and field under `Scope`, `Repository Decisions`, `Workers`, `Dispatches`, and `Outcome`; use exact precomputed repository totals, distinguish eligible, selected, skipped, and deferred repositories, and use `0`, `none`, or `not applicable` for empty fields.

Add the evidence supporting each selected repository's UK public-sector, AI, open-code, recent-change, or resilience priority alongside the standard fields. When no repository has enough observed evidence for a useful advisory, dispatch nothing and report a no-op in `Outcome`.
