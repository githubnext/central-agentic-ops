# Dashboard Language Renderer Plan

## Milestones

- [x] **Scaffold** — `package.json` (ESM, private, scripts for `typecheck`, `lint`, `test`, `test:e2e`), `tsconfig.json` with `checkJs` and `strict`, ESLint flat config, Vitest config, Playwright config, `README.md`, and `PLAN.md`.
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

- None recorded yet.

## Run log

### 2026-08-28

- Shipped the bootstrap scaffold in `pages/dashboard/` with ESM package metadata, TypeScript `checkJs`, ESLint flat config, Vitest config, Playwright config, and a README.
- Verified `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` from `pages/dashboard/`.
- Noted an infrastructure/tooling mismatch: the preinstalled `playwright-cli` is an interactive browser control tool rather than a Playwright test runner, so the scaffold uses `npx playwright test` for end-to-end execution while still keeping Playwright-based browser tests.
- Next milestone: Reactive core.
