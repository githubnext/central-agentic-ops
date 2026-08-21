#!/usr/bin/env bash

set -euo pipefail

readonly REPOSITORY="githubnext/central-agentic-ops"
readonly WORKFLOW_SLUG="optimization-ai-credit-optimizer"
readonly WORKFLOW_NAME="Optimization / AI Credit Optimizer"

fail() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

definition() {
    jq -n '
    {
      schemaVersion: 3,
      slug: "optimization-ai-credit-optimizer",
      sourcePath: ".github/workflows/optimization-ai-credit-optimizer.md",
      repository: "githubnext/central-agentic-ops",
      workflowName: "Optimization / AI Credit Optimizer",
      adoption: {
        commit: "35c7c3cbd319632f85784cce196e57c0f61db9a0",
        adoptedAt: "2026-08-18T17:54:55Z",
        baselineCommit: "ed9921bfd3aa8f95f9cc8dd30f87d0dbca97a42b",
        baselineAt: "2026-08-18T12:20:21Z"
      },
      evaluation: {mode: "attainment-only"},
      evidence: {
        key: "same-workflow-half-window-aic-and-reliability",
        repositories: ["githubnext/central-agentic-ops"],
        opportunity: "A dispatched repository target in a seven-day window for which the completed first-half runs identify a highest-total-AIC workflow and that same workflow has completed and successful-run evidence in both halves.",
        filters: [
          "Targets are parsed from immutable display_title values of completed Optimization / AI Credit Optimizer Actions runs in the central repository.",
          "The target workflow is the workflow with highest total AIC among completed first-half runs, with workflow name ascending as the stable tie-break.",
          "The selected workflow must have at least one completed run and at least one successful run in each half.",
          "AIC medians use successful runs only; failure rates use all completed runs and classify every conclusion other than success as non-successful.",
          "Second-half median AIC must be strictly lower and second-half failure rate must be no greater than first-half failure rate."
        ],
        collection: "Batch central Actions runs for all windows, deduplicate dispatched targets, invoke gh aw logs once per target for the total requested span, and derive each midpoint comparison locally from immutable target run IDs.",
        window: {durationDays: 7, cadenceDays: 7, maturationDays: 7}
      },
      model: {
        architecture: "One eligible opportunity per dispatched target-window, scored on two independently reported attainment dimensions.",
        recommendation: "Use efficient-and-reliable opportunity share as primary; retain lower-AIC share and reliability-preserved share as diagnostics. Reject recommendation and issue counts because they measure workflow output rather than repository outcome.",
        presentation: {
          label: "Efficient and reliable opportunities",
          betterLabel: "Higher is better"
        }
      },
      summary: {
        nativeLabel: "Share of comparable target-windows with lower median successful-run AIC and preserved failure rate"
      },
      metrics: [
        {
          id: "efficient-reliable-share",
          name: "Efficient-and-reliable opportunity share",
          role: "primary",
          formula: "efficientReliableOpportunities / comparableOpportunities",
          direction: "increase",
          presentation: {name: "Efficient and reliable", legendLabel: "Efficient + reliable", transform: "identity"}
        },
        {
          id: "lower-aic-share",
          name: "Lower-AIC opportunity share",
          role: "diagnostic",
          formula: "lowerAicOpportunities / comparableOpportunities",
          direction: "increase",
          presentation: {name: "Lower median AIC", legendLabel: "Lower AIC", transform: "identity"}
        },
        {
          id: "reliability-preserved-share",
          name: "Reliability-preserved opportunity share",
          role: "diagnostic",
          formula: "reliabilityPreservedOpportunities / comparableOpportunities",
          direction: "increase",
          presentation: {name: "Reliability preserved", legendLabel: "Reliability preserved", transform: "identity"}
        }
      ],
      validationExamples: {
        targetAttained: {
          status: "complete", comparableOpportunities: 1,
          efficientReliableOpportunities: 1, lowerAicOpportunities: 1,
          reliabilityPreservedOpportunities: 1
        },
        targetMissed: {
          status: "complete", comparableOpportunities: 1,
          efficientReliableOpportunities: 0, lowerAicOpportunities: 0,
          reliabilityPreservedOpportunities: 0
        },
        missing: {
          status: "missing", comparableOpportunities: 0,
          efficientReliableOpportunities: null, lowerAicOpportunities: null,
          reliabilityPreservedOpportunities: null
        },
        malformed: {status: "complete", comparableOpportunities: "one"}
      }
    }'
}

score_metric() {
    local metric_id=$1
    local numerator_field
  local evidence
    case "$metric_id" in
        efficient-reliable-share) numerator_field=efficientReliableOpportunities ;;
        lower-aic-share) numerator_field=lowerAicOpportunities ;;
        reliability-preserved-share) numerator_field=reliabilityPreservedOpportunities ;;
        *) fail "unknown metric: $metric_id" ;;
    esac

    evidence=$(cat)
    printf '%s\n' "$evidence" | jq -e . >/dev/null 2>&1 || { printf 'null\n'; return; }
    printf '%s\n' "$evidence" | jq --arg numerator "$numerator_field" '
      if type != "object"
         or .status != "complete"
         or (.comparableOpportunities | type) != "number"
         or .comparableOpportunities <= 0
         or (.[$numerator] | type) != "number"
         or .[$numerator] < 0
         or .[$numerator] > .comparableOpportunities
      then null
      else ((.[$numerator] / .comparableOpportunities) * 1000000 | round) / 1000000
      end'
}

iso_day() {
    printf '%s\n' "${1%%T*}"
}

collect_batch() {
  local request repo_root temp_dir cleanup_command min_start max_end start_day end_day log_end_day
    request=$(cat)
    printf '%s\n' "$request" | jq -e '
      type == "array" and all(.[];
        (.windowStart | type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$"))
        and (.windowEnd | type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$"))
        and (.observedAt | type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$"))
        and ((.windowStart | fromdateiso8601) < (.windowEnd | fromdateiso8601))
        and ((.windowEnd | fromdateiso8601) <= (.observedAt | fromdateiso8601))
      )' >/dev/null || fail "invalid batch request"

    if [[ $(printf '%s\n' "$request" | jq 'length') -eq 0 ]]; then
        printf '[]\n'
        return
    fi

    repo_root=$(cd "$(dirname "$0")/../.." && pwd)
    temp_dir=$(mktemp -d "$repo_root/.aw-value-${WORKFLOW_SLUG}.XXXXXX")
    printf -v cleanup_command 'rm -rf %q' "$temp_dir"
    trap "$cleanup_command" EXIT

    min_start=$(printf '%s\n' "$request" | jq -r 'map(.windowStart) | min')
    max_end=$(printf '%s\n' "$request" | jq -r 'map(.windowEnd) | max')
    start_day=$(iso_day "$min_start")
    end_day=$(iso_day "$max_end")
    log_end_day=$(jq -nr --arg end "$max_end" '$end | fromdateiso8601 + 86400 | todateiso8601 | split("T")[0]')

    gh api --paginate --method GET \
      -H 'Accept: application/vnd.github+json' \
      "repos/$REPOSITORY/actions/runs?per_page=100&created=${start_day}..${end_day}" \
      --jq '.workflow_runs[] | {id, name, path, created_at, display_title, status, conclusion}' \
      | jq -s '.' >"$temp_dir/central-runs.json"

    jq --arg workflowName "$WORKFLOW_NAME" --arg workflowSlug "$WORKFLOW_SLUG" '[.[]
      | select(.name == $workflowName or (.path | type == "string" and contains($workflowSlug)))
      | select(.id != null and (.created_at | type == "string") and (.display_title | type == "string"))
      | . + (try (.display_title | capture("(?<target>[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)")) catch {})
      | select(.target != null)]' "$temp_dir/central-runs.json" >"$temp_dir/dispatches.json"

    local targets_file target target_index=0
    targets_file="$temp_dir/targets.txt"
    printf '[]\n' >"$temp_dir/all-runs.json"
    jq -r '.[].target' "$temp_dir/dispatches.json" | LC_ALL=C sort -u >"$targets_file"
    while IFS= read -r target; do
        [[ -n "$target" ]] || continue
        target_index=$((target_index + 1))
        mkdir -p "$temp_dir/logs-$target_index"
        gh aw logs --repo "$target" --start-date "$start_day" --end-date "$log_end_day" \
          --count 10000 --json --output "$temp_dir/logs-$target_index" \
          >"$temp_dir/logs-$target_index/stdout.json"
        jq -s 'map(select(type == "object" or type == "array"))' \
          "$temp_dir/logs-$target_index/stdout.json" \
          "$temp_dir/logs-$target_index/summary.json" 2>/dev/null \
          >"$temp_dir/logs-$target_index/input.json" || \
          jq -s 'map(select(type == "object" or type == "array"))' \
            "$temp_dir/logs-$target_index/stdout.json" >"$temp_dir/logs-$target_index/input.json"

        jq --arg repository "$target" '
          def pick($names): . as $object | first($names[] as $name | $object[$name] | select(. != null)) // null;
          [.. | objects
            | . as $run
            | (pick(["run_id", "runId", "database_id", "databaseId", "id"])) as $runId
            | (pick(["workflow_name", "workflowName", "workflow", "workflow_id", "workflowId", "name"])) as $workflow
            | (pick(["created_at", "createdAt", "started_at", "startedAt", "timestamp"])) as $createdAt
            | (pick(["status"])) as $status
            | (pick(["conclusion", "result"])) as $conclusion
            | (pick(["aic", "total_aic", "totalAic", "ai_credits", "aiCredits", "estimated_aic", "estimatedAic", "credits", "cost"])) as $aic
            | select(($runId | type) == "number" or ($runId | type) == "string")
            | select(($workflow | type) == "string" and ($createdAt | type) == "string")
            | {repository: $repository, runId: ($runId | tostring), workflow: $workflow,
               createdAt: $createdAt, status: $status, conclusion: $conclusion,
               aic: (if ($aic | type) == "number" then $aic
                     elif ($aic | type) == "string" then (try ($aic | tonumber) catch null)
                     else null end)}]
          | unique_by(.runId)' "$temp_dir/logs-$target_index/input.json" \
          >"$temp_dir/logs-$target_index/runs.json"
        jq -s 'add | unique_by(.repository + "#" + .runId)' \
          "$temp_dir/all-runs.json" "$temp_dir/logs-$target_index/runs.json" \
          >"$temp_dir/all-runs.next.json"
        mv "$temp_dir/all-runs.next.json" "$temp_dir/all-runs.json"
    done <"$targets_file"

    jq -n --argjson requests "$request" \
      --slurpfile dispatches "$temp_dir/dispatches.json" \
      --slurpfile runs "$temp_dir/all-runs.json" '
      def median:
        sort as $values | ($values | length) as $length
        | if $length == 0 then null
          elif ($length % 2) == 1 then $values[($length / 2 | floor)]
          else (($values[$length / 2 - 1] + $values[$length / 2]) / 2) end;
      def completed: (.status == "completed" or (.conclusion | type) == "string");
      def target_result($target; $start; $midpoint; $end):
        ($runs[0] | map(select(.repository == $target and completed
          and (.createdAt | fromdateiso8601) >= $start
          and (.createdAt | fromdateiso8601) < $end))) as $completedRuns
        | ($completedRuns | map(select((.createdAt | fromdateiso8601) < $midpoint))) as $firstRuns
        | ($completedRuns | map(select((.createdAt | fromdateiso8601) >= $midpoint))) as $secondRuns
        | (if ($firstRuns | length) > 0 and all($firstRuns[]; (.aic | type) == "number")
           then ($firstRuns | group_by(.workflow)
             | map({workflow: .[0].workflow, totalAic: (map(.aic) | add)})
             | sort_by([-.totalAic, .workflow]) | first)
           else null end) as $selection
        | if $selection == null then
            {target: $target, status: "missing", reason: "no-identifiable-first-half-workflow",
             runIds: ($completedRuns | map(.runId) | unique)}
          else
            ($firstRuns | map(select(.workflow == $selection.workflow))) as $firstSelected
            | ($secondRuns | map(select(.workflow == $selection.workflow))) as $secondSelected
            | ($firstSelected | map(select(.conclusion == "success" and (.aic | type) == "number"))) as $firstSuccess
            | ($secondSelected | map(select(.conclusion == "success" and (.aic | type) == "number"))) as $secondSuccess
            | if ($firstSelected | length) == 0 or ($secondSelected | length) == 0
                 or ($firstSuccess | length) == 0 or ($secondSuccess | length) == 0 then
                {target: $target, status: "missing", workflow: $selection.workflow,
                 reason: "incomplete-comparable-run-evidence",
                 runIds: (($firstSelected + $secondSelected) | map(.runId) | unique)}
              else
                ($firstSuccess | map(.aic) | median) as $firstMedian
                | ($secondSuccess | map(.aic) | median) as $secondMedian
                | (($firstSelected | map(select(.conclusion != "success")) | length) / ($firstSelected | length)) as $firstFailureRate
                | (($secondSelected | map(select(.conclusion != "success")) | length) / ($secondSelected | length)) as $secondFailureRate
                | {target: $target, status: "complete", workflow: $selection.workflow,
                   firstHalf: {completedRuns: ($firstSelected | length), successfulRuns: ($firstSuccess | length),
                               medianAic: $firstMedian, failureRate: $firstFailureRate},
                   secondHalf: {completedRuns: ($secondSelected | length), successfulRuns: ($secondSuccess | length),
                                medianAic: $secondMedian, failureRate: $secondFailureRate},
                   lowerAic: ($secondMedian < $firstMedian),
                   reliabilityPreserved: ($secondFailureRate <= $firstFailureRate),
                   efficientReliable: (($secondMedian < $firstMedian) and ($secondFailureRate <= $firstFailureRate)),
                   runIds: (($firstSelected + $secondSelected) | map(.runId) | unique)}
              end
          end;
      $requests | map(. as $window
        | ($window.windowStart | fromdateiso8601) as $start
        | ($window.windowEnd | fromdateiso8601) as $end
        | ($start + (($end - $start) / 2)) as $midpoint
        | ($dispatches[0] | map(select((.created_at | fromdateiso8601) >= ($window.windowStart | fromdateiso8601)
            and (.created_at | fromdateiso8601) < ($window.windowEnd | fromdateiso8601)))) as $windowDispatches
        | ($windowDispatches | map(.target) | unique) as $targets
        | ($targets | map(target_result(.; $start; $midpoint; $end))) as $targetResults
        | ($targetResults | map(select(.status == "complete"))) as $comparable
        | {
            evidence: {
              key: "same-workflow-half-window-aic-and-reliability",
              repositories: ($targets | if length == 0 then ["githubnext/central-agentic-ops"] else . end),
              opportunity: "Dispatched target-window with a comparable highest-first-half-AIC workflow",
              filters: ["completed runs", "successful-run AIC medians", "same workflow in both halves"],
              collection: "Central immutable dispatch runs and one gh aw logs JSON download per target over the batch span",
              window: {durationDays: 7, cadenceDays: 7, maturationDays: 7,
                       windowStart: $window.windowStart, windowEnd: $window.windowEnd, observedAt: $window.observedAt},
              status: (if ($comparable | length) > 0 then "complete" else "missing" end),
              comparableOpportunities: ($comparable | length),
              efficientReliableOpportunities: (if ($comparable | length) > 0 then ($comparable | map(select(.efficientReliable)) | length) else null end),
              lowerAicOpportunities: (if ($comparable | length) > 0 then ($comparable | map(select(.lowerAic)) | length) else null end),
              reliabilityPreservedOpportunities: (if ($comparable | length) > 0 then ($comparable | map(select(.reliabilityPreserved)) | length) else null end),
              targets: $targets,
              targetResults: $targetResults,
              reason: (if ($comparable | length) > 0 then null elif ($targets | length) == 0 then "no-dispatched-target" else "no-comparable-matured-runs" end)
            },
            provenance: (($windowDispatches | map({repository: "githubnext/central-agentic-ops", kind: "actions-run", ref: (.id | tostring)}))
              + ($targetResults | map(. as $result | $result.runIds[]? | {repository: $result.target, kind: "actions-run", ref: tostring})))
          }
        | if (.provenance | length) == 0 then
            .provenance = [{repository: "githubnext/central-agentic-ops", kind: "commit", ref: "35c7c3cbd319632f85784cce196e57c0f61db9a0"}]
          else . end
      )'
}

case ${1:-} in
    --definition)
        [[ $# -eq 1 ]] || fail "--definition takes no arguments"
        definition
        ;;
    --metric)
        [[ $# -eq 2 ]] || fail "usage: $0 --metric <id>"
        score_metric "$2"
        ;;
    --collect-batch)
        [[ $# -eq 1 ]] || fail "--collect-batch takes no arguments"
        collect_batch
        ;;
    "")
        score_metric "efficient-reliable-share"
        ;;
    *)
        fail "usage: $0 [--definition | --metric <id> | --collect-batch]"
        ;;
esac