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
