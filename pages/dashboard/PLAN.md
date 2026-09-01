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
- `src/components/report-list.js` — shared durable-report list/table rendering, filtering, counts, and empty states for package and workflow views.
- `src/components/summary-copy.js` — shared summary-count copy.
- `src/components/table-region.js` — reusable table regions, headers, bodies, and empty states.
- `src/components/tab-nav.js` — shared linked and interactive tab navigation with roving tabindex keyboard support.
- `src/components/ui-primitives.js` — section headings, vital statistics, and UTC date-time presentation.
- `src/components/view-chrome.js` — reusable section, metadata, summary, context, state, and provenance chrome.
- `src/components/workflow-badges.js` — shared workflow role and package-membership badge strips for workflow identity and repository inventory views.
- `src/workflow-data.js` — package and standalone workflow inventory sources for declarative topology views.
- `src/view-formatters.js` — numeric and aggregate value formatting.

## Infrastructure blockers

- Local quality commands may need one rerun after installation while package binaries and type declarations are linked.
- Browser checks require a provisioned Playwright Chromium executable; otherwise use the built-in browser tools and treat startup failure as infrastructure-only.
- This run did not complete a browser snapshot comparison because only shell tools were available in-session; unit assertions were used for affected-page output preservation instead.
- The checked-out baseline has nine existing browser assertion failures involving page headings, skip-link visibility, route-driven repository views, keyboard section counts, and declarative table row visibility.

## 2026-08-31 run entry

- Extraction: `src/components/tab-nav.js` for shared linked and interactive tab navigation.
- Duplication evidence and call sites collapsed:
  - `src/components/packages-view.js` duplicated roving-tabindex mode-tab construction and keyboard handling for package activity filters.
  - `src/components/package-detail.js` duplicated near-identical interactive mode-tab behavior for package reports and separately duplicated linked package navigation tabs.
  - `src/components/workflow-detail.js` duplicated linked workflow navigation tab rendering.
  - `src/components/repository-workflows.js` duplicated linked repository navigation tab rendering.
- Behavior-preservation evidence:
  - Preserved package-detail package-tab DOM text, links, current markers, report-mode keyboard behavior, and report filtering through unchanged `package-detail` assertions.
  - Preserved workflow-detail tab DOM text, links, and current marker through unchanged `workflow-detail` assertions.
  - Preserved repository workflow tab DOM text, links, and current marker through unchanged `repository-workflows` assertions.
  - Added focused unit coverage in `test/unit/tab-nav.test.js` for linked tabs plus interactive roving-tabindex keyboard navigation and selection updates.
- Quality gates and proof:
  - Rendered-output proof for affected pages is covered by unchanged unit assertions for package detail, workflow detail, and repository workflows before and after replacing all identified tab call sites.
  - Ran `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `node ./scripts/build.mjs` from `pages/dashboard/`; all passed.
  - Browser snapshot comparison remained blocked in-session because Playwright browser tools were not exposed here.
- Next candidates:
  - Shared static table-section wrapper across `src/components/packages-view.js`, `src/components/repository-workflows.js`, and `src/components/ui-elements.js` coverage diagnostics.
  - Shared repository/package/workflow identity badge strips across `src/components/repository-workflows.js`, `src/components/workflow-detail.js`, and `src/components/package-detail.js`.
  - Shared route-scoped empty/unavailable state helper across `src/components/package-detail.js`, `src/components/workflow-detail.js`, and `src/components/repository-workflows.js`.

## 2026-09-01 run entry

- Investigation: audited the remaining JavaScript-only views and selected runtime execution episodes as the smallest complete view migration that could reuse existing Dashboard Language elements.
- Declarative specification: replaced the `execution-episodes` element in `dashboard.json` with a `summary-grid` and two generic table views.
- JSON-shaped data: `runtime-data.js` now emits `runtime-episode-summary`, `runtime-episodes`, and `runtime-attribution-gaps` logical sources from retained run evidence.
- Reusable presentation: removed the specialized `execution-elements.js` renderer and its styles; runtime episodes now use shared summary, table, badge, filtering, sorting, empty-state, and link behavior.
- Preserved evidence boundaries: root-only attribution, unavailable repeated coverage, exact-correlation gaps, run status, timing, duration, and run evidence remain explicit.

## 2026-09-01 workflow topology entry

- Investigation: selected workflow topology as a bounded JavaScript-only view that could be expressed through existing Dashboard Language elements.
- Declarative specification: replaced the `workflow-topology` element in `dashboard.json` with one summary grid and generic tables for package and repository-owned workflows.
- JSON-shaped data: `workflow-data.js` now emits topology summary, packaged-workflow, and standalone-workflow logical sources from retained workflow inventory.
- Reusable presentation: removed the specialized topology renderer and styles; shared summary, table, link, badge, filtering, sorting, and empty-state components now own presentation.
- Preserved evidence boundaries: the views describe declared workflow relationships and explicitly avoid claiming that a dispatch occurred.

## 2026-09-01 dispatch catalog entry

- Investigation: audited the remaining JavaScript-only views and selected the dispatch catalog as the smallest complete migration to generic Dashboard Language marks.
- Declarative specification: replaced the `dispatch-catalog` element in `dashboard.json` with one generic table view whose columns, links, displays, and empty state are JSON-defined.
- JSON-shaped data: retained `runtime-data.js` dispatch rows and the reusable `dispatch-type-classification.json` rules without moving presentation decisions back into data derivation.
- Reusable presentation: removed the specialized dispatch renderer; shared table, temporal cell, status, entity-link, filtering, faceting, sorting, summary, and empty-state components now own presentation.
- Preserved evidence boundaries: only retained runs whose authoritative event is `workflow_dispatch` appear, in descending start-time order.

## 2026-09-01 badge-strip entry

- Extraction: `src/components/workflow-badges.js` for shared workflow role and package-membership badge strips.
- Duplication evidence and call sites collapsed:
  - `src/components/workflow-identity.js` inlined workflow role badge rendering plus sorted package-membership links for workflow detail identity strips.
  - `src/components/repository-workflows.js` separately inlined the same role badge and package-membership link strip for repository inventory rows.
- Behavior-preservation evidence:
  - Preserved workflow-detail badge text, ordering, and package links through unchanged assertions in `test/unit/workflow-detail.test.js`.
  - Preserved repository workflow badge text, ordering, and package links through unchanged assertions in `test/unit/repository-workflows.test.js`.
  - Added focused coverage in `test/unit/workflow-badges.test.js` for role rendering, sorted memberships, fallback memberships, unknown/operation role derivation, and configurable destinations.
- Quality gates and proof:
  - Rendered-output proof for affected pages is covered by the unchanged workflow-detail and repository-workflows assertions before and after replacing both identified badge-strip call sites.
  - Ran `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `node ./scripts/build.mjs` from `pages/dashboard/`; all passed.
  - Browser snapshot comparison remained blocked in-session because Playwright browser tools were not exposed here.
- Next candidates:
  - Shared route-scoped empty/unavailable state helper across `src/components/package-detail.js`, `src/components/workflow-detail.js`, and `src/components/repository-workflows.js`.
  - Shared static table-section wrapper across `src/components/packages-view.js`, `src/components/repository-workflows.js`, and report/table custom views.
  - Shared repository/package/workflow tab-and-identity chrome across `src/components/package-detail.js`, `src/components/workflow-detail.js`, and `src/components/repository-workflows.js`.

Run-by-run history was removed during compaction; milestones, unresolved questions, current inventory, blockers, and actionable parity work remain above.
