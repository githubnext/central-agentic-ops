---
title: Adopt Declarative Workflow Route Layouts
description: Record the decision to expose reusable workflow-runtime route layouts in the Dashboard Language.
---

# ADR 2136: Adopt declarative `workflow-route` layouts for the workflow-runtime view

## Status

Draft

## Context

The `workflow-runtime` view (`dashboard/site/src/components/workflow-runtime.js`) composed its identity, runtime metrics, and operational-value sections in page-specific JavaScript via `renderWorkflowRuntimeBody`, combining route shell behavior with runtime metrics and operational-value rendering in one monolithic function.

By contrast, `workflow-detail` and `workflow-runs` were already represented in `dashboard/site/dashboard.json` using `workflow-route` elements with a declarative `config.body`, and `dashboard/site/src/components/workflow-route-composition.js` already provided reusable declarative body composition for the `reports` and `runs` sections. This established prior art for composing workflow routes declaratively rather than through page-specific imperative rendering, leaving `workflow-runtime` as an inconsistent, monolithic outlier within the Dashboard Language's route model.

## Decision

Introduce a new `workflow-route` `config.layout` vocabulary with canonical values `identity`, `metrics`, and `value-report`, valid only on `workflow-route` elements, and use it to express the runtime view's identity, metrics, and value-report sections as reusable declarative route layouts.

Concretely:
- Split the runtime-specific renderer into reusable exported sub-boundaries: `renderWorkflowRuntimeMetrics(...)` (new) and the existing `renderWorkflowValueReport(...)`.
- Extend `renderWorkflowRouteView(...)` to compose these reusable boundaries declaratively whenever `config.layout` is present.
- Extend the validator (`dashboard/site/src/validator.js`) and specification constants (`dashboard/site/src/specification.js`, `docs/dashboard-language-specification.md`) to recognize and normatively restrict the new `config.layout` vocabulary to `workflow-route`.
- Update `dashboard/site/dashboard.json` to represent the runtime page with three visible declarative route elements (`workflow-runtime-identity`, `workflow-runtime-metrics`, `workflow-runtime-value-report`), while keeping the existing `workflow-runtime-route` as the full `insights` composition, marked supplemental, to preserve backward-compatible composition coverage.
- Keep existing `config.body` behavior for `insights`, `reports`, and `runs` unchanged.

## Alternatives Considered

- **Leave `workflow-runtime` as page-specific JavaScript composition.** This was the prior state (`renderWorkflowRuntimeBody` hard-coding the runtime composition). Rejected implicitly by this change because it left `workflow-runtime` inconsistent with the declarative `workflow-route` model already used by `workflow-detail` and `workflow-runs`, and prevented reuse of runtime sections (e.g., by fixture dashboards).
- **Reuse the existing `config.body` mechanism (as used by `reports`/`runs` via `workflow-route-composition.js`) instead of introducing a new `config.layout` vocabulary.** The evidence shows the PR instead added a distinct `config.layout` vocabulary scoped to identity/metrics/value-report layouts on `workflow-route`, rather than extending `config.body` for this purpose; the rationale for choosing a separate vocabulary over extending `config.body` is not inferable from current pull request evidence.

## Consequences

**Positive:**
- The runtime view's identity, metrics, and operational-value sections become reusable declarative route primitives, exercisable independently by other compositions, including fixture dashboards (per added end-to-end coverage in `dashboard/site/test/e2e/smoke.spec.js`).
- Brings `workflow-runtime` in line with the declarative composition pattern already established for `workflow-detail`, `workflow-runs`, `reports`, and `runs`, reducing divergence in how workflow routes are represented in `dashboard.json`.
- Existing route behavior, tabs, accessibility, and rendered content are preserved, and the full `insights` composition remains available via the supplemental `workflow-runtime-route`, avoiding a breaking change to existing consumers.
- New validator and unit test coverage (`dashboard/site/test/unit/validator.test.js`, `dashboard/site/test/unit/workflow-runtime.test.js`) directly enforces the new `config.layout` vocabulary and confirms `metrics` and `value-report` layouts render independently.

**Negative:**
- Introduces a second declarative composition mechanism (`config.layout` alongside `config.body`) within the Dashboard Language, increasing the vocabulary a maintainer must understand to reason about `workflow-route` composition.
- `dashboard.json` now carries redundant representations of the runtime page (three new declarative layout elements plus the retained supplemental full `insights` composition), increasing configuration surface area.
- Not inferable from current pull request evidence: any measured impact on performance, bundle size, or maintenance cost of supporting two composition mechanisms long-term.
