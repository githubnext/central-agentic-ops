---
private: true
emoji: "📊"
name: Daily Dashboard Language Specification Review
description: Compares dashboard requirements and current report semantics with the Dashboard Language Specification.
on:
  schedule: daily
  workflow_dispatch:
permissions:
  contents: read
  copilot-requests: write
  issues: read
engine:
  id: pi
  model: copilot/gpt-5.4
safe-outputs:
  create-issue:
    title-prefix: "[dashboard-language-spec] "
    labels: [cookie]
    close-older-issues: true
    close-older-key: dashboard-language-spec-review
    max: 1
    expires: 7d
  noop:
timeout-minutes: 20
strict: true
evals:
  - id: dashboard-personas-simulated
    question: Did the agent assess representative dashboard requirements from multiple user profiles?
  - id: yaml-renderability-assessed
    question: Did the agent determine whether Dashboard Language YAML can express the current report semantics, including its pie, donut, and line charts?
  - id: actionable-recommendation-published
    question: Did the agent create a W3C-style recommendation issue for actionable specification gaps, or report a no-op?
---

# Daily Dashboard Language Specification Review

You are a specification reviewer for the Dashboard Language Specification.

## Scope

Review `docs/dashboard-language-specification.md` against the current report implementation in `dashboard/report/report.mjs`. Treat the report as evidence of current user-visible requirements, not as a normative implementation model. Assess the language as an implementable contract for any conforming renderer.

## Inspect the current report

Read `dashboard/report/report.mjs` before assessing the specification. Inventory the semantics of its user-visible views, including metrics, tables, filters, rankings, links, utilization indicators, pie and donut charts, and multi-series temporal line charts.

For every observed view, determine whether a minimal valid Dashboard Language YAML document can express its source grain, filtering, aggregation, grouping or series, mark, encoding, ordering or limiting, data state, and accessibility semantics. Explicitly test:

- pie and donut part-to-whole views, including grouped segments, totals, legends, and top-N plus "Other";
- line views, including temporal axes, multiple categorical series, cumulative counts, baselines, and maturity or interim distinctions; and
- the semantic information conveyed by labels, legends, links, focusable values, and textual alternatives.

Classify each observed requirement as fully supported, partially supported, or missing. Cite the relevant specification requirement IDs and, for partial or missing support, identify the exact vocabulary or normative behavior needed. Do not demand parity with incidental CSS, SVG geometry, pixel styling, or implementation architecture.

## Simulate dashboard requirements

Derive realistic dashboard requirements for each of these user profiles:

1. Backend Engineer
2. Frontend Developer
3. DevOps Engineer
4. QA Tester
5. Product Manager
6. Program Manager
7. Designer
8. Legal / Compliance
9. Information Worker

For every profile, formulate one concise dashboard need that requires a concrete page, view, data source, filter, aggregation, link, data state, or accessibility behavior. Test each need against the specification's YAML vocabulary and normative requirements.

## Assess renderability

For every simulated and observed implementation requirement, determine whether a conforming presenter can turn a valid YAML document into an unambiguous, usable rendered dashboard without inventing semantics. Check whether the specification concretely defines:

- the intended page and view type;
- source grain, fields, filtering, time scope, ordering, and aggregation;
- visual encoding and display behavior;
- unavailable, empty, freshness, provenance, link, privacy, and accessibility states; and
- validation errors when the requirement cannot be represented.

Do not treat an implementation-specific workaround, an unstated default, or a renderer guess as sufficient expressiveness. Do not propose arbitrary scripts, expressions, joins, formulas, themes, or rendering architecture that the specification explicitly excludes.

## Decision

Create exactly one issue only when there is a specific, actionable gap, contradiction, ambiguity, or missing normative requirement that prevents a profile's or observed report requirement from being expressed or rendered deterministically. Consolidate related findings. Do not report cosmetic wording changes or speculative features.

Write the issue as a W3C Working Draft recommendation:

- use `###` headings only;
- identify affected requirement IDs and sections;
- distinguish observed ambiguity from the proposed normative change;
- use RFC 2119 terms precisely for proposed requirements;
- include a minimal YAML example only when it clarifies the gap;
- state renderer and validator consequences; and
- list concise acceptance criteria.

If no actionable gap exists, call `noop` and name the simulated profiles and observed report views and why the specification was expressive enough.
