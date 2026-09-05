# ADR 2710: Extract reusable experiment detail sections behind a shared renderer boundary

## Status

Draft

## Context

`dashboard/site/src/components/experiments-evaluation.js` was identified as the most over-specialized renderer candidate in the dashboard: it owned both experiment selection and five distinct detail sections (metric comparison, eval outcomes, grader diagnostics, observation quality, run evidence) in one page-specific module. Before editing, the required guidance and dashboard language sources were reviewed (AGENTS.md, `.github/aw/instructions.md`, `dashboard/site/PLAN.md`, `docs/dashboard-language-specification.md`, `dashboard/site/dashboard.json`, `dashboard/site/src/specification.js`, `dashboard/aw.yml`, and renderer tests). Recent workflow PR history was also considered: #2439 (fixing SelfCare dashboard workflow validation) and #2139 (making SelfCare dashboard review Playwright setup reliable) are positive evidence for preserving workflow and validation discipline and stable browser validation; #2672 (moving Dashboard Lighthouse checks to SelfCare) was closed without merge and is treated as negative evidence not to be repeated. Prior positive evidence from #1289 (adding a SelfCare dashboard view reuse workflow) reinforced an expected direction toward reusable, declarative dashboard boundaries.

## Decision

Extract the experiment detail section family out of `experiments-evaluation.js` into a new module, `dashboard/site/src/components/experiment-detail-sections.js`, which defines `renderExperimentDetailSection(...)` and the five detail section renderers (metric comparison, eval outcomes, grader diagnostics, observation quality, run evidence). The `experiments` page module retains experiment selection, filtering, and summary logic, but now composes the extracted sections declaratively by calling `renderExperimentDetailSection(...)` instead of hard-coding each section's rendering inline. Routes, accessibility semantics, rendered content, and public imports used by the page are preserved. No Dashboard Language vocabulary change was required, so `dashboard.json`, the specification, and validator vocabulary remain unchanged.

## Alternatives Considered

- Leave the five detail sections inline in `experiments-evaluation.js`. This was the prior state and was rejected because it kept experiment selection and five distinct detail-section renderers over-specialized in a single page-specific module, contrary to the reuse direction reinforced by #1289.
- Move dashboard checks/validation scope instead of refactoring the renderer (as proposed in #2672, moving Dashboard Lighthouse checks to SelfCare). This is negative evidence: #2672 was closed without merge, and this change explicitly does not repeat that proposal.

## Consequences

Positive:
- The five experiment detail section renderers become reusable and are decoupled from the page-specific selection/filtering/summary logic in `experiments-evaluation.js`.
- Section composition is now declarative, going through the shared `renderExperimentDetailSection(...)` boundary rather than hard-coded per-section inline calls.
- Routes, accessibility semantics, rendered content, and public imports used by the page are preserved, and no Dashboard Language vocabulary, `dashboard.json`, specification, or validator changes were required.

Negative:
- Not inferable from current pull request evidence.
