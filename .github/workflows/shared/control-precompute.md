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
  max_scan_repos:
    type: string
    default: "1000"
  allowed_owners:
    type: string
    default: ""
  dispatch_max:
    type: string
    default: "1"
  rollout_percent:
    type: string
    default: "100"
  safe_output_mode:
    type: string
    default: "staged"
  safe_output_repo:
    type: string
    default: ""
  preview_only:
    type: string
    default: "true"
  enabled:
    type: string
    default: "true"
  worker_enabled:
    type: string
    default: "true"
  worker_max_mode:
    type: string
    default: "staged"
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
  aggregate_credit_limit:
    type: string
    default: "1100"

tools:
  github:
    mode: remote
    toolsets: [repos, actions]

steps:
  - name: Precompute control facts
    env:
      GH_TOKEN: ${{ steps.github-mcp-app-token.outputs.token || secrets.GH_AW_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}
      ROLE: ${{ github.aw.import-inputs.role }}
      TARGET_REPO: ${{ github.aw.import-inputs.target_repo }}
      ORGANIZATION: ${{ github.aw.import-inputs.organization }}
      MAX_REPOS: ${{ github.aw.import-inputs.max_repos }}
      MAX_SCAN_REPOS: ${{ github.aw.import-inputs.max_scan_repos }}
      ALLOWED_OWNERS: ${{ github.aw.import-inputs.allowed_owners }}
      DISPATCH_MAX: ${{ github.aw.import-inputs.dispatch_max }}
      ROLLOUT_PERCENT: ${{ github.aw.import-inputs.rollout_percent }}
      SAFE_OUTPUT_MODE: ${{ github.aw.import-inputs.safe_output_mode }}
      SAFE_OUTPUT_REPO: ${{ github.aw.import-inputs.safe_output_repo }}
      PREVIEW_ONLY: ${{ github.aw.import-inputs.preview_only }}
      ENABLED: ${{ github.aw.import-inputs.enabled }}
      WORKER_ENABLED: ${{ github.aw.import-inputs.worker_enabled }}
      WORKER_MAX_MODE: ${{ github.aw.import-inputs.worker_max_mode }}
      CORRELATION_ID: ${{ github.aw.import-inputs.correlation_id }}
      CENTRAL_REPO: ${{ github.aw.import-inputs.central_repo }}
      CONTROL_PLANE_RUN_URL: ${{ github.aw.import-inputs.control_plane_run_url }}
      ORCHESTRATOR_CREDITS: ${{ github.aw.import-inputs.orchestrator_credits }}
      WORKER_CREDITS_PER_TARGET: ${{ github.aw.import-inputs.worker_credits_per_target }}
      AGGREGATE_CREDIT_LIMIT: ${{ github.aw.import-inputs.aggregate_credit_limit }}
    run: |
      set -euo pipefail
      mkdir -p /tmp/gh-aw/agent

      write_precompute() {
        cp /tmp/gh-aw/agent/control-precompute.json /tmp/gh-aw/agent/dispatch-precompute.json
      }

      write_worker_precompute() {
        jq -n \
          --arg enabled "$ENABLED" \
          --arg worker_enabled "$WORKER_ENABLED" \
          --arg worker_max_mode "$WORKER_MAX_MODE" \
          --arg target_repo "$TARGET_REPO" \
          --arg safe_output_mode "$SAFE_OUTPUT_MODE" \
          --arg safe_output_repo "$SAFE_OUTPUT_REPO" \
          --arg preview_only "$PREVIEW_ONLY" \
          --arg correlation_id "$CORRELATION_ID" \
          --arg central_repo "$CENTRAL_REPO" \
          --arg control_plane_run_url "$CONTROL_PLANE_RUN_URL" \
          '{
            control_role: "worker",
            enabled: $enabled,
            worker_enabled: $worker_enabled,
            worker_max_mode: $worker_max_mode,
            target_repo: $target_repo,
            safe_output_mode: $safe_output_mode,
            safe_output_repo: $safe_output_repo,
            preview_only: $preview_only,
            correlation_id: $correlation_id,
            central_repo: $central_repo,
            control_plane_run_url: $control_plane_run_url,
            candidate_repositories: [],
            worker_workflows: []
          }' > /tmp/gh-aw/agent/control-precompute.json
        write_precompute
      }

      mode_rank() {
        case "$1" in
          staged) printf '0\n' ;;
          review) printf '1\n' ;;
          live) printf '2\n' ;;
          *) echo "$2 must be staged, review, or live" >&2; exit 1 ;;
        esac
      }

      validate_worker_dispatch() {
        local requested_rank
        local maximum_rank
        local control_run_id

        case "$WORKER_ENABLED" in
          true) ;;
          false) echo "worker is disabled by its control-plane policy" >&2; exit 1 ;;
          *) echo "worker_enabled must be true or false" >&2; exit 1 ;;
        esac

        requested_rank=$(mode_rank "$SAFE_OUTPUT_MODE" "safe_output_mode")
        maximum_rank=$(mode_rank "$WORKER_MAX_MODE" "worker_max_mode")
        if [ "$requested_rank" -gt "$maximum_rank" ]; then
          echo "safe_output_mode exceeds the worker_max_mode ceiling" >&2
          exit 1
        fi

        if { [ "$SAFE_OUTPUT_MODE" = "staged" ] && [ "$PREVIEW_ONLY" != "true" ]; } || \
           { [ "$SAFE_OUTPUT_MODE" != "staged" ] && [ "$PREVIEW_ONLY" != "false" ]; }; then
          echo "preview_only is inconsistent with safe_output_mode" >&2
          exit 1
        fi
        if [ "$CENTRAL_REPO" != "$GITHUB_REPOSITORY" ]; then
          echo "central_repo must identify the current control repository" >&2
          exit 1
        fi
        if ! [[ "$CORRELATION_ID" =~ ^[0-9]+-[0-9]+$ ]]; then
          echo "correlation_id must identify an orchestrator run and attempt" >&2
          exit 1
        fi
        control_run_id="${CORRELATION_ID%%-*}"
        if [ "$CONTROL_PLANE_RUN_URL" != "${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${control_run_id}" ]; then
          echo "control_plane_run_url must match correlation_id and central_repo" >&2
          exit 1
        fi
      }

      validate_review_destination() {
        local is_private

        [ "$SAFE_OUTPUT_MODE" != "review" ] && return
        if ! is_private=$(gh api "repos/$SAFE_OUTPUT_REPO" --jq '.private'); then
          echo "review safe_output_repo must be accessible" >&2
          exit 1
        fi
        if [ "$is_private" != "true" ]; then
          echo "review safe_output_repo must be private" >&2
          exit 1
        fi
      }

      validate_repository_owner() {
        local label="$1"
        local repository="$2"
        local repository_owner
        local allowed_owner

        [ -z "$repository" ] && return
        if ! [[ "$repository" =~ ^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9._-]+$ ]]; then
          echo "$label must use owner/repository form" >&2
          exit 1
        fi

        repository_owner="${repository%%/*}"
        repository_owner=$(printf '%s' "$repository_owner" | tr '[:upper:]' '[:lower:]')
        IFS=',' read -ra configured_owners <<< "$ALLOWED_OWNERS"
        for allowed_owner in "${configured_owners[@]}"; do
          allowed_owner=$(printf '%s' "$allowed_owner" | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')
          if [ -n "$allowed_owner" ] && [ "$repository_owner" = "$allowed_owner" ]; then
            return
          fi
        done

        echo "$label owner is outside CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS" >&2
        exit 1
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
          if ! gh api "repos/$TARGET_REPO" --jq '[{full_name, archived, disabled, private, pushed_at, default_branch}]' \
            > /tmp/gh-aw/agent/candidates.json 2>/tmp/gh-aw/agent/repo-error.txt; then
            repo_error=$(cat /tmp/gh-aw/agent/repo-error.txt)
            printf '[]\n' > /tmp/gh-aw/agent/candidates.json
          fi
          return
        fi

        if ! load_bounded_inventory "orgs/$ORGANIZATION/repos" "all"; then
          if ! load_bounded_inventory "users/$ORGANIZATION/repos" "owner"; then
            repo_error=$(cat /tmp/gh-aw/agent/repo-error.txt)
            printf '[]\n' > /tmp/gh-aw/agent/candidates.json
          fi
        fi
      }

      load_bounded_inventory() {
        local endpoint="$1"
        local repository_type="$2"
        local page=1
        local pages=$(( (MAX_SCAN_REPOS + 99) / 100 ))
        local page_count

        : > /tmp/gh-aw/agent/candidate-pages.jsonl
        while [ "$page" -le "$pages" ]; do
          if ! gh api "$endpoint?per_page=100&type=$repository_type&page=$page" \
            --jq '.[] | {full_name, archived, disabled, private, pushed_at, default_branch}' \
            > /tmp/gh-aw/agent/candidate-page.jsonl 2>/tmp/gh-aw/agent/repo-error.txt; then
            return 1
          fi
          page_count=$(jq -s 'length' /tmp/gh-aw/agent/candidate-page.jsonl)
          cat /tmp/gh-aw/agent/candidate-page.jsonl >> /tmp/gh-aw/agent/candidate-pages.jsonl
          [ "$page_count" -lt 100 ] && break
          page=$((page + 1))
        done

        jq -s ".[0:$MAX_SCAN_REPOS]" /tmp/gh-aw/agent/candidate-pages.jsonl \
          > /tmp/gh-aw/agent/candidates.json
      }

      write_orchestrator_precompute() {
        local workers_json

        if ! [[ "$MAX_REPOS" =~ ^[1-9][0-9]*$ ]] || [ "$MAX_REPOS" -gt 1000 ]; then
          echo "max_repos must be an integer from 1 through 1000" >&2
          exit 1
        fi
        if ! [[ "$MAX_SCAN_REPOS" =~ ^[1-9][0-9]*$ ]] || [ "$MAX_SCAN_REPOS" -gt 100000 ]; then
          echo "max_scan_repos must be an integer from 1 through 100000" >&2
          exit 1
        fi
        if ! [[ "$DISPATCH_MAX" =~ ^[1-9][0-9]*$ ]] || [ "$DISPATCH_MAX" -gt 1000 ]; then
          echo "dispatch_max must be an integer from 1 through 1000" >&2
          exit 1
        fi
        if ! [[ "$ROLLOUT_PERCENT" =~ ^([1-9][0-9]?|100)$ ]]; then
          echo "rollout_percent must be an integer from 1 through 100" >&2
          exit 1
        fi
        if ! [[ "$ORCHESTRATOR_CREDITS" =~ ^[0-9]+$ ]] || \
           ! [[ "$WORKER_CREDITS_PER_TARGET" =~ ^[0-9]+$ ]] || \
           ! [[ "$AGGREGATE_CREDIT_LIMIT" =~ ^[1-9][0-9]*$ ]]; then
          echo "AI Credit admission values must be integers and aggregate_credit_limit must be positive" >&2
          exit 1
        fi

        load_control_source
        workers_json=$(extract_dispatch_workers)

        if [ "$(printf '%s' "$workers_json" | jq 'length')" -eq 0 ]; then
          echo "shared/control.md role orchestrator requires safe-outputs.dispatch-workflow.workflows" >&2
          exit 1
        fi

        gh api "repos/${GITHUB_REPOSITORY}/actions/workflows?per_page=100" --jq '.workflows[] | {id, name, path, state}' \
          | jq -s '.' > /tmp/gh-aw/agent/workflows.json
        load_candidate_repositories

        printf '%s\n' "$workers_json" > /tmp/gh-aw/agent/workers.json

        jq -n \
          --arg enabled "$ENABLED" \
          --arg target_repo "$TARGET_REPO" \
          --arg organization "$ORGANIZATION" \
          --arg max_repos "$MAX_REPOS" \
          --arg max_scan_repos "$MAX_SCAN_REPOS" \
          --arg dispatch_max "$DISPATCH_MAX" \
          --arg rollout_percent "$ROLLOUT_PERCENT" \
          --arg safe_output_mode "$SAFE_OUTPUT_MODE" \
          --arg safe_output_repo "$SAFE_OUTPUT_REPO" \
          --arg preview_only "$PREVIEW_ONLY" \
          --arg orchestrator_credits "$ORCHESTRATOR_CREDITS" \
          --arg worker_credits_per_target "$WORKER_CREDITS_PER_TARGET" \
          --arg aggregate_credit_limit "$AGGREGATE_CREDIT_LIMIT" \
          --arg repo_source "$repo_source" \
          --arg repo_error "$repo_error" \
          --slurpfile workers /tmp/gh-aw/agent/workers.json \
          --slurpfile workflows /tmp/gh-aw/agent/workflows.json \
          --slurpfile candidates /tmp/gh-aw/agent/candidates.json '
            def worker_match($worker):
              $workflows[0]
              | map(select(.path == (".github/workflows/" + $worker + ".lock.yml")))
              | .[0];

            {
              control_role: "orchestrator",
              enabled: $enabled,
              target_repo: $target_repo,
              organization: $organization,
              max_repos: $max_repos,
              max_scan_repos: $max_scan_repos,
              dispatch_max: $dispatch_max,
              rollout_percent: $rollout_percent,
              effective_max_repos: (
                (if ($candidates[0] | length) == 0 then 0
                 else [1, (($candidates[0] | length) * ($rollout_percent | tonumber) / 100 | ceil)] | max
                 end) as $percent_cap
                | (if ($worker_credits_per_target | tonumber) == 0 then ($max_repos | tonumber)
                   elif ($aggregate_credit_limit | tonumber) <= ($orchestrator_credits | tonumber) then 0
                   else ((($aggregate_credit_limit | tonumber) - ($orchestrator_credits | tonumber)) / ($worker_credits_per_target | tonumber) | floor)
                   end) as $credit_cap
                | [($max_repos | tonumber), $percent_cap, $credit_cap] | min
              ),
              orchestrator_credits: ($orchestrator_credits | tonumber),
              worker_credits_per_target: ($worker_credits_per_target | tonumber),
              aggregate_credit_limit: ($aggregate_credit_limit | tonumber),
              safe_output_mode: $safe_output_mode,
              safe_output_repo: $safe_output_repo,
              preview_only: $preview_only,
              repo_source: $repo_source,
              repo_error: $repo_error,
              total_repositories_scanned: ($candidates[0] | length),
              candidate_repositories: $candidates[0],
              worker_workflows: [
                $workers[0][] as $worker
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
            | . as $result
            | ($result.worker_workflows | map(select(.eligible)) | length) as $eligible_workers
            | $result
            | .effective_max_repos = (
                if $eligible_workers == 0 then 0
                else [.effective_max_repos, (($dispatch_max | tonumber) / $eligible_workers | floor)] | min
                end
              )
          ' > /tmp/gh-aw/agent/control-precompute.json
        write_precompute
      }

      validate_repository_owner "target_repo" "$TARGET_REPO"
      validate_repository_owner "safe_output_repo" "$SAFE_OUTPUT_REPO"
      validate_review_destination

      if [ "$ROLE" = "worker" ]; then
        validate_worker_dispatch
        write_worker_precompute
        exit 0
      fi

      write_orchestrator_precompute
---

Read `/tmp/gh-aw/agent/control-precompute.json` before making control decisions. Treat it as authoritative for `control_role`, enablement state, target repository inputs, safe-output routing, and worker workflow availability. `/tmp/gh-aw/agent/dispatch-precompute.json` is also written for compatibility with existing dispatch-oriented instructions.