# Dashboard Language Renderer Plan

## Milestones

- [x] **Scaffold** — `package.json` (ESM, private, scripts for `typecheck`, `lint`, `test`, `test:e2e`), `tsconfig.json` with `checkJs` and `strict`, ESLint flat config, Vitest config, Playwright config, `README.md`, and `PLAN.md`.
- [x] **Reactive core** — state, derived values, effects, disposal, and the DOM builder with keyed lists; unit tests including update, removal, and reordering.
- [x] **Document model and validation** — Sections 4 and 12: root structure, vocabulary, unknown and duplicate key rejection, identifier grammar, uniqueness, error codes from Appendix B with code, message, and YAML path.
- [x] **Semantic model** — Section 5 sources, grain, field catalog, and intrinsic types.
- [x] **Scope, time, filters** — Section 6 including context composition.
- [x] **Dimensions, measures, aggregation** — Section 7 including canonical dimensions, measures, aggregates, and time units.
- [x] **Provenance, freshness, data states** — Section 8 including unavailable, empty, partial, and stale states.
- [x] **Links and findings** — Section 9 link objects and the `href` channel semantics.
- [x] **Custom pages** — Section 11 metric, table, and chart views with the temporal line and bar defaults.
- [x] **Built-in pages** — Section 10, all 13 pages fully specified by the authoritative `dashboard.json`, including their view and build/composition definitions, and visibly rendered by a minimal generic JavaScript runtime.
  - [x] Slice: `DLS-PAGE-001` built-in page title default validation.
  - [x] Slice: `DLS-PAGE-001` canonical explicit title validation for built-in pages.
  - [x] Slice: `DLS-PAGE-002` and `DLS-PAGE-006` conservative required-source validation for built-in page definitions.
  - [x] Slice: `DLS-PAGE-003` through `DLS-PAGE-013` conservative required-field coverage validation for built-in page definitions.
  - [x] Slice: `DLS-PAGE-014` conservative built-in data-state exposure validation via implementation-local declarative markers.
  - [x] Slice: `DLS-PAGE-006` conservative run-link coverage validation for the `runs` built-in page.
  - [x] Slice: `DLS-PAGE-002` conservative `overview` linked-findings and operational-value timeline coverage validation.
  - [x] Slice: `DLS-PAGE-002` and `DLS-PAGE-014` presenter render for the `overview` built-in page, exposing rollout-mode filtering, workflow active-state inventory, run status and conclusion counts and trends, repository and workflow rankings, largest AIC spenders, recent linked findings, operational-value timeline, and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-006` and `DLS-PAGE-014` presenter render for the `runs` built-in page status counts, outcome counts, scope/model/time columns, run links, and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-005` and `DLS-PAGE-014` presenter render for the `workflows` built-in page inventory, active state, rollout mode, run conclusions, downstream outcomes, available usage, findings, operational value counts, and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-013` and `DLS-PAGE-014` presenter render for the `findings` built-in page summary, severity, status, scope, time, provenance, available issue/pull-request/run links, and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-010` and `DLS-PAGE-014` presenter render for the `usage` built-in page, keeping each raw-token measure separate from AIC while exposing engine, requested model, resolved model, scope, rollout mode, time, provenance, and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-011` and `DLS-PAGE-014` presenter render for the `engines-models` built-in page, exposing engine, requested model, and resolved model as separate dimensions with run counts, run conclusions, downstream outcomes, raw tokens, AIC, provenance, and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-012` and `DLS-PAGE-014` presenter render for the `operational-value` built-in page, exposing a time-ordered absolute-attainment series with definition, operational case, evaluator digest, subject, requested evidence time, effective evidence cutoff, maturity time and status, accepted evidence links when available, separate baseline delta, provenance, and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-003` and `DLS-PAGE-014` presenter render for the `organizations` built-in page, exposing organization inventory, repository counts, workflow counts, run counts, available usage measures, provenance, and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-004` and `DLS-PAGE-014` presenter render for the `repositories` built-in page, exposing repository inventory plus deterministic rankings by run count, AIC, and available operational value while keeping operational-value definitions separate, with provenance and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-007` and `DLS-PAGE-014` presenter render for the `experiments` built-in page, exposing experiment definitions plus observed run-to-variant assignments, grader observations, eval observations, downstream outcomes, available usage AIC, operational value by definition, provenance, and independent data-state summaries without implying causation.
  - [x] Slice: `DLS-PAGE-008` and `DLS-PAGE-014` presenter render for the `graders` built-in page, keeping grader definitions and grader observations distinguishable while exposing observed subject, result, score when present, time, provenance, and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-009` and `DLS-PAGE-014` presenter render for the `evals` built-in page, keeping eval definitions and eval observations distinguishable while exposing observed subject, `YES`/`NO`/`UNKNOWN` result, evaluation model when available, time, provenance, and independent data-state summaries.
  - [x] Slice: `DLS-PAGE-015` presenter render for the `packages` built-in page, exposing mode filtering, package-level AIC utilization including unavailable states, and cumulative run trends grouped by conclusion.
  - [x] Define `dashboard.json` as the single authoritative data-driven document containing all 13 built-in pages and every view and build/composition definition they require.
  - [x] Refactor the built-in page dispatcher in `src/presenter.js` from a page-name `if` chain to a declarative renderer registry keyed by `dashboard.json` page names, reducing page-name dispatch while retaining the existing generic runtime and reusable primitives.
  - [x] Continue refactoring each built-in page body in `src/presenter.js` into its `.json` equivalent, removing the remaining page-specific rendering/build logic while retaining only the minimum generic JavaScript interpreter and reusable primitives.
  - [x] Add build, unit, and browser coverage proving `dashboard.json` renders every specification-defined built-in page and that no page depends on custom page-specific JavaScript.
  - [x] Specify the `repositories` inventory and its run-count, AIC, and per-definition operational-value rankings as separate declarative views with explicit descending ranking keys.
- [x] **Security, privacy, accessibility** — Section 13 including escaping, redaction, and keyboard and screen-reader behavior verified with Playwright.
  - [x] Slice: `DLS-SAFE-003`, `DLS-SAFE-004`, `DLS-SAFE-007`, `DLS-SAFE-008`, and `DLS-SAFE-010` presenter render for inert text escaping, https-only safe link exposure, non-empty accessible names, labeled table columns, textual data-state labels, and labeled external links.
  - [x] Slice: `DLS-SAFE-007` and `DLS-SAFE-008` keyboard presenter behavior for focusable labeled sections with deterministic arrow-key traversal verified in unit and browser tests.
  - [x] Slice: `DLS-SAFE-005` and `DLS-VAL-004` validator rejection for secret-bearing provenance metadata with non-echoing error messages.
  - [x] Slice: `DLS-SAFE-006`, `DLS-VIEW-013`, `DLS-VIEW-014`, and `DLS-VIEW-015` presenter render for custom metric, table, and chart views with visible available/empty/unavailable state output, effective-context text, and non-fabricated per-row links constrained to provided source data.
  - [x] Slice: `DLS-SAFE-006`, `DLS-CTX-003`, `DLS-CTX-004`, and `DLS-CTX-008` presenter enforcement for custom-view scope, absolute-time, and filter narrowing so only context-permitted observations and links are rendered.
  - [x] Slice: `DLS-SAFE-009` presenter render for non-color chart category semantics via explicit textual color-category legends alongside chart tabular equivalents.
  - [x] Closure verification: rerun build, typecheck, lint, unit, and browser gates against the already-implemented Section 13 slices before marking the milestone complete.
- [x] **Compliance suite** — Section 14 test suite, the compliance checklist, Appendix A as a passing fixture, and Appendix C as failing fixtures.
  - [x] Slice: `DLS-TEST-001`, `DLS-TEST-002`, `DLS-TEST-003`, `T-DOC-001`, and `T-VAL-001` compliance smoke harness with machine-readable results, Appendix A passing coverage, and Appendix C failing fixtures.
  - [x] Slice: `T-SEM-001`, `T-SEM-002`, `T-SEM-003`, and `T-CTX-001` checklist-backed machine-readable coverage for the implemented semantic and context validator/presenter requirements.
  - [x] Slice: `T-PAGE-001` conservative machine-readable coverage for implemented built-in page defaults and data-state exposure via the Appendix A presenter fixture.
  - [x] Slice: `T-LINK-001` conservative machine-readable coverage for available finding issue, pull-request, and run associations rendered as anchored links in the Appendix A presenter fixture.
- [ ] **Parity** — inventory the features of the existing dashboard in `dashboard/report/report.mjs`, record them in `PLAN.md` as a parity checklist, then express each one as YAML configuration plus data fixtures, closing the checklist incrementally.
  - [x] Overview structure: express the report's full-width control-plane health, paired wide/narrow attention and managed-workflow panels, and full-width execution/value trends as declarative JSON sections rendered by the generic presenter.
  - [x] Motion audit: port the report's 120ms interactive color/background transitions and 80ms chart-point tooltip fade; retain the existing repository-link transition, and disable nonessential motion for reduced-motion users. The report contains no keyframe animations, and its catalog disclosure transition has no renderer equivalent yet.
  - [x] Motion audit verification: add automated parity coverage proving the retained 120ms navigation/link transitions, 80ms chart tooltip fade, repository-link transition, and reduced-motion override remain present in the generic stylesheet.
  - [x] Preview fixtures: provide multi-point, multi-series operational-value observations plus linked run and evidence records so the browser dashboard renders meaningful chart geometry and actionable links.
  - [x] Safe-link parity verification: harden automated coverage so credential-bearing, non-HTTPS, and blank-label runtime links are all omitted across reusable metric and table link surfaces while safe HTTPS links remain visible.
  - [x] Pages-level visual parity inventory: record the report-derived page-layout, Primer-style navigation, and footer/header presentation patterns already implemented by the generic renderer, without adding new semantics.
  - [x] Catalog filtering: port the report's live text filtering and announced result counts into reusable custom-table controls, making the interaction available to declaratively configured built-in and custom pages.
  - [x] Chart-series legends: port the report's labeled trend legend into reusable generic custom-chart chrome for multi-series declarative charts while retaining explicit textual category semantics.
  - [x] Operational overview: port the control-plane status banner, execution-health bar, attention list, and managed-package cards, including package allowance and inventory readiness source metadata.
  - [x] Catalog interaction parity: derive bounded nominal facets from declared table columns, synchronize each table's search and facet state through namespaced URL parameters, and progressively disclose matching rows in groups of 25.

### Parity inventory

#### Report presentation and interaction

- [x] Primer color tokens, light/dark modes, responsive shell, sidebar, breadcrumb, header, footer, print treatment, reduced motion, increased contrast, and forced colors.
- [x] Hash-addressable page navigation, active navigation state, keyboard section traversal, status/mode badges, workflow topology, safe external links, charts, legends, and point tooltips.
- [x] Operational overview health banner, execution-health bar, attention list, managed-package cards, and execution/value trends.
- [x] Reusable table search, announced shown/matched counts, bounded nominal facets, URL-synchronized filter state, and 25-row progressive disclosure.
- [ ] Section-labeled Attention/Investigate/Explore navigation and report actions for refresh and repository access.
- [ ] Mode, package, repository, and workflow view tabs with configured-mode indicators.
- [ ] Dense findings/outcomes indexes, category summaries, and durable output detail presentation.
- [x] Package AI Credit utilization bars and threshold treatments.
- [ ] Specialized run and dispatch catalog chrome beyond the reusable table controls.
- [ ] Export JSON and static report-control toolbar presentation.

#### Producer-derived data semantics

- [x] Independent source availability, completeness, freshness, retrieval time, and empty/unavailable states.
- [x] Run-window status and conclusion counts, linked run records, and partial/unavailable telemetry.
- [x] AI Credit availability/completeness, raw measures, per-run attribution, and package allowance.
- [x] Inventory package membership, orchestrator/worker topology, active state, rollout mode, and deterministic readiness.
- [x] Operational-value attainment, definition, evidence cutoff/link, maturity status, and baseline delta.
- [ ] Discovery coverage detail including public/private/unknown visibility and organization repository totals.
- [ ] Dispatch-event identity and package/standalone dispatch attribution.
- [ ] Episode correlation, control transition, and exact execution-map evidence.
- [ ] Durable output warning, report-kind, lifecycle, and full report-body detail semantics.

## Specification questions

- 2026-08-28: Section 10 requires every built-in page to be expressed as declarative page definitions built from the custom-view primitives, but Section 4.2 and Section 10 define no YAML vocabulary for embedding those declarative built-in definitions alongside `kind: built-in` / `page`. The current validator implements the most conservative reading available in this slice by accepting an implementation-local `definition.views` sequence on built-in pages so required source, field, and run-link coverage can be validated, but this key is not yet specification-backed and may need to change if the YAML vocabulary is clarified.
- 2026-08-28: `DLS-PAGE-014` says every built-in page must expose availability, completeness, and freshness independently, but Section 10 does not define a declarative YAML shape for asserting that exposure inside a built-in page definition. The current validator uses a conservative implementation-local `definition.data-state` marker with canonical boolean `true` for each axis. The presenter prototype now renders independent page-level summaries from runtime source metadata, but the exact normative YAML vocabulary for binding built-in definitions to those summaries remains unspecified.
- 2026-08-28: Section 4.3 requires `language-version` to be the quoted string `"0.1.0"`, but YAML parsing does not preserve whether a scalar was quoted. The current validator enforces string type and exact canonical value, which is the most conservative check available without relying on parser-specific CST details.
- 2026-08-28: Section 8 defines required logical-source metadata outside the dashboard YAML, while Section 4.2 omits any YAML vocabulary for carrying that metadata inside a dashboard document. The current validator now accepts a conservative `data.source-metadata` structure so Section 8 metadata shape can be validated in-document, but the presenter-side runtime contract and the exact source of truth between YAML and external inputs remain ambiguous.
- 2026-08-28: Section 11.2 says `data.order-by.field` resolves against the post-aggregation output grain, but the specification does not fully define how to derive that grain from arbitrary encodings before the presenter exists. The current validator uses the most conservative reading available in this slice: it accepts aggregate output identifiers and bare source fields only when they are canonical entity identifier fields for the selected source, and rejects other unresolved references with `DLS-E010`.

## Component inventory

- `src/components/badge.js` — presentation-only Primer status, mode, and active-state badges.
- `src/components/data-state.js` — presentation-only data-state metrics card grid for availability, completeness, and freshness.
- `src/components/table-region.js` — presentation-only reusable table wrapper for repeated table-region markup, header rows, empty-state rows, and keyed body-row descriptors across built-in and custom tables.
- `src/components/view-chrome.js` — presentation-only reusable page-section, titled-region, summary-list/summary-region, generic custom-view chrome paragraphs, custom-view source/metadata/context chrome, shared custom-view section chrome, and built-in provenance-section helpers.
- `src/components/operational-overview.js` — report-aligned overview and packages widgets for control-plane health, package AIC utilization, mode filtering, and run trends.
- `src/view-formatters.js` — presentation-only shared numeric and aggregate formatting helpers for custom metric and chart text output.

## Infrastructure blockers

- 2026-08-28: `npm run typecheck`, `npm run lint`, and `npm test` can fail immediately after `npm install` if the runner has not linked local `node_modules/.bin` shims or installed the declared type packages yet; rerunning after installation from the package directory is currently required in this environment.
- 2026-08-28: `npm run test:e2e` is currently blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`). The workflow should prefer the built-in Playwright MCP browser tools until the package-level browser dependency is available.

## Run log

### 2026-08-30 (packages built-in view)
- Added `packages` to the Dashboard Language built-in page contract with declarative workflow, usage, and run coverage in `dashboard.json`.
- Extended the imported operational widget with report-aligned mode tabs, package utilization cards that retain unavailable packages, and cumulative run-status trends.
- Added validator, deterministic presenter, and browser coverage for `DLS-PAGE-015`.
- Next milestone: Parity, continuing with the remaining sectioned navigation and durable output presentation slices.

### 2026-08-30 (parity catalog-interaction slice)
- Audited `dashboard/report/` presentation and producer-derived states into separate parity checklists so remaining work is explicit rather than inferred from the legacy generator.
- Extended the reusable table primitive with deterministic facets for bounded nominal columns, namespaced URL state, announced shown/matched counts, and report-aligned 25-row progressive disclosure without adding page-specific rendering.
- Added focused component and browser coverage for facet derivation, combined filtering, URL synchronization, pagination reset, and disclosure.
- Verified `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` (103 tests), and `npm run test:e2e` (8 browser tests) from `pages/dashboard/`.
- Next milestone: Parity, with sectioned navigation/report actions or dense findings/outcomes presentation as the highest-value remaining presentation slices.

### 2026-08-30 (operational overview parity slice)
- Migrated the report-style operational status, execution-health, attention, and managed-package UX into the Dashboard Language overview while retaining the declarative execution and operational-value trends below it.
- Extended the report source bridge with optional control-plane inventory metadata so package cards can display per-attempt AIC allowance and deterministic readiness without inferring either value from usage.
- Added focused unit and browser coverage for critical health, attention signals, package state, responsive composition, and source enrichment.

### 2026-08-30 (parity chart-legend slice)
- Continued the Parity milestone with a narrow renderer increment derived from the report's labeled execution-trend legend, keeping the change generic to existing custom chart semantics rather than adding new dashboard-language vocabulary.
- Re-read `dashboard/report/report.mjs` and inventoried the still-unported visual series-legend pattern used by the legacy trend panel; then updated `src/presenter.js` and `src/styles.js` so multi-series declarative chart views with `encoding.color` now render a reusable visual legend sourced from shared chart-series grouping alongside the existing textual category line.
- Extended `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` to verify deterministic legend labels, chart-type-specific legend chrome, and unchanged chart/table rendering for the affected custom chart surfaces.
- Verified `npm install`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` (102 tests), and `npx playwright test --config=playwright.config.mjs` (7 browser tests) all pass from `pages/dashboard/`.
- Next candidates in the queue: extract shared link-cell composition across custom metric and custom table views; extract the remaining custom-view state-message plus affected-source/context composition in `src/presenter.js`; continue parity inventory for any additional report interaction chrome still missing after the chart legend port.

### 2026-08-30 (parity table filtering slice)
- Continued the Parity milestone with the report's interactive catalog-search pattern as a reusable renderer primitive rather than copying report-specific workflow, run, or dispatch logic.
- Added accessible text filtering and live visible-result counts to populated declarative table views, with report-aligned control styling and no changes to dashboard-language semantics.
- Added component, presenter, and browser coverage for case-insensitive filtering, row visibility, accessible labels, and singular/plural result announcements.
- Verified `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` (102 tests), and `npm run test:e2e` (7 browser tests) from `pages/dashboard/`.
- Next milestone: Parity, continuing the remaining report feature and presentation inventory closure work under the existing declarative and reusable-runtime constraints.

### 2026-08-30 (parity visual inventory slice)
- Continued the Parity milestone with a narrow documentation-and-verification increment derived from a fresh read of `dashboard/report/report.mjs`, keeping the implementation conservative and non-semantic.
- Recorded the currently matched report presentation patterns directly in `PLAN.md`: responsive overview section structure, Primer-style sidebar and breadcrumb navigation, report-style header/footer chrome, retained interactive transitions, and reusable safe link surfaces already rendered by the generic presenter.
- Verified the implementation evidence for that inventory without code changes by rerunning `pages/dashboard/` quality gates: `npm install`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` all pass.
- Next milestone: Parity, continuing the remaining report feature and presentation inventory closure work under the existing declarative and reusable-runtime constraints.

### 2026-08-30 (security safe-link coverage slice)
- Continued the Security, privacy, accessibility milestone with a narrow `DLS-SAFE-004` presenter verification increment, using the existing conservative runtime link sanitizer rather than expanding semantics.
- Extended `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` so Section 13 coverage now explicitly verifies that runtime links with embedded credentials are omitted from both custom table and custom metric rendering while safe HTTPS links remain exposed with their labels.
- Tightened existing findings accessibility test names to record `DLS-SAFE-004` alongside the already-covered `DLS-SAFE-003`, `DLS-SAFE-007`, `DLS-SAFE-008`, and `DLS-SAFE-010` surfaces, matching the specification's safe-link handling requirement more directly.
- Verified `pages/dashboard/` quality gates in this run: `npm install`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` all pass.
- Next milestone: Security, privacy, accessibility, continuing with the remaining Section 13 closure work and parity follow-up inventory once the milestone is complete.

### 2026-08-30 (security milestone closure verification)
- Re-ran the full `pages/dashboard/` quality gate stack on the current Section 13 implementation and confirmed the repository already contains the conservative escaping, safe-link, redaction, keyboard-navigation, context-narrowing, and non-color chart semantics slices without requiring additional code changes.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run build`, `npm run typecheck` (required one immediate rerun after install because local type definitions were not linked yet), `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` all pass.
- Marked the Security, privacy, accessibility milestone complete now that its implemented Section 13 slices are green end-to-end in build, unit, and browser verification.
- Next milestone: Parity, continuing the report feature and presentation inventory closure work under the existing declarative and reusable-runtime constraints.

### 2026-08-30 (parity motion audit verification slice)
- Continued the Parity milestone with a narrow non-semantic verification increment against the already-implemented motion audit patterns derived from `dashboard/report/report.mjs`.
- Added automated unit coverage in `test/unit/scaffold.test.js` proving the generic stylesheet still includes the retained 120ms color/background transitions, the 80ms chart-point tooltip fade, the repository-link transition, and the reduced-motion override that suppresses nonessential motion.
- Re-read `dashboard/report/report.mjs` and kept the implementation conservative: no new runtime behavior or dashboard semantics were introduced because this slice only hardens parity evidence for existing generic styling primitives.
- Next milestone: Parity, continuing the remaining report feature and presentation inventory closure work under the existing declarative and reusable-runtime constraints.

### 2026-08-30 (parity safe-link verification slice)
- Continued the Parity milestone with a narrow verification increment on reusable runtime link handling, keeping the existing conservative `https`-only sanitizer and extending evidence rather than inventing new semantics.
- Expanded `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` so `DLS-SAFE-004` coverage now proves credential-bearing links, non-HTTPS `ftp:` links, and blank-label links are all omitted across both custom table and custom metric link surfaces while safe HTTPS links remain visible.
- Re-read the report reference and kept this slice presentation-aligned but non-semantic: no renderer code or declarative dashboard composition changed because the existing generic runtime already satisfied the conservative behavior.
- Verified `pages/dashboard/` quality gates in this run: `npm install`, `npm run build`, `npm run typecheck` (rerun once per environment guidance), `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` all pass.
- Next milestone: Parity, continuing the remaining report feature and presentation inventory closure work under the existing declarative and reusable-runtime constraints.

### 2026-08-30 (package AIC utilization parity slice)
- Continued the Parity milestone by porting the report's `bundleUtilizationPanel` AI Credit utilization UX from `dashboard/report/report.mjs` into `pages/dashboard`, closing the "Package AI Credit utilization bars and threshold treatments" checklist item.
- Added `summarizePackageAicUsage(...)` and `renderPackageAicUtilization(...)` to `src/components/operational-overview.js`, joining `usage` rows to their owning package through the workflow path already recorded on `workflows` rows, then rendering a per-package meter bar with low/medium/high/empty threshold coloring, a formatted percentage, and a used-of-allowed detail line, matching the report's widget shape and thresholds (`>=80%` high, `>=50%` medium, otherwise low, unavailable/no-allowance as empty).
- Wired the new panel into `renderOperationalOverview(...)` between the control-plane status banner and the attention/managed-packages grid, and extended `src/styles.js` with report-derived `.package-aic-utilization`/`.utilization-*` rules reusing existing Primer color tokens.
- Extended `test/unit/presenter.test.js` with utilization-bar assertions on the existing overview fixture (percentage, threshold class, detail text, accessible label, meter width) and a new empty-state test for packages without a configured AIC allowance.
- Verified `pages/dashboard/` quality gates in this run: `npm install`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` (107 tests), and `npx playwright test --config=playwright.config.mjs` (8 browser tests) all pass.
- Next milestone: Parity, continuing the remaining report feature and presentation inventory closure work under the existing declarative and reusable-runtime constraints.

## Run log

## Run log

### 2026-08-30 (view-formatters helper refactor)
- Re-inventoried repeated UI-adjacent helper construction under `pages/dashboard/src/` and selected the highest remaining bounded pure-helper slice: duplicated aggregate metric value formatting and shared numeric formatting in `src/presenter.js`, reused by custom metric rendering today and chart text equivalents indirectly through the same numeric formatter.
- Extracted `src/view-formatters.js` with presentation-only `formatAggregateValue(...)`, `toNumber(...)`, and `formatNumber(...)`, then replaced every identified call site in `src/presenter.js` by collapsing the inline aggregate `count`/`distinct-count`/`sum`/`mean`/`min`/`max` branch inside `renderMetricView(...)` plus the shared `formatNumber(...)`/`toNumber(...)` usage consumed by chart-point labels and chart-series construction.
- Added unit coverage in `test/unit/view-formatters.test.js` for populated, empty, missing-field, and non-numeric cases while preserving the existing `DLS-VIEW-013` requirement coverage for custom-view presentation semantics.
- Proved unchanged behavior by keeping the presenter output contract intact for the affected custom metric and chart surfaces and by rerunning the `pages/dashboard/` quality gates after the extraction.
- Next candidates in the queue: extract the repeated custom-view state-message plus affected-source/context composition in `src/presenter.js`; extract shared link-cell composition across custom metric and custom table views; extract shared chart-series grouping and textual legend helpers if upcoming feature slices add more chart variants.

### 2026-08-30 (compliance suite milestone closure verification)

- Re-ran the full `pages/dashboard/` quality gate stack on the current compliance implementation and confirmed the repository already contains the machine-readable Section 14 smoke harness, Appendix A passing fixture coverage, Appendix C failing fixture coverage, semantic/context checklist assertions, and conservative built-in page and link checks without requiring additional code changes.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` all pass.
- Marked the Compliance suite milestone complete now that the compliance harness and tests are green end-to-end for the implemented conservative Section 14 slices.
- Next milestone: Security, privacy, accessibility, continuing with the remaining Section 13 verification needed to close that milestone before parity follow-up work.

### 2026-08-30 (view-section-chrome refactor)

- Re-inventoried repeated UI construction under `pages/dashboard/src/` and selected the highest remaining bounded custom-view chrome slice: repeated `renderViewHeader(...)` plus `renderContextList(...)` composition shared by metric, table, and chart custom-view renderers in `src/presenter.js`.
- Extended `src/components/view-chrome.js` with presentation-only `renderContextChrome(...)` and `renderViewSectionChrome(...)`, then replaced every identified custom-view call site in `src/presenter.js` so metric, table, and chart views all reuse the same shared section-chrome assembly.
- Collapsed the identified call sites in `src/presenter.js`: `renderMetricView(...)`, `renderTableView(...)`, and `renderChartView(...)`, while leaving the distinct unavailable/empty custom-view state helper unchanged because its `Affected source:` line differs from the source/metadata pattern.
- Added unit coverage in `test/unit/view-chrome.test.js` for populated and empty `renderContextChrome(...)` output and for `renderViewSectionChrome(...)` composition, preserving the existing `DLS-VIEW-013` assertions around custom-view chrome.
- Proved unchanged behavior by keeping `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` green from `pages/dashboard/`, and by capturing the affected refactor diff at `/tmp/gh-aw/agent/view-section-chrome-refactor.diff` to confirm the change is limited to shared chrome extraction and call-site replacement.
- Next candidates in the queue: extract the repeated custom-view state-message plus context composition in `src/presenter.js`; extract shared pure helpers for metric/chart aggregate value formatting; extract shared link-cell composition across custom metric and custom table views.

### 2026-08-30 (compliance built-in page data-state slice)

- Continued the Compliance suite milestone with a narrow `T-PAGE-001` increment for already-implemented built-in page behavior, using the Appendix A presenter fixture instead of inventing new runtime semantics.
- Extended `src/compliance.js` so the machine-readable smoke suite now records a passing `T-PAGE-001` result for `DLS-PAGE-014` when the rendered Appendix A built-in pages expose independent `Availability`, `Completeness`, and `Freshness` text.
- Added unit coverage in `test/unit/compliance.test.js` that asserts the new machine-readable `T-PAGE-001` / `DLS-PAGE-014` result alongside the existing semantic and context checklist coverage.
- Verified `pages/dashboard/` quality gates in this run: `npm install`, `npm run typecheck`, `npm run lint`, and `npm test` all pass.
- Deferred `T-LINK-001` checklist automation for this run and recorded the fixture/presenter observability ambiguity under Specification questions rather than inventing broader link semantics.
- Next milestone: Compliance suite, continuing with `T-LINK-001` or `T-AGG-001` once the fixture surface supports conservative machine-readable assertions.

### 2026-08-30 (security context-permitted custom views slice)

- Continued the Security, privacy, accessibility milestone with a narrow `DLS-SAFE-006` vertical increment that now enforces custom-view narrowing context in the presenter rather than only echoing the declared context text.
- Updated `src/presenter.js` so custom metric, table, and chart views filter rows by declared `scope`, absolute `time.start`/`time.end`, and `filters` before rendering, returning the existing explicit `empty` or `unavailable` states when the narrowed selection has no usable observations.
- Added focused unit and browser coverage in `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` that verify out-of-scope and out-of-range finding rows and their links are omitted while in-scope rows and links remain visible and the effective-context text stays exposed.
- Verification still pending in this run: execute the full `pages/dashboard/` gate stack and then continue with the remaining Section 13 screen-reader/accessibility or compliance slices.
- Next milestone: Security, privacy, accessibility, continuing with the remaining Section 13 slices that are not yet covered in the checklist.

### 2026-08-30 (view-chrome paragraph refactor)

- Re-inventoried the remaining repeated UI construction under `pages/dashboard/src/` and selected the next bounded helper slice inside the shared chrome library: repeated custom-view paragraph assembly where the first line uses `.view-source` and subsequent lines use `.view-metadata`.
- Extended `src/components/view-chrome.js` with presentation-only `renderViewChrome(lines)` and rewired `renderViewHeader(...)` to compose it, collapsing the duplicated paragraph shape used by source and metadata chrome into one reusable helper for future custom-view slices.
- Collapsed the identified call sites in `src/components/view-chrome.js`: the existing source line and metadata line emitted by `renderViewHeader(...)`, which now reuse the shared paragraph helper while preserving DOM text and class names.
- Added unit coverage in `test/unit/view-chrome.test.js` for populated and empty `renderViewChrome(...)` inputs alongside the existing `renderViewHeader(...)` assertions.
- Proved unchanged behavior by keeping `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` green from `pages/dashboard/`, and by capturing the affected diff at `/tmp/gh-aw/agent/view-chrome-refactor.diff` to confirm the change is limited to introducing the shared helper and composing it from the existing header helper.
- Next candidates in the queue: extract the repeated custom-view section composition shared by metric, table, and chart renderers in `src/presenter.js`; extract shared pure helpers for chart/table row text formatting and link-column composition; extract the repeated state-message plus context composition in unavailable and empty custom views.

### 2026-08-30 (repositories ranking-definition slice)

- Continued the Built-in pages milestone by replacing the `repositories` page's source-coverage placeholders with separate declarative inventory, run-count ranking, AIC ranking, and operational-value ranking views.
- Made each ranking's aggregate output identifier and descending order explicit while retaining `operational-value-definition` in the operational-value output grain so distinct definitions are never combined.
- Added focused unit assertions that keep the authoritative `dashboard.json` repository ranking contract deterministic and auditable.
- Next milestone: Security, privacy, accessibility, continuing with the remaining Section 13 slices that are not yet covered in the checklist.

### 2026-08-30 (summary-list view-chrome refactor)

- Re-inventoried repeated construction under `pages/dashboard/src/` and selected the highest remaining bounded helper slice: the repeated count-list `<ul><li>${name}: ${count}</li></ul>` assembly still centralized in `src/presenter.js` and reused across runs, findings, usage totals, and overview sections.
- Extended `src/components/view-chrome.js` with presentation-only `renderSummaryList(listClassName, counts)` and rewired `renderSummaryRegion(...)` to compose it, then replaced every presenter call site previously routed through the local `renderSummaryList(...)` helper in `src/presenter.js`.
- Collapsed duplicated summary-list call sites identified in `src/presenter.js`: runs status/conclusion/outcome counts, findings severity/status counts, usage totals, overview rollout-mode/workflow-active summaries, overview run status/conclusion summary blocks, repository/workflow rankings, and largest AIC spenders.
- Added unit coverage in `test/unit/view-chrome.test.js` for the extracted summary-list helper plus the existing summary-region wrapper, including populated and empty inputs.
- Proved unchanged behavior by keeping `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` green from `pages/dashboard/`, and by capturing the affected refactor diff at `/tmp/gh-aw/agent/summary-list-refactor.diff` to confirm the presenter change is limited to replacing the local list builder with the shared component helper.
- Next candidates in the queue: extract the repeated overview summary-plus-trend region composition in `src/presenter.js`; extract the repeated definitions/observations dual-region composition for graders and evals; extract shared pure helpers for observation rollups such as subjects, score values, and model summaries.

### 2026-08-30 (built-in pages milestone closure verification)

- Re-ran the full `pages/dashboard/` quality gate stack on the current built-in-page implementation to confirm the authoritative `dashboard.json` and generic built-in interpreter continue to satisfy the milestone end state without further code changes.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` all pass.
- Marked the Built-in pages milestone complete now that the repository already contains all 12 specification-defined built-in pages in `dashboard.json`, declarative rendering coverage, and passing build, unit, and browser verification proving they render without top-level page-specific dispatch.
- Next milestone: Security, privacy, accessibility, continuing with the remaining Section 13 slices that are not yet covered in the checklist.

### 2026-08-29 (built-in source-ordered definition interpreter slice)

- Continued the Built-in pages milestone with a bounded presenter increment that removes the remaining dependence on hard-coded built-in section index positions when mapping `definition.views` to rendered built-in sections.
- Updated `src/presenter.js` so `renderBuiltInPageFromDefinition(...)` now matches built-in section renderers by declared view `data.source`, consuming repeated source-backed sections in view order and falling back conservatively to any remaining declared sections.
- Added focused unit coverage in `test/unit/presenter.test.js` proving a built-in `runs` page can reorder repeated `runs` and `outcomes` views declaratively while preserving the correct rendered section bodies and titles.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` all pass.
- Next milestone: Built-in pages, with the remaining gap now narrowed to replacing implementation-local source-to-section assumptions with a more fully generic built-in composition vocabulary if and when the specification defines one.

### 2026-08-29 (built-in definition-interpreter slice)

- Continued the Built-in pages milestone by shifting built-in page body composition from page-level dispatch functions toward a generic definition interpreter keyed by ordered `dashboard.json` `definition.views` entries.
- Refactored `src/presenter.js` so built-in pages now render through `renderBuiltInPageFromDefinition(...)` and reusable section renderers, removing the remaining top-level per-page wrapper functions and making section titles derive from declarative view order and optional view titles.
- Kept the implementation conservative: the existing validated implementation-local `definition.views` sequence remains the only built-in declarative contract, and no new specification semantics were invented.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` all pass.
- Next milestone: Built-in pages, with the remaining gap now narrowed to replacing implementation-local ordered view-to-section assumptions with a more fully generic built-in composition vocabulary if and when the specification defines one.

### 2026-08-29 (built-in coverage gate rerun slice)

- Re-ran the full `pages/dashboard/` quality gate stack after the authoritative `dashboard.json` milestone slice to verify the document-backed built-in page inventory remains green under strict `checkJs` typing.
- Fixed strict type-check regressions by annotating the built-in renderer registry in `src/presenter.js` and the authoritative `dashboard.json` structure assertions in `test/unit/presenter.test.js`, without changing renderer behavior or expanding the implementation surface.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` all pass.
- Closed the Built-in pages subtask for build, unit, and browser coverage proving the authoritative `dashboard.json` contains and renders all 12 specification-defined built-in pages under the current renderer architecture.
- Next milestone: Built-in pages, continuing the migration of remaining page-body composition out of `src/presenter.js` and into generic interpretation of declarative `dashboard.json` definitions.

### 2026-08-29 (authoritative dashboard document slice)

- Created `pages/dashboard/dashboard.json` as the authoritative declarative dashboard document containing all 12 specification-defined built-in pages, each with conservative `definition.views` source/field coverage and canonical independent `availability`, `completeness`, and `freshness` exposure markers.
- Replaced the built-in page `if`/`else` dispatch chain in `src/presenter.js` with a declarative renderer registry keyed by built-in page names, reducing bespoke page-name branching while preserving the existing verified rendering behavior.
- Added unit coverage in `test/unit/presenter.test.js` that reads `dashboard.json` directly and verifies the document contains exactly the 12 specification-defined built-in pages with declarative views and canonical data-state markers.
- Verification in this run is limited to document creation plus unit-level structural coverage; the remaining quality gates still need to be rerun after the next built-in runtime migration slice.
- Next milestone: Built-in pages, continuing the migration of individual built-in page body composition from page-specific presenter code into generic interpretation of the authoritative `dashboard.json` definitions.

### 2026-08-29 (data-driven built-in renderer plan)

- Reframed the remaining Built-in pages work around an authoritative `dashboard.json` containing all 12 specification-defined pages, their views, and their build/composition definitions.
- Added explicit follow-up slices to refactor the existing JavaScript page views into JSON equivalents, minimize the generic JavaScript runtime, and prove all built-in pages through build and browser coverage.
- Next milestone: Built-in pages, starting with the authoritative `dashboard.json` schema and the first page-specific JavaScript-to-JSON migration.

### 2026-08-29 (built-in overview render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-002` and `DLS-PAGE-014` presenter increment for the `overview` built-in page.
- Updated `src/presenter.js` so declarative built-in `overview` definitions now render rollout-mode filtering, workflow active-state inventory, run status and conclusion counts and trends, repository and workflow rankings, largest AIC spenders, recent linked findings, and an operational-value timeline from the `workflows`, `runs`, `usage`, `findings`, and `operational-values` logical sources.
- Added focused unit coverage in `test/unit/presenter.test.js` and browser coverage in `test/e2e/smoke.spec.js` that verify overview section headings, independent `availability`, `completeness`, and `freshness` summaries, rankings, trends, linked findings, operational-value timeline rows, and provenance entries.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` all pass.
- Next milestone: Security, privacy, accessibility, next slice for additional authorization-boundary or accessibility behavior, or Compliance suite parity between checklist coverage and the now-rendered `overview` built-in page.

### 2026-08-29 (titled-region view-chrome refactor)

- Re-inventoried repeated built-in section composition in `src/presenter.js` and selected the next bounded duplication slice: repeated `h('h3', ...)` plus a single summary list, table region, or provenance list across built-in page bodies.
- Extended `src/components/view-chrome.js` with presentation-only `renderTitledRegion()` and `renderProvenanceSection()` helpers so built-in pages can reuse the existing focusable labeled `page-section` wrapper without rebuilding title-plus-content markup at each call site.
- Collapsed every duplicated single-region call site identified in `src/presenter.js`: built-in provenance plus workflows, usage totals, usage observations, engines-models, operational-value, organizations, repositories, experiments, and graders definitions/observations.
- Added unit coverage in `test/unit/view-chrome.test.js` for titled-region composition and reusable provenance-section rendering, including empty provenance fallback output.
- Proved unchanged behavior by keeping the full existing unit and browser suites green and by capturing a presenter diff at `/tmp/gh-aw/agent/presenter-refactor.diff`, confirming the affected pages changed only by replacing repeated heading-plus-content assembly with `renderTitledRegion(...)` / `renderProvenanceSection(...)` calls while preserving the same DOM text, section headings, class names, and accessible labeling.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` all pass.
- Next candidates in the queue: extract repeated built-in summary-section composition for count lists; extract the next shared pure helpers around subject/provenance/count formatting in `src/presenter.js`; extract repeated built-in definitions/observations dual-region composition in `src/presenter.js`.

### 2026-08-29 (summary-region view-chrome refactor)

- Re-inventoried repeated section composition in `src/presenter.js` and selected the highest remaining bounded count-list slice: `renderPageSection(...)` wrapped around a single `renderSummaryList(...)` call in `renderRunsPage`, `renderFindingsPage`, and `renderOverviewPage`.
- Extended `src/components/view-chrome.js` with presentation-only `renderSummaryRegion(pageId, title, listClassName, counts)` so repeated summary-section DOM can reuse the shared focusable labeled `page-section` wrapper without rebuilding the same section-plus-list shape.
- Collapsed every duplicated single-summary call site identified in `src/presenter.js`: runs status/conclusion/outcome counts, findings severity/status counts, and overview rollout-mode/workflow-active summaries.
- Added unit coverage in `test/unit/view-chrome.test.js` for populated and empty summary-region rendering, preserving the existing `No data available.` fallback semantics and deterministic heading ids.
- Proved unchanged behavior by keeping the full suite green and rendering the existing overview presenter fixture to `/tmp/gh-aw/agent/behavior-check.html`, confirming the affected overview section headings and summary-list class names remain unchanged after the extraction.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test --config=playwright.config.mjs` all pass.
- Next candidates in the queue: extract the next shared pure helpers around subject/provenance/count formatting in `src/presenter.js`; extract repeated built-in definitions/observations dual-region composition in `src/presenter.js`; extract repeated summary-plus-trend section composition in `src/presenter.js`.

### 2026-08-29 (custom-view context-list refactor)

- Re-inventoried duplication in `src/presenter.js` and selected the highest remaining bounded custom-view chrome slice: repeated `.view-context` list construction in `renderCustomViewState`, `renderMetricView`, `renderTableView`, and `renderChartView`.
- Extended `src/components/view-chrome.js` with presentation-only `renderContextList(details)` so custom views can reuse the same context-strip DOM shape without rebuilding the unordered-list markup at each call site.
- Collapsed every duplicated custom-view context-list call site identified in `src/presenter.js`, preserving the same DOM text, list item ordering, class names, and empty-list behavior.
- Added unit coverage in `test/unit/view-chrome.test.js` for populated and empty context-list rendering under `DLS-VIEW-013`.
- Proved unchanged behavior by keeping the full test suite green, capturing the affected diff at `/tmp/gh-aw/agent/context-list-refactor.diff`, and rendering the existing custom-views presenter fixture to `/tmp/gh-aw/agent/custom-page-after.html` to confirm the refactored page still emits the same custom metric, table, chart, empty, and unavailable view text.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` all pass.
- Next candidates in the queue: extract repeated built-in summary-section composition for count lists; extract the next shared pure helpers around subject/provenance/count formatting in `src/presenter.js`; extract repeated built-in definitions/observations dual-region composition in `src/presenter.js`.

### 2026-08-29 (view-chrome component refactor)

- Inventoried repeated presenter chrome after the table-region extraction and selected the next bounded duplication slice: shared page-section markup plus repeated custom-view source/metadata paragraphs and built-in provenance list rendering in `src/presenter.js`.
- Added `src/components/view-chrome.js`, a presentation-only reusable helper module for focusable labeled `page-section` wrappers, custom-view source/metadata header chrome, and conservative built-in provenance lists.
- Collapsed the repeated custom metric/table/chart header markup and the built-in provenance list in `src/presenter.js` into the shared helpers while preserving all existing DOM text, accessible names, section heading ids, class names, and fallback messages.
- Added `test/unit/view-chrome.test.js` covering deterministic section labeling, provenance list rendering, and reusable source/metadata chrome output.
- Updated the Playwright data-URL module wiring in `test/e2e/smoke.spec.js` so browser coverage continues to exercise the presenter with the new shared component module.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` all pass.
- Next candidates in the queue: extract repeated built-in provenance heading-plus-list composition; extract repeated summary-section composition for built-in pages; continue parity inventory once the presenter refactor surface stabilizes.

### 2026-08-29 (table-region built-in inventory expansion refactor)

- Re-inventoried `src/presenter.js` after the first table extraction and found the best remaining bounded duplication in repeated `.table-region > table > thead/tbody` construction still in `renderEnginesModelsPage`, `renderOperationalValuePage`, `renderOrganizationsPage`, `renderRepositoriesPage`, `renderExperimentsPage`, `renderGradersPage`, and `renderEvalsPage`.
- Reused `src/components/table-region.js` at every remaining duplicated call site identified above, preserving all existing DOM text, accessible names, class names, empty-state messages, and keyed row renderers while collapsing seven more built-in table wrappers into the shared component.
- Added unit coverage in `test/unit/table-region.test.js` for keyed-list descriptor bodies so the shared component is explicitly tested against the built-in presenter's keyed table usage.
- Proved unchanged behavior by keeping the full existing unit and browser suites green and by reviewing the presenter diff to confirm the affected pages changed only by replacing duplicated table wrapper construction with `renderTableRegion(...)` calls.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` all pass.
- Next candidates in the queue: extract repeated custom-view source/metadata/context chrome; extract repeated provenance section rendering for built-in pages; extract repeated built-in page section headings plus inventory-table composition once the remaining table call sites settle.

### 2026-08-29 (table-region component refactor)

- Inventoried repeated table wrapper construction in `src/presenter.js` and selected the highest-leverage bounded extraction: duplicated `.table-region > table > thead/tbody` markup shared by built-in runs, workflows, findings, and usage pages plus custom table and chart text-equivalent views.
- Added `src/components/table-region.js`, a presentation-only reusable table wrapper component with a minimal API for table class name, header labels, empty-state message, column span, and prebuilt body rows, while preserving existing DOM text, accessible names, class names, and custom view `data-custom-view-mark` attributes.
- Collapsed duplicated call sites in `src/presenter.js` for `renderRunsPage`, `renderWorkflowsPage`, `renderFindingsPage`, `renderUsagePage`, `renderTableView`, and `renderChartView`.
- Added `test/unit/table-region.test.js` covering populated tables, empty tables, and custom table/chart attribute preservation.
- Proved unchanged behavior by keeping the existing presenter unit tests and Playwright smoke tests green after the extraction, including custom-view and built-in page assertions that depend on the affected tables; compared the affected presenter output structurally via `git diff` against the pre-refactor `src/presenter.js` and confirmed the changes are limited to replacing duplicated construction with the shared component.
- Verified quality gates from `pages/dashboard/`: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` all pass.
- Next candidates in the queue: extract repeated custom-view source/metadata/context chrome; extract repeated provenance section rendering for built-in pages; extract repeated built-in page section headings plus inventory-table composition once the remaining table call sites settle.

### 2026-08-29 (compliance semantic-and-context coverage slice)

- Extended the Compliance suite milestone with a narrow Section 14 increment covering `T-SEM-001`, `T-SEM-002`, `T-SEM-003`, and `T-CTX-001` for the semantic and context requirements already implemented in the validator and presenter.
- Updated `src/compliance.js` so the machine-readable harness now records passing results for implemented `DLS-SEM-001`, `DLS-SEM-002`, `DLS-SEM-004`, `DLS-SEM-005`, `DLS-SEM-007` through `DLS-SEM-017`, `DLS-SEM-021`, and `DLS-CTX-001`, `DLS-CTX-002`, `DLS-CTX-004`, `DLS-CTX-005`, `DLS-CTX-006`, `DLS-CTX-009`, including presenter verification that experiments are rendered without implying causation.
- Added focused unit coverage in `test/unit/compliance.test.js` that verifies machine-readable checklist results for the new `T-SEM-*` and `T-CTX-001` slices while preserving Appendix A / Appendix C smoke checks.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Compliance suite, next slice for `T-AGG-001`, `T-LINK-001`, or `T-PAGE-001` checklist-backed machine-readable coverage.

### 2026-08-29 (security non-color chart semantics slice)

- Extended the Security, privacy, accessibility milestone with a narrow presenter increment for `DLS-SAFE-009`, ensuring custom chart color encodings are never communicated by color alone.
- Updated `src/presenter.js` so chart views with a `color` encoding now render an explicit textual category legend derived deterministically from the rendered data, alongside the existing tabular equivalent.
- Added focused unit coverage in `test/unit/presenter.test.js` and browser coverage in `test/e2e/smoke.spec.js` that verify visible textual color-category labels for chart series.
- Next milestone: Security, privacy, accessibility, next slice for additional consuming-context authorization-boundary behavior once the runtime context contract is specified.

### 2026-08-29 (custom views data-state render slice)

- Extended the Security, privacy, accessibility milestone with a narrow presenter increment spanning `DLS-SAFE-006`, `DLS-VIEW-013`, `DLS-VIEW-014`, and `DLS-VIEW-015` for custom-page rendering.
- Updated `src/presenter.js` so custom pages now visibly render supported metric, table, and chart views from provided YAML definitions, expose per-view source and effective-context text, show explicit `available`/`empty`/`unavailable` states instead of omitting views, preserve chart semantic defaults as text, and render links only when the provided row carries the referenced relation-specific link object.
- Added focused unit coverage in `test/unit/presenter.test.js` and browser coverage in `test/e2e/smoke.spec.js` that verify aggregate metric output, labeled table and chart text equivalents, empty/unavailable custom-view states, and absent-link rows remaining unlinked.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Security, privacy, accessibility, next slice for `DLS-SAFE-009` non-color semantics or additional consuming-context authorization boundary behavior once the runtime context contract is specified.

### 2026-08-29 (security secret-redaction validator slice)

- Extended the Security, privacy, accessibility milestone with a narrow Section 13 and Section 12 validator increment for `DLS-SAFE-005` and `DLS-VAL-004` covering secret-bearing provenance metadata rejection without echoing secret values back into validation errors.
- Updated `src/validator.js` so `data.source-metadata` now conservatively rejects credential-like strings and PEM-like private-key material across provenance metadata fields while keeping error messages generic and path-specific.
- Added focused unit coverage in `test/unit/validator.test.js` that verifies rejected secret-bearing metadata and confirms the secret literal is not repeated in emitted error messages.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Security, privacy, accessibility, next slice for `DLS-SAFE-006` consuming-context authorization boundaries or additional screen-reader behavior.

### 2026-08-29 (security keyboard navigation slice)

- Extended the Security, privacy, accessibility milestone with a narrow Section 13 presenter increment for `DLS-SAFE-007` and `DLS-SAFE-008` covering keyboard traversal across labeled page sections.
- Updated `src/presenter.js` so built-in runs, findings, and evals content is grouped into reusable focusable `page-section` regions with stable accessible headings, and added `enableDashboardKeyboardNavigation()` for deterministic ArrowUp/ArrowDown movement between adjacent sections without changing page semantics.
- Added focused unit coverage in `test/unit/presenter.test.js` and browser coverage in `test/e2e/smoke.spec.js` that verify section labels, focusability, and keyboard traversal across runs page sections.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Security, privacy, accessibility, next slice for privacy/redaction semantics or additional screen-reader-oriented presenter behavior.

### 2026-08-29 (security accessibility presenter slice)

- Started the Security, privacy, accessibility milestone with a narrow Section 13 presenter increment for `DLS-SAFE-003`, `DLS-SAFE-007`, `DLS-SAFE-008`, and `DLS-SAFE-010`.
- Updated `src/presenter.js` so rendered external links now preserve the specification's non-empty labels as accessible names and open with conservative `target="_blank"` plus `rel="noopener noreferrer"`, while untrusted finding summaries continue to render as inert text nodes rather than markup.
- Added focused unit coverage in `test/unit/presenter.test.js` and browser coverage in `test/e2e/smoke.spec.js` that verify skip navigation presence, page accessible names, labeled table columns, distinct textual data-state labels, inert HTML-like text rendering, and labeled issue links.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Security, privacy, accessibility, next slice for keyboard behavior and additional redaction/privacy semantics.

### 2026-08-29 (built-in evals render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-009` and `DLS-PAGE-014` presenter increment for the `evals` built-in page, rendering distinguishable eval definitions and eval observations with observed subject, `YES`/`NO`/`UNKNOWN` result, evaluation model when available, time, provenance, and independent data-state summaries.
- Updated `src/presenter.js` so declarative built-in `evals` definitions now render separate definitions and observations tables from the `evals` and `eval-observations` logical sources with deterministic ordering and conservative unavailable handling for absent resolved models.
- Replaced the presenter unit and browser smoke coverage with focused `DLS-PAGE-009` / `DLS-PAGE-014` tests in `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` that verify definition-versus-observation separation, subject strings, result rendering, evaluation-model exposure, provenance, and independent `availability`, `completeness`, and `freshness` text.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Security, privacy, accessibility.

### 2026-08-29 (built-in graders render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-008` and `DLS-PAGE-014` presenter increment for the `graders` built-in page, rendering distinguishable grader definitions and grader observations with observed subject, result, score when present, time, provenance, and independent data-state summaries.
- Updated `src/presenter.js` so declarative built-in `graders` definitions now render separate definitions and observations tables from the `graders` and `grader-observations` logical sources with deterministic ordering and conservative unavailable handling for absent scores.
- Replaced the presenter unit and browser smoke coverage with focused `DLS-PAGE-008` / `DLS-PAGE-014` tests in `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` that verify definition-versus-observation separation, subject strings, result counts, score rendering, provenance, and independent `availability`, `completeness`, and `freshness` text.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page such as `evals` from the declarative definitions.

### 2026-08-29 (built-in experiments render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-007` and `DLS-PAGE-014` presenter increment for the `experiments` built-in page, rendering experiment definitions alongside observed run-to-variant assignments, grader observations, eval observations, downstream outcomes, available usage AIC, and operational value by definition.
- Updated `src/presenter.js` so declarative built-in `experiments` definitions now render a concrete inventory table from the `experiments`, `experiment-assignments`, `grader-observations`, `eval-observations`, `outcomes`, `usage`, and `operational-values` logical sources, while adding an explicit non-causation note to preserve the specification's conservative semantics.
- Replaced the presenter unit and browser smoke coverage with focused `DLS-PAGE-007` / `DLS-PAGE-014` tests in `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` that verify deterministic variant, grader, eval, outcome, usage, operational-value, provenance, and independent `availability`, `completeness`, and `freshness` rendering.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page such as `graders` or `evals` from the declarative definitions.

### 2026-08-29 (built-in repositories render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-004` and `DLS-PAGE-014` presenter increment for the `repositories` built-in page, rendering repository inventory plus deterministic rankings by run count, AIC, and available operational value while preserving operational-value definitions as separate labeled values instead of combining them.
- Updated `src/presenter.js` so declarative built-in `repositories` definitions now render a concrete inventory table from the `repositories`, `runs`, `usage`, and `operational-values` logical sources with stable ranking order and conservative unavailable handling when a repository has no operational-value observations.
- Replaced the presenter unit and browser smoke coverage with focused `DLS-PAGE-004` / `DLS-PAGE-014` tests in `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` that verify row ordering, run counts, AIC totals, separated operational-value definitions, provenance, and independent `availability`, `completeness`, and `freshness` text.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page such as `experiments`, `graders`, or `evals` from the declarative definitions.

### 2026-08-29 (built-in organizations render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-003` and `DLS-PAGE-014` presenter increment for the `organizations` built-in page, rendering organization inventory with repository, workflow, and run counts plus separated available usage measures.
- Updated `src/presenter.js` so declarative built-in `organizations` definitions now render a concrete inventory table from the `organizations`, `repositories`, `workflows`, `runs`, and `usage` logical sources with deterministic per-organization counting and usage-measure summarization.
- Replaced the presenter unit and browser smoke coverage with focused `DLS-PAGE-003` / `DLS-PAGE-014` tests in `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` that verify organization rows, counts, separated usage totals, provenance, and independent `availability`, `completeness`, and `freshness` text.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page such as `repositories` from the declarative definitions.

### 2026-08-29 (built-in operational-value render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-012` and `DLS-PAGE-014` presenter increment for the `operational-value` built-in page, rendering a time-ordered absolute-attainment series with definition, operational case, evaluator digest, subject scope, requested evidence time, effective evidence cutoff, maturity time and status, separate baseline delta, available evidence links, provenance, and independent data-state summaries.
- Updated `src/presenter.js` so declarative built-in `operational-value` definitions now render a concrete timeline table from the `operational-values` logical source with deterministic chronological ordering and conservative absent-value handling for optional delta and evidence-link fields.
- Replaced the presenter unit and browser smoke coverage with focused `DLS-PAGE-012` / `DLS-PAGE-014` tests in `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` that verify chronology, absolute attainment values, evidence timing, maturity status, optional delta and evidence link rendering, provenance, and independent `availability`, `completeness`, and `freshness` text.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page such as `organizations` or `repositories` from the declarative definitions.

### 2026-08-29 (built-in engines-models render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-011` and `DLS-PAGE-014` presenter increment for the `engines-models` built-in page, rendering engine, requested model, and resolved model as separate grouping dimensions with run counts, run conclusions, downstream outcome counts, separate raw-token totals, AIC totals, provenance, and independent data-state summaries.
- Updated `src/presenter.js` so declarative built-in `engines-models` definitions now render a concrete grouped inventory table from the `runs`, `outcomes`, and `usage` logical sources, reusing keyed reconciliation and shared usage-measure summarization helpers for deterministic output.
- Replaced the presenter unit and browser smoke coverage with focused `DLS-PAGE-011` / `DLS-PAGE-014` tests in `test/unit/presenter.test.js` and `test/e2e/smoke.spec.js` that verify grouped engine-model rows, separated token measures and AIC, provenance, and independent `availability`, `completeness`, and `freshness` text.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page such as `operational-value`, `organizations`, or `repositories` from the declarative definitions.

### 2026-08-29 (built-in usage render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-010` and `DLS-PAGE-014` presenter increment for the `usage` built-in page, rendering raw-token totals separately from AIC plus per-observation engine, requested model, resolved model, scope, rollout mode, observed time, provenance, and independent data-state summaries.
- Updated `src/presenter.js` so declarative built-in `usage` definitions now render a concrete totals summary and usage table from the `usage` logical source, reusing the keyed-list DOM primitive and the existing mode-badge component for deterministic row reconciliation and presentation.
- Expanded `test/unit/presenter.test.js` with a jsdom presenter contract for the `usage` slice and added a Playwright browser test in `test/e2e/smoke.spec.js` that verifies separate raw-token and AIC totals, rendered usage rows, provenance, and independent `availability`, `completeness`, and `freshness` text.
- Verified all quality gates pass: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page such as `engines-models` or `operational-value` from the declarative definitions.

### 2026-08-29 (GitHub Primer brand styling & presentation component slice)

- Updated the dashboard presenter to clone the style of the current JavaScript dashboard implemented in CAO (`dashboard/report/report.mjs`), generating dashboards that are GitHub brand-aligned using GitHub Primer CSS tokens and elements.
- Added GitHub Primer design tokens and stylesheet module (`src/styles.js`) supporting dark, light, contrast, and high-contrast color schemes.
- Added GitHub Octicons and CAO brand mark SVG helpers (`src/octicons.js`) with SVG namespace support in the DOM builder (`src/dom.js`).
- Created reusable presentation components for Primer status/mode badges (`src/components/badge.js`) and data-state metrics card grids (`src/components/data-state.js`).
- Updated `src/presenter.js` to render the Primer `.app-shell` layout with `.org-sidebar`, brand mark, `.primary-nav` with Octicons, breadcrumbs, `.overview-header`, `.table-region` data tables, and `.report-footer`.
- Configured Playwright runner to use the system Chromium binary and expanded unit and E2E test suites to verify Primer styling, brand elements, sidebar navigation, and data badges.
- Verified all quality gates pass: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
- Next milestone: Built-in pages, next slice for rendering remaining Section 10 built-in pages (such as overview or tasks) or custom page views.

### 2026-08-29 (built-in findings render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-013` and `DLS-PAGE-014` presenter increment for the `findings` built-in page, rendering finding summary, severity, status, scope, observed time, available issue/pull-request/run links, and independent data-state summaries.
- Updated `src/presenter.js` so declarative built-in `findings` definitions now render severity and status summary lists plus a concrete findings table from the `findings` logical source, preserving absent-link rows without fabricated links.
- Expanded `test/unit/presenter.test.js` with a jsdom presenter contract for the `findings` slice and added a Playwright browser test in `test/e2e/smoke.spec.js` that verifies rendered finding rows, available and absent links, provenance, and independent `availability`, `completeness`, and `freshness` text.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page from the declarative definitions or extracting the first reusable presentation component needed by that rendering.

### 2026-08-29 (built-in workflows render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-005` and `DLS-PAGE-014` presenter increment for the `workflows` built-in page, rendering workflow inventory with active state, rollout mode, run counts, run conclusion summaries, downstream outcome counts, available AIC totals, finding counts, operational value counts, and independent data-state summaries.
- Updated `src/presenter.js` so declarative built-in `workflows` definitions now render a concrete table from `workflows`, `runs`, `outcomes`, `usage`, `findings`, and `operational-values` logical sources, reusing the keyed-list DOM primitive for deterministic row reconciliation.
- Expanded `test/unit/presenter.test.js` with a jsdom presenter contract for the `workflows` slice and replaced the browser smoke coverage in `test/e2e/smoke.spec.js` with a Playwright browser test that verifies the rendered workflow rows, aggregated counts, provenance, and independent `availability`, `completeness`, and `freshness` text.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page from the declarative definitions or extracting the first reusable presentation component needed by that rendering.

### 2026-08-29 (built-in runs render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-006` and `DLS-PAGE-014` presenter increment for the `runs` built-in page, rendering run status counts, terminal conclusions, downstream outcome counts, scope, rollout mode, engine, requested model, resolved model, started time, run links, and independent data-state summaries.
- Updated `src/presenter.js` so declarative built-in `runs` definitions now render a concrete table and summary lists from `runs` and `outcomes` logical sources, reusing the keyed-list DOM primitive for deterministic row reconciliation.
- Replaced the previous browser smoke test with a Playwright browser test in `test/e2e/smoke.spec.js` that renders a built-in `runs` page and verifies counts, rows, links, provenance, and independent `availability`, `completeness`, and `freshness` text.
- Added `test/unit/presenter.test.js` to cover deterministic presenter output for the same `runs` slice in jsdom.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page from the declarative definitions or extracting the first reusable presentation component needed by that rendering.

### 2026-08-29 (built-in overview provenance-and-freshness render slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-002` and `DLS-PAGE-014` presenter increment for `overview`, rendering independent availability, completeness, and freshness summaries plus per-source provenance from runtime source metadata.
- Added `src/presenter.js`, a tiny browser presenter prototype that renders built-in pages with page headings, independent data-state text, and source provenance derived from built-in `definition.views` plus runtime logical-source metadata.
- Replaced the static browser smoke test with a Playwright browser test in `test/e2e/smoke.spec.js` that renders a built-in `overview` page and verifies independent `availability`, `completeness`, and `freshness` text alongside per-source provenance entries.
- Added a validator acceptance test in `test/unit/validator.test.js` showing that `overview` built-in definitions can conservatively carry source-metadata-bearing declarative views covering provenance and freshness obligations without inventing new dashboard semantics.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for rendering one additional Section 10 built-in page from the declarative definitions instead of only validating its coverage.

### 2026-08-29 (built-in overview linked-findings and operational-value timeline slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-002` validator increment for conservative `overview` coverage of recent linked findings and operational-value timelines.
- Updated `src/specification.js` so the implementation-local declarative definition for the `overview` built-in page now requires relation-specific finding links (`issue-link`, `pull-request-link`, `run-link`) plus `operational-value-definition` alongside `operational-value` and `observed-at`.
- Expanded `test/unit/validator.test.js` with a negative `overview` built-in fixture that now fails when linked finding fields or definition-aware operational-value timeline coverage are omitted, and updated the positive built-in coverage fixture to include an `overview` page satisfying those requirements.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for conservative validation of `overview` provenance and freshness exposure obligations without inventing presenter semantics.

### 2026-08-29 (built-in runs run-link coverage slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-006` validator increment for conservative run-link coverage on the `runs` built-in page.
- Updated `src/specification.js` so the implementation-local declarative definition for the `runs` built-in page now requires an `outcomes` source view exposing `run-link`, matching the most conservative reading of the Section 10 requirement to expose run links only when available.
- Expanded `test/unit/validator.test.js` with a negative `runs` built-in fixture that now fails when no declarative `outcomes` run-link coverage exists, and updated the positive built-in coverage fixture to include an `outcomes` view carrying `run-link`.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for conservative validation of `overview` findings-link and operational-value timeline coverage without inventing presenter semantics.

### 2026-08-28 (built-in data-state exposure slice)

- Extended the Built-in pages milestone with a narrow `DLS-PAGE-014` validator increment for independent availability, completeness, and freshness exposure on built-in pages.
- Updated `src/specification.js` and `src/validator.js` to accept a conservative implementation-local built-in `definition.data-state` mapping and require canonical boolean `true` markers for `availability`, `completeness`, and `freshness`, while still rejecting unknown declarative data-state axes.
- Expanded `test/unit/validator.test.js` coverage for accepted built-in definitions carrying independent data-state markers plus rejected built-in definitions with missing or non-canonical data-state declarations.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for conservative validation of Section 10 run-link coverage on the `runs` built-in page without inventing presenter semantics.

### 2026-08-28 (built-in required-field coverage slice)

- Extended the Built-in pages milestone with a narrow Section 10 validator increment that conservatively checks built-in declarative definitions for field-level coverage, not just logical-source presence.
- Added a per-page required-field catalog in `src/specification.js` and updated `src/validator.js` to collect field coverage across built-in `definition.views`, then reject built-in pages whose definitions omit required fields for their required sources.
- Expanded `test/unit/validator.test.js` coverage for `DLS-PAGE-003` through `DLS-PAGE-013`, including accepted built-in definitions for `runs`, `usage`, `operational-value`, `findings`, and `engines-models`, plus a negative `runs` fixture that reports omitted required fields with `DLS-E003`.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for conservative validation of Section 10 data-state exposure obligations such as independent availability, completeness, and freshness coverage.

### 2026-08-28 (built-in page-definition vocabulary slice)

- Extended the Built-in pages milestone with a narrow Section 10 validator increment that introduces an implementation-local built-in `definition.views` shape composed from the existing custom-view primitives.
- Updated `src/specification.js` and `src/validator.js` so built-in pages may now satisfy conservative required-source coverage by declaring at least one view per required logical source, while missing definitions or missing source coverage continue to report `DLS-E003`.
- Expanded `test/unit/validator.test.js` coverage for `DLS-PAGE-001` through `DLS-PAGE-014`, including positive acceptance for `usage` and `engines-models` built-in pages with matching declarative definitions and negative cases for missing built-in definitions or incomplete source coverage.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for validating that built-in declarative definitions cover the conservative content obligations of each canonical page without inventing presenter semantics.

### 2026-08-28 (provenance metadata validation slice)

- Completed the Provenance, freshness, data states milestone with a narrow Section 8 validation increment for `DLS-DATA-001` through conservative in-document `source-metadata` validation.
- Extended `src/specification.js` to admit `data.source-metadata` and the Section 8 `availability` axis, and reused the existing validator path to require canonical metadata keys, RFC 3339 timestamps, ordered coverage bounds, canonical availability/completeness/freshness values, and safe Section 9.1 provenance links.
- Added unit coverage in `test/unit/validator.test.js` for accepted `source-metadata` payloads and rejected invalid provenance/data-state metadata with `DLS-E012`.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for declarative built-in page definitions.

### 2026-08-28 (built-in pages required-source slice)

- Extended the Built-in pages milestone with a narrow Section 10 validation increment for `DLS-PAGE-002` and `DLS-PAGE-006`.
- Added conservative built-in required-source catalogs in `src/specification.js` and validator checks in `src/validator.js` that reject built-in pages until declarative built-in definitions exist for the logical sources required by the selected page.
- Added unit coverage in `test/unit/validator.test.js` for rejected `overview` and `runs` built-in pages, naming the required missing sources and using `DLS-E003`.
- Verified `npm install`; the first parallel pass of `npm run typecheck`, `npm run lint`, and `npm test` failed due to missing local install linkage in this runner, and `npm run test:e2e` remains blocked by a Playwright runner mismatch (`Playwright Test did not expect test() to be called here`).
- Next milestone: Built-in pages, next slice for defining a concrete declarative vocabulary for built-in page definitions once the specification ambiguity is resolved.

### 2026-08-28 (built-in pages canonical title slice)

- Extended the Built-in pages milestone with a narrow Section 10 validation increment for `DLS-PAGE-001` covering explicit built-in page titles.
- Updated `src/validator.js` so a built-in page with an explicit `title` must match the specification's canonical capitalized page-name default, while omitted titles continue to use the existing defaultability check.
- Added unit coverage in `test/unit/validator.test.js` for accepted canonical explicit titles and rejected non-canonical explicit titles on built-in pages.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for declarative built-in page definitions.

## Run log

### 2026-08-28 (built-in pages title-default slice)

- Started the Built-in pages milestone with a narrow Section 10 validation increment for `DLS-PAGE-001`.
- Updated `src/validator.js` so built-in pages continue to require canonical `page` names and may omit `title` only when that page name is canonical, matching the specification's title-default precondition without inventing presenter behavior.
- Added unit coverage in `test/unit/validator.test.js` for accepted omitted-title built-in pages and rejected omitted-title cases with non-canonical built-in page names.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages, next slice for declarative built-in page definitions.


### 2026-08-28 (custom pages slice)

- Completed the first explicit Section 11 defaulting slice for custom pages by tightening validator coverage around omitted custom-page titles, canonical defaultability from IDs, and conservative chart-default validation for temporal line and non-temporal bar shapes.
- Implemented tests for `DLS-VIEW-001`, `DLS-VIEW-005`, and `DLS-VIEW-006` in `test/unit/validator.test.js`, covering accepted omitted-title custom pages, accepted temporal and categorical chart encodings, rejected temporal charts that omit a conservative bucket, and rejected quantitative `x` channel typing.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`).
- Next milestone: Built-in pages.

### 2026-08-28 (links and findings slice)

- Shipped the first Section 9 validation slice in `src/specification.js` and `src/validator.js`, adding canonical Section 9.1 link relations, relation-specific link-field vocabularies, and `DLS-E009` handling for invalid custom-view `href` references.
- Implemented conservative checks for `DLS-LINK-001`, `DLS-LINK-005`, `DLS-VIEW-007`, `DLS-VIEW-014`, and `DLS-SAFE-004`: `href.field` must reference exactly one relation-specific link field, link objects must use canonical relations, non-empty labels, and absolute HTTPS URLs without embedded credentials, and dataset `provenance-link` now reuses the same safe link-object validation with `DLS-E012` in the current metadata-gap path.
- Added unit coverage in `test/unit/validator.test.js` for accepted relation-specific `href` fields, rejected non-link `href` fields with `DLS-E009`, metric value-channel constraints, and invalid metadata `provenance-link` safety checks.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned.
- Next milestone: Custom pages.

### 2026-08-28 (provenance, freshness, data states slice)

- Audited Section 8 against the current document model and confirmed a specification gap: required logical-source metadata is defined outside the dashboard YAML, but Section 4.2 does not admit any `data` key for embedding that metadata in a document.
- Added Section 8 constants and `DLS-E012` definitions in `src/specification.js` and recorded the ambiguity in `PLAN.md`, but kept the validator on the conservative reading that rejects undeclared `source-metadata` keys instead of inventing new YAML semantics.
- Added unit coverage in `test/unit/validator.test.js` documenting the current behavior for attempted `source-metadata` payloads, so the gap is explicit and regression-tested until the presenter-side data contract is implemented.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned.
- Next milestone: Custom pages.

### 2026-08-28 (dimensions, measures, aggregation slice)

- Shipped the first Section 7 and Section 11 aggregation-validation slice in `src/specification.js` and `src/validator.js`, adding canonical custom-view mark, encoding, field-definition, aggregate, type, and time-unit vocabularies together with source field catalogs for Section 5.1 sources.
- Implemented conservative validation for `DLS-AGG-002`, `DLS-AGG-005`, `DLS-AGG-009`, `DLS-AGG-010`, `DLS-VIEW-002`, `DLS-VIEW-003`, `DLS-VIEW-004`, `DLS-VIEW-005`, `DLS-VIEW-007`, `DLS-VIEW-008`, `DLS-VIEW-009`, and `DLS-VIEW-010`: mark/channel shape rules, field-definition key restrictions, canonical aggregates and time units, additive versus non-additive measure compatibility, temporal-field-only `time-unit`, aggregate alias restrictions, duplicate aggregate-output rejection, and conservative post-aggregation `order-by.field` resolution.
- Added unit coverage in `test/unit/validator.test.js` for the implemented `DLS-AGG-*` and `DLS-VIEW-*` requirements, including positive aggregate aliasing and temporal bucketing plus negative cases for invalid mark/channel combinations, aggregate incompatibilities, unknown source fields, duplicate output identifiers, and invalid `order-by` references.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked in this environment because the Playwright Chromium executable is not provisioned.
- Next milestone: Provenance, freshness, data states.

### 2026-08-28 (scope, time, filters slice)

- Shipped the first Section 6 validation slice in `src/specification.js` and `src/validator.js`, adding canonical context-key validation for `scope`, `time`, `filters`, `limit`, and `order-by`, plus `DLS-E010` reporting for invalid context shapes.
- Implemented conservative checks for `DLS-CTX-002`, `DLS-CTX-004`, and `DLS-CTX-009`: RFC 3339 `start` and `end`, strictly increasing absolute bounds, `time.range` pattern enforcement, forbidding `range` alongside `start` or `end`, non-empty scope/filter sequences, positive integer limits, and `order-by.direction` restricted to `asc` and `desc`.
- Extended semantic filter literal validation to findings enumerations used by Section 9 fields when they appear inside Section 6 filters.
- Added unit coverage in `test/unit/validator.test.js` for `DLS-CTX-002`, `DLS-CTX-004`, `DLS-CTX-006`, and `DLS-CTX-009`.
- Verified `npm install`; direct local binaries pass `eslint` and `vitest`, while `npm run typecheck` is currently blocked by an upstream TypeScript parse failure in `node_modules/globals/index.d.ts` under the workflow's Node/TypeScript toolchain and `npm run test:e2e` remains blocked because the Playwright test runner resolves to an incompatible executable path in this environment.
- Next milestone: Dimensions, measures, aggregation.


### 2026-08-28 (semantic model slice)

- Shipped the first Semantic model slice in `src/specification.js` and `src/validator.js`, adding canonical Section 5.1 source-name validation for custom-view `data.source` and conservative canonical-enumeration checks for intrinsic semantic filter literals.
- Added unit coverage in `test/unit/validator.test.js` for `DLS-SEM-017`, `DLS-SEM-021`, and canonical intrinsic enumeration spellings from `DLS-SEM-004`, `DLS-SEM-005`, `DLS-SEM-006`, `DLS-SEM-008`, `DLS-SEM-009`, and `DLS-SEM-015`.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` still fails in this environment because the Playwright Chromium executable is not provisioned.
- Next milestone: Scope, time, filters.


### 2026-08-28

- Shipped the bootstrap scaffold in `pages/dashboard/` with ESM package metadata, TypeScript `checkJs`, ESLint flat config, Vitest config, Playwright config, and a README.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` from `pages/dashboard/`.
- Noted an infrastructure/tooling mismatch: the preinstalled `playwright-cli` is an interactive browser control tool rather than a Playwright test runner; the dashboard workflow now uses the built-in Playwright MCP browser tools instead, while keeping local `npx playwright test` coverage for the package-level browser harness.
- Shipped the reactive core in `src/reactive.js` and `src/dom.js` with state, derived values, effects, disposal, hyperscript DOM construction, and keyed-list reconciliation.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test` from `pages/dashboard/`.
- Added Playwright end-to-end coverage for the browser rendering harness, but `npm run test:e2e` is blocked in this environment because the required Playwright Chromium executable is not installed.
- Shipped the first document-model and validation slice in `src/specification.js` and `src/validator.js`, covering Sections 4 and 12 requirements for single-document YAML parsing, root and dashboard structure, canonical IDs, page/view ID uniqueness, key vocabulary checks, page kind validation, built-in page name validation, and coded path-based errors.
- Added unit coverage in `test/unit/validator.test.js` for DLS-DOC-001 through DLS-DOC-009, DLS-SAFE-001 parser safety behavior, and DLS-VAL-001 error reporting shape.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, and `npm test`; `npm run test:e2e` remains blocked by the missing Playwright Chromium executable in the workflow environment.
- Next milestone: Semantic model.
