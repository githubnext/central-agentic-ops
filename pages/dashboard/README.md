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

The latest semantic-model slice adds canonical Section 5.1 source-name validation for custom views plus conservative canonical-enumeration checks for intrinsic semantic literals such as rollout mode, workflow active state, run status, run conclusion, grader status, eval result, and outcome state when they appear in filters.

The current scope/time/filter slice adds structural validation for Section 6 context objects: canonical `scope`, `time`, and `filters` keys; RFC 3339 absolute time bounds; `time.range` syntax and exclusivity rules; non-empty scope/filter sequences; positive `limit`; and `order-by` clause shape with canonical `asc`/`desc` directions.

The current aggregation slice adds conservative Section 7 and Section 11 field-definition validation for custom views: canonical `mark`, `encoding`, `aggregate`, `type`, and `time-unit` vocabularies; source-field existence checks; additive and non-additive aggregate compatibility; `as` alias restrictions; duplicate aggregate output rejection; and post-aggregation `order-by.field` validation against aggregate outputs or conservative entity-grain identifiers.

The latest provenance/freshness/data-states slice audited Section 8 and recorded a specification gap: required logical-source metadata is defined outside the dashboard YAML, but no Section 4.2 document vocabulary admits it yet. The validator therefore continues to reject attempted inline `source-metadata` keys conservatively rather than inventing undeclared YAML semantics.

The current built-in-pages slice begins Section 10 validation with `DLS-PAGE-001`: built-in pages may omit `title` when their `page` name is canonical, while non-canonical built-in page names continue to be rejected so title defaulting never invents unsupported page semantics.
