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
