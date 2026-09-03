# Central Agentic Ops Dashboard

> [!NOTE]
> **Research prototype:** Features and interfaces may change as the project evolves.

The dashboard package publishes an access-controlled static view of Central Agentic Ops reports from a private control-plane repository.

> [!NOTE]
> Do not create a `REPORT_PAGES_TOKEN` secret. The workflow reads report data with the automatic `github.token` under explicit job permissions and deploys through GitHub Pages OIDC using `pages: write` and `id-token: write`.

> [!CAUTION]
> The generated site contains private control-plane data, including repository identity, issue and pull request content, comments, artifact-derived summaries, and workflow/run metadata. A private source repository does not make its Pages site private. Configure Pages access control before running the standalone publisher; do not publish the dashboard when the intended audience cannot be enforced. `REPORT_INCLUDE_PRIVATE` is a boolean, not a credential, and no `REPORT_INCLUDE_TOKEN` exists. The packaged workflow does not enable cross-repository private discovery. A custom implementation needs a short-lived credential limited to selected repositories with `Metadata: read`, `Contents: read`, and `Actions: read`.

## Contents

- `.github/workflows/dashboard-build.yml`: reusable, path-aware report build that uploads a mergeable Actions artifact.
- `.github/workflows/dashboard.yml`: manual standalone GitHub Pages deployment.
- `.github/actions/cao-activity`: shared activity-cache consumer and refresher installed by the core activity package.
- `.github/cao/src/policy.mjs`: dependency-free checked-in policy parser and resolver.
- `.github/cao/src/control.mjs`: deterministic policy command adapter used by the build workflow.
- `.github/aw/dashboard/report`: deterministic collectors, durable-record production, and Dashboard Language source adaptation.
- `.github/aw/dashboard/site`: the packaged Dashboard Language validator, presenter, configuration, and browser runtime.

The publisher reads trusted workflow, issue, pull request, and value-artifact data from the installed repository. Collectors write bounded JSON, `records.mjs` normalizes durable outputs, `dashboard-language-sources.mjs` creates `sources.json`, and the packaged renderer serves it at the configured `site-path`. AI agents do not receive `pages: write`, `id-token: write`, or deployment authority.

If authoritative control policy resolution fails, the build remains fail-closed to the control repository and publishes the resolver diagnostic on the dashboard's Coverage diagnostics page. Valid policy that omits or disables an installed package or worker is shown as an admission gate in Overview attention and Security & controls. A latest failed run blocked by pre-activation GitHub REST API capacity is shown separately with its reset time, wait estimate, and official GitHub rate-limit guidance.

## Install

The root Central Agentic Ops package installs the dashboard by default. For a focused installation, install the core activity package and dashboard from the same reviewed release tag or full commit SHA:

```bash
gh aw add githubnext/central-agentic-ops/activity@<catalog-release>
gh aw add githubnext/central-agentic-ops/dashboard@<catalog-release>
```

Both installation paths add the deterministic dashboard automation without an additional enable variable. The standalone publisher remains manual-only and cannot enable Pages for the repository.

To refresh or restore package-owned files, reinstall a reviewed release with force:

```bash
gh aw add githubnext/central-agentic-ops/dashboard@<catalog-release> --force
```

The package contains only deterministic action workflows and resources, so `gh aw update` has no source-tracked agentic workflow through which to discover it.

## Standalone Pages site

Before running the standalone deployment, configure the private control-plane or review repository that will own the Pages site:

1. In **Settings > Pages**, select **GitHub Actions** as the source.
2. Restrict site access to the intended audience.
3. Protect the `github-pages` environment as required by your organization.

The workflow passes `enablement: false` to `actions/configure-pages`, so a run validates existing Pages configuration but never enables Pages for the repository.

Use **Refresh** in the dashboard header to open **Central Agentic Ops Dashboard** on the repository's **Actions** page, then click **Run workflow**. The standalone workflow is deliberately not scheduled, so installing the package cannot replace an existing Pages deployment without an explicit run. Operational-value collection bootstraps adoption-to-current history through the gh-aw report contract and then reuses digest-scoped weekly replay shards. Workflow inventory and recent runs come from the core activity package's schema-versioned Actions cache. Actions caches accelerate refreshes but are evictable and are not historical authority.

The catalog contains only collector, adapter, and presenter code. Installed control repositories hold runtime aggregation and the current access-controlled Pages view. Live organization-specific JSON, Markdown, and SVG snapshots are generated data and are not committed to this catalog.

## Existing Pages site

Keep the existing Pages workflow as the site's only uploader and deployer. Add the reusable dashboard build as a job, pass the desired mount path, and download its artifact into the existing site's output directory before `actions/upload-pages-artifact` runs:

```yaml
jobs:
	dashboard:
		permissions:
			actions: read
			contents: read
			issues: read
			pull-requests: read
		uses: ./.github/workflows/dashboard-build.yml
		with:
			site-path: operations/dashboard

	pages:
		needs: dashboard
		runs-on: ubuntu-latest
		steps:
			- name: Build existing site
				run: npm run build

			- name: Add Central Agentic Ops dashboard
				uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
				with:
					name: central-agentic-ops-dashboard
					path: dist

			- name: Upload combined Pages artifact
				uses: actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b # v4
				with:
					path: dist
```

This example publishes the dashboard at `/operations/dashboard/`. Replace `dist` with the existing site's artifact directory. Preserve the existing workflow's checkout, setup, permissions, Pages configuration, deployment job, and triggers. Do not run the standalone dashboard workflow for an embedded installation.

## Configure

1. Set `control-plane.scope.allowed-repositories` in `.github/workflows/cao.json` when report discovery should be limited to an explicit repository allowlist.
2. Use `site-path: .` only when the dashboard is the whole site; use a relative URL path when embedding it.

Do not install this package when the report would be public or when the repository plan cannot enforce the required access boundary. See [Publishing Pages Reports](../docs/operations.md#publishing-pages-reports) for operating details.
