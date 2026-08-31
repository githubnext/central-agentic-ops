# Dashboard Language Renderer Plan

## Status

- [x] **Scaffold and reactive core** — package tooling, strict JavaScript checks, linting, unit/browser tests, state, derived values, effects, disposal, DOM construction, and keyed lists.
- [x] **Language model and validation** — document structure, semantic sources and fields, context, time, filters, dimensions, measures, aggregation, provenance, freshness, data states, links, findings, custom pages, and coded validation errors.
- [x] **Built-in pages** — all 13 specification-defined pages are declared by `dashboard.json` and rendered through the generic runtime without page-specific dispatch.
- [x] **Security, privacy, accessibility, and compliance** — inert text, safe links, secret redaction, context narrowing, keyboard and screen-reader behavior, non-color chart semantics, data-state presentation, and Appendix A/C compliance fixtures.
- [ ] **Parity** — continue expressing evidence-backed legacy dashboard behavior as declarative configuration, fixtures, and reusable presentation primitives.

Completed parity includes the responsive shell and navigation; overview health and trends; package tabs and AI Credit utilization; searchable, faceted, sortable, progressively disclosed tables; chart legends and tooltips; safe links; repository actions; declarative dispatch rows; and independent availability, completeness, freshness, provenance, usage, topology, and operational-value semantics.

## Parity backlog

Evidence paths below are relative to:

- Screenshots: `/tmp/gh-aw/agent/migrate-dashboard/screenshots/`
- Snapshots: `/tmp/gh-aw/agent/migrate-dashboard/snapshots/`

### Presentation and interaction

- [ ] **Configured-mode navigation**
  - Legacy: `packages/index`, `packages/live`, `packages/review`, `packages/ambient-context`, `packages/ambient-context-live`, `repositories/githubnext-central-agentic-ops`, `repositories/githubnext-central-agentic-ops-reports`, `repositories/githubnext-central-agentic-ops-insights`, repository workflow report/insight pages, and `workflows/migrate-dashboard`.
  - Next: `packages`, `repositories`, `repository-detail`, and `workflows`.
  - Evidence: matching `legacy/*.png|yaml` and `next/*.png|yaml` files under the roots above.
  - Acceptance: expose the evidence-backed all/review/live and reports/insights/detail navigation, with visible and structural current-mode indicators.
- [ ] **Durable-output indexes and details**
  - Legacy: `outcomes/githubnext--central-agentic-ops-issue-218`, `outcomes/githubnext--central-agentic-ops-pr-264`, and `outcomes/githubnext--central-agentic-ops-comment-5478982701`.
  - Next: `security`, `operational-value`, and `findings`.
  - Evidence: matching legacy and next screenshot/snapshot files under the roots above.
  - Acceptance: provide a dense outcomes index and navigable details exposing output kind, lifecycle or disposition, warning state, and retained body/evidence metadata.
- [ ] **Runtime and dispatch triage chrome**
  - Legacy: `runtime/index` and `dispatches/index`; next: `runtime` and `dispatches`.
  - Evidence: matching legacy and next screenshot/snapshot files under the roots above.
  - Acceptance: frame the generic catalogs with ranked attention, execution-boundary guidance, and episode/dispatch-specific evidence.
- [ ] **Report-controls toolbar**
  - Legacy: `security/index` and `cost/index`; next: `security` and `cost`.
  - Evidence: matching legacy and next screenshot/snapshot files under the roots above.
  - Acceptance: show page-wide active filters and JSON export controls without removing refresh and repository actions.

### Producer-derived semantics

- [ ] **Discovery coverage**
  - Legacy: `coverage/index` and `repositories/index`; next: `repositories`.
  - Evidence: matching legacy and next screenshot/snapshot files under the roots above.
  - Acceptance: expose public/private/unknown visibility buckets, unknown coverage, and organization/repository totals that explain inventory completeness.
- [ ] **Dispatch identity and attribution**
  - Legacy: `dispatches/index` and `workflows/index`; next: `dispatches` and `workflows`.
  - Evidence: matching legacy and next screenshot/snapshot files under the roots above.
  - Acceptance: identify the triggering event, owning package relationship, and package-worker, package-orchestrator, or standalone attribution.
- [ ] **Runtime execution map**
  - Legacy: `runtime/index`; next: `runtime`.
  - Evidence: matching legacy and next screenshot/snapshot files under the roots above.
  - Acceptance: expose root-to-worker correlation, control transitions, worker attribution, and evidence gaps.
- [ ] **Durable-output semantics**
  - Legacy: the issue, pull-request, and comment outcome details listed above; next: `security`, `operational-value`, and `findings`.
  - Evidence: matching legacy and next screenshot/snapshot files under the roots above.
  - Acceptance: model report kind, lifecycle or disposition, warnings, and retained full-body details for evidence-backed outputs.

## Specification questions

- Section 10 requires declarative built-in page definitions, but Sections 4.2 and 10 define no YAML vocabulary for embedding them alongside `kind: built-in` and `page`; the validator currently accepts implementation-local `definition.views`.
- `DLS-PAGE-014` requires independent availability, completeness, and freshness, but Section 10 defines no declarative binding; the current implementation uses `definition.data-state` markers and runtime source metadata.
- Section 4.3 requires quoted `"0.1.0"`, but YAML parsing does not preserve scalar quoting; validation therefore enforces the string type and exact value.
- Section 8 defines logical-source metadata outside dashboard YAML while Section 4.2 omits a carrier; the validator currently accepts conservative `data.source-metadata`.
- Section 11.2 does not fully define post-aggregation grain derivation; `data.order-by.field` conservatively accepts aggregate output identifiers and canonical entity identifier fields.

## Component inventory

- `src/components/badge.js` — status, mode, and active-state badges.
- `src/components/cell-display.js` — declarative table-cell display with a plain-text fallback.
- `src/components/chart-elements.js` — generic chart widgets, legends, series, and pie-category summaries.
- `src/components/count-formatters.js` — shared count and singular/plural text formatting.
- `src/components/data-state.js` — availability, completeness, and freshness cards.
- `src/components/link-content.js` — safe-link discovery and external-link/value composition.
- `src/components/linked-text.js` — linked text and entity-aware table-cell rendering.
- `src/components/packages-view.js` — package mode tabs, utilization, coverage, allowances, and trends.
- `src/components/summary-copy.js` — shared summary-count copy.
- `src/components/table-region.js` — reusable table regions, headers, bodies, and empty states.
- `src/components/ui-primitives.js` — section headings, vital statistics, and UTC date-time presentation.
- `src/components/view-chrome.js` — reusable section, metadata, summary, context, state, and provenance chrome.
- `src/components/workflow-topology.js` — package and standalone workflow topology.
- `src/view-formatters.js` — numeric and aggregate value formatting.

## Infrastructure blockers

- Local quality commands may need one rerun after installation while package binaries and type declarations are linked.
- Browser checks require a provisioned Playwright Chromium executable; otherwise use the built-in browser tools and treat startup failure as infrastructure-only.
- The checked-out baseline has nine existing browser assertion failures involving page headings, skip-link visibility, route-driven repository views, keyboard section counts, and declarative table row visibility.

Run-by-run history was removed during compaction; milestones, unresolved questions, current inventory, blockers, and actionable parity work remain above.
