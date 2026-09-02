#!/usr/bin/env bash

set -uo pipefail

authorized=false
reason="control policy admission did not complete"
admission_dir=$(mktemp -d "${RUNNER_TEMP:-/tmp}/cao-admission.XXXXXX")
policy_file="$admission_dir/central-agentic-ops.json"
resolver="$admission_dir/resolve.mjs"
effective_file="$admission_dir/effective-policy.json"
trap 'rm -rf "$admission_dir"' EXIT

emit_admission() {
  reason=${reason//$'\r'/ }
  reason=${reason//$'\n'/ }
  {
    echo "authorized=$authorized"
    echo "reason=$reason"
  } >> "$GITHUB_OUTPUT"
  {
    echo "## Central Agentic Ops admission"
    echo
    if [ "$authorized" = "true" ]; then
      echo "Authorized package \`$CAO_PACKAGE\` as \`$CAO_ROLE\`."
    else
      echo "Skipped package \`$CAO_PACKAGE\` as \`$CAO_ROLE\`: $reason"
    fi
  } >> "$GITHUB_STEP_SUMMARY"
}

CAO_WORKER=${CAO_WORKER:-}
[ "${CAO_ROLE:-}" != "orchestrator" ] || CAO_WORKER=""

if [ -z "${CAO_PACKAGE:-}" ] || [ -z "${CAO_ROLE:-}" ]; then
  reason="admission requires a package and control role"
elif ! [[ "${WORKFLOW_SHA:-}" =~ ^[0-9a-fA-F]{40,64}$ ]]; then
  reason="github.workflow_sha must be an exact commit SHA"
elif ! gh api --method GET "repos/${GITHUB_REPOSITORY}/contents/.github/central-agentic-ops.json" \
  -f ref="$WORKFLOW_SHA" --jq '.content' | base64 -d > "$policy_file"; then
  reason="cannot read .github/central-agentic-ops.json at github.workflow_sha"
elif ! gh api --method GET "repos/${GITHUB_REPOSITORY}/contents/.github/cao/resolve.mjs" \
  -f ref="$WORKFLOW_SHA" --jq '.content' | base64 -d > "$resolver"; then
  reason="cannot read the control policy resolver at github.workflow_sha"
elif ! CAO_TARGET_REPOSITORY="${TARGET_REPO:-}" \
  CAO_REQUESTED_MODE="${REQUESTED_MODE:-}" \
  CAO_REQUESTED_MAX_REPOSITORIES="${REQUESTED_MAX_REPOS:-}" \
  CAO_REQUESTED_ROLLOUT_PERCENT="${REQUESTED_ROLLOUT_PERCENT:-}" \
  node "$resolver" --effective "$policy_file" > "$effective_file"; then
  reason="control policy validation failed"
elif ! jq -e '.authorized | type == "boolean"' "$effective_file" >/dev/null; then
  reason="control policy resolver returned an invalid admission result"
elif [ "$(jq -r '.authorized' "$effective_file")" = "true" ]; then
  authorized=true
  reason="authorized"
else
  reason=$(jq -r '.reason // "control policy denied this run"' "$effective_file")
fi

emit_admission