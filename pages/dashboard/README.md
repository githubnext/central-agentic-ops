# Dashboard Language Renderer

Incremental implementation workspace for the Dashboard Language presenter and validator.

## Scripts

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:e2e`

## Status

This directory now includes the initial reactive core: state, derived values, effects, and a tiny DOM builder with keyed list reconciliation.

The current increment adds the first validator slice for Sections 4 and 12: YAML document parsing, root and dashboard structure checks, canonical identifiers, key vocabulary validation, page kind checks, and coded error reporting with YAML paths.

The latest semantic-model slice adds canonical Section 5.1 source-name validation for custom views plus conservative canonical-enumeration checks for intrinsic semantic literals such as rollout mode, workflow role, workflow active state, run status, run conclusion, grader status, eval result, and outcome state when they appear in filters.

The current scope/time/filter slice adds structural validation for Section 6 context objects: canonical `scope`, `time`, and `filters` keys; RFC 3339 absolute time bounds; `time.range` syntax and exclusivity rules; non-empty scope/filter sequences; positive `limit`; and `order-by` clause shape with canonical `asc`/`desc` directions.

The current aggregation slice adds conservative Section 7 and Section 11 field-definition validation for custom views: canonical `mark`, `encoding`, `aggregate`, `type`, and `time-unit` vocabularies; source-field existence checks; additive and non-additive aggregate compatibility; `as` alias restrictions; duplicate aggregate output rejection; and post-aggregation `order-by.field` validation against aggregate outputs or conservative entity-grain identifiers.

The latest provenance/freshness/data-states slice audited Section 8 and recorded a specification gap: required logical-source metadata is defined outside the dashboard YAML, but no Section 4.2 document vocabulary admits it yet. The validator therefore continues to reject attempted inline `source-metadata` keys conservatively rather than inventing undeclared YAML semantics.

The current built-in-pages slice adds a conservative implementation-local built-in `definition.views` shape so Section 10 pages can declare custom-view-style source and field coverage without inventing presenter behavior beyond the specification's built-in page names and required-source catalog.

The latest built-in-pages increment also adds a conservative implementation-local `definition.data-state` marker for `DLS-PAGE-014`, requiring declarative independent coverage of `availability`, `completeness`, and `freshness` on built-in pages.

The current built-in-pages slice extends Section 10 rendering for `runs`, adding a visible browser prototype for status and conclusion counts, downstream outcome counts, scope/model/time columns, run links, and independent freshness/completeness/availability summaries derived from runtime source metadata.

The latest presenter slice updates the presentation layer to clone the style of the current JavaScript dashboard in CAO (`dashboard/report/report.mjs`), rendering dashboards that are GitHub brand-aligned using GitHub Primer CSS tokens, Octicons, sidebar navigation, responsive layout, status/mode badges, and reusable catalog controls with facets and progressive disclosure.

The overview now renders a report-style six-domain attention grid from canonical dashboard sources, with deterministic urgency states and links to the corresponding evidence pages.

The Packages page renders centrally managed package utilization cards with retained-usage coverage and complete-attempt allowances, All/Review/Live mode filters, and a 30-day cumulative package-run trend.

Repository and package workflow links open a JSON-declared runtime view with workflow-scoped run health, registration, AI Credit usage, and operational-value evidence.

Named UI elements, navigation icons, and semantic table-cell treatments are declared in dashboard JSON. The presenter dispatches these declarations without inferring UI from page IDs, view IDs, source contents, or field names.

Pages may also declare a JSON-configured `filter-bar` with ordered filter tokens, a time-range label, and a page-source JSON export.

The Value & outcomes page composes the shared summary grid and signal list with generic tables for comparable operational-value observations and the retained grader ledger.

Runtime triage is likewise declared as JSON: pure runtime data derivation emits ranked signals, episode summaries, root episodes, and attribution gaps, while shared signal-list, summary-grid, and table elements own their presentation and navigation.

The workflow-dispatch catalog is also declarative: JSON-classified runtime rows feed the `dispatch-catalog` element rendered through the shared table, status, link, search, facet, sort, and empty-state primitives.

Coverage diagnostics are declared as a static JSON table over the logical coverage source. Their Overview parent navigation is route metadata rather than component-owned behavior.

The preview also mirrors the report's interactive transitions for navigation, linked records, and chart-point tooltips while respecting reduced-motion preferences. It loads generated `sources.json` data by default so deployed `/ymao` views stay aligned with `/cao`. Add `?fixtures` when opening the renderer to explicitly use illustrative data with multiple operational-value observations and linked runs, issues, pull requests, and evidence.

The current compliance-suite slice adds machine-readable conformance result records, a passing Appendix A fixture, and failing Appendix C fixtures exercised through a small reusable compliance smoke harness.
