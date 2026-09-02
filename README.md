# Central Agentic Ops

> [!NOTE]
> **Research prototype:** Features and interfaces may change as the project evolves.

> [!TIP]
> **Agent setup router:** When asked to create, bootstrap, initialize, or set up a Central Agentic Ops control plane, load and follow [the setup skill](.github/skills/setup-central-agentic-ops/SKILL.md). Do not configure this catalog repository as the control plane.

Run trusted agentic operations across your repository fleet from one central control plane.

Central Agentic Ops packages reusable orchestrators and focused workers so platform teams can automate repository operations without copying workflows into every repository.

- **Reach more repositories:** deterministically discover and batch inventories of 100,000+ repositories while keeping each run bounded.
- **Roll out with confidence:** review proposed outcomes away from the target, then promote each package independently to `live`.
- **Keep work accountable:** every worker stays scoped to one repository and links its outcome to the originating control-plane run.

## Documentation

Ready to explore? [See the docs](https://githubnext.github.io/central-agentic-ops/).

## GitHub Pages setup

The default Central Agentic Ops package installs the dashboard builder and manual Pages publisher. Before running **Central Agentic Ops Dashboard** for the first time:

1. Open **Settings > Pages** in the control repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Restrict Pages access to the intended audience before publishing control-plane data.

The dashboard workflow remains manual and does not enable Pages automatically.
