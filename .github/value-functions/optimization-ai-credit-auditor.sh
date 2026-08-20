#!/usr/bin/env bash

set -euo pipefail

repository='githubnext/central-agentic-ops'
workflow_slug='optimization-ai-credit-auditor'
workflow_file='optimization-ai-credit-auditor.lock.yml'

definition() {
    jq -cn '
    {
      schemaVersion: 3,
      slug: "optimization-ai-credit-auditor",
      sourcePath: ".github/workflows/optimization-ai-credit-auditor.md",
      repository: "githubnext/central-agentic-ops",
      workflowName: "Optimization / AI Credit Auditor",
      adoption: {
        commit: "35c7c3cbd319632f85784cce196e57c0f61db9a0",
        adoptedAt: "2026-08-18T17:54:55Z",
        baselineCommit: "ed9921bfd3aa8f95f9cc8dd30f87d0dbca97a42b",
        baselineAt: "2026-08-18T12:20:21Z"
      },
      evaluation: {mode: "attainment-only"},
      evidence: {
        key: "target-day-audit-aggregate-reproduction",
        repositories: ["githubnext/central-agentic-ops"],
        opportunity: "A target repository and UTC day containing at least one completed agentic workflow run, among targets immutably named by dispatched Optimization / AI Credit Auditor runs.",
        filters: [
          "Discover targets only from central Actions run display_title values matching Token audit · owner/repo · mode.",
          "Include only retained target runs with status completed and created_at within the target-day window.",
          "Empty completed-run windows are ineligible.",
          "A day is accurate only when the durable daily snapshot reproduces overall and per-workflow completed-run aggregates.",
          "Absent or inaccessible retained logs and snapshots remain explicitly missing; numeric zero is accepted only from retained evidence."
        ],
        collection: "Batch central Actions discovery over the full request, fetch gh aw logs once per discovered target for the total date span, and read daily snapshots from immutable central repo-memory commits at or before observedAt.",
        window: {durationDays: 1, cadenceDays: 1, maturationDays: 1}
      },
      model: {
        architecture: "Deterministic exact aggregate reproduction over paired retained run logs and durable daily snapshots",
        recommendation: "Use the accurate audit-day share as primary; report completed-run and durable-history coverage separately so missing evidence is never averaged into accuracy.",
        presentation: {label: "Accurate audit days", betterLabel: "Higher is better"}
      },
      summary: {nativeLabel: "Accurate audit-day share"},
      metrics: [
        {
          id: "accurate-audit-day-share",
          name: "Accurate audit-day share",
          role: "primary",
          formula: "matched eligible target-days / eligible target-days with both retained completed-run logs and a readable durable snapshot",
          direction: "increase",
          presentation: {name: "Accurate audit-day share", legendLabel: "Accurate days", transform: "identity"}
        },
        {
          id: "completed-run-coverage",
          name: "Completed-run coverage",
          role: "diagnostic",
          formula: "sum min(snapshot overall.total_runs, retained completed runs) / sum retained completed runs across paired eligible target-days",
          direction: "increase",
          presentation: {name: "Completed-run coverage", legendLabel: "Run coverage", transform: "identity"}
        },
        {
          id: "durable-history-coverage",
          name: "Durable-history coverage",
          role: "diagnostic",
          formula: "eligible target-days with a readable durable snapshot / eligible target-days established from retained completed-run logs",
          direction: "increase",
          presentation: {name: "Durable-history coverage", legendLabel: "History coverage", transform: "identity"}
        }
      ],
      validationExamples: {
        targetAttained: {
          status: "complete",
          days: [{eligible: true, logsStatus: "available", snapshotStatus: "available", comparison: "matched", completedRuns: 4, snapshotRuns: 4}]
        },
        targetMissed: {
          status: "complete",
          days: [
            {eligible: true, logsStatus: "available", snapshotStatus: "available", comparison: "mismatched", completedRuns: 4, snapshotRuns: 2},
            {eligible: true, logsStatus: "available", snapshotStatus: "missing", comparison: "missing", completedRuns: 3, snapshotRuns: null}
          ]
        },
        missing: {status: "missing", days: []},
        malformed: {status: "complete", days: [{eligible: "yes"}]}
      }
    }'
}

score_metric() {
    local metric_id=$1
    case $metric_id in
        accurate-audit-day-share)
            jq '
              if .status != "complete" or (.days | type) != "array"
                 or any(.days[]; (.eligible | type) != "boolean")
              then null
              else [.days[] | select(.eligible and .logsStatus == "available" and .snapshotStatus == "available")]
                   | if length == 0 or any(.[]; (.comparison != "matched" and .comparison != "mismatched")) then null
                     else (([.[] | select(.comparison == "matched")] | length) / length * 1000000 | round / 1000000)
                     end
              end'
            ;;
        completed-run-coverage)
            jq '
              if .status != "complete" or (.days | type) != "array"
                 or any(.days[]; (.eligible | type) != "boolean")
              then null
              else [.days[] | select(.eligible and .logsStatus == "available" and .snapshotStatus == "available")]
                   | if length == 0
                        or any(.[]; (.completedRuns | type) != "number" or .completedRuns <= 0
                                   or (.snapshotRuns | type) != "number" or .snapshotRuns < 0)
                     then null
                     else (map(.completedRuns) | add) as $runs
                       | (map([.snapshotRuns, .completedRuns] | min) | add) / $runs
                       | . * 1000000 | round / 1000000
                     end
              end'
            ;;
        durable-history-coverage)
            jq '
              if .status != "complete" or (.days | type) != "array"
                 or any(.days[]; (.eligible | type) != "boolean")
              then null
              else [.days[] | select(.eligible and .logsStatus == "available")]
                   | if length == 0 or any(.[]; (.snapshotStatus != "available" and .snapshotStatus != "missing")) then null
                     else (([.[] | select(.snapshotStatus == "available")] | length) / length * 1000000 | round / 1000000)
                     end
              end'
            ;;
        *)
            printf 'null\n'
            ;;
    esac
}

empty_evidence() {
    local request_file=$1
    local reason=$2
    jq -c --arg reason "$reason" '
      .[] | {
        evidence: {
          key: "target-day-audit-aggregate-reproduction",
          repositories: ["githubnext/central-agentic-ops"],
          opportunity: "Target-days containing completed agentic workflow runs for immutably dispatched auditor targets",
          filters: ["completed target runs", "exact durable aggregate reproduction", "empty run windows ineligible"],
          collection: $reason,
          window: {durationDays: 1, cadenceDays: 1, maturationDays: 1},
          status: "missing",
          days: []
        },
        provenance: [{repository: "githubnext/central-agentic-ops", kind: "workflow-source-at-adoption", ref: "35c7c3cbd319632f85784cce196e57c0f61db9a0:.github/workflows/optimization-ai-credit-auditor.md"}],
        commit: "35c7c3cbd319632f85784cce196e57c0f61db9a0"
      }' "$request_file" | jq -s '.'
}

collect_batch() {
  local script_dir repo_root work_dir cleanup_command request_file
    script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
    repo_root=$(CDPATH='' cd -- "$script_dir/../.." && pwd)
    work_dir=$(mktemp -d "$repo_root/.aw-value-collector.XXXXXX")
    printf -v cleanup_command 'rm -rf %q' "$work_dir"
    trap "$cleanup_command" EXIT HUP INT TERM
    request_file="$work_dir/request.json"
    cat > "$request_file"

    if ! jq -e '
      type == "array" and all(.[];
        (.windowStart | type) == "string" and (.windowEnd | type) == "string" and (.observedAt | type) == "string"
        and (try (.windowStart | fromdateiso8601) catch null) != null
        and (try (.windowEnd | fromdateiso8601) catch null) != null
        and (try (.observedAt | fromdateiso8601) catch null) != null)
    ' "$request_file" >/dev/null 2>&1; then
        empty_evidence "$request_file" "Invalid batch request; evidence was not collected."
        return
    fi
    if [[ $(jq 'length' "$request_file") -eq 0 ]]; then
        printf '[]\n'
        return
    fi
    if ! command -v gh >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
        empty_evidence "$request_file" "Required collection command unavailable; evidence was not collected."
        return
    fi

    local actions_file min_dispatch max_observed
    actions_file="$work_dir/actions.json"
    min_dispatch=$(jq -r 'map(.windowEnd) | min' "$request_file")
    max_observed=$(jq -r 'map(.observedAt) | max' "$request_file")
    if ! gh api --paginate --method GET \
      "repos/$repository/actions/runs" \
        -f "created=$min_dispatch..$max_observed" -f event=workflow_dispatch -f per_page=100 \
        | jq -s '[.[].workflow_runs[]? | {
            id, created_at, updated_at, status, conclusion, head_sha,
        display_title, path,
            target: (try (.display_title | capture("^Token audit · (?<target>[^ ·]+/[^ ·]+) · ").target) catch null)
        } | select(.path == ".github/workflows/optimization-ai-credit-auditor.lock.yml" and .target != null)]' > "$actions_file"; then
        empty_evidence "$request_file" "Central Actions run discovery was inaccessible; evidence was not collected."
        return
    fi

    local targets_file
    targets_file="$work_dir/targets.txt"
    jq -r '.[].target' "$actions_file" | sort -u > "$targets_file"

    local logs_start logs_end target target_key logs_file
    logs_start=$(jq -r 'map(.windowStart[0:10]) | min' "$request_file")
    logs_end=$(jq -r 'map(.windowEnd[0:10]) | max' "$request_file")
    while IFS= read -r target; do
        [[ -n $target ]] || continue
        target_key=$(printf '%s' "$target" | tr '/:' '___')
        logs_file="$work_dir/logs-$target_key.json"
        if gh aw logs --repo "$target" --start-date "$logs_start" --end-date "$logs_end" \
            --count 10000 --json --output "$work_dir/gh-aw-$target_key" > "$logs_file" 2> "$work_dir/logs-$target_key.err" \
            && jq -e '(.runs | type) == "array"' "$logs_file" >/dev/null 2>&1; then
            jq -c '.runs' "$logs_file" > "$work_dir/runs-$target_key.json"
            printf 'available\n' > "$work_dir/logs-status-$target_key"
        else
            printf '[]\n' > "$work_dir/runs-$target_key.json"
            printf 'missing\n' > "$work_dir/logs-status-$target_key"
        fi
    done < "$targets_file"

    local results_file index window_start window_end observed_at dispatch_file
    results_file="$work_dir/results.ndjson"
    : > "$results_file"
    index=0
    while [[ $index -lt $(jq 'length' "$request_file") ]]; do
        window_start=$(jq -r ".[$index].windowStart" "$request_file")
        window_end=$(jq -r ".[$index].windowEnd" "$request_file")
        observed_at=$(jq -r ".[$index].observedAt" "$request_file")
        dispatch_file="$work_dir/dispatch-$index.json"
        jq --arg start "$window_end" --arg end "$observed_at" \
            '[.[] | select(.created_at > $start and .created_at <= $end)] | unique_by(.target)' \
            "$actions_file" > "$dispatch_file"

        local days_file provenance_file
        days_file="$work_dir/days-$index.ndjson"
        provenance_file="$work_dir/provenance-$index.ndjson"
        : > "$days_file"
        jq -c '.[] | {repository: "githubnext/central-agentic-ops", kind: "actions-run", ref: ("run:" + (.id | tostring) + "@" + .head_sha)}' \
            "$dispatch_file" > "$provenance_file"

        while IFS=$'\t' read -r target run_id run_sha dispatch_at; do
            [[ -n $target ]] || continue
            target_key=$(printf '%s' "$target" | tr '/:' '___')
            local runs_file logs_status completed_file completed_count snapshot_date snapshot_name branch commits_file cutoff_sha tree_file blob_sha snapshot_file snapshot_status comparison snapshot_runs
            runs_file="$work_dir/runs-$target_key.json"
            logs_status=$(cat "$work_dir/logs-status-$target_key")
            completed_file="$work_dir/completed-$index-$target_key.json"
            if [[ $logs_status == available ]]; then
                jq --arg start "$window_start" --arg end "$window_end" '
                  [.[] | select(.status == "completed" and .created_at >= $start and .created_at < $end)]' \
                  "$runs_file" > "$completed_file"
            else
                printf '[]\n' > "$completed_file"
            fi
            completed_count=$(jq 'length' "$completed_file")
            snapshot_date=${dispatch_at%%T*}
            snapshot_name=$(printf '%s__%s__%s.json' "${target%%/*}" "${target#*/}" "$snapshot_date")
            branch="memory/token-audit-$target"
            commits_file="$work_dir/commits-$target_key.json"
            snapshot_status=missing
            snapshot_runs=null
            comparison=missing
            cutoff_sha=

            if [[ ! -f $commits_file ]]; then
                if gh api --paginate --method GET "repos/$repository/commits" \
                    -f sha="$branch" -f until="$max_observed" -f per_page=100 \
                    | jq -s 'add // []' > "$commits_file" 2>/dev/null; then
                    :
                else
                    printf 'null\n' > "$commits_file"
                fi
            fi
            if jq -e 'type == "array"' "$commits_file" >/dev/null 2>&1; then
                cutoff_sha=$(jq -r --arg observed "$observed_at" \
                    '[.[] | select(.commit.committer.date <= $observed)] | sort_by(.commit.committer.date) | last | .sha // empty' \
                    "$commits_file")
                if [[ -n $cutoff_sha ]]; then
                    tree_file="$work_dir/tree-$cutoff_sha.json"
                    if [[ ! -f $tree_file ]]; then
                        gh api "repos/$repository/git/trees/$cutoff_sha?recursive=1" > "$tree_file" 2>/dev/null || printf 'null\n' > "$tree_file"
                    fi
                    blob_sha=$(jq -r --arg name "$snapshot_name" '
                      [.tree[]? | select(.type == "blob" and (.path | split("/") | last) == $name)] | first | .sha // empty' \
                      "$tree_file" 2>/dev/null || true)
                    if [[ -n $blob_sha ]]; then
                        snapshot_file="$work_dir/blob-$blob_sha.json"
                        if [[ ! -f $snapshot_file ]]; then
                            gh api "repos/$repository/git/blobs/$blob_sha" --jq '.content' 2>/dev/null \
                                | tr -d '\n' | base64 --decode > "$snapshot_file" 2>/dev/null || printf 'null\n' > "$snapshot_file"
                        fi
                        if jq -e '(.overall | type) == "object" and (.workflows | type) == "array"' "$snapshot_file" >/dev/null 2>&1; then
                            snapshot_status=available
                            snapshot_runs=$(jq '.overall.total_runs // null' "$snapshot_file")
                        else
                            snapshot_status=inaccessible
                        fi
                    fi
                fi
            else
                snapshot_status=inaccessible
            fi

            if [[ $logs_status == available && $completed_count -gt 0 && $snapshot_status == available ]]; then
                local expected_file
                expected_file="$work_dir/expected-$index-$target_key.json"
                jq '
                  def number: if type == "number" then . else 0 end;
                  def wf: (.workflow_name // "") | tostring;
                  {
                    overall: {
                      total_runs: length,
                      total_ai_credits: (map((.aic // 0) | number) | add // 0),
                      total_tokens: (map((.token_usage // 0) | number) | add // 0),
                      total_action_minutes: (map((.action_minutes // 0) | number) | add // 0)
                    },
                    workflows: (group_by(wf) | map({
                      workflow_name: (.[0] | wf),
                      run_count: length,
                      total_ai_credits: (map((.aic // 0) | number) | add // 0),
                      avg_ai_credits: ((map((.aic // 0) | number) | add // 0) / length),
                      total_tokens: (map((.token_usage // 0) | number) | add // 0),
                      avg_tokens: ((map((.token_usage // 0) | number) | add // 0) / length),
                      total_turns: (map((.turns // 0) | number) | add // 0),
                      avg_turns: ((map((.turns // 0) | number) | add // 0) / length),
                      total_action_minutes: (map((.action_minutes // 0) | number) | add // 0),
                      error_count: (map((.error_count // 0) | number) | add // 0),
                      warning_count: (map((.warning_count // 0) | number) | add // 0)
                    }) | sort_by(.workflow_name))
                  }' "$completed_file" > "$expected_file"
                if jq -e --slurpfile expected "$expected_file" '
                  def close($a; $b): (($a | tonumber) - ($b | tonumber) | fabs) <= 0.000001;
                  (.overall.total_runs == $expected[0].overall.total_runs)
                  and close(.overall.total_ai_credits; $expected[0].overall.total_ai_credits)
                  and (.overall.total_tokens == $expected[0].overall.total_tokens)
                  and close(.overall.total_action_minutes; $expected[0].overall.total_action_minutes)
                  and ((.workflows | sort_by(.workflow_name)) as $actual
                    | ($expected[0].workflows) as $wanted
                    | ($actual | length) == ($wanted | length)
                    and all(range(0; $wanted | length); . as $i
                      | $actual[$i].workflow_name == $wanted[$i].workflow_name
                      and $actual[$i].run_count == $wanted[$i].run_count
                      and close($actual[$i].total_ai_credits; $wanted[$i].total_ai_credits)
                      and close($actual[$i].avg_ai_credits; $wanted[$i].avg_ai_credits)
                      and $actual[$i].total_tokens == $wanted[$i].total_tokens
                      and close($actual[$i].avg_tokens; $wanted[$i].avg_tokens)
                      and $actual[$i].total_turns == $wanted[$i].total_turns
                      and close($actual[$i].avg_turns; $wanted[$i].avg_turns)
                      and close($actual[$i].total_action_minutes; $wanted[$i].total_action_minutes)
                      and $actual[$i].error_count == $wanted[$i].error_count
                      and $actual[$i].warning_count == $wanted[$i].warning_count))
                ' "$snapshot_file" >/dev/null 2>&1; then comparison=matched; else comparison=mismatched; fi
            fi

            jq -cn --arg target "$target" --arg date "$snapshot_date" --arg logs "$logs_status" \
                --arg snapshot "$snapshot_status" --arg comparison "$comparison" \
                --argjson completed "$completed_count" --argjson snapshot_runs "$snapshot_runs" '
              {
                target: $target,
                date: $date,
                eligible: ($logs == "available" and $completed > 0),
                logsStatus: $logs,
                snapshotStatus: $snapshot,
                comparison: $comparison,
                completedRuns: $completed,
                snapshotRuns: $snapshot_runs
              }' >> "$days_file"
            printf '{"repository":"%s","kind":"target-agentic-workflow-logs","ref":"actions-artifacts:%s:%s..%s"}\n' \
                "$target" "$target" "$window_start" "$window_end" >> "$provenance_file"
            if [[ -n $cutoff_sha ]]; then
                printf '{"repository":"%s","kind":"repo-memory-commit","ref":"%s"}\n' "$repository" "$cutoff_sha" >> "$provenance_file"
            fi
        done < <(jq -r '.[] | [.target, (.id | tostring), .head_sha, .created_at] | @tsv' "$dispatch_file")

        if [[ ! -s $provenance_file ]]; then
            printf '{"repository":"%s","kind":"actions-workflow-query","ref":"%s:.github/workflows/%s"}\n' \
                "$repository" "35c7c3cbd319632f85784cce196e57c0f61db9a0" "$workflow_file" > "$provenance_file"
        fi
        jq -cn --slurpfile days <(jq -s '.' "$days_file") --slurpfile provenance <(jq -s 'unique_by(.repository, .kind, .ref)' "$provenance_file") '
          {
            evidence: {
              key: "target-day-audit-aggregate-reproduction",
              repositories: (["githubnext/central-agentic-ops"] + [$days[0][].target] | unique),
              opportunity: "Target-days containing completed agentic workflow runs for immutably dispatched auditor targets",
              filters: ["completed target runs", "exact durable aggregate reproduction", "empty run windows ineligible"],
              collection: "Batched central Actions discovery, one gh aw logs fetch per target, immutable repo-memory snapshot lookup",
              window: {durationDays: 1, cadenceDays: 1, maturationDays: 1},
              status: "complete",
              days: $days[0]
            },
            provenance: $provenance[0]
          }' >> "$results_file"
        index=$((index + 1))
    done
    jq -s '.' "$results_file"
}

case ${1:-} in
    --definition)
        [[ $# -eq 1 ]] || exit 2
        definition
        ;;
    --collect-batch)
        [[ $# -eq 1 ]] || exit 2
        collect_batch
        ;;
    --metric)
        [[ $# -eq 2 ]] || exit 2
        score_metric "$2"
        ;;
    '')
        score_metric 'accurate-audit-day-share'
        ;;
    *)
        exit 2
        ;;
esac