# What Optimization / AI Credit Optimizer measures

This page explains the chart in plain language. It defines what was measured; it does not decide whether the workflow caused the observed changes.

![Optimization / AI Credit Optimizer outcome measures after adoption](optimization-ai-credit-optimizer-timeline.svg)

## How to read the chart

- Observations begin at workflow adoption on `2026-08-18`.
- No comparable pre-adoption evidence is available, so the chart shows attainment rather than improvement.
- Each dot is one immutable observation. Missing evidence is omitted, never treated as zero.
- Workflow runs show execution activity only. They do not prove repository value.

## What was measured

### Efficient and reliable

- **What it tells you:** Efficient-and-reliable opportunity share. This is a `primary` measure.
- **Normalized scoring formula:** `efficientReliableOpportunities / comparableOpportunities`
- **Goal:** Higher values are better.
- **Chart display:** The chart shows the normalized score directly.

### Lower median AIC

- **What it tells you:** Lower-AIC opportunity share. This is a `diagnostic` measure.
- **Normalized scoring formula:** `lowerAicOpportunities / comparableOpportunities`
- **Goal:** Higher values are better.
- **Chart display:** The chart shows the normalized score directly.

### Reliability preserved

- **What it tells you:** Reliability-preserved opportunity share. This is a `diagnostic` measure.
- **Normalized scoring formula:** `reliabilityPreservedOpportunities / comparableOpportunities`
- **Goal:** Higher values are better.
- **Chart display:** The chart shows the normalized score directly.

## Evidence rules

- **Repository:** `githubnext/central-agentic-ops`
- **Evidence population:** A dispatched repository target in a seven-day window for which the completed first-half runs identify a highest-total-AIC workflow and that same workflow has completed and successful-run evidence in both halves.
- **Collection:** Batch central Actions runs for all windows, deduplicate dispatched targets, invoke gh aw logs once per target for the total requested span, and derive each midpoint comparison locally from immutable target run IDs.
- **Observation window:** 7 days, sampled every 7 days
- **Maturation delay:** 7 days
- **Filters:** `Targets are parsed from immutable display_title values of completed Optimization / AI Credit Optimizer Actions runs in the central repository.`; `The target workflow is the workflow with highest total AIC among completed first-half runs, with workflow name ascending as the stable tie-break.`; `The selected workflow must have at least one completed run and at least one successful run in each half.`; `AIC medians use successful runs only; failure rates use all completed runs and classify every conclusion other than success as non-successful.`; `Second-half median AIC must be strictly lower and second-half failure rate must be no greater than first-half failure rate.`

The frozen definitions and formulas are applied to every post-adoption observation. The structured evidence, exact snapshots, provenance, and normalized scores are in [optimization-ai-credit-optimizer-timeline.json](optimization-ai-credit-optimizer-timeline.json).

## Important limitation

This report can show whether the intended outcome is attained after adoption. It cannot estimate change from pre-adoption conditions or attribute attainment to the workflow.

Value-function SHA-256: `31fd953cba856c7a825c5cfec3bdac30b9c6d16b4fc3d1dd42abd7cb52fc949d`

