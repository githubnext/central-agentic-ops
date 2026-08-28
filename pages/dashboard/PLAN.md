# Plan

## Milestones

- [x] **Scaffold** — `package.json` (ESM, private, scripts for `typecheck`, `lint`, `test`, `test:e2e`), `tsconfig.json` with `checkJs` and `strict`, ESLint flat config, Vitest config, Playwright config, `README.md`, and `PLAN.md`.
  - Note: `test:e2e` currently runs a minimal browser smoke check via Playwright's Node API because the available `playwright-cli` is an interactive browser driver rather than the Playwright test runner.
- [ ] **Reactive core** — state, derived values, effects, disposal, and the DOM builder with keyed lists; unit tests including update, removal, and reordering.
- [ ] **Document model and validation** — Sections 4 and 12: root structure, vocabulary, unknown and duplicate key rejection, identifier grammar, uniqueness, error codes from Appendix B with code, message, and YAML path.
- [ ] **Semantic model** — Section 5 sources, grain, field catalog, and intrinsic types.
- [ ] **Scope, time, filters** — Section 6 including context composition.
- [ ] **Dimensions, measures, aggregation** — Section 7 including canonical dimensions, measures, aggregates, and time units.
- [ ] **Provenance, freshness, data states** — Section 8 including unavailable, empty, partial, and stale states.
- [ ] **Links and findings** — Section 9 link objects and the `href` channel semantics.
- [ ] **Custom pages** — Section 11 metric, table, and chart views with the temporal line and bar defaults.
- [ ] **Built-in pages** — Section 10, one page per increment, each expressed as declarative page definitions built from the custom-view primitives.
- [ ] **Security, privacy, accessibility** — Section 13 including escaping, redaction, and keyboard and screen-reader behavior verified with Playwright.
- [ ] **Compliance suite** — Section 14 test suite, the compliance checklist, Appendix A as a passing fixture, and Appendix C as failing fixtures.
- [ ] **Parity** — inventory the features of the existing dashboard in `.github/scripts/pages-report/report.mjs`, record them in `PLAN.md` as a parity checklist, then express each one as YAML configuration plus data fixtures, closing the checklist incrementally.

## Specification questions

- The bootstrap-only run procedure conflicts with the requirement that every implemented normative requirement be covered by a requirement-named test. This run added harness smoke tests only and does not claim language conformance beyond scaffold verification.

## Run log

### 2026-08-28

- Shipped the bootstrap scaffold only, per the run procedure.
- Added self-contained tooling, smoke tests, and documentation files under `pages/dashboard/`.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run test:e2e` from `pages/dashboard/`.
- Next milestone: **Reactive core**.
