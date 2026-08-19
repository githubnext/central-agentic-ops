---
import-schema:
  role:
    type: choice
    options: [orchestrator, worker]
    required: true
  rollout_mode:
    type: string
    default: "preview"
  review_repo:
    type: string
    default: ""

env:
  CENTRAL_AGENTIC_OPS_MODE: ${{ github.aw.import-inputs.rollout_mode }}
  GH_AW_SAFE_OUTPUT_MODE: ${{ github.event.inputs.safe_output_mode || github.aw.import-inputs.rollout_mode || 'preview' }}
  TARGET_REPO: ${{ github.event.inputs.target_repo || '' }}
  REVIEW_OUTPUT_REPO: ${{ github.event.inputs.safe_output_repo || github.aw.import-inputs.review_repo || '' }}
  SAFE_OUTPUT_REPO: ${{ (github.event.inputs.safe_output_mode || github.aw.import-inputs.rollout_mode || 'preview') == 'review' && env.REVIEW_OUTPUT_REPO || '' }}

# Disabled until checkout safe outputs correctly fall back to PAT authentication.
# github-app:
#   client-id: ${{ vars.GH_AW_GITHUB_APP_ID }}
#   private-key: ${{ secrets.GH_AW_GITHUB_APP_PRIVATE_KEY }}
#   ignore-if-missing: true
#   repositories: ["*"]

imports:
  #- uses: sentry.md
  #- uses: grafana.md
  #- uses: datadog.md
  - uses: control-precompute.md
    with:
      role: ${{ github.aw.import-inputs.role }}
      target_repo: ${{ github.event.inputs.target_repo || '' }}
      organization: ${{ github.repository_owner }}
      max_repos: ${{ github.event.inputs.max_repos || '1' }}
      safe_output_mode: ${{ env.GH_AW_SAFE_OUTPUT_MODE }}
      safe_output_repo: ${{ env.SAFE_OUTPUT_REPO }}
      preview_only: ${{ (env.GH_AW_SAFE_OUTPUT_MODE == 'live' || env.GH_AW_SAFE_OUTPUT_MODE == 'review') && 'false' || 'true' }}
      enabled: ${{ github.event_name == 'workflow_dispatch' || env.CENTRAL_AGENTIC_OPS_MODE == 'preview' || env.CENTRAL_AGENTIC_OPS_MODE == 'review' || env.CENTRAL_AGENTIC_OPS_MODE == 'live' }}
---

Read `/tmp/gh-aw/agent/control-precompute.json` before making control decisions. Treat it as authoritative for `control_role`, enablement state, target repository inputs, safe-output routing, and worker workflow availability.

If `control_role` is `worker`, this workflow is a dispatched worker. Do not select repositories and do not dispatch workflows. Use the importing workflow's mission instructions, and treat `target_repo`, `safe_output_mode`, `safe_output_repo`, `preview_only`, `correlation_id`, `central_repo`, and `control_plane_run_url` as the standard control-plane envelope. When `correlation_id` is present, include a short `### Control Plane` section in safe-output issues, pull requests, or comments with the correlation ID, central repository, and control plane run URL. Safe outputs are created in `SAFE_OUTPUT_REPO`.

If `safe_output_mode` is `review` and `safe_output_repo` is empty, do not create safe outputs and do not dispatch workers. Call `report_incomplete` explaining that `review` mode requires an explicit private review destination via the `safe_output_repo` input or the bundle's review-repository variable.

When `target_repo` is present, prefer a dedicated `target/` checkout when the importing workflow provides one. Treat that checkout as the authoritative target-repository snapshot for analysis, and treat the workspace root as the repository where safe outputs land. In `review` mode, do not treat `SAFE_OUTPUT_REPO` as a live substitute for the target repository. Instead, prefer an artifact-backed review bundle in `SAFE_OUTPUT_REPO` for target-bound outputs that would otherwise mutate target git state. Use the same safe-output primitive only when gh-aw natively supports that primitive against the review repository; otherwise publish a clearly labeled review bundle that identifies the target repository, intended safe-output primitive, base branch when known, and the key evidence needed for human review.

If `control_role` is `orchestrator`, filter and prioritize target repositories, then dispatch the configured worker workflows.

Use the `enabled`, `max_repos`, `safe_output_mode`, `safe_output_repo`, and `preview_only` fields from `/tmp/gh-aw/agent/control-precompute.json`; do not infer those values from workflow inputs.

For orchestrators, use the importing package's `Discovery` and `Workers` sections only for ranking, prioritization, and deciding whether a precomputed candidate is useful for this package.

- If `enabled` is not `true`, do not select repositories or dispatch workers. Call `report_incomplete` explaining that the bundle is installed but not enabled; set its rollout-mode variable to `preview`, `review`, or `live` after configuration and manual testing.

Continue with the repository targeting and workflow dispatch steps below.

1. Select target repositories:
  - use `candidate_repositories` from `/tmp/gh-aw/agent/control-precompute.json`
  - skip archived or disabled repositories and repositories where required data could not be precomputed
  - use the importing package's `Discovery` section to rank candidates
  - if `max_repos` is non-empty, select no more than that many repositories
  - do not exceed the configured `dispatch-workflow.max` limit
  - if `safe_output_mode` is `review` and `safe_output_repo` is empty, select zero repositories and call `report_incomplete` instead of dispatching

2. Compute `effective_safe_output_repo` for each target repository:
  - start with `safe_output_repo`
  - if `safe_output_mode` is not `review` and `safe_output_repo` is empty, use the selected target repository instead

3. Resolve enabled worker workflows before dispatching:
  - use `worker_workflows` from `/tmp/gh-aw/agent/control-precompute.json`
  - if a configured worker workflow has `skip_reason`, do not dispatch that worker; record that reason
  - only enabled worker workflows are eligible for dispatch

4. If no eligible target repositories are found, dispatch zero workers and report the targeting decision.

5. Dispatch each enabled worker workflow for each selected target repository with this standard input envelope:
  - `target_repo`: selected target repository
  - `safe_output_mode`: `safe_output_mode`
  - `safe_output_repo`: `effective_safe_output_repo`
  - `preview_only`: `preview_only`
  - `correlation_id`: `${{ github.run_id }}-${{ github.run_number }}`
  - `central_repo`: `${{ github.repository }}`
  - `control_plane_run_url`: `${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}`
  - `batch_label`: omitted unless a worker requires it

6. Summarize candidate count, selected target repositories, skipped repositories and reasons, `safe_output_repo`, whether review safe outputs are active, whether `preview_only` is active, configured worker workflows, skipped worker workflows and reasons, enabled worker workflows, and dispatches.