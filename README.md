# Central Agentic Ops

> [!WARNING]
> This project is still experimental. Do not use until it is marked as ready and this notice is removed.

A catalog of GitHub Agentic Workflow bundles run from a private control-plane repository.

## Install

Create a private control-plane repository, then run:

```bash
gh auth login
gh extension install github/gh-aw
gh aw init
gh aw add-wizard githubnext/central-agentic-ops@<catalog-release>
```

Every bundle starts in `staged` mode. Follow [Install and run safely](docs/getting-started.md) before enabling writes.

## Documentation

See the [documentation](docs/README.md).
