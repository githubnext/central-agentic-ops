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
- [ ] **Security, privacy, accessibility** — Section 13 including escaping, redaction, and keyboard and screen-reader behavior verified with Playwright.
- [ ] **Compliance suite** — Section 14 test suite, the compliance checklist, Appendix A as a passing fixture, and Appendix C as failing fixtures.
- [ ] **Parity** — inventory the features of the existing dashboard in `.github/scripts/pages-report/report.mjs`, record them in `PLAN.md` as a parity checklist, then express each one as YAML configuration plus data fixtures, closing the checklist incrementally.

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
