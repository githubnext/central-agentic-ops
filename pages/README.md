# Pages Bundle

> [!WARNING]
> This project is experimental and not ready for use.

The Pages bundle publishes an access-controlled static view of Central Agentic Ops reports from a private control-plane repository.

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
