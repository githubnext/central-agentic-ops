# Pages Bundle

> [!WARNING]
> This project is experimental and not ready for use.

The Pages bundle publishes an access-controlled static view of Central Agentic Ops reports from a private control-plane repository.

> [!NOTE]
> Do not create a `REPORT_PAGES_TOKEN` secret. The workflow reads report data with the automatic `github.token` under explicit job permissions and deploys through GitHub Pages OIDC using `pages: write` and `id-token: write`.

> [!CAUTION]
> The generated site contains private control-plane data, including repository identity, issue and pull request content, comments, artifact-derived summaries, and workflow/run metadata. A private source repository does not make its Pages site private. Configure Pages access control before deployment; do not use this bundle when the intended audience cannot be enforced. `REPORT_INCLUDE_PRIVATE` is a boolean, not a credential, and no `REPORT_INCLUDE_TOKEN` exists. The catalog workflow does not enable cross-repository private discovery. A custom implementation needs a short-lived credential limited to selected repositories with `Metadata: read`, `Contents: read`, and `Actions: read`.

## Contents

- `pages.yml`: deterministic GitHub Pages build and deployment workflow.
- `github-pages-report`: report generation, accessibility, and publishing guidance.

The publisher reads trusted workflow, issue, pull request, and value-artifact data from the installed repository. AI agents do not receive `pages: write`, `id-token: write`, or deployment authority.

## Install

Install the bundle in the private control-plane or review repository that will own the Pages site:

```bash
gh aw add-wizard githubnext/central-agentic-ops/pages@<catalog-release>
```

## Configure

1. In **Settings > Pages**, select **GitHub Actions** as the source.
2. Restrict site access to the intended audience.
3. Protect the `github-pages` environment as required by your organization.
4. Run **Pages** from the repository's **Actions** page.

Do not use this bundle when the report would be public or when the repository plan cannot enforce the required access boundary. See [Publishing Pages Reports](../docs/operations.md#publishing-pages-reports) for operating details.
