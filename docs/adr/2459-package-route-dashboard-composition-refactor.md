# ADR 2459: Refactor package route dashboard composition

## Status

Draft

## Context

`dashboard/site/src/components/package-detail.js` was over-specialized: it branched directly on `selectedView` (`insights`, `workflows`, `dispatches`, `reports`) to choose package page identity, copy, CSS root class, tab state, and whether to render workflow value reports. This meant page-specific strings, root class names, tab selection, and insight-only composition logic lived in JavaScript rather than in `dashboard.json`, even though the existing `workflow-route` pattern already demonstrated a declarative alternative for a comparable page family.

Recent related history informed the scope of this change: PR #2139 (merged) favored targeted reliability improvements with explicit contract assertions, PR #2138 (merged) favored precise boundary fixes without widening scope, and PR #2095 (merged) favored renderer reuse that preserves compatibility and accessibility. Conversely, PR #2152 was closed unmerged, indicating that broad architectural boundary shifts across renderer view families were not accepted.

## Decision

Extract package route rendering into one declarative `package-route` primitive instead of four page-specific element implementations, mirroring the existing `workflow-route` pattern. Concretely:

- Add `dashboard/site/src/components/package-route-composition.js`, `package-route-shell.js`, and `package-route-view.js` as reusable subcomponents.
- Reduce `dashboard/site/src/components/package-detail.js` to a compatibility wrapper.
- Register `package-route` in `dashboard/site/src/specification.js` and `dashboard/site/src/components/ui-elements.js`.
- Extend `config.body` validation for `package-route` in `dashboard/site/src/validator.js`, admitting the closed vocabulary `insights`, `workflows`, `dispatches`, `reports`.
- Update `docs/dashboard-language-specification.md` normatively to define allowed `package-route` body values.
- Replace four package page element bindings in `dashboard/site/dashboard.json` with one `package-route` element plus declarative `config.body`.

The package insights, workflows, dispatches, and reports views are thereby configured in Dashboard Language while preserving their existing routes, data-state behavior, and rendered output. The change stays within one renderer view family (the package route family), consistent with the precedent that broad architectural boundary shifts (as attempted and closed in PR #2152) are avoided.

## Alternatives Considered

- **Targeted reliability fix without refactor**: As favored in merged PR #2139, apply explicit contract assertions or point fixes to `package-detail.js` branching logic without extracting a reusable primitive. Not chosen because it would leave page-specific JavaScript branching and duplicated composition logic in place across all four views.
- **Precise boundary fix limited to validator only**: As favored in merged PR #2138, narrowly patch `validator.js` or `dashboard.json` bindings without introducing new shell/composition/view subcomponents. Not chosen because it would not address the root cause of `selectedView`-based branching in `package-detail.js`.
- **Broader architectural boundary shift across renderer families**: As attempted in closed (unmerged) PR #2152, restructure beyond the package route family. Not chosen; this decision instead followed the precedent of renderer reuse preserving compatibility and accessibility (as in merged PR #2095), scoping the refactor to one view family.

## Consequences

**Positive:**

- Page-specific branching, strings, root class names, tab selection, and insight-only composition logic are removed from `package-detail.js` and replaced by declarative `config.body` values (`insights`, `workflows`, `dispatches`, `reports`) in `dashboard.json`.
- One `package-route` element now powers all four existing package route compositions, mirroring the established `workflow-route` pattern and improving consistency across the Dashboard Language.
- Existing routes, data-state behavior, and rendered output are preserved, as confirmed by `npm --prefix dashboard/site run typecheck`, `lint`, `test`, `validate:corpus`, `test:e2e`, and `npm test` all passing.
- `package-detail.js` remains as a compatibility wrapper, limiting disruption to existing consumers.

**Negative:**

- Introduces three new subcomponent files (`package-route-composition.js`, `package-route-shell.js`, `package-route-view.js`) plus a compatibility wrapper, increasing the number of files involved in package route rendering compared to the single prior `package-detail.js` implementation.
- Not inferable from current pull request evidence: any performance impact, migration burden for external consumers of `package-detail.js`, or long-term plan for removing the compatibility wrapper.
