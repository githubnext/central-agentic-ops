# SelfCare

SelfCare runs repository-local maintenance for `githubnext/central-agentic-ops`. Its orchestrator dispatches five live-only workers:

- **Accessibility Checker** audits the rendered documentation site and publishes one prioritized accessibility issue.
- **Code Improvement** extracts one evidenced duplicated dashboard UI construct into a tested reusable component and opens one focused draft pull request.
- **Dashboard Review** assesses dashboard correctness, decision support, efficiency, and usability through deterministic checks and executive browser journeys.
- **Docs Build-Time Investigator** analyzes Documentation Pages workflow timings and publishes one non-repeating, evidence-backed caching or dashboard build-speed suggestion.
- **Primer Brand Checker** audits the dashboard against current Primer brand guidance and opens one focused draft pull request when an evidenced fix is available.

The checked-in control policy admits only `githubnext/central-agentic-ops` as a live target, and the target-authority declaration grants this repository's control plane authority for the package. The orchestrator rejects every other repository and every non-live candidate; all five workers repeat those checks before performing their mission.

The package uses `shared/control.md` for policy resolution, target authority, dispatch envelopes, safe-output routing, and correlation. It dispatches at most five workflows for its single target.

The Docs Build-Time Investigator registers an operational-value evaluator that measures material `docs.yml` execution-time reduction while requiring completed-run reliability to be preserved. The package dashboard keeps recommendations distinct from matured attainment. Design evaluators for the other workers after adoption evidence establishes measurable accessibility, component-reuse, dashboard-review, and brand-maintenance outcomes.
