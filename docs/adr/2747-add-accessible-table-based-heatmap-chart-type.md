---
title: Add Heatmap as an Accessible, Table-Rendered Chart Type in the Dashboard Language
description: Record the decision to add a bounded heatmap chart type rendered as an accessible table rather than a visual grid.
---

# ADR 2747: Add Heatmap as an Accessible, Table-Rendered Chart Type in the Dashboard Language

## Status

Draft

## Context

The dashboard previously compared discrete dimensions such as job and runner using a bar chart, which does not scale well to two nominal/ordinal axes with an aggregated quantitative value. This PR adds `heatmap` as a new chart type in the Dashboard Language, defined in `dashboard/site/src/specification.js`, with nominal/ordinal `x`/`y` encodings and a `color` encoding that carries an aggregated quantitative field (e.g. `mean` of `job-duration-seconds`). The first application, "Job time by job and runner," replaces the existing job/runner bar chart in `dashboard/site/dashboard.json`, and workflow-duration and job-duration views are grouped into explicit `sections`.

Rendering is implemented in `dashboard/site/src/components/chart-elements.js` as an accessible, keyboard-navigable table with visible values and labeled empty cells, styled in `dashboard/site/src/styles.js` using Primer color tokens without relying on color alone to convey meaning. `dashboard/site/src/validator.js` enforces limits of 100 cells and 12 categories per axis, with an explicit fallback when a matrix exceeds these bounds. Supporting changes include updated e2e (`smoke.spec.js`) and unit tests (`chart-elements.test.js`, `data-view.test.js`, `presenter.test.js`, `validator.test.js`) and updated documentation in `docs/dashboard-language-specification.md`. The change touches 12 files and is treated as a significant addition to the Dashboard Language, a domain-specific language with its own validator and specification.

## Decision

Add `heatmap` as a first-class chart type in the Dashboard Language, defined by nominal/ordinal `x`/`y` encodings plus an aggregated quantitative `color` encoding, and render it as an accessible, keyboard-navigable HTML table (with visible values, labeled empty cells, and Primer color tokens applied without relying on color alone) rather than a visual grid or canvas-based heatmap. Enforce explicit bounds — 100 cells and 12 categories per axis — in the validator, with a defined fallback when a matrix exceeds those bounds, and use "Job time by job and runner" as the first dashboard view built on this chart type, replacing the prior bar chart and grouping duration views into sections.

## Alternatives Considered

Not inferable from current pull request evidence. The PR body and diff do not describe rejected rendering approaches (e.g., a canvas/SVG grid) or alternative bounding strategies that were considered and declined.

## Consequences

**Positive:**
- The Dashboard Language now formally supports two-dimensional discrete comparisons via `heatmap`, with the encoding shape (nominal/ordinal axes plus aggregated quantitative color) documented in `docs/dashboard-language-specification.md` and enforced in `specification.js`.
- Rendering as a keyboard-navigable table with visible values and labeled empty cells, plus Primer color tokens applied without relying on color alone, gives the chart type an accessible foundation from the outset rather than requiring a later accessibility retrofit.
- The validator's explicit limits (100 cells, 12 categories per axis) and defined fallback prevent unbounded or unreadable matrices from reaching users.
- The job/runner view moves from a bar chart to a heatmap, and workflow/job duration views are grouped into sections, which the PR presents as clarifying the dashboard's duration views.
- New and updated unit tests (`chart-elements.test.js`, `data-view.test.js`, `presenter.test.js`, `validator.test.js`) and e2e coverage (`smoke.spec.js`) exercise the new chart type and its validation limits.

**Negative:**
- The 100-cell / 12-category-per-axis limits mean any future data set exceeding these bounds falls back to an explicit degraded presentation rather than rendering the full heatmap; not inferable from current pull request evidence whether this fallback preserves full information or truncates it.
- Not inferable from current pull request evidence: no information is given on performance implications for large data sources, migration impact for other dashboards or consumers relying on the previous bar chart view, or whether other chart types will be revisited to match this accessible-table rendering approach.
