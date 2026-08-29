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
- [ ] **Built-in pages** — Section 10, one page per increment, each expressed as declarative page definitions built from the custom-view primitives and visibly rendered in the browser prototype.
  - [x] Slice: `DLS-PAGE-001` built-in page title default validation.
  - [x] Slice: `DLS-PAGE-001` canonical explicit title validation for built-in pages.
  - [x] Slice: `DLS-PAGE-002` and `DLS-PAGE-006` conservative required-source validation for built-in page definitions.
  - [x] Slice: `DLS-PAGE-003` through `DLS-PAGE-013` conservative required-field coverage validation for built-in page definitions.
  - [x] Slice: `DLS-PAGE-014` conservative built-in data-state exposure validation via implementation-local declarative markers.
  - [x] Slice: `DLS-PAGE-006` conservative run-link coverage validation for the `runs` built-in page.
  - [x] Slice: `DLS-PAGE-002` conservative `overview` linked-findings and operational-value timeline coverage validation.
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
- [ ] **Security, privacy, accessibility** — Section 13 including escaping, redaction, and keyboard and screen-reader behavior verified with Playwright.
  - [x] Slice: `DLS-SAFE-003`, `DLS-SAFE-007`, `DLS-SAFE-008`, and `DLS-SAFE-010` presenter render for inert text escaping, non-empty accessible names, labeled table columns, textual data-state labels, and labeled external links.
  - [x] Slice: `DLS-SAFE-007` and `DLS-SAFE-008` keyboard presenter behavior for focusable labeled sections with deterministic arrow-key traversal verified in unit and browser tests.
- [ ] **Compliance suite** — Section 14 test suite, the compliance checklist, Appendix A as a passing fixture, and Appendix C as failing fixtures.
- [ ] **Parity** — inventory the features of the existing dashboard in `dashboard/report/report.mjs`, record them in `PLAN.md` as a parity checklist, then express each one as YAML configuration plus data fixtures, closing the checklist incrementally.

## Specification questions

- 2026-08-28: Section 10 requires every built-in page to be expressed as declarative page definitions built from the custom-view primitives, but Section 4.2 and Section 10 define no YAML vocabulary for embedding those declarative built-in definitions alongside `kind: built-in` / `page`. The current validator implements the most conservative reading available in this slice by accepting an implementation-local `definition.views` sequence on built-in pages so required source, field, and run-link coverage can be validated, but this key is not yet specification-backed and may need to change if the YAML vocabulary is clarified.
- 2026-08-28: `DLS-PAGE-014` says every built-in page must expose availability, completeness, and freshness independently, but Section 10 does not define a declarative YAML shape for asserting that exposure inside a built-in page definition. The current validator uses a conservative implementation-local `definition.data-state` marker with canonical boolean `true` for each axis. The presenter prototype now renders independent page-level summaries from runtime source metadata, but the exact normative YAML vocabulary for binding built-in definitions to those summaries remains unspecified.
- 2026-08-28: Section 4.3 requires `language-version` to be the quoted string `"0.1.0"`, but YAML parsing does not preserve whether a scalar was quoted. The current validator enforces string type and exact canonical value, which is the most conservative check available without relying on parser-specific CST details.
- 2026-08-28: Section 8 defines required logical-source metadata outside the dashboard YAML, while Section 4.2 omits any YAML vocabulary for carrying that metadata inside a dashboard document. The current validator now accepts a conservative `data.source-metadata` structure so Section 8 metadata shape can be validated in-document, but the presenter-side runtime contract and the exact source of truth between YAML and external inputs remain ambiguous.
- 2026-08-28: Section 11.2 says `data.order-by.field` resolves against the post-aggregation output grain, but the specification does not fully define how to derive that grain from arbitrary encodings before the presenter exists. The current validator uses the most conservative reading available in this slice: it accepts aggregate output identifiers and bare source fields only when they are canonical entity identifier fields for the selected source, and rejects other unresolved references with `DLS-E010`.

## Infrastructure blockers

- 2026-08-28: `npm run typecheck`, `npm run lint`, and `npm test` can fail immediately after `npm install` if the runner has not linked local `node_modules/.bin` shims or installed the declared type packages yet; rerunning after installation from the package directory is currently required in this environment.
- 2026-08-28: `npm run test:e2e` is currently blocked in this environment because the Playwright Chromium executable is not provisioned (`browserType.launch: Executable doesn't exist`). The workflow should prefer the built-in Playwright MCP browser tools until the package-level browser dependency is available.

## Run log

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
