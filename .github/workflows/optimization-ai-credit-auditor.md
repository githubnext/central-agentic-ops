---
emoji: ":mag:"

description: "Daily audit of AI Credit (AIC) usage across all agentic workflows with historical trend tracking"

name: "Optimization / AI Credit Auditor"

max-ai-credits: 350
max-daily-ai-credits: -1

on:
  workflow_dispatch:
    inputs:
      target_repo:
        required: true
        type: string
      safe_output_repo:
        required: true
        type: string
      safe_output_mode:
        type: string
      correlation_id:
        type: string
      central_repo:
        type: string
      control_plane_run_url:
        type: string
      batch_label:
        type: string

checkout:
  - repository: ${{ (inputs.safe_output_mode || 'review') == 'review' && (inputs.safe_output_repo || github.repository) || inputs.target_repo }}
    github-token: ${{ secrets.GH_AW_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}
    fetch-depth: 0
    fetch: ["*"]
    current: true
  - repository: ${{ inputs.target_repo }}
    github-token: ${{ secrets.GH_AW_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}
    path: target

env:
  CENTRAL_AGENTIC_OPS_PACKAGE_ENABLED: ${{ vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_ENABLED || 'true' }}
  CENTRAL_AGENTIC_OPS_WORKER_ENABLED: ${{ vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_AUDITOR_ENABLED || 'true' }}
  CENTRAL_AGENTIC_OPS_WORKER_MAX_MODE: ${{ vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_AUDITOR_MAX_MODE || 'review' }}
  GH_AW_SAFE_OUTPUT_MODE: ${{ inputs.safe_output_mode || 'review' }}
  REVIEW_OUTPUT_REPO: ${{ inputs.safe_output_repo || github.repository }}
  SAFE_OUTPUT_REPO: ${{ (inputs.safe_output_mode || 'review') == 'review' && (inputs.safe_output_repo || github.repository) || inputs.target_repo }}
  TARGET_REPO: ${{ inputs.target_repo || '' }}

if: >-
  (vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_ENABLED || 'true') == 'true' &&
  (vars.CENTRAL_AGENTIC_OPS_OPTIMIZATION_AUDITOR_ENABLED || 'true') == 'true'

imports:
  - uses: shared/control.md
    with:
      bundle: optimization
      role: worker
      allowed_owners: ${{ vars.CENTRAL_AGENTIC_OPS_ALLOWED_OWNERS || github.repository_owner }}

permissions:
  contents: read
  actions: read
  copilot-requests: write
  issues: read
  pull-requests: read

strict: true

network:
  allowed:
    - defaults
    - python

run-name: "Token audit · ${{ inputs.target_repo }} · ${{ inputs.safe_output_mode || 'review' }}"

concurrency:
  group: "${{ github.workflow }}-${{ inputs.target_repo }}"
  cancel-in-progress: true

graders:
  operational-value:
    run: .github/graders/optimization-ai-credit-auditor-operational-value.sh

tracker-id: optimization-ai-credit-auditor

tools:
  github:
    mode: remote
    toolsets: [repos, issues, pull_requests, actions]
  agentic-workflows:
  bash:
    - "*"
  repo-memory:
    branch-name: "memory/token-audit-${{ inputs.central_repo }}-${{ inputs.target_repo }}"
    description: "Historical daily workflow AI credit snapshots (shared with optimization-ai-credit-optimizer)"
    file-glob: ["*.json", "*.jsonl", "*.csv", "*.md"]
    max-file-size: 102400
    max-patch-size: 51200

safe-outputs:
  create-issue:
    expires: 3d
    title-prefix: "[optimization:ai-credit-auditor] "
    max: 1
    close-older-issues: true
    target-repo: ${{ (inputs.safe_output_mode || 'review') == 'review' && (inputs.safe_output_repo || github.repository) || inputs.target_repo }}
  upload-artifact:
    max-uploads: 5
    retention-days: 14
    skip-archive: true
    allowed-paths:
      - "/tmp/gh-aw/token-audit/charts/**"
  upload-asset:
    #target-repo: ${{ env.SAFE_OUTPUT_REPO }} Does not compile with this, this is a bug
    allowed-exts: [.png, .jpg, .jpeg, .svg]
    max: 5

timeout-minutes: 25

steps:
  - name: Setup Python
    uses: actions/setup-python@v7.0.0
    with:
      python-version: "3.12"
  - name: Setup local chart workspace
    run: |
      mkdir -p /tmp/gh-aw/token-audit/charts /tmp/gh-aw/token-audit/site-packages
  - name: Install Python chart dependencies
    run: |
      python3 -m pip install --quiet --target /tmp/gh-aw/token-audit/site-packages pandas matplotlib seaborn
  - name: Download agentic workflow logs
    env:
      GH_TOKEN: ${{ steps.github-mcp-app-token.outputs.token || secrets.GH_AW_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}
      GH_REPO: ${{ inputs.target_repo }}
    run: |
      set -euo pipefail
      mkdir -p /tmp/gh-aw/token-audit
      PARTS_DIR=/tmp/gh-aw/token-audit/log-parts
      mkdir -p "$PARTS_DIR"
      WINDOW_END=$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID" --jq .created_at)
      WINDOW_START=$(date -u -d "$WINDOW_END - 24 hours" +%Y-%m-%dT%H:%M:%SZ)

      # Fetch logs per workflow to avoid repo-wide pagination truncation in
      # high-CI-volume repositories.
      FOUND_WORKFLOW=0
      for workflow in target/.github/workflows/*.md; do
        [ -f "$workflow" ] || continue

        WORKFLOW_ID=$(sed -n 's/^tracker-id:[[:space:]]*//p' "$workflow" | head -n 1 | tr -d '\r' | sed 's/[[:space:]]*$//')
        [ -n "$WORKFLOW_ID" ] || continue

        FOUND_WORKFLOW=1
        SAFE_WORKFLOW_ID=$(printf '%s' "$WORKFLOW_ID" | tr -cs 'A-Za-z0-9._-' '_')
        PART_FILE="$PARTS_DIR/$SAFE_WORKFLOW_ID.json"
        PART_EXIT=0
        gh aw logs "$WORKFLOW_ID" \
          --start-date -2d \
          --json \
          -c 100 \
          > "$PART_FILE" || PART_EXIT=$?

        if ! jq -e . "$PART_FILE" >/dev/null 2>&1; then
          echo "⚠️ $WORKFLOW_ID: invalid log JSON (exit code $PART_EXIT)"
          rm -f "$PART_FILE"
          continue
        fi

        COUNT=$(jq '(.runs // []) | length' "$PART_FILE")
        if [ "$COUNT" -gt 0 ]; then
          echo "✅ $WORKFLOW_ID: downloaded $COUNT runs (exit code $PART_EXIT)"
        else
          echo "⚠️ $WORKFLOW_ID: no log data (exit code $PART_EXIT)"
          rm -f "$PART_FILE"
        fi
      done

      if [ "$FOUND_WORKFLOW" -eq 1 ] && ls "$PARTS_DIR"/*.json >/dev/null 2>&1; then
        jq -s --arg windowStart "$WINDOW_START" --arg windowEnd "$WINDOW_END" '
          (map(.runs // []) | add // [] | unique_by(.run_id)
            | map(select(.created_at >= $windowStart and .created_at < $windowEnd))) as $runs |
          {
            window_start: $windowStart,
            window_end: $windowEnd,
            summary: {
              total_runs: ($runs | length),
              total_tokens: ($runs | map(.token_usage // 0) | add // 0),
              total_aic: ($runs | map(.aic // 0) | add // 0)
            },
            runs: $runs
          }
        ' "$PARTS_DIR"/*.json > /tmp/gh-aw/token-audit/workflow-logs.json
        TOTAL=$(jq '.runs | length' /tmp/gh-aw/token-audit/workflow-logs.json)
        echo "✅ Downloaded $TOTAL agentic workflow runs (last 24 hours)"
      else
        if [ "$FOUND_WORKFLOW" -eq 0 ]; then
          echo "⚠️ No agentic workflow sources found under target/.github/workflows"
        fi
        jq -cn --arg windowStart "$WINDOW_START" --arg windowEnd "$WINDOW_END" \
          '{window_start:$windowStart,window_end:$windowEnd,runs:[],summary:{}}' \
          > /tmp/gh-aw/token-audit/workflow-logs.json
      fi

source: githubnext/central-agentic-ops/.github/workflows/optimization-ai-credit-auditor.md@main
---

You are the Agentic Workflow Auditor — a workflow that tracks daily AI Credit (AIC) spend and token consumption across all agentic workflows in the target repository and maintains a historical record for trend analysis.

## Workspace Layout

Read target-repository evidence from `target/`. Treat the workspace root as the repository where safe outputs land.

In `live`, the workspace root may be the target repository itself. In `review`, the workspace root is the control-plane repository.

Recreate safe outputs there without pretending the control-plane repo is the target repo: keep issues as issues, prefer `upload_artifact` for charts and other audit evidence, and use `upload_asset` only when you need a persistent URL.

## Mission

1. Parse the pre-downloaded agentic workflow logs and compute per-workflow AI credit spend and token usage metrics.
2. Persist today's snapshot to repo-memory so the optimizer (and future runs of this audit) can read historical data.
3. Publish a concise audit issue summarizing today's AI credit spend and trend highlights.

## Data Sources

### Pre-downloaded logs

The workflow logs are at `/tmp/gh-aw/token-audit/workflow-logs.json`. The file is the raw JSON output of `gh aw logs --json` with this top-level shape:

```json
{
  "summary": { "total_runs": N, "total_tokens": N, ... },
  "runs": [ ... ],
  "tool_usage": [ ... ],
  "mcp_tool_usage": { ... },
  ...
}
```

Each element of `.runs` is a `RunData` object with (among others):

| Field | Type | Notes |
|---|---|---|
| `workflow_name` | string | Human-readable name |
| `workflow_path` | string | `.github/workflows/....lock.yml` |
| `aic` | float | AI Credits (AIC) consumed (primary billing metric; 1 AI credit = $0.01 USD) |
| `token_usage` | int | Total tokens (`omitempty` — treat missing/null as 0) |
| `effective_tokens` | int | Legacy normalized token metric (deprecated; use `aic` for billing) |
| `action_minutes` | float | Billable GitHub Actions minutes |
| `turns` | int | Number of agent turns |
| `duration` | string | Human-readable duration |
| `created_at` | ISO 8601 | Run creation time |
| `run_id` | int64 | Unique run ID |
| `url` | string | Link to the run |
| `status` | string | `completed`, `in_progress`, etc. |
| `conclusion` | string | `success`, `failure`, etc. |
| `error_count` | int | Errors encountered |
| `warning_count` | int | Warnings encountered |
| `token_usage_summary` | object or null | Firewall-level breakdown by model |

### Repo-memory (historical snapshots)

Previous snapshots live at `/tmp/gh-aw/repo-memory/default/`. For local runs, each daily snapshot is stored as `YYYY-MM-DD.json`. For central runs with `target_repo`, normalize the target repository by replacing `/` with `__` and use `<owner>__<repo>__YYYY-MM-DD.json` so multiple target repositories do not overwrite each other.

## Phase 1 — Process Logs

Write a Python script to `/tmp/gh-aw/token-audit/process_audit.py` and run it. The script must:

1. Load `/tmp/gh-aw/token-audit/workflow-logs.json`; preserve its `window_start` and `window_end`, and extract `.runs`.
2. Filter to `status == "completed"` runs only.
3. Group by `workflow_path` (falling back to `workflow_name` only when the path is absent) and compute per-workflow aggregates. Preserve both fields so distinct workflows with the same display name never merge:
   - `run_count`, `total_ai_credits`, `avg_ai_credits`, `total_tokens`, `avg_tokens`, `total_turns`, `avg_turns`, `total_action_minutes`, `error_count`, `warning_count`
4. Compute an overall summary: total runs, total AI credits, total tokens, total action minutes.
5. Sort workflows descending by `total_ai_credits`.
6. Save the result to `/tmp/gh-aw/token-audit/audit_snapshot.json` with this shape:

```json
{
  "date": "YYYY-MM-DD",
  "period_days": 1,
  "window_start": "ISO-8601",
  "window_end": "ISO-8601",
  "overall": {
    "total_runs": N,
    "total_ai_credits": F,
    "total_tokens": N,
    "total_action_minutes": F
  },
  "workflows": [
    {
      "workflow_name": "...",
      "workflow_path": ".github/workflows/example.lock.yml",
      "run_count": N,
      "total_ai_credits": F,
      "avg_ai_credits": F,
      "total_tokens": N,
      "avg_tokens": N,
      "total_turns": N,
      "avg_turns": F,
      "total_action_minutes": F,
      "error_count": N,
      "warning_count": N,
      "latest_run_url": "..."
    }
  ]
}
```

Handle null/missing `aic` and `token_usage` by treating them as 0.

## Phase 2 — Persist Snapshot to Repo-Memory

1. Read the snapshot from `/tmp/gh-aw/token-audit/audit_snapshot.json`.
2. Copy it to the snapshot file for today's UTC date. Use `/tmp/gh-aw/repo-memory/default/YYYY-MM-DD.json` for local runs, or `/tmp/gh-aw/repo-memory/default/<owner>__<repo>__YYYY-MM-DD.json` when `target_repo` is present.
3. This file is what the optimizer workflow reads to identify high-usage workflows.

Also maintain a rolling summary file that contains an array of daily overall totals (date, total_ai_credits, total_tokens, total_runs, total_action_minutes, active_workflows) for the last 90 entries. Use `/tmp/gh-aw/repo-memory/default/rolling-summary.json` for local runs, or `/tmp/gh-aw/repo-memory/default/<owner>__<repo>__rolling-summary.json` when `target_repo` is present. `active_workflows` must be the count of distinct workflows with `run_count >= 1` in that day's snapshot. Load the existing file, append today's entry, trim to 90, and save.

Do not append a synthetic zero-valued entry to `rolling-summary.json` when either of these conditions is true:

- the raw `.runs` array is empty
- the raw `.runs` array is non-empty but there are zero completed runs in the current window

Report those two cases differently in the issue as described below so the empty-window diagnosis stays precise while the historical trend remains unchanged.

## Phase 3 — Generate Charts

Create up to two chart images in `/tmp/gh-aw/token-audit/charts/` using Python, `matplotlib`, and `seaborn` with `whitegrid` styling:

1. **AI credit spend by workflow** (`ai_credits_by_workflow.png`): a horizontal bar chart of the top 15 workflows by total AI credits from `audit_snapshot.json`.
2. **Historical AI credit trend** (`ai_credits_trend.png`): a dual-axis line chart from `rolling-summary.json` with total AI credits on the primary y-axis and active workflows/day on the secondary y-axis.

Chart requirements:

- The preinstalled Python packages live in `/tmp/gh-aw/token-audit/site-packages`. Set `PYTHONPATH=/tmp/gh-aw/token-audit/site-packages${PYTHONPATH:+:$PYTHONPATH}` for every Python command that imports `pandas`, `matplotlib`, or `seaborn`, for example: `PYTHONPATH=/tmp/gh-aw/token-audit/site-packages${PYTHONPATH:+:$PYTHONPATH} python3 /tmp/gh-aw/token-audit/process_audit.py`.
- Use 300 DPI and a white background.
- Add clear axis labels and titles.
- Save only PNG files.
- For `ai_credits_trend.png`, label the secondary y-axis as `Active workflows/day` (or `Distinct workflows executed`) and plot daily distinct executed workflows from `active_workflows`.
- Do not plot the total number of workflows defined in the repository.
- If there are fewer than 2 rolling-summary points, skip the trend chart and explain why in the issue.
- After generating each chart, call `upload_asset` with its file path.
- In the issue template below, replace `UPLOAD_URL_WORKFLOW_PLACEHOLDER` with the URL returned for `ai_credits_by_workflow.png`.
- In the issue template below, replace `UPLOAD_URL_TREND_PLACEHOLDER` with the URL returned for `ai_credits_trend.png`.
- If a chart is skipped, omit that image markdown line entirely instead of leaving a placeholder behind.

## Phase 4 — Publish Audit Issue

Create an issue with these sections:

### Formatting Requirements

- Use `###` for main sections and `####` for subsections inside the issue body.
- Keep the executive summary and final observations visible without collapsible sections.
- Put verbose tables or supporting detail inside `<details><summary>...</summary>` blocks.
- If you cite specific workflow runs, format them as links like `[§12345](https://github.com/${{ github.repository }}/actions/runs/12345)` and include up to 3 under `**References:**`.

### Report Template

```
### 📊 Executive Summary

- **Period**: last 24 hours (YYYY-MM-DD to YYYY-MM-DD)
- **Total runs**: N
- **Total AI credits**: N.NN AIC
- **Total tokens**: N (formatted with commas)
- **Total Actions minutes**: X.X min
- **Active workflows**: N

### 🏆 Top 5 Workflows by AI Credit Spend

| Workflow | Runs | Total AI Credits | Avg AI Credits |
|---|---|---|---|
| ... | ... | ... | ... |

### 📈 Trends

Embed chart images using uploaded asset URLs when available:

![AI Credit Spend by Workflow](UPLOAD_URL_WORKFLOW_PLACEHOLDER)

![Historical AI Credit Trend](UPLOAD_URL_TREND_PLACEHOLDER)

Summarize AI credit, token, and active-workflow changes from `rolling-summary.json` when historical data is available.

<details>
<summary><b>Full Per-Workflow Breakdown</b></summary>

[Complete table of all workflows sorted by total AI credits]

</details>

### 💡 Observations

- Identify any workflow with >30% of total AI credits as a "heavy hitter"
- Note workflows with high error/warning counts relative to runs
- Flag any workflow whose avg AI credits per run exceeds 1.00 AIC

**Data snapshot**: `memory/token-audit/YYYY-MM-DD.json` or `memory/token-audit/<owner>__<repo>__YYYY-MM-DD.json` for central runs
```

## Important Notes

- Use `// 0` (null coalescing) in jq and `.get(field, 0)` in Python for nullable numeric fields (`aic`, `token_usage`).
- Distinguish between these two cases in the issue:
  - the raw `.runs` array is empty
  - the raw `.runs` array is non-empty but none of the runs are `status == "completed"`
- Report those cases differently:
  - if `len(runs) == 0` (or `jq '.runs | length' == 0`), say the collection window returned no runs
  - if `len(runs) > 0` and there are zero completed runs, say the collection window had runs but none completed yet
- Do not claim the raw log file was empty unless you verified `len(runs) == 0` (or `jq '.runs | length' == 0`).
- Keep the issue concise — the optimizer workflow will do the deep analysis.

## Experiment OTEL Span Attributes

If the file `/tmp/gh-aw/experiments/assignments.json` exists, read it and emit one OTEL span
attribute per experiment using the `otlp.cjs` `logSpan` helper:

```javascript
const fs = require('fs');
const assignmentsFile = '/tmp/gh-aw/experiments/assignments.json';
if (fs.existsSync(assignmentsFile)) {
  const assignments = JSON.parse(fs.readFileSync(assignmentsFile, 'utf8'));
  const names = Object.keys(assignments).sort();
  if (names.length > 0) {
    const attrs = { 'gh_aw.experiment.names': names.join(',') };
    for (const name of names) {
      attrs[`gh_aw.experiment.${name}`] = assignments[name];
    }
    const otlp = require('/tmp/gh-aw/actions/otlp.cjs');
    await otlp.logSpan('experiment', attrs);
  }
}
```

This enables filtering workflow runs by experiment variant in Datadog, Honeycomb, or any
OTLP-compatible backend. Attribute keys follow the pattern `gh_aw.experiment.<name>` with the
assigned variant as the value, plus `gh_aw.experiment.names` as a comma-separated index.