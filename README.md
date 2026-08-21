# Central Agentic Ops

> [!WARNING]
> This project is still experimental. Do not use until it is marked as ready and this notice is removed.

This repository contains the source for the Central Agentic Ops catalog, which is an opinioned set of GitHub Agentic Workflow bundles prescribed by GitHub. The catalog is designed to be installed in a private repository and run against configured target repositories across an enterprise.

<p align="center">
   <img src="docs/assets/aw-enterprise.png" alt="Enterprise and organization control planes dispatch work to target repositories">
</p>

## Why Central Agentic Ops

- **One control point:** shared authentication and safety policy for every installed bundle.
- **Deliberate rollout:** every bundle starts in `staged`, moves through private `review`, and reaches `live` independently.
- **Bounded work:** orchestrators select repositories; each worker receives one target and uses only declared safe outputs.
- **Traceable runs:** worker workflow safe outputs link back to the originating orchestrator workflow run.

## Control Boundary

Central Agentic Ops governs workflows run through its central control repositories. It does not prevent people, repositories, or other automation from creating or running workflows outside the catalog, and it does not make the control plane the only path for GitHub Actions execution.

Pair it with GitHub-native policies, rulesets, protected environments, and least-privilege credentials when mandatory enforcement is required. Read [What this does not do](docs/architecture.md#what-this-does-not-do) before broad adoption.

## Install

1. Install the [GitHub CLI](https://cli.github.com/), authenticate, and install `gh aw`:

   ```bash
   gh auth login
   gh extension install github/gh-aw
   ```

2. Create and clone a private control-plane repository, then run `gh aw init` in it.

3. Install the catalog from an exact release tag:

   ```bash
   gh aw add-wizard githubnext/central-agentic-ops@<catalog-release>
   ```

   Or install one bundle:

   ```bash
   gh aw add-wizard githubnext/central-agentic-ops/dependabot@<catalog-release>
   gh aw add-wizard githubnext/central-agentic-ops/optimization@<catalog-release>
   ```

   Add the optional operations report only to a private, access-controlled repository:

   ```bash
   gh aw add-wizard githubnext/central-agentic-ops/pages@<catalog-release>
   ```

The installer leaves every bundle in `staged`. Follow [Install and run safely](docs/getting-started.md) before enabling review or live outputs. The core catalog does not install Pages or grant `pages: write`.

## Documentation

Start with the [documentation overview](docs/README.md), then use the guide for your task:

- [Install and run safely](docs/getting-started.md)
- [Choose credentials](docs/authentication.md)
- [Roll out a bundle](docs/rollout-and-routing.md)
- [Monitor, recover, and maintain](docs/operations.md)
- [Configuration reference](docs/configuration.md)
- [How the control plane works](docs/architecture.md)
- [Orchestrators and workers](docs/orchestrators-and-workers.md)
