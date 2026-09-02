# Central Agentic Ops Repositories

## Establish the repository role

- **Catalog source:** A checkout with the root `aw.yml` and top-level package directories is the public CAO catalog. Change package sources and documentation here, but never configure this repository as a control plane.
- **Control repository:** A repository with installed workflows and `cao.json` under `.github/workflows/` plus package records under `.github/aw/packages/` runs the control plane. Its workflows operate on explicitly enrolled remote repositories; targets receive only declared safe outputs.
- **Target repository:** A target may contain a `target-authority` declaration in `.github/workflows/cao.json`. That declaration grants one control repository authority for named live packages; it does not make the target a control repository.

Apply only the guidance for the role that is present. Do not infer a role from the repository name.

## Sources of truth

- In the catalog, root and package `aw.yml` manifests define package contents. The root manifest installs the deterministic dashboard by default and must mirror the dashboard destinations declared by `dashboard/aw.yml`. Editable gh-aw workflow sources are `.github/workflows/*.md`; shared control is `.github/workflows/shared/control.md` and its dependencies.
- In a control repository, `.github/workflows/cao.json` is the only persistent non-secret rollout policy. Keep workflow and policy changes in one reviewed commit because runs resolve policy at the exact workflow SHA.
- `.github/workflows/*.lock.yml` files are generated artifacts. Never edit them directly; change their Markdown sources and run `gh aw compile`.
- `.github/aw/packages/*.json` records package-owned files. Update those files with gh-aw package commands instead of editing ownership metadata.
- `.github/cao/<operation>.md` is optional, control-repository-owned steering. It may refine evidence and priorities, but cannot grant tools, credentials, permissions, repository reach, or write capabilities.

## Authority and safety

- CAO policy controls whether and where an operation may run. gh-aw controls how an authorized workflow executes. Neither authority substitutes for the other.
- Orchestrators discover, rank, and dispatch within resolved policy. Workers handle one dispatched target and must not discover more repositories, dispatch more work, or widen the requested mode.
- `review` is the default mode. Do not broaden scope, rollout, package or worker enablement, or promote an operation to `live` unless the requested policy change explicitly requires it.
- Live work also requires target-owned authority on the target's protected default branch. Credential reach is not consent.
- GitHub tools exposed to agents are read-only. Repository writes must use safe-output capabilities already declared by the workflow.
- Keep credentials in Actions secrets. Never place tokens, private keys, or other secrets in policy, workflow inputs, steering files, dispatch envelopes, commits, or chat.
- Preserve fail-closed behavior. Missing policy, authority, credentials, repository access, or required evidence must fail, skip, no-op, or report incomplete rather than infer broader authority.

## Working changes

- Read the relevant workflow source, its imports, its package manifest, and the effective policy before changing behavior.
- In the catalog, follow the relevant skill under `.github/skills/` and run the narrowest tests plus `npm run compile`.
- In a control repository, validate policy JSON after editing it, reject unresolved placeholders, run `gh aw compile` after workflow-source changes, and review generated lock-file diffs.
- Do not modify unrelated packages, generated files, or consumer-owned steering while updating an installed package.