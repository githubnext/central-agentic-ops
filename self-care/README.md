# SelfCare

SelfCare runs repository-local maintenance for `githubnext/central-agentic-ops`. Its daily orchestrator dispatches two live-only workers:

- **Accessibility Checker** audits the rendered documentation site and publishes one prioritized accessibility issue.
- **Primer Brand Checker** audits the dashboard against current Primer brand guidance and opens one focused draft pull request when an evidenced fix is available.

The checked-in control policy admits only `githubnext/central-agentic-ops` as a live target, and the target-authority declaration grants this repository's control plane authority for the package. The orchestrator rejects every other repository and every non-live candidate; both workers repeat those checks before performing their mission.

The package uses `shared/control.md` for policy resolution, target authority, dispatch envelopes, safe-output routing, and correlation. It dispatches at most two workflows for its single target.

The workers do not yet register operational-value evaluators. Design those evaluators after adoption evidence establishes measurable accessibility and brand-maintenance outcomes.
