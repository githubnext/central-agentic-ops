# ADR 2547: Decompose the outcome-detail view into reusable outcome-detail-section primitives

## Status

Draft

## Context

The `outcome-detail` page previously embedded page-specific discussion rendering, metadata rendering, and Markdown sanitization directly inside the routed view component (`dashboard/site/src/components/outcome-detail.js`). This made `outcome-detail` an "over-specialized" view relative to other route families such as `workflow-route` and `package-route`, which already used declarative composition in `dashboard/site/dashboard.json` for reusable route families.

Recent merged PRs (#2537, #2502, #2500) established relevant precedent: #2502 established the Dashboard Language/specification contract, #2500 demonstrated additive dashboard composition through declarative views without redesigning unrelated surfaces, and #2537 tied dashboard behavior to authoritative policy refresh and contract coverage. This PR selects `outcome-detail` as the candidate for the same declarative-composition treatment already applied elsewhere.

## Decision

Decompose the monolithic `outcome-detail` view into reusable section primitives declared through the Dashboard Language:

- Extract discussion rendering, metadata rendering, and the Markdown sanitization boundary out of `outcome-detail.js` into a new module, `dashboard/site/src/components/outcome-detail-sections.js`, exposing reusable `discussion` and `metadata` section renderers.
- Keep `outcome-detail` as the route-aware wrapper, reduced to allocation and composition over the reusable section family (routed behavior, title-link allocation, accessibility semantics, and provenance display unchanged).
- Introduce a new declarative element vocabulary, `outcome-detail-section`, with `config.body` accepting canonical values `discussion` and `metadata`, supported by validator changes (`dashboard/site/src/validator.js`) and specification changes (`dashboard/site/src/specification.js`).
- Update `dashboard/site/dashboard.json` so the selected outcome-detail page declares the reusable section family (`outcome-discussion`, `outcome-metadata`) explicitly as separate views alongside the existing `outcome-record` and `outcome-disposition` views, composed together in an `outcome-summary` section.
- Extend `ui-elements.js` to support rendering the new `outcome-detail-section` element.

## Alternatives Considered

- **Leave `outcome-detail` as a monolithic, page-specific view.** This was the prior state and is implicitly rejected as evidence: the PR body identifies `outcome-detail` as "the selected over-specialized candidate," in contrast to `workflow-route` and `package-route`, which already use declarative composition for reusable route families.
- **Follow the precedent set by `workflow-route`/`package-route` declarative composition.** The PR explicitly follows this established pattern rather than introducing a new composition mechanism, applying the same declarative, reusable-section approach already used for those route families to `outcome-detail`.

## Consequences

**Positive:**
- Discussion and metadata rendering logic is reusable via the `outcome-detail-section` element/`config.body` vocabulary rather than being duplicated or hardcoded per-page.
- `outcome-detail.js` is reduced in size (+6/-183 lines) and scope, now limited to allocation and composition, improving consistency with other reusable route families (`workflow-route`, `package-route`).
- Routed behavior, title-link allocation, accessibility semantics, and provenance display for the selected outcome page are preserved unchanged, per the PR's stated acceptance criterion.
- Validation coverage was extended: unit tests for reusable section rendering, validator acceptance/rejection tests for `outcome-detail-section` config, and an extended E2E outcome route assertion; typecheck, lint, unit tests, validate:corpus, test:e2e, and npm test all passed.

**Negative:**
- The Dashboard Language surface area grows with a new declarative element vocabulary (`outcome-detail-section` and its `config.body` values `discussion`/`metadata`), which the validator and specification must maintain going forward.
- `dashboard.json` composition for the affected page is more verbose, adding discrete `outcome-discussion` and `outcome-metadata` view entries (48 additions/4 deletions) and a new `outcome-summary` section grouping, rather than the previous single-view definition.
- Not inferable from current pull request evidence: any performance, maintenance-cost, or long-term scalability implications beyond what is stated in the diff and test coverage.
