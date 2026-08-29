# Central Agentic Ops Repository Instructions

## Package categories

Treat top-level Central Agentic Ops packages as operational packages by default. They contain an orchestrator and at least one independently dispatchable worker, use `shared/control.md`, and follow `.github/skills/create-ops-package/SKILL.md`.

The `dashboard/` package is the deterministic exception. It contains conventional GitHub Actions workflows and report resources, not an orchestrator or workers. Never fold it into an operational package or the root `aw.yml` includes, and never package the separate dashboard-language prototype under `pages/dashboard/`.

## Dashboard contract

- Install with `gh aw add githubnext/central-agentic-ops/dashboard@<release>`.
- Keep `dashboard/dashboard-build.yml` reusable through `workflow_call`. Its `site-path` input controls the relative directory included in the mergeable `central-agentic-ops-dashboard` artifact.
- Keep `dashboard/dashboard.yml` as the manual-only standalone Pages publisher. It must pass `enablement: false` to `actions/configure-pages` and must not add a schedule or another enable variable.
- For an existing Pages site, retain one Pages artifact uploader and deployer. Call the reusable builder, then download its artifact into the existing site's output directory before that workflow uploads the combined Pages artifact.
- Keep report source modules under `dashboard/report/` and install them under `.github/aw/dashboard/report/` through `dashboard/aw.yml` resources.
- Require Pages to be configured for GitHub Actions with appropriate access control before any standalone deployment.