---
import-schema:
  package:
    type: string
    required: true
  role:
    type: choice
    options: [orchestrator, worker]
    required: true
  worker:
    type: string
    default: ""
  target_repo:
    type: string
    default: ""
  requested_mode:
    type: string
    default: ""
  requested_max_repos:
    type: string
    default: ""
  requested_rollout_percent:
    type: string
    default: ""
  dispatch_max:
    type: string
    default: "1"
  safe_output_repo:
    type: string
    default: ""
  correlation_id:
    type: string
    default: ""
  central_repo:
    type: string
    default: ""
  control_plane_run_url:
    type: string
    default: ""
  orchestrator_credits:
    type: string
    default: "0"
  worker_credits_per_target:
    type: string
    default: "0"

tools:
  github:
    mode: remote
    toolsets: [repos, actions]

jobs:
  pre-activation:
    pre-steps:
      - name: Evaluate Central Agentic Ops admission
        id: cao_admission
        env:
          GH_TOKEN: ${{ github.token }}
          WORKFLOW_SHA: ${{ github.workflow_sha }}
          CAO_PACKAGE: ${{ github.aw.import-inputs.package }}
          CAO_ROLE: ${{ github.aw.import-inputs.role }}
          CAO_WORKER: ${{ github.aw.import-inputs.worker }}
          TARGET_REPO: ${{ github.aw.import-inputs.target_repo }}
          REQUESTED_MODE: ${{ github.aw.import-inputs.requested_mode }}
          REQUESTED_MAX_REPOS: ${{ github.aw.import-inputs.requested_max_repos }}
          REQUESTED_ROLLOUT_PERCENT: ${{ github.aw.import-inputs.requested_rollout_percent }}
        run: |
          set -uo pipefail
          if ! gh api --method GET "repos/${GITHUB_REPOSITORY}/contents/.github/cao/admit.sh" \
            -f ref="$WORKFLOW_SHA" --jq '.content' | base64 -d | bash; then
            reason="cannot read or execute the control policy admission helper at github.workflow_sha"
            echo "authorized=false" >> "$GITHUB_OUTPUT"
            echo "reason=$reason" >> "$GITHUB_OUTPUT"
            printf '## Central Agentic Ops admission\n\nSkipped: %s\n' "$reason" >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: Fetch CAO precompute helper
        if: ${{ steps.cao_admission.outputs.authorized == 'true' }}
        env:
          GH_TOKEN: ${{ github.token }}
          WORKFLOW_SHA: ${{ github.workflow_sha }}
        run: |
          set -euo pipefail
          cao_dir="${RUNNER_TEMP:-/tmp}/cao"
          mkdir -p "$cao_dir"
          gh api --method GET "repos/${GITHUB_REPOSITORY}/contents/.github/cao/precompute.sh" \
            -f ref="$WORKFLOW_SHA" --jq '.content' | base64 -d > "$cao_dir/precompute.sh"
          chmod +x "$cao_dir/precompute.sh"

      - name: Install gh-aw CLI when monthly budget is enabled
        if: ${{ steps.cao_admission.outputs.authorized == 'true' && steps.cao_admission.outputs.monthly_credit_budget != '0' }}
        uses: github/gh-aw-actions/setup-cli@v0.88.0
        with:
          version: v0.88.0

      - name: Run CAO control precompute
        if: ${{ steps.cao_admission.outputs.authorized == 'true' }}
        env:
          GH_TOKEN: ${{ secrets.GH_AW_GITHUB_TOKEN || github.token }}
          WORKFLOW_SHA: ${{ github.workflow_sha }}
          BUNDLE: ${{ github.aw.import-inputs.package }}
          ROLE: ${{ github.aw.import-inputs.role }}
          WORKER: ${{ github.aw.import-inputs.worker }}
          TARGET_REPO: ${{ github.aw.import-inputs.target_repo }}
          DISPATCH_MAX: ${{ github.aw.import-inputs.dispatch_max }}
          SAFE_OUTPUT_REPO: ${{ github.aw.import-inputs.safe_output_repo }}
          CORRELATION_ID: ${{ github.aw.import-inputs.correlation_id }}
          CENTRAL_REPO: ${{ github.aw.import-inputs.central_repo }}
          CONTROL_PLANE_RUN_URL: ${{ github.aw.import-inputs.control_plane_run_url }}
          ORCHESTRATOR_CREDITS: ${{ github.aw.import-inputs.orchestrator_credits }}
          WORKER_CREDITS_PER_TARGET: ${{ github.aw.import-inputs.worker_credits_per_target }}
        run: |
          set -euo pipefail
          "${RUNNER_TEMP:-/tmp}/cao/precompute.sh"

      - name: Upload CAO control precompute artifact
        if: ${{ steps.cao_admission.outputs.authorized == 'true' }}
        uses: actions/upload-artifact@v7.0.1
        with:
          name: cao-control-precompute
          path: /tmp/gh-aw/agent/control-precompute.json
          if-no-files-found: error
          retention-days: 1

  agent:
    pre-steps:
      - name: Download CAO control precompute artifact
        uses: actions/download-artifact@v8.0.1
        with:
          name: cao-control-precompute
          path: /tmp/gh-aw/agent

      - name: Validate CAO control precompute artifact
        env:
          WORKFLOW_SHA: ${{ github.workflow_sha }}
          CONTROL_REPOSITORY: ${{ github.repository }}
          BUNDLE: ${{ github.aw.import-inputs.package }}
          ROLE: ${{ github.aw.import-inputs.role }}
          WORKER: ${{ github.aw.import-inputs.worker }}
        run: |
          set -euo pipefail
          out=/tmp/gh-aw/agent/control-precompute.json
          expected_worker="$WORKER"
          [ "$ROLE" != "orchestrator" ] || expected_worker=""
          [ -f "$out" ]
          jq -e '.authorized == true' "$out" >/dev/null
          jq -e --arg package "$BUNDLE" '.package == $package and .bundle == $package' "$out" >/dev/null
          jq -e --arg role "$ROLE" '.control_role == $role' "$out" >/dev/null
          jq -e --arg worker "$expected_worker" '.worker == $worker' "$out" >/dev/null
          jq -e --arg repository "$CONTROL_REPOSITORY" --arg sha "$WORKFLOW_SHA" \
            '.policy_source == {repository:$repository,path:".github/central-agentic-ops.json",sha:$sha}' \
            "$out" >/dev/null
---

Read `/tmp/gh-aw/agent/control-precompute.json` before making control decisions. Treat it as authoritative for `control_role`, enablement state, target repository inputs, safe-output routing, and worker workflow availability.
