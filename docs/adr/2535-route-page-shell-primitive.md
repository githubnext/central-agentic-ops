# ADR 2535: Extract a reusable route-page-shell primitive for route detail views

## Status

Draft

## Context

The workflow route detail renderer (`dashboard/site/src/components/workflow-route-shell.js`) implemented its tab chrome, route allocation, and matched-state composition in page-specific JavaScript, even though the same structural pattern already existed for package route views (`dashboard/site/src/components/package-route-shell.js`). Each shell independently built DOM for tabs, dispatched the `dashboard-route-allocation` CustomEvent, and composed matched route content, duplicating logic across the two route-specific modules.

The existing Dashboard Language JSON contract (`dashboard/site/dashboard.json`) already selects the workflow body declaratively via `element: "workflow-route"` and a `config.body` binding, and this contract needed to remain intact through any refactor.

## Decision

Extract a new reusable primitive, `dashboard/site/src/components/route-page-shell.js` (`createRoutePageShell`), that centralizes route-scoped tab chrome, route allocation, and matched-content composition. This shell wraps `createRouteView` (from `route-empty-state.js`), centralizes route matching via a `renderMatched` callback, dispatches the `dashboard-route-allocation` CustomEvent, and renders the tab set via `renderRouteTabSet`.

Both `workflow-route-shell.js` and `package-route-shell.js` are rewired to compose through this shared shell declaratively instead of implementing tab rendering and allocation dispatch directly. `renderPackageRouteShell` now delegates to `createRoutePageShell(context, {...})`, passing `tabs`, `tabListClassName`, `tabListAriaLabel`, and a `renderMatched` callback that returns `{ allocation, content }`, rather than directly dispatching the `dashboard-route-allocation` event and building DOM itself. The existing `config.body` binding and the JSON-driven `element: "workflow-route"` selection in `dashboard.json` are preserved unchanged.

A focused contract test (`test/unit/route-page-shell.test.js`, 51 additions) was added for the new primitive, and `test/unit/workflow-detail.test.js` was extended (15 additions) to verify the workflow detail view continues to render correctly through the shared shell.

## Alternatives Considered

- **Leave the duplication in place and update `workflow-route-shell.js` and `package-route-shell.js` independently for future changes.** This was the status quo prior to this PR: each shell had its own tab-chrome, allocation, and matched-content code. The PR evidence indicates this duplication was the specific problem being addressed, since "the same structure already existed for package route views" but was reimplemented rather than shared.
- **Modify only `package-route-shell.js` to be the shared base and have `workflow-route-shell.js` depend on it directly**, instead of introducing a new standalone `route-page-shell.js` module. The evidence shows the PR instead created a new, separate primitive that both shells compose through, rather than having one route shell depend on the other.

## Consequences

**Positive:**
- Tab chrome, route allocation dispatch, and matched-state composition logic now live in a single reusable module (`route-page-shell.js`), reducing duplication between workflow and package route views.
- `package-route-shell.js` was simplified: it no longer directly imports `h`, `createRouteView`, and `renderRouteTabSet`, nor directly dispatches the `dashboard-route-allocation` CustomEvent or builds DOM directly; it now delegates to `createRoutePageShell` (net reduction from 31 to 18 relevant lines per the diff).
- The existing Dashboard Language JSON contract (`element: "workflow-route"`, `config.body` binding in `dashboard.json`) and rendered behavior are preserved, so downstream consumers of the declarative configuration are unaffected.
- New focused unit test coverage (`route-page-shell.test.js`) verifies the contract of the extracted primitive in isolation, and `workflow-detail.test.js` was extended to confirm the workflow route view still renders correctly through the shared shell.

**Negative:**
- Both `workflow-route-shell.js` and `package-route-shell.js` now have a shared dependency on `route-page-shell.js`; a defect or behavioral change in the shared primitive can affect both route views simultaneously, whereas previously each shell's tab/allocation logic was independent and isolated.
- Not inferable from current pull request evidence: any performance impact, migration cost for other potential route-shell consumers beyond workflow and package, or long-term maintenance implications of the new abstraction.
