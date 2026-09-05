---
title: Integrate the filter bar into shared horizon view chrome
description: Record the decision to remove page-level filter-bar declarations and consolidate filter controls into the shared horizon header.
---

# ADR 2786: Integrate the filter bar into shared horizon view chrome

## Status

Proposed

## Decision

Filter controls are removed from per-page declarations in `dashboard/site/dashboard.json` and are instead rendered as part of the shared dashboard view chrome (the horizon header), applied uniformly to every dashboard page by the presenter rather than opted into per page.

## Context

Previously, `dashboard/site/dashboard.json` declared a `"filter-bar"` object (with a `filters` array, e.g. `["phase:after"]`, `["event:workflow_dispatch"]`, or `[]`) on individual pages such as `readiness`, `github-api`, `firewall`, `mcps`, `security`, `outcome`, `runtime`, `performance`, `safe-outputs`, `detection`, `dispatches`, `value`, and `admission`. `dashboard/site/src/validator.js` contained a `validatePageFilterBar` function and `PAGE_FILTER_BAR_KEYS` export enforcing the shape and vocabulary of that per-page declaration. `dashboard/site/src/presenter.js` read `page['filter-bar']` and conditionally called `renderFilterBar(page['filter-bar'], ...)` only for pages that declared it, and the `PresentableBuiltInPage`/`PresentableCustomPage` typedefs carried a `['filter-bar']` field.

This PR removes all of that: every `"filter-bar": { "filters": [...] }` block is deleted from `dashboard.json`; `validatePageFilterBar` and `PAGE_FILTER_BAR_KEYS` are deleted from `validator.js`; `filter-bar` is removed from `BUILT_IN_PAGE_KEYS` and `CUSTOM_PAGE_KEYS` in `specification.js`; and `presenter.js` no longer reads or forwards `page['filter-bar']` in `BUILT_IN_PAGE_PAYLOADS` or `getBuiltInPagePayload`. `renderCustomPage` now takes a `withFilterBar` boolean parameter (defaulting to `true`) instead of branching on `page['filter-bar']`, so `renderFilterBar` is invoked unconditionally for every custom page render. `renderFilterBar` itself no longer takes a `config` argument (the `FilterBarConfig` typedef is deleted); instead it initializes its text-filter input from `readHorizonSettings().filters`, a value persisted in `localStorage` (introduced by the related ADR 2715).

The horizon label previously rendered as a plain `<span>` in `renderDashboardHorizon` (`presenter.js`); it now renders as a `<button class="horizon-toggle" aria-expanded="false">`. `enableDashboardPageNavigation` now locates `.filter-bar` (rather than `.filter-control input`) to place the horizon element inside it, tracks `activeFilterBar`, and prepends the whole `filter-bar` element (not just the horizon) into `reportActions` on page activation, removing it on page deactivation. `filter-bar.js` replaces the old `scopeLabel` button and its own click/`aria-expanded` handling with a `root`-level click listener that toggles expansion when `event.target.closest('.horizon-toggle')` matches, and a `keydown` listener that collapses on `Escape` and restores focus to the toggle. `renderCustomPage`'s filtered-rerender path now preserves `<details>` open/closed state across re-renders by reading `details.open` from the old DOM and re-applying it to the corresponding elements in the replacement DOM.

`styles.js` adds `.horizon-toggle` and `.filter-tuning-controls` rules: `.filter-tuning-controls` is `display: none` by default and becomes an absolutely positioned popover (`position: absolute; ... top: calc(100% + 9px); right: 0`) when the ancestor has the new `.filter-bar-expanded` class (replacing the old `.filter-bar.time-window-expanded` class name), with a mobile media-query override making it a full-width stacked (`display: grid`, static position) layout instead. `docs/dashboard-language-specification.md` is updated correspondingly (removing `filter-bar` from the page-declaration keys/prose, per the diff to that file and to `specification.js`).

Test files (`smoke.spec.js`, `filter-bar.test.js`, `presenter.test.js`, `validator.test.js`, `cost-view.test.js`, `dispatch-view.test.js`, `github-api-view.test.js`) are updated to locate the filter UI via `.horizon-toggle` clicks and `getByLabel('Dashboard filters')` instead of per-page filter-bar assertions, and `validator.test.js` drops cases exercising `validatePageFilterBar`.

## Alternatives Considered

- **Keep per-page `filter-bar` declarations and only change persistence (as in ADR 2715):** This was the prior/adjacent model — pages still had to opt in with a `filter-bar` block (even an empty `{"filters": []}`) to get any filter controls at all, and `validator.js` had to validate that declaration on every page. The diff shows this required a near-identical `filter-bar` block repeated across thirteen pages in `dashboard.json`, which this PR removes entirely.
- **Continue exposing filter controls inline in a dedicated toolbar row (the pre-PR `scope-label`/`filter-toggle` button inside `.filter-control`) rather than a popover anchored to the horizon toggle:** The diff shows the prior implementation rendered an always-visible `.filter-control` with a `scope-label` button and toggled a `.time-window-control` open in place; this PR replaces that with a collapsed-by-default `.filter-tuning-controls` popover (desktop) or stacked panel (mobile) revealed via the new `.horizon-toggle` button, per the added CSS and the `filter-bar.js`/`presenter.js` changes.

## Consequences

**Positive:**

- View authors no longer declare or maintain a `filter-bar` block per page in `dashboard.json`; thirteen near-duplicate declarations were deleted, and `validator.js` no longer needs `validatePageFilterBar`/`PAGE_FILTER_BAR_KEYS` to validate them.
- Filter controls are guaranteed to be available consistently on every dashboard page (`withFilterBar` defaults to `true` in `renderCustomPage`), removing the possibility of a page omitting filtering by omitting a declaration.
- The filter/horizon disclosure now has explicit accessible interactions: a `button` with `aria-expanded`, click-to-toggle scoped to `.horizon-toggle`, and `Escape`-to-collapse with focus restored to the toggle (`filter-bar.js`).
- Disclosure (`<details>`) open/closed state and keyboard navigation are explicitly preserved across filtered rerenders, per the added state-capture/restore logic in `renderCustomPage`.
- Responsive presentation is now explicit in `styles.js`: a desktop popover (absolutely positioned, `right: 0`, boxed) and a mobile stacked/full-width layout via media query.

**Negative:**

- The dashboard specification and schema surface shrank (removal of `filter-bar`/`PAGE_FILTER_BAR_KEYS` from `specification.js` and `docs/dashboard-language-specification.md`), so per-page control over whether/what a page's filter bar exposes (e.g. the previous page-specific tokens like `phase:after` or `event:workflow_dispatch`) is no longer expressed as declarative page configuration; Not inferable from current pull request evidence whether/how such page-specific filter tokens are now reintroduced or preserved elsewhere.
- Test coverage had to be reworked across `smoke.spec.js`, `filter-bar.test.js`, `presenter.test.js`, `validator.test.js`, `cost-view.test.js`, `dispatch-view.test.js`, and `github-api-view.test.js` to locate the filter UI via the new `.horizon-toggle`/`Dashboard filters` label instead of per-page assertions, representing added migration and maintenance cost evidenced by the diff's test churn.
- Navigation/activation logic in `presenter.js` (`enableDashboardPageNavigation`) grew more stateful, now tracking `activeFilterBar` and moving the whole `.filter-bar` element (not just the horizon span) between pages, increasing the complexity of the page-activation code path.
