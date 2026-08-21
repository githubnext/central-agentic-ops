#!/usr/bin/env bash

set -euo pipefail

readonly REPOSITORY="githubnext/central-agentic-ops"
readonly ADOPTION_COMMIT="35c7c3cbd319632f85784cce196e57c0f61db9a0"

fail() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

definition() {
    jq -n \
        --arg repository "$REPOSITORY" \
        --arg adoption_commit "$ADOPTION_COMMIT" \
        '{
            schemaVersion: 3,
            slug: "dependabot-release-train-updater",
            sourcePath: ".github/workflows/dependabot-release-train-updater.md",
            repository: $repository,
            workflowName: "Dependabot / Release Train Updater",
            adoption: {
                commit: $adoption_commit,
                adoptedAt: "2026-08-18T17:54:55Z",
                baselineCommit: "ed9921bfd3aa8f95f9cc8dd30f87d0dbca97a42b",
                baselineAt: "2026-08-18T12:20:21Z"
            },
            evaluation: {
                mode: "attainment-only"
            },
            evidence: {
                key: "dependabot-release-train-validated-resolutions-v1",
                repositories: [$repository],
                opportunity: "Matured dependency pull requests or security-alert opportunities in repositories named by immutable central workflow run display titles.",
                filters: [
                    "Dispatch targets are owner/repository names parsed from Dependabot / Release Train Updater Actions run display titles.",
                    "Opportunities are pull requests created in the window, matured for 14 days by observedAt, and classified from title, author, labels, and changed files.",
                    "Dependency opportunities are Dependabot-authored pull requests or pull requests changing dependency manifests or lockfiles.",
                    "Security opportunities have security labels, security title indicators, or Dependabot security indicators.",
                    "Validated resolutions are merged by windowEnd, change dependency manifests or lockfiles, and have successful evidence for every configured required check at the merge commit.",
                    "Unavailable required-check configuration or merge-commit check evidence cannot establish a validated resolution."
                ],
                collection: "Batch central Actions runs over the complete requested span, fetch each target pull-request population once for that span, classify locally, and fetch merge-commit check evidence only for eligible merged dependency candidates.",
                window: {
                    durationDays: 30,
                    cadenceDays: 30,
                    maturationDays: 14
                }
            },
            model: {
                architecture: "Deterministic opportunity-normalized attainment shares",
                recommendation: "Use the validated dependency resolution share as primary and the security-opportunity resolution share as a diagnostic; report missing when no eligible opportunity evidence exists.",
                presentation: {
                    label: "Validated dependency resolution attainment",
                    betterLabel: "Higher validated resolution share"
                }
            },
            summary: {
                nativeLabel: "Validated dependency resolution share"
            },
            metrics: [
                {
                    id: "validated-resolution-share",
                    name: "Validated dependency resolution share",
                    role: "primary",
                    formula: "validatedResolutions / eligibleOpportunities",
                    direction: "increase",
                    presentation: {
                        name: "Validated dependency resolution share",
                        legendLabel: "Validated resolution",
                        transform: "identity"
                    }
                },
                {
                    id: "security-resolution-share",
                    name: "Security-opportunity resolution share",
                    role: "diagnostic",
                    formula: "securityValidatedResolutions / securityEligibleOpportunities",
                    direction: "increase",
                    presentation: {
                        name: "Security-opportunity resolution share",
                        legendLabel: "Security resolution",
                        transform: "identity"
                    }
                }
            ],
            validationExamples: {
                targetAttained: {
                    status: "observed",
                    eligibleOpportunities: 4,
                    validatedResolutions: 4,
                    securityEligibleOpportunities: 2,
                    securityValidatedResolutions: 2
                },
                targetMissed: {
                    status: "observed",
                    eligibleOpportunities: 4,
                    validatedResolutions: 0,
                    securityEligibleOpportunities: 2,
                    securityValidatedResolutions: 0
                },
                missing: {
                    status: "missing",
                    eligibleOpportunities: null,
                    validatedResolutions: null,
                    securityEligibleOpportunities: null,
                    securityValidatedResolutions: null
                },
                malformed: {
                    status: "observed",
                    eligibleOpportunities: 1,
                    validatedResolutions: 2,
                    securityEligibleOpportunities: "unknown",
                    securityValidatedResolutions: 0
                }
            }
        }'
}

score_metric() {
    metric_id=$1
    metric_evidence=$(cat)
    printf '%s\n' "$metric_evidence" | jq -e . >/dev/null 2>&1 || {
        printf 'null\n'
        return
    }

    case "$metric_id" in
        validated-resolution-share)
            printf '%s\n' "$metric_evidence" | jq '
                if .status != "observed"
                    or (.eligibleOpportunities | type) != "number"
                    or (.validatedResolutions | type) != "number"
                    or .eligibleOpportunities <= 0
                    or .validatedResolutions < 0
                    or .validatedResolutions > .eligibleOpportunities
                    or (.eligibleOpportunities | floor) != .eligibleOpportunities
                    or (.validatedResolutions | floor) != .validatedResolutions
                then null
                else ([1, (.validatedResolutions / .eligibleOpportunities)] | min) * 1000000 | round / 1000000
                end'
            ;;
        security-resolution-share)
            printf '%s\n' "$metric_evidence" | jq '
                if .status != "observed"
                    or (.securityEligibleOpportunities | type) != "number"
                    or (.securityValidatedResolutions | type) != "number"
                    or .securityEligibleOpportunities <= 0
                    or .securityValidatedResolutions < 0
                    or .securityValidatedResolutions > .securityEligibleOpportunities
                    or (.securityEligibleOpportunities | floor) != .securityEligibleOpportunities
                    or (.securityValidatedResolutions | floor) != .securityValidatedResolutions
                then null
                else ([1, (.securityValidatedResolutions / .securityEligibleOpportunities)] | min) * 1000000 | round / 1000000
                end'
            ;;
        *)
            fail "unknown metric: $metric_id"
            ;;
    esac
}

dependency_path_filter='test("(^|/)(package(-lock)?\\.json|npm-shrinkwrap\\.json|yarn\\.lock|pnpm-lock\\.yaml|bun\\.lockb?|deno\\.lock|requirements[^/]*\\.txt|constraints[^/]*\\.txt|Pipfile(\\.lock)?|poetry\\.lock|pyproject\\.toml|uv\\.lock|setup\\.(py|cfg)|environment[^/]*\\.ya?ml|Gemfile(\\.lock)?|gems\\.lock(ed)?|go\\.(mod|sum|work)|Cargo\\.(toml|lock)|composer\\.(json|lock)|mix\\.(exs|lock)|pubspec\\.(yaml|lock)|Package\\.swift|Podfile(\\.lock)?|Cartfile(\\.resolved)?|packages?\\.lock\\.json|Directory\\.Packages\\.props|pom\\.xml|build\\.gradle(\\.kts)?|gradle\\.lockfile|dependencies\\.lock|MODULE\\.bazel(\\.lock)?|WORKSPACE|flake\\.(nix|lock)|renovate\\.json|dependabot\\.ya?ml)$"; "i")'

api_json() {
    output_file=$1
    shift
    if gh api "$@" >"$output_file" 2>/dev/null; then
        return 0
    fi
    rm -f "$output_file"
    return 1
}

collect_actions_runs() {
    destination=$1
    span_start=$2
    span_end=$3
    endpoint="repos/$REPOSITORY/actions/runs?per_page=100&created=${span_start}..${span_end}"
    gh api --paginate "$endpoint" --jq '.workflow_runs[]' 2>/dev/null | jq -s '.' >"$destination"
}

collect_target_pulls() {
    target=$1
    span_start=$2
    span_end=$3
    destination=$4
    query="repo:${target} is:pr created:${span_start}..${span_end}"
    cursor=null
    printf '[]\n' >"$destination"

    while :; do
        page="$work_dir/graphql-page.json"
        if ! gh api graphql \
            -f query='query($searchQuery: String!, $cursor: String) { search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { ... on PullRequest { number url title createdAt mergedAt baseRefName author { login } labels(first: 100) { nodes { name } } mergeCommit { oid } } } } }' \
            -f searchQuery="$query" \
            -F cursor="$cursor" >"$page" 2>/dev/null; then
            return 1
        fi
        jq -s '.[0] + [.[1].data.search.nodes[]]' "$destination" "$page" >"$destination.next"
        mv "$destination.next" "$destination"
        has_next=$(jq -r '.data.search.pageInfo.hasNextPage' "$page")
        [[ $has_next == true ]] || break
        cursor=$(jq -r '.data.search.pageInfo.endCursor' "$page")
    done
}

fetch_pull_files() {
    target=$1
    number=$2
    destination=$3
    gh api --paginate "repos/$target/pulls/$number/files?per_page=100" --jq '.[].filename' 2>/dev/null | jq -Rsc 'split("\n") | map(select(length > 0))' >"$destination"
}

checks_validate_resolution_uncached() {
    target=$1
    branch=$2
    merge_commit=$3
    cache_key=$(printf '%s-%s' "$target" "$branch" | tr '/ :' '___')
    required_file="$work_dir/required-$cache_key.json"
    unavailable_file="$work_dir/required-$cache_key.unavailable"

    if [[ ! -f $required_file && ! -f $unavailable_file ]]; then
        if ! api_json "$required_file" "repos/$target/branches/$branch/protection/required_status_checks"; then
            : >"$unavailable_file"
        fi
    fi
    [[ -f $required_file ]] || return 1

    required_contexts=$(jq -c '[.checks[]?.context, .contexts[]?] | map(select(type == "string" and length > 0)) | unique' "$required_file")
    [[ $(printf '%s\n' "$required_contexts" | jq 'length') -gt 0 ]] || return 1

    checks_file="$work_dir/checks-$merge_commit.json"
    statuses_file="$work_dir/statuses-$merge_commit.json"
    gh api --paginate -H 'Accept: application/vnd.github+json' "repos/$target/commits/$merge_commit/check-runs?per_page=100" --jq '.check_runs[]' 2>/dev/null | jq -s '.' >"$checks_file" || return 1
    api_json "$statuses_file" "repos/$target/commits/$merge_commit/status" || return 1
    [[ $(jq 'length' "$checks_file") -gt 0 || $(jq '.statuses | length' "$statuses_file") -gt 0 ]] || return 1

    jq -en \
        --argjson required "$required_contexts" \
        --slurpfile checks "$checks_file" \
        --slurpfile statuses "$statuses_file" '
        [$checks[0][] | select(.conclusion == "success") | .name] as $successfulChecks
        | [$statuses[0].statuses[]? | select(.state == "success") | .context] as $successfulStatuses
        | all($required[] as $context; (($successfulChecks + $successfulStatuses) | index($context)) != null)' >/dev/null
}

checks_validate_resolution() {
    target=$1
    branch=$2
    merge_commit=$3
    result_key=$(printf '%s-%s' "$target" "$merge_commit" | tr '/' '_')
    result_file="$work_dir/validation-$result_key"
    if [[ -f $result_file ]]; then
        [[ $(cat "$result_file") == true ]]
        return
    fi
    if checks_validate_resolution_uncached "$target" "$branch" "$merge_commit"; then
        printf 'true\n' >"$result_file"
        return 0
    fi
    printf 'false\n' >"$result_file"
    return 1
}

collect_batch() {
    request_file="$work_dir/request.json"
    cat >"$request_file"
    jq -e '
        type == "array" and length > 0
        and all(.[];
            (.windowStart | type == "string" and fromdateiso8601)
            and (.windowEnd | type == "string" and fromdateiso8601)
            and (.observedAt | type == "string" and fromdateiso8601)
            and (.windowStart | fromdateiso8601) < (.windowEnd | fromdateiso8601)
            and (.windowEnd | fromdateiso8601) <= (.observedAt | fromdateiso8601))' "$request_file" >/dev/null \
        || fail "invalid batch request"

    span_start=$(jq -r 'map(.windowStart) | min' "$request_file")
    span_end=$(jq -r 'map(.windowEnd) | max' "$request_file")
    runs_file="$work_dir/actions-runs.json"
    runs_available=true
    if ! collect_actions_runs "$runs_file" "$span_start" "$span_end"; then
        runs_available=false
        printf '[]\n' >"$runs_file"
    fi

    targets_file="$work_dir/targets.json"
        jq --arg workflow "Dependabot / Release Train Updater" '
        [ .[]
          | select(.name == $workflow or .workflow_name == $workflow)
                    | . as $run
                    | (($run.display_title // "") | split("\u00b7")) as $titleParts
                    | select(($titleParts | length) == 3)
                    | ($titleParts[1] | gsub("^\\s+|\\s+$"; ""))
                    | select(test("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$"))
        ] | unique' "$runs_file" >"$targets_file"

    target_records="$work_dir/target-records.json"
    printf '[]\n' >"$target_records"
    while IFS= read -r target; do
        target_key=$(printf '%s' "$target" | tr '/' '_')
        pulls_file="$work_dir/pulls-$target_key.json"
        target_available=true
        if ! collect_target_pulls "$target" "$span_start" "$span_end" "$pulls_file"; then
            target_available=false
            printf '[]\n' >"$pulls_file"
        fi
        jq -n --arg repository "$target" --argjson available "$target_available" --slurpfile pulls "$pulls_file" \
            '{repository: $repository, available: $available, pulls: $pulls[0]}' >"$work_dir/target-record.json"
        jq -s '.[0] + [.[1]]' "$target_records" "$work_dir/target-record.json" >"$target_records.next"
        mv "$target_records.next" "$target_records"
    done < <(jq -r '.[]' "$targets_file")

    results_file="$work_dir/results.jsonl"
    : >"$results_file"
    window_count=$(jq 'length' "$request_file")
    window_index=0
    while [[ $window_index -lt $window_count ]]; do
        window_file="$work_dir/window-$window_index.json"
        jq ".[$window_index]" "$request_file" >"$window_file"
        window_start=$(jq -r '.windowStart' "$window_file")
        window_end=$(jq -r '.windowEnd' "$window_file")
        observed_at=$(jq -r '.observedAt' "$window_file")
        cutoff_epoch=$(jq -nr --arg observed "$observed_at" '$observed | fromdateiso8601 - (14 * 86400)')

        opportunities_file="$work_dir/opportunities-$window_index.jsonl"
        : >"$opportunities_file"
        while IFS=$'\t' read -r target target_available number title created_at merged_at branch author merge_commit; do
            [[ $target_available == true ]] || continue
            created_epoch=$(jq -nr --arg value "$created_at" '$value | fromdateiso8601')
            start_epoch=$(jq -nr --arg value "$window_start" '$value | fromdateiso8601')
            end_epoch=$(jq -nr --arg value "$window_end" '$value | fromdateiso8601')
            [[ $created_epoch -ge $start_epoch && $created_epoch -lt $end_epoch && $created_epoch -le $cutoff_epoch ]] || continue

            files_file="$work_dir/files-$(printf '%s-%s' "$target" "$number" | tr '/' '_').json"
            files_unavailable="$files_file.unavailable"
            if [[ ! -f $files_file && ! -f $files_unavailable ]] && ! fetch_pull_files "$target" "$number" "$files_file"; then
                : >"$files_unavailable"
            fi
            if [[ -f $files_unavailable ]]; then
                continue
            fi
            dependency_files=$(jq --arg filter "$dependency_path_filter" '[.[] | select(test("(^|/)(package(-lock)?\\.json|npm-shrinkwrap\\.json|yarn\\.lock|pnpm-lock\\.yaml|bun\\.lockb?|deno\\.lock|requirements[^/]*\\.txt|constraints[^/]*\\.txt|Pipfile(\\.lock)?|poetry\\.lock|pyproject\\.toml|uv\\.lock|setup\\.(py|cfg)|environment[^/]*\\.ya?ml|Gemfile(\\.lock)?|gems\\.lock(ed)?|go\\.(mod|sum|work)|Cargo\\.(toml|lock)|composer\\.(json|lock)|mix\\.(exs|lock)|pubspec\\.(yaml|lock)|Package\\.swift|Podfile(\\.lock)?|Cartfile(\\.resolved)?|packages?\\.lock\\.json|Directory\\.Packages\\.props|pom\\.xml|build\\.gradle(\\.kts)?|gradle\\.lockfile|dependencies\\.lock|MODULE\\.bazel(\\.lock)?|WORKSPACE|flake\\.(nix|lock)|renovate\\.json|dependabot\\.ya?ml)$"; "i"))]' "$files_file")
            labels=$(jq -c --arg target "$target" --argjson number "$number" '.[] | select(.repository == $target) | .pulls[] | select(.number == $number) | [.labels.nodes[].name]' "$target_records")
            is_dependabot=$(jq -nr --arg author "$author" '$author | ascii_downcase | startswith("dependabot")')
            dependency_file_count=$(printf '%s\n' "$dependency_files" | jq 'length')
            [[ $is_dependabot == true || $dependency_file_count -gt 0 ]] || continue

            is_security=$(jq -nr --arg title "$title" --arg author "$author" --argjson labels "$labels" '
                (($title | test("(^|[^a-z])(security|vulnerability|cve-[0-9]|ghsa-|dependabot alert)([^a-z]|$)"; "i"))
                 or any($labels[]; test("security|vulnerability|dependabot.*security"; "i"))
                 or (($author | ascii_downcase | startswith("dependabot")) and any($labels[]; test("security|vulnerability"; "i"))))')
            validated=false
            if [[ $merged_at != null && $merge_commit != null && $dependency_file_count -gt 0 ]]; then
                merged_epoch=$(jq -nr --arg value "$merged_at" '$value | fromdateiso8601')
                if [[ $merged_epoch -le $end_epoch ]] && checks_validate_resolution "$target" "$branch" "$merge_commit"; then
                    validated=true
                fi
            fi
            jq -cn \
                --arg repository "$target" --argjson number "$number" --arg createdAt "$created_at" \
                --argjson security "$is_security" --argjson validated "$validated" --arg mergeCommit "$merge_commit" \
                '{repository: $repository, pullRequest: $number, createdAt: $createdAt, security: $security, validated: $validated, mergeCommit: (if $mergeCommit == "null" then null else $mergeCommit end)}' \
                >>"$opportunities_file"
        done < <(jq -r '.[] | .repository as $repository | .available as $available | .pulls[] | [$repository, $available, .number, .title, .createdAt, (.mergedAt // "null"), .baseRefName, (.author.login // ""), (.mergeCommit.oid // "null")] | @tsv' "$target_records")

        jq -s '.' "$opportunities_file" >"$work_dir/opportunities-$window_index.json"
        eligible=$(jq 'length' "$work_dir/opportunities-$window_index.json")
        validated=$(jq '[.[] | select(.validated)] | length' "$work_dir/opportunities-$window_index.json")
        security_eligible=$(jq '[.[] | select(.security)] | length' "$work_dir/opportunities-$window_index.json")
        security_validated=$(jq '[.[] | select(.security and .validated)] | length' "$work_dir/opportunities-$window_index.json")
        collection_status=observed
        [[ $runs_available == true && $eligible -gt 0 ]] || collection_status=missing

        provenance_file="$work_dir/provenance-$window_index.json"
        jq -n --arg repository "$REPOSITORY" --arg ref "$ADOPTION_COMMIT" '[{repository: $repository, kind: "frozen-contract", ref: $ref}]' >"$provenance_file"
        jq --arg start "$window_start" --arg end "$window_end" --arg repository "$REPOSITORY" '
            [.[] | select(.created_at >= $start and .created_at < $end) | {repository: $repository, kind: "actions-run", ref: ("run:" + (.id | tostring))}]' "$runs_file" >"$work_dir/run-provenance.json"
        jq -s '.[0] + .[1]' "$provenance_file" "$work_dir/run-provenance.json" >"$provenance_file.next"
        mv "$provenance_file.next" "$provenance_file"
        jq '[.[] | select(.mergeCommit != null) | {repository: .repository, kind: "merge-commit", ref: .mergeCommit}]' "$work_dir/opportunities-$window_index.json" >"$work_dir/merge-provenance.json"
        jq -s '.[0] + .[1] | unique_by([.repository, .kind, .ref])' "$provenance_file" "$work_dir/merge-provenance.json" >"$provenance_file.next"
        mv "$provenance_file.next" "$provenance_file"

        jq -n \
            --arg status "$collection_status" --arg windowStart "$window_start" --arg windowEnd "$window_end" --arg observedAt "$observed_at" \
            --argjson eligible "$eligible" --argjson validated "$validated" --argjson securityEligible "$security_eligible" --argjson securityValidated "$security_validated" \
            --slurpfile targets "$targets_file" --slurpfile opportunities "$work_dir/opportunities-$window_index.json" --slurpfile provenance "$provenance_file" '
            {
                evidence: {
                    key: "dependabot-release-train-validated-resolutions-v1",
                    repositories: (["githubnext/central-agentic-ops"] + $targets[0] | unique),
                    opportunity: "Matured dependency pull requests or security-alert opportunities in dispatched targets",
                    filters: ["created in window", "matured 14 days", "Dependabot author or dependency file change", "validated merge with dependency file changes and successful configured required checks"],
                    collection: "Batched central Actions run discovery and one pull-request corpus per dispatched target over the complete requested span",
                    window: {durationDays: 30, cadenceDays: 30, maturationDays: 14, windowStart: $windowStart, windowEnd: $windowEnd, observedAt: $observedAt},
                    status: $status,
                    eligibleOpportunities: (if $status == "observed" then $eligible else null end),
                    validatedResolutions: (if $status == "observed" then $validated else null end),
                    securityEligibleOpportunities: (if $status == "observed" then $securityEligible else null end),
                    securityValidatedResolutions: (if $status == "observed" then $securityValidated else null end),
                    targets: $targets[0],
                    opportunities: $opportunities[0]
                },
                provenance: $provenance[0]
            }' >>"$results_file"
        window_index=$((window_index + 1))
    done
    jq -s '.' "$results_file"
}

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
workspace_root=$(CDPATH= cd -- "$script_dir/../.." && pwd)
work_dir="$workspace_root/.aw-value-dependabot-release-train-updater.$$"
mkdir "$work_dir"
cleanup_dir=$work_dir
trap 'rm -rf "$cleanup_dir"' EXIT HUP INT TERM

case ${1:-} in
    --definition)
        [[ $# -eq 1 ]] || fail "usage: $0 --definition"
        definition
        ;;
    --collect-batch)
        [[ $# -eq 1 ]] || fail "usage: $0 --collect-batch"
        command -v gh >/dev/null 2>&1 || fail "gh is required for collection"
        collect_batch
        ;;
    --metric)
        [[ $# -eq 2 ]] || fail "usage: $0 --metric <id>"
        score_metric "$2"
        ;;
    '')
        score_metric "validated-resolution-share"
        ;;
    *)
        fail "usage: $0 [--definition|--collect-batch|--metric <id>]"
        ;;
esac