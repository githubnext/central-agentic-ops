# Central Agentic Ops

> [!CAUTION]
> Do not use this repository or setup, it is still experimental and not intended for use.

An organization-wide control-plane catalog for [GitHub Agentic Workflows](https://github.github.com/gh-aw/).

## Quick Start

1. Install the [GitHub CLI](https://cli.github.com/), authenticate, and install `gh aw`:

   ```bash
   gh auth login
   gh extension install github/gh-aw --force --pin v0.82.10
   gh aw version
   ```

2. Create and clone a private control-plane repository. Replace `<organization>` and `central-agentic-ops-control-plane` to match your naming convention:

   ```bash
   CONTROL_PLANE_REPO="<organization>/central-agentic-ops-control-plane"
   gh repo create "$CONTROL_PLANE_REPO" --private --clone
   cd "${CONTROL_PLANE_REPO##*/}"
   gh aw init
   git add -A
   git commit -m "Initialize GitHub Agentic Workflows"
   ```
<!--
3. To install all Central Agentic Ops packages, run the following command. Replace `<catalog-release>` with an exact release tag:

   ```bash
   gh aw add-wizard githubnext/central-agentic-ops@<catalog-release>
   ```

   To install capabilities individually, use a package-specific reference. Current packages are `githubnext/central-agentic-ops/dependabot@<catalog-release>` and `githubnext/central-agentic-ops/optimization@<catalog-release>`.

   The guided installer compiles the workflows, configures the GitHub App and credentials, and starts in `preview` mode.
   -->
