# What Optimization / AI Credit Auditor measures

This page explains the chart in plain language. It defines what was measured; it does not decide whether the workflow caused the observed changes.

![Optimization / AI Credit Auditor outcome measures after adoption](optimization-ai-credit-auditor-timeline.svg)

## How to read the chart

- Observations begin at workflow adoption on `2026-08-18`.
- No comparable pre-adoption evidence is available, so the chart shows attainment rather than improvement.
- Each dot is one immutable observation. Missing evidence is omitted, never treated as zero.
- Workflow runs show execution activity only. They do not prove repository value.

## What was measured

### Accurate audit-day share

- **What it tells you:** Accurate audit-day share. This is a `primary` measure.
- **Normalized scoring formula:** `matched eligible target-days / eligible target-days with both retained completed-run logs and a readable durable snapshot`
- **Goal:** Higher values are better.
- **Chart display:** The chart shows the normalized score directly.

### Completed-run coverage

- **What it tells you:** Completed-run coverage. This is a `diagnostic` measure.
- **Normalized scoring formula:** `sum min(snapshot overall.total_runs, retained completed runs) / sum retained completed runs across paired eligible target-days`
- **Goal:** Higher values are better.
- **Chart display:** The chart shows the normalized score directly.

### Durable-history coverage

- **What it tells you:** Durable-history coverage. This is a `diagnostic` measure.
- **Normalized scoring formula:** `eligible target-days with a readable durable snapshot / eligible target-days established from retained completed-run logs`
- **Goal:** Higher values are better.
- **Chart display:** The chart shows the normalized score directly.

## Evidence rules

- **Repository:** `githubnext/central-agentic-ops`
- **Evidence population:** A target repository and UTC day containing at least one completed agentic workflow run, among targets immutably named by dispatched Optimization / AI Credit Auditor runs.
- **Collection:** Batch central Actions discovery over the full request, fetch gh aw logs once per discovered target for the total date span, and read daily snapshots from immutable central repo-memory commits at or before observedAt.
- **Observation window:** 1 days, sampled every 1 days
- **Maturation delay:** 1 days
- **Filters:** `Discover targets only from central Actions run display_title values matching Token audit · owner/repo · mode.`; `Include only retained target runs with status completed and created_at within the target-day window.`; `Empty completed-run windows are ineligible.`; `A day is accurate only when the durable daily snapshot reproduces overall and per-workflow completed-run aggregates.`; `Absent or inaccessible retained logs and snapshots remain explicitly missing; numeric zero is accepted only from retained evidence.`

The frozen definitions and formulas are applied to every post-adoption observation. The structured evidence, exact snapshots, provenance, and normalized scores are in [optimization-ai-credit-auditor-timeline.json](optimization-ai-credit-auditor-timeline.json).

## Important limitation

This report can show whether the intended outcome is attained after adoption. It cannot estimate change from pre-adoption conditions or attribute attainment to the workflow.

Value-function SHA-256: `87e7dcc0ed2e8d64e93a5023f40f3476f3677314b1711d140113a488d930a5b1`

