# What Dependabot / Release Train Updater measures

This page explains the chart in plain language. It defines what was measured; it does not decide whether the workflow caused the observed changes.

![Dependabot / Release Train Updater outcome measures after adoption](dependabot-release-train-updater-timeline.svg)

## How to read the chart

- Observations begin at workflow adoption on `2026-08-18`.
- No comparable pre-adoption evidence is available, so the chart shows attainment rather than improvement.
- Each dot is one immutable observation. Missing evidence is omitted, never treated as zero.
- Workflow runs show execution activity only. They do not prove repository value.

## What was measured

### Validated dependency resolution share

- **What it tells you:** Validated dependency resolution share. This is a `primary` measure.
- **Normalized scoring formula:** `validatedResolutions / eligibleOpportunities`
- **Goal:** Higher values are better.
- **Chart display:** The chart shows the normalized score directly.

### Security-opportunity resolution share

- **What it tells you:** Security-opportunity resolution share. This is a `diagnostic` measure.
- **Normalized scoring formula:** `securityValidatedResolutions / securityEligibleOpportunities`
- **Goal:** Higher values are better.
- **Chart display:** The chart shows the normalized score directly.

## Evidence rules

- **Repository:** `githubnext/central-agentic-ops`
- **Evidence population:** Matured dependency pull requests or security-alert opportunities in repositories named by immutable central workflow run display titles.
- **Collection:** Batch central Actions runs over the complete requested span, fetch each target pull-request population once for that span, classify locally, and fetch merge-commit check evidence only for eligible merged dependency candidates.
- **Observation window:** 30 days, sampled every 30 days
- **Maturation delay:** 14 days
- **Filters:** `Dispatch targets are owner/repository names parsed from Dependabot / Release Train Updater Actions run display titles.`; `Opportunities are pull requests created in the window, matured for 14 days by observedAt, and classified from title, author, labels, and changed files.`; `Dependency opportunities are Dependabot-authored pull requests or pull requests changing dependency manifests or lockfiles.`; `Security opportunities have security labels, security title indicators, or Dependabot security indicators.`; `Validated resolutions are merged by windowEnd, change dependency manifests or lockfiles, and have successful evidence for every configured required check at the merge commit.`; `Unavailable required-check configuration or merge-commit check evidence cannot establish a validated resolution.`

The frozen definitions and formulas are applied to every post-adoption observation. The structured evidence, exact snapshots, provenance, and normalized scores are in [dependabot-release-train-updater-timeline.json](dependabot-release-train-updater-timeline.json).

## Important limitation

This report can show whether the intended outcome is attained after adoption. It cannot estimate change from pre-adoption conditions or attribute attainment to the workflow.

Value-function SHA-256: `3ae460a857f942ecda114ccaa697da705096c235d8dc43c30fe5b0f218ff6519`

