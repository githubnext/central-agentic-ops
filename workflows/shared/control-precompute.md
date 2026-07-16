---
import-schema:
  role:
    type: choice
    options: [orchestrator, worker]
    required: true
  target_repo:
    type: string
    default: ""
  organization:
    type: string
    required: true
  max_repos:
    type: string
    default: ""
  safe_output_mode:
    type: string
    default: "preview"
  safe_output_repo:
    type: string
    default: ""
  preview_only:
    type: string
    default: "true"
  enabled:
    type: string
    default: "true"

tools:
  github:
    mode: remote
    github-app:
      client-id: ${{ vars.GH_AW_GITHUB_APP_ID }}
      private-key: ${{ secrets.GH_AW_GITHUB_APP_PRIVATE_KEY }}
      repositories: ["*"]
    toolsets: [repos, actions]

steps:
  - name: Mint GitHub App token for control-plane reads
    id: github_app_token
    uses: actions/create-github-app-token@v3.2.0
    with:
      client-id: ${{ vars.GH_AW_GITHUB_APP_ID }}
      private-key: ${{ secrets.GH_AW_GITHUB_APP_PRIVATE_KEY }}
      owner: ${{ github.aw.import-inputs.organization }}
      permission-actions: read
      permission-contents: read
  - name: Precompute control facts
    env:
      GH_TOKEN: ${{ steps.github_app_token.outputs.token }}
      ROLE: ${{ github.aw.import-inputs.role }}
      TARGET_REPO: ${{ github.aw.import-inputs.target_repo }}
      ORGANIZATION: ${{ github.aw.import-inputs.organization }}
      MAX_REPOS: ${{ github.aw.import-inputs.max_repos }}
      SAFE_OUTPUT_MODE: ${{ github.aw.import-inputs.safe_output_mode }}
      SAFE_OUTPUT_REPO: ${{ github.aw.import-inputs.safe_output_repo }}
      PREVIEW_ONLY: ${{ github.aw.import-inputs.preview_only }}
      ENABLED: ${{ github.aw.import-inputs.enabled }}
    run: |
      set -euo pipefail
      mkdir -p /tmp/gh-aw/agent

      write_precompute() {
        cp /tmp/gh-aw/agent/control-precompute.json /tmp/gh-aw/agent/dispatch-precompute.json
      }

      write_worker_precompute() {
        jq -n \
          --arg enabled "$ENABLED" \
          --arg target_repo "$TARGET_REPO" \
          --arg safe_output_mode "$SAFE_OUTPUT_MODE" \
          --arg safe_output_repo "$SAFE_OUTPUT_REPO" \
          --arg preview_only "$PREVIEW_ONLY" \
          '{
            control_role: "worker",
            enabled: $enabled,
            target_repo: $target_repo,
            safe_output_mode: $safe_output_mode,
            safe_output_repo: $safe_output_repo,
            preview_only: $preview_only,
            candidate_repositories: [],
            worker_workflows: []
          }' > /tmp/gh-aw/agent/control-precompute.json
        write_precompute
      }

      derive_control_source_path() {
        workflow_ref_path="${GITHUB_WORKFLOW_REF#${GITHUB_REPOSITORY}/}"
        workflow_path="${workflow_ref_path%@*}"
        workflow_ref="${GITHUB_WORKFLOW_REF##*@}"
        source_path="${workflow_path%.lock.yml}.md"

        if [ "$source_path" = "$workflow_path" ]; then
          source_path="${workflow_path%.yml}.md"
        fi
      }

      load_control_source() {
        derive_control_source_path
        gh api --method GET "repos/${GITHUB_REPOSITORY}/contents/${source_path}" -f ref="$workflow_ref" --jq '.content' \
          | base64 -d > /tmp/gh-aw/agent/control-source.md
      }

      extract_dispatch_workers() {
        awk '
          NR == 1 && /^---[[:space:]]*$/ { in_frontmatter = 1; next }
          in_frontmatter && /^---[[:space:]]*$/ { exit }
          !in_frontmatter { next }
          /^safe-outputs:/ { in_safe = 1; next }
          in_safe && /^[^[:space:]]/ { in_safe = 0 }
          in_safe && /^  dispatch-workflow:/ { in_dispatch = 1; next }
          in_dispatch && /^  [^[:space:]]/ { in_dispatch = 0; in_workflows = 0 }
          in_dispatch && /^    workflows:[[:space:]]*\[/ {
            line = $0
            sub(/^    workflows:[[:space:]]*\[/, "", line)
            sub(/\][[:space:]]*$/, "", line)
            gsub(/,/, "\n", line)
            print line
            next
          }
          in_dispatch && /^    workflows:[[:space:]]*$/ { in_workflows = 1; next }
          in_workflows && /^      - / { sub(/^      - /, ""); print; next }
          in_workflows && $0 !~ /^      - / { in_workflows = 0 }
        ' /tmp/gh-aw/agent/control-source.md \
          | jq -R -s 'split("\n") | map(gsub("^\\s+|\\s+$"; "") | gsub("^\\\"|\\\"$"; "") | select(length > 0))'
      }

      load_candidate_repositories() {
        repo_source="organization"
        repo_error=""

        if [ -n "$TARGET_REPO" ]; then
          repo_source="target_repo"
          if ! candidates_json=$(gh api "repos/$TARGET_REPO" --jq '[{full_name, archived, disabled, private, pushed_at, default_branch}]' 2>/tmp/gh-aw/agent/repo-error.txt); then
            repo_error=$(cat /tmp/gh-aw/agent/repo-error.txt)
            candidates_json='[]'
          fi
          return
        fi

        if ! candidates_json=$(gh api "orgs/$ORGANIZATION/repos?per_page=100&type=all" --paginate --jq '.[] | {full_name, archived, disabled, private, pushed_at, default_branch}' | jq -s '.' 2>/tmp/gh-aw/agent/repo-error.txt); then
          if ! candidates_json=$(gh api "users/$ORGANIZATION/repos?per_page=100&type=owner" --paginate --jq '.[] | {full_name, archived, disabled, private, pushed_at, default_branch}' | jq -s '.' 2>/tmp/gh-aw/agent/repo-error.txt); then
            repo_error=$(cat /tmp/gh-aw/agent/repo-error.txt)
            candidates_json='[]'
          fi
        fi
      }

      write_orchestrator_precompute() {
        local workers_json workflows_json

        load_control_source
        workers_json=$(extract_dispatch_workers)

        if [ "$(printf '%s' "$workers_json" | jq 'length')" -eq 0 ]; then
          echo "shared/control.md role orchestrator requires safe-outputs.dispatch-workflow.workflows" >&2
          exit 1
        fi

        workflows_json=$(gh api "repos/${GITHUB_REPOSITORY}/actions/workflows" --paginate --jq '.workflows[] | {id, name, path, state}' | jq -s '.')
        load_candidate_repositories

        jq -n \
          --arg enabled "$ENABLED" \
          --arg target_repo "$TARGET_REPO" \
          --arg organization "$ORGANIZATION" \
          --arg max_repos "$MAX_REPOS" \
          --arg safe_output_mode "$SAFE_OUTPUT_MODE" \
          --arg safe_output_repo "$SAFE_OUTPUT_REPO" \
          --arg preview_only "$PREVIEW_ONLY" \
          --arg repo_source "$repo_source" \
          --arg repo_error "$repo_error" \
          --argjson workers "$workers_json" \
          --argjson workflows "$workflows_json" \
          --argjson candidates "$candidates_json" '
            def worker_match($worker):
              $workflows
              | map(select(
                  .path == (".github/workflows/" + $worker + ".lock.yml")
                  or .name == $worker
                  or .name == ($worker | gsub("-"; " "))
                ))
              | .[0];

            {
              control_role: "orchestrator",
              enabled: $enabled,
              target_repo: $target_repo,
              organization: $organization,
              max_repos: $max_repos,
              safe_output_mode: $safe_output_mode,
              safe_output_repo: $safe_output_repo,
              preview_only: $preview_only,
              repo_source: $repo_source,
              repo_error: $repo_error,
              candidate_repositories: $candidates,
              worker_workflows: [
                $workers[] as $worker
                | (worker_match($worker)) as $match
                | {
                    configured: $worker,
                    matched: ($match != null),
                    id: $match.id,
                    name: $match.name,
                    path: $match.path,
                    state: ($match.state // ""),
                    eligible: (($match != null) and (($match.state // "") | startswith("disabled") | not)),
                    skip_reason: (
                      if $match == null then "worker workflow unavailable"
                      elif (($match.state // "") | startswith("disabled")) then "worker workflow disabled"
                      else null
                      end
                    )
                  }
              ]
            }
          ' > /tmp/gh-aw/agent/control-precompute.json
        write_precompute
      }

      if [ "$ROLE" = "worker" ]; then
        write_worker_precompute
        exit 0
      fi

      write_orchestrator_precompute
---

Read `/tmp/gh-aw/agent/control-precompute.json` before making control decisions. Treat it as authoritative for `control_role`, enablement state, target repository inputs, safe-output routing, and worker workflow availability. `/tmp/gh-aw/agent/dispatch-precompute.json` is also written for compatibility with existing dispatch-oriented instructions.