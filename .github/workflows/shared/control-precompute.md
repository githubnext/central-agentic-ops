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

resources:
  - ../../scripts/control-policy/resolve.mjs

tools:
  github:
    mode: remote
    toolsets: [repos, actions]

steps:
  - name: Resolve authoritative control policy
    env:
      GH_TOKEN: ${{ steps.github-mcp-app-token.outputs.token || secrets.GH_AW_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}
      WORKFLOW_SHA: ${{ github.workflow_sha }}
      BUNDLE: ${{ github.aw.import-inputs.package }}
      ROLE: ${{ github.aw.import-inputs.role }}
      WORKER: ${{ github.aw.import-inputs.worker }}
      REQUESTED_MODE: ${{ github.aw.import-inputs.requested_mode }}
      REQUESTED_MAX_REPOS: ${{ github.aw.import-inputs.requested_max_repos }}
      REQUESTED_ROLLOUT_PERCENT: ${{ github.aw.import-inputs.requested_rollout_percent }}
    run: |
      set -euo pipefail
      [ "$ROLE" != "orchestrator" ] || WORKER=""
      mkdir -p /tmp/gh-aw/agent
      out=/tmp/gh-aw/agent/control-precompute.json
      policy_file=/tmp/gh-aw/agent/central-agentic-ops.json
      effective_file=/tmp/gh-aw/agent/effective-policy.json
      resolver=.github/aw/control-policy/resolve.mjs

      if ! [[ "$WORKFLOW_SHA" =~ ^[0-9a-fA-F]{40,64}$ ]]; then
        echo "github.workflow_sha must be an exact commit SHA" >&2
        exit 1
      fi
      if ! gh api --method GET "repos/${GITHUB_REPOSITORY}/contents/.github/central-agentic-ops.json" \
        -f ref="$WORKFLOW_SHA" --jq '.content' | base64 -d > "$policy_file"; then
        echo "cannot read .github/central-agentic-ops.json at github.workflow_sha" >&2
        exit 1
      fi
      if ! CAO_PACKAGE="$BUNDLE" \
        CAO_ROLE="$ROLE" \
        CAO_WORKER="$WORKER" \
        CAO_REQUESTED_MODE="$REQUESTED_MODE" \
        CAO_REQUESTED_MAX_REPOSITORIES="$REQUESTED_MAX_REPOS" \
        CAO_REQUESTED_ROLLOUT_PERCENT="$REQUESTED_ROLLOUT_PERCENT" \
        GITHUB_REPOSITORY="$GITHUB_REPOSITORY" \
        node "$resolver" --effective "$policy_file" > "$effective_file"; then
        echo "control policy validation failed" >&2
        exit 1
      fi

      if [ "$(jq -r '.authorized' "$effective_file")" != "true" ]; then
        reason=$(jq -r '.reason' "$effective_file")
        jq -n \
          --arg role "$ROLE" --arg package "$BUNDLE" --arg worker "$WORKER" \
          --arg reason "$reason" --arg repository "$GITHUB_REPOSITORY" --arg sha "$WORKFLOW_SHA" \
          '{authorized:false,$reason,control_role:$role,$package,$worker,enabled:"false",effective_max_repos:0,
            repo_error:"",candidate_repositories:[],worker_workflows:[],
            policy_source:{repository:$repository,path:".github/central-agentic-ops.json",sha:$sha}}' > "$out"
        if [ -n "${GH_AW_SAFE_OUTPUTS:-}" ]; then
          jq -cn --arg message "Central Agentic Ops policy denied this run: $reason" \
            '{type:"noop",message:$message}' >> "$GH_AW_SAFE_OUTPUTS"
        fi
        echo "CAO_POLICY_AUTHORIZED=false" >> "$GITHUB_ENV"
        exit 0
      fi

      {
        echo "CAO_POLICY_AUTHORIZED=true"
        echo "ENABLED=true"
        echo "WORKER_ENABLED=true"
        echo "WORKER_MAX_MODE=$(jq -r '.safe_output_mode' "$effective_file")"
        echo "SAFE_OUTPUT_MODE=$(jq -r '.safe_output_mode' "$effective_file")"
        echo "MAX_REPOS=$(jq -r '.max_repositories' "$effective_file")"
        echo "ROLLOUT_PERCENT=$(jq -r '.rollout_percent' "$effective_file")"
        echo "MONTHLY_CREDIT_BUDGET=$(jq -r '.monthly_ai_credit_budget' "$effective_file")"
        echo "MAX_SCAN_REPOS=$(jq -r '.inventory["max-scan-repositories"]' "$effective_file")"
        echo "CELL_COUNT=$(jq -r '.inventory["cell-count"]' "$effective_file")"
        echo "CELL_INDEX=$(jq -r '.inventory["cell-index"]' "$effective_file")"
        echo "BATCH_SIZE=$(jq -r '.inventory["batch-size"]' "$effective_file")"
        echo "BATCH_INDEX=$(jq -r '.inventory["batch-index"]' "$effective_file")"
        echo "ALLOWED_OWNERS=$(jq -r '.allowed_owners | join(",")' "$effective_file")"
        echo "ALLOWED_REPOS=$(jq -r '.allowed_repositories | join(",")' "$effective_file")"
        echo "ORGANIZATION=${GITHUB_REPOSITORY%%/*}"
      } >> "$GITHUB_ENV"

  - name: Precompute control facts
    env:
      GH_TOKEN: ${{ steps.github-mcp-app-token.outputs.token || secrets.GH_AW_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}
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
      [ "${CAO_POLICY_AUTHORIZED:-false}" = "true" ] || exit 0
      [ "$ROLE" != "orchestrator" ] || WORKER=""
      mkdir -p /tmp/gh-aw/agent
      OUT=/tmp/gh-aw/agent/control-precompute.json
      RESOLVER=.github/aw/control-policy/resolve.mjs

      write_worker_precompute() {
        jq -n \
          --arg enabled "$ENABLED" \
          --arg bundle "$BUNDLE" \
          --arg worker_enabled "$WORKER_ENABLED" \
          --arg worker_max_mode "$WORKER_MAX_MODE" \
          --arg target_repo "$TARGET_REPO" \
          --arg safe_output_mode "$SAFE_OUTPUT_MODE" \
          --arg safe_output_repo "$SAFE_OUTPUT_REPO" \
          --arg correlation_id "$CORRELATION_ID" \
          --arg central_repo "$CENTRAL_REPO" \
          --arg control_plane_run_url "$CONTROL_PLANE_RUN_URL" \
          --arg worker "$WORKER" \
          --arg repository "$GITHUB_REPOSITORY" \
          --arg workflow_sha "$WORKFLOW_SHA" \
          --arg target_authority_sha "${TARGET_AUTHORITY_SHA:-}" \
          '{authorized:true,reason:"authorized",control_role:"worker",package:$bundle,$bundle,$worker,$enabled,$worker_enabled,$worker_max_mode,
            $target_repo,$safe_output_mode,$safe_output_repo,
            $correlation_id,$central_repo,$control_plane_run_url,
            candidate_repositories:[],worker_workflows:[],
            policy_source:{repository:$repository,path:".github/central-agentic-ops.json",sha:$workflow_sha}}
            + (if $target_authority_sha == "" then {} else {
                target_authority_source:{repository:$target_repo,path:".github/central-agentic-ops.json",sha:$target_authority_sha}
              } end)' > "$OUT"
      }

      mode_rank() {
        case "$1" in
          review) printf '0\n' ;;
          live) printf '1\n' ;;
          *) echo "$2 must be review or live" >&2; exit 1 ;;
        esac
      }

      repository_equal() {
        awk 'BEGIN { exit(tolower(ARGV[1]) != tolower(ARGV[2])) }' "$1" "$2"
      }

      validate_worker_dispatch() {
        local requested_rank
        local maximum_rank
        local control_run_id

          if [ -z "$TARGET_REPO" ]; then
            echo "worker target_repo is required" >&2
            exit 1
          fi
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

        if [ "$CENTRAL_REPO" != "$GITHUB_REPOSITORY" ]; then
          echo "central_repo must identify the current control repository" >&2
          exit 1
        fi
        if ! [[ "$CORRELATION_ID" =~ ^[1-9][0-9]*-[1-9][0-9]*$ ]]; then
          echo "correlation_id must identify an orchestrator run and attempt" >&2
          exit 1
        fi
        control_run_id="${CORRELATION_ID%%-*}"
        if [ "$CONTROL_PLANE_RUN_URL" != "${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${control_run_id}" ]; then
          echo "control_plane_run_url must match correlation_id and central_repo" >&2
          exit 1
        fi
      }

      validate_live_authority() {
        local authority
        local default_branch
        local target_sha

        [ "$SAFE_OUTPUT_MODE" != "live" ] && return
        if ! [[ "$BUNDLE" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
          echo "package slug must use lowercase characters for live authority validation" >&2
          exit 1
        fi
        if ! default_branch=$(gh api "repos/$TARGET_REPO" --jq '.default_branch'); then
          echo "live authority validation could not read the target default branch" >&2
          exit 1
        fi
        if ! target_sha=$(gh api "repos/$TARGET_REPO/commits/$default_branch" --jq '.sha'); then
          echo "live authority validation could not resolve the target default branch commit" >&2
          exit 1
        fi
        if ! [[ "$target_sha" =~ ^[0-9a-fA-F]{40,64}$ ]]; then
          echo "target default branch did not resolve to an exact commit SHA" >&2
          exit 1
        fi
        if ! gh api --method GET "repos/$TARGET_REPO/contents/.github/central-agentic-ops.json" \
          -f ref="$target_sha" --jq '.content' | base64 -d \
          > /tmp/gh-aw/agent/target-authority.json; then
          echo "live mode requires .github/central-agentic-ops.json on the target default branch" >&2
          exit 1
        fi
        if ! authority=$(node "$RESOLVER" --authority /tmp/gh-aw/agent/target-authority.json "$BUNDLE"); then
          echo "target authority file must declare version 1 and target-authority.packages.$BUNDLE.authority" >&2
          exit 1
        fi
        if ! [[ "$authority" =~ ^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9._-]+$ ]]; then
          echo "target-authority.packages.$BUNDLE.authority must use owner/repository form" >&2
          exit 1
        fi
        if ! repository_equal "$authority" "$CENTRAL_REPO"; then
          echo "target assigns live authority for $BUNDLE to a different control repository" >&2
          exit 1
        fi

        TARGET_AUTHORITY_SHA="$target_sha"
      }

      validate_output_destination() {
        local is_private

        if [ "$SAFE_OUTPUT_MODE" = "live" ]; then
          [ "$ROLE" != "worker" ] || repository_equal "$SAFE_OUTPUT_REPO" "$TARGET_REPO" || {
            echo "live worker safe_output_repo must equal target_repo" >&2; exit 1;
          }
          return
        fi
        if repository_equal "$SAFE_OUTPUT_REPO" "$TARGET_REPO" && \
          ! repository_equal "$SAFE_OUTPUT_REPO" "$CENTRAL_REPO"; then
          echo "review safe_output_repo must differ from target_repo" >&2; exit 1;
        fi
        if ! is_private=$(gh api "repos/$SAFE_OUTPUT_REPO" --jq '.private'); then
          echo "review safe_output_repo must be accessible" >&2
          exit 1
        fi
        if [ "$is_private" != "true" ] && ! repository_equal "$SAFE_OUTPUT_REPO" "$CENTRAL_REPO"; then
          echo "non-central review safe_output_repo must be private" >&2
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

        echo "$label owner is outside control-plane.scope.allowed-owners" >&2
        exit 1
      }

      prepare_allowlist() {
        local allowed_repo

        : > /tmp/gh-aw/agent/allowed-repos
        [ -z "$ALLOWED_REPOS" ] && return

        if ! printf '%s' "$ALLOWED_REPOS" | jq -Rr \
          'split(",") | map(gsub("\\s"; "") | ascii_downcase) | unique[]' \
          > /tmp/gh-aw/agent/allowed-repos || grep -qx '' /tmp/gh-aw/agent/allowed-repos; then
          echo "control-plane.scope.allowed-repositories is invalid" >&2
          exit 1
        fi
        while read -r allowed_repo; do
          validate_repository_owner "allowed repository" "$allowed_repo"
        done < /tmp/gh-aw/agent/allowed-repos
        if [ "$(wc -l < /tmp/gh-aw/agent/allowed-repos)" -gt "$MAX_SCAN_REPOS" ]; then
          echo "allowed repos exceed max_scan_repos" >&2
          exit 1
        fi
        if [ -n "$TARGET_REPO" ] && ! grep -Fqix "$TARGET_REPO" /tmp/gh-aw/agent/allowed-repos; then
          echo "target_repo is not allowed" >&2
          exit 1
        fi
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
          if ! gh api "repos/$TARGET_REPO" --jq '[{id, full_name, archived, disabled, private, pushed_at, default_branch}]' \
            > /tmp/gh-aw/agent/candidates.json 2>/tmp/gh-aw/agent/repo-error.txt; then
            repo_error=$(cat /tmp/gh-aw/agent/repo-error.txt)
            printf '[]\n' > /tmp/gh-aw/agent/candidates.json
          fi
          return
        fi

        if [ -n "$ALLOWED_REPOS" ]; then
          repo_source="allowed_repos"
          load_allowed_inventory
          return
        fi

        if ! load_bounded_inventory "orgs/$ORGANIZATION/repos" "all"; then
          if ! load_bounded_inventory "users/$ORGANIZATION/repos" "owner"; then
            repo_error=$(cat /tmp/gh-aw/agent/repo-error.txt)
            printf '[]\n' > /tmp/gh-aw/agent/candidates.json
          fi
        fi
      }

      load_allowed_inventory() {
        local allowed_repo

        printf '[]\n' > /tmp/gh-aw/agent/candidates.json
        : > /tmp/gh-aw/agent/candidate-pages.jsonl
        while read -r allowed_repo; do
          if ! gh api "repos/$allowed_repo" \
            --jq '{id, full_name, archived, disabled, private, pushed_at, default_branch}' \
            >> /tmp/gh-aw/agent/candidate-pages.jsonl 2>/tmp/gh-aw/agent/repo-error.txt; then
            repo_error="cannot read allowed repository $allowed_repo"
            printf '[]\n' > /tmp/gh-aw/agent/candidates.json
            return
          fi
        done < /tmp/gh-aw/agent/allowed-repos

        jq -s '.' /tmp/gh-aw/agent/candidate-pages.jsonl \
          > /tmp/gh-aw/agent/candidates.json
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
            --jq '.[] | {id, full_name, archived, disabled, private, pushed_at, default_branch}' \
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

      prepare_inventory_batch() {
        local inventory_digest
        local inventory_count
        local cell_repository_count
        local batch_count
        local batch_offset

        if ! jq -e 'all(.[]; (.id | type) == "number" and (.full_name | type) == "string")' \
          /tmp/gh-aw/agent/candidates.json >/dev/null; then
          echo "repository inventory entries require numeric id and full_name" >&2
          exit 1
        fi

        inventory_digest=$(jq -cS 'sort_by([.id, .full_name])[]' /tmp/gh-aw/agent/candidates.json \
          | openssl dgst -sha256 | awk '{print $NF}')
        inventory_version="sha256:$inventory_digest"
        inventory_count=$(jq 'length' /tmp/gh-aw/agent/candidates.json)

        if [ -n "$TARGET_REPO" ]; then
          jq 'sort_by([.id, .full_name])' /tmp/gh-aw/agent/candidates.json \
            > /tmp/gh-aw/agent/cell-candidates.json
        else
          jq --argjson cell_count "$CELL_COUNT" --argjson cell_index "$CELL_INDEX" \
            '[.[] | select((.id % $cell_count) == $cell_index)] | sort_by([.id, .full_name])' \
            /tmp/gh-aw/agent/candidates.json > /tmp/gh-aw/agent/cell-candidates.json
        fi

        cell_repository_count=$(jq 'length' /tmp/gh-aw/agent/cell-candidates.json)
        batch_count=$(( (cell_repository_count + BATCH_SIZE - 1) / BATCH_SIZE ))
        if [ "$batch_count" -gt 0 ] && [ "$BATCH_INDEX" -ge "$batch_count" ]; then
          echo "batch_index must be smaller than the selected cell batch count ($batch_count)" >&2
          exit 1
        fi

        batch_offset=$(( BATCH_INDEX * BATCH_SIZE ))
        jq ".[${batch_offset}:$((batch_offset + BATCH_SIZE))]" \
          /tmp/gh-aw/agent/cell-candidates.json > /tmp/gh-aw/agent/current-batch.json
        batch_id="${inventory_version}:cell-${CELL_INDEX}-of-${CELL_COUNT}:batch-${BATCH_INDEX}-of-${batch_count}"

        jq -n \
          --arg inventory_version "$inventory_version" \
          --arg batch_id "$batch_id" \
          --argjson inventory_repository_count "$inventory_count" \
          --argjson cell_count "$CELL_COUNT" \
          --argjson cell_index "$CELL_INDEX" \
          --argjson cell_repository_count "$cell_repository_count" \
          --argjson batch_size "$BATCH_SIZE" \
          --argjson batch_index "$BATCH_INDEX" \
          --argjson batch_count "$batch_count" \
          '{
            inventory_version: $inventory_version,
            inventory_repository_count: $inventory_repository_count,
            cell_count: $cell_count,
            cell_index: $cell_index,
            cell_repository_count: $cell_repository_count,
            batch_size: $batch_size,
            batch_index: $batch_index,
            batch_count: $batch_count,
            batch_id: $batch_id
          }' > /tmp/gh-aw/agent/inventory-metadata.json
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
        if ! [[ "$CELL_COUNT" =~ ^[1-9][0-9]*$ ]] || [ "$CELL_COUNT" -gt 1000 ]; then
          echo "cell_count must be an integer from 1 through 1000" >&2
          exit 1
        fi
        if ! [[ "$CELL_INDEX" =~ ^[0-9]+$ ]] || [ "$CELL_INDEX" -ge "$CELL_COUNT" ]; then
          echo "cell_index must be an integer from 0 through cell_count minus 1" >&2
          exit 1
        fi
        if ! [[ "$BATCH_SIZE" =~ ^[1-9][0-9]*$ ]] || [ "$BATCH_SIZE" -gt 100000 ]; then
          echo "batch_size must be an integer from 1 through 100000" >&2
          exit 1
        fi
        if ! [[ "$BATCH_INDEX" =~ ^[0-9]+$ ]]; then
          echo "batch_index must be a non-negative integer" >&2
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
            ! [[ "$WORKER_CREDITS_PER_TARGET" =~ ^[0-9]+$ ]]; then
           echo "AI Credit admission values must be non-negative integers" >&2
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
        prepare_inventory_batch

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
          --arg orchestrator_credits "$ORCHESTRATOR_CREDITS" \
          --arg worker_credits_per_target "$WORKER_CREDITS_PER_TARGET" \
          --arg monthly_credit_budget "$MONTHLY_CREDIT_BUDGET" \
          --arg repo_source "$repo_source" \
          --arg repo_error "$repo_error" \
          --arg package "$BUNDLE" \
          --arg repository "$GITHUB_REPOSITORY" \
          --arg workflow_sha "$WORKFLOW_SHA" \
          --slurpfile inventory_metadata /tmp/gh-aw/agent/inventory-metadata.json \
          --slurpfile workers /tmp/gh-aw/agent/workers.json \
          --slurpfile workflows /tmp/gh-aw/agent/workflows.json \
          --slurpfile candidates /tmp/gh-aw/agent/current-batch.json '
            def worker_match($worker):
              $workflows[0] | map(select(.path == (".github/workflows/" + $worker + ".lock.yml"))) | .[0];

            $inventory_metadata[0] as $m | $candidates[0] as $c |
            {
              authorized:true, reason:"authorized", control_role:"orchestrator", package:$package, bundle:$package,
              $enabled, $target_repo, $organization,
              $max_repos, $max_scan_repos, $dispatch_max, $rollout_percent,
              effective_max_repos: (
                (if ($c | length) == 0 then 0
                 else [1, (($c | length) * ($rollout_percent | tonumber) / 100 | ceil)] | max
                  end) as $percent_cap
                 | [($max_repos | tonumber), $percent_cap] | min
              ),
              orchestrator_credits:($orchestrator_credits | tonumber),
              worker_credits_per_target:($worker_credits_per_target | tonumber),
                monthly_credit_budget:($monthly_credit_budget | tonumber),
              $safe_output_mode, $safe_output_repo, $repo_source, $repo_error,
                policy_source:{repository:$repository,path:".github/central-agentic-ops.json",sha:$workflow_sha},
              inventory_version:$m.inventory_version,
              inventory_repository_count:$m.inventory_repository_count,
              cell_count:$m.cell_count, cell_index:$m.cell_index,
              cell_repository_count:$m.cell_repository_count,
              batch_size:$m.batch_size, batch_index:$m.batch_index,
              batch_count:$m.batch_count, batch_id:$m.batch_id,
              total_repositories_scanned:$m.inventory_repository_count,
              candidate_repositories:$c,
              worker_workflows: [
                $workers[0][] as $worker
                | (worker_match($worker)) as $match
                | {
                    configured:$worker, matched:($match != null),
                    id:$match.id, name:$match.name, path:$match.path, state:($match.state // ""),
                    eligible:(($match != null) and (($match.state // "") | startswith("disabled") | not)),
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
                if $eligible_workers == 0 then 0 else
                  [.effective_max_repos, (($dispatch_max | tonumber) / $eligible_workers | floor)] | min
                end
              )
          ' > "$OUT"
      }

      mode_rank "$SAFE_OUTPUT_MODE" "safe_output_mode" >/dev/null
      if [ "$ROLE" = "orchestrator" ]; then
        CENTRAL_REPO="$GITHUB_REPOSITORY"
      fi
      validate_repository_owner "target_repo" "$TARGET_REPO"
      validate_repository_owner "safe_output_repo" "$SAFE_OUTPUT_REPO"

      if [ "$ROLE" = "worker" ]; then
        validate_worker_dispatch
        validate_output_destination
        validate_live_authority
        write_worker_precompute
        exit 0
      fi

      validate_output_destination
      prepare_allowlist
      write_orchestrator_precompute
  - name: Apply monthly package budget
    env:
      GH_REPO: ${{ github.repository }}
      BUNDLE: ${{ github.aw.import-inputs.package }}
      ROLE: ${{ github.aw.import-inputs.role }}
      ORCHESTRATOR_CREDITS: ${{ github.aw.import-inputs.orchestrator_credits }}
      WORKER_CREDITS_PER_TARGET: ${{ github.aw.import-inputs.worker_credits_per_target }}
    run: |
      set -euo pipefail
      OUT=/tmp/gh-aw/agent/control-precompute.json
      [ "$ROLE" = "orchestrator" ] || exit 0
      [ "$(jq -r '.enabled' "$OUT")" = "true" ] || exit 0
      MONTHLY_CREDIT_BUDGET=$(jq -r '.monthly_credit_budget' "$OUT")
      if ! [[ "$MONTHLY_CREDIT_BUDGET" =~ ^[0-9]+$ ]]; then
        echo "monthly_credit_budget must be a non-negative integer" >&2
        exit 1
      fi
      if [ "$MONTHLY_CREDIT_BUDGET" -gt 0 ] && [ "$WORKER_CREDITS_PER_TARGET" -eq 0 ]; then
        echo "monthly_credit_budget requires positive worker_credits_per_target" >&2
        exit 1
      fi

      monthly_ai_credits_spent="0"
      monthly_budget_error=""
      if [ "$MONTHLY_CREDIT_BUDGET" -gt 0 ]; then
        month_start=$(date -u +%Y-%m-01)
        parts_dir=/tmp/gh-aw/agent/monthly-budget-parts
        mkdir -p "$parts_dir"
        rm -f "$parts_dir"/*.json
        {
          printf '%s\n' "$BUNDLE"
          jq -r '.[]' /tmp/gh-aw/agent/workers.json
        } | sort -u > /tmp/gh-aw/agent/monthly-budget-workflows

        while IFS= read -r workflow_id; do
          [ -n "$workflow_id" ] || continue
          safe_workflow_id=$(printf '%s' "$workflow_id" | tr -cs 'A-Za-z0-9._-' '_')
          part_file="$parts_dir/$safe_workflow_id.json"
          part_exit=0
          gh aw logs "$workflow_id" --start-date "$month_start" --json -c 1000 > "$part_file" || part_exit=$?
          if ! jq -e '(.runs // []) | type == "array"' "$part_file" >/dev/null 2>&1; then
            monthly_budget_error="could not read valid month-to-date AI Credit usage for $workflow_id (exit code $part_exit)"
            break
          fi
        done < /tmp/gh-aw/agent/monthly-budget-workflows

        if [ -z "$monthly_budget_error" ]; then
          monthly_ai_credits_spent=$(jq -s '
            map(.runs // []) | add // [] | unique_by(.run_id)
            | map(.aic // 0) | add // 0
          ' "$parts_dir"/*.json)
        fi
      fi

      jq \
        --arg budget "$MONTHLY_CREDIT_BUDGET" \
        --arg spent "$monthly_ai_credits_spent" \
        --arg budget_error "$monthly_budget_error" '
          ($budget | tonumber) as $b
          | ($spent | tonumber) as $s
          | .monthly_credit_budget = $b
          | .monthly_ai_credits_spent = $s
          | .monthly_ai_credits_remaining = ([0, ($b - $s)] | max)
          | .monthly_budget_error = $budget_error
          | .monthly_budget_target_cap = (
              if $b == 0 then .max_repos | tonumber
              elif $budget_error != "" or $b <= ($s + .orchestrator_credits) then 0
              else (($b - $s - .orchestrator_credits) / .worker_credits_per_target | floor)
              end
            )
          | .effective_max_repos = ([.effective_max_repos, .monthly_budget_target_cap] | min)
        ' "$OUT" > "$OUT.tmp"
      mv "$OUT.tmp" "$OUT"
---

Read `/tmp/gh-aw/agent/control-precompute.json` before making control decisions. Treat it as authoritative for `control_role`, enablement state, target repository inputs, safe-output routing, and worker workflow availability.