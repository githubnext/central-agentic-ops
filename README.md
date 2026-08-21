# Central Agentic Ops

> [!WARNING]
> This project is still experimental. Do not use until it is marked as ready and this notice is removed.

Run trusted agentic operations across your repository fleet from one private control plane.

Central Agentic Ops packages reusable orchestrators and focused workers so platform teams can automate repository operations without copying workflows into every repository.

- **Reach more repositories:** discover, prioritize, and process work in bounded batches.
- **Roll out with confidence:** start in `staged`, review proposed outcomes, and promote each bundle independently.
- **Keep work accountable:** every worker stays scoped to one repository and links its outcome to the originating control-plane run.

## Install

Create a private control-plane repository, then run:

```bash
gh auth login
gh extension install github/gh-aw
gh aw init
gh aw add-wizard githubnext/central-agentic-ops@<catalog-release>
```

Every bundle starts in `staged` mode, so the first run can demonstrate value without writing to a target repository.

## Documentation

Ready to explore? [See the docs](docs/README.md) or [run one safe staged check](docs/getting-started.md).
