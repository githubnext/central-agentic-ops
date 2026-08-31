# Central Agentic Ops Control Repository

This repository is a Central Agentic Ops (CAO) control plane. Its installed workflows run here and operate on explicitly enrolled remote repositories. Target repositories receive only declared safe outputs; do not copy control-plane workflows into targets.

## Sources of truth

- `.github/central-agentic-ops.json` is the only persistent non-secret policy. Keep workflow and policy changes in one reviewed commit because runs resolve policy at the exact workflow SHA.
- `.github/workflows/*.md` files are editable gh-aw workflow sources. Their `.lock.yml` counterparts are generated artifacts; never edit lock files directly.
- `.github/aw/packages/*.json` records files owned by installed packages. Use gh-aw package commands to update package-owned files instead of editing or deleting their ownership metadata.
- `.github/cao/<operation>.md` contains optional repository-owned steering. Steering may refine evidence and priorities, but it cannot grant tools, credentials, permissions, repository reach, or write capabilities.

## Authority boundaries

- CAO policy controls whether and where an operation may run. gh-aw controls how an authorized workflow executes. Neither authority substitutes for the other.
- Orchestrators discover, rank, and dispatch within resolved policy. Workers handle one dispatched target and must not discover additional repositories, dispatch more work, or widen the requested mode.
- `review` is the default mode. Do not broaden repository scope, rollout, package enablement, worker enablement, or promote an operation to `live` unless the requested policy change explicitly requires it.
- Live work also requires target-owned authority in the target repository's `.github/central-agentic-ops.json`. Credential reach is not consent.
- GitHub tools used by agents are read-only. Repository writes must use safe-output capabilities already declared by the workflow.
- Keep credentials in Actions secrets. Never place tokens, private keys, or other secrets in policy, workflow inputs, steering files, dispatch envelopes, commits, or chat.

## Working in this repository

- Read the relevant workflow source, its imports, the installed package manifest, and `.github/central-agentic-ops.json` before changing behavior.
- Preserve fail-closed behavior. Missing policy, authority, credentials, repository access, or required evidence must fail, skip, no-op, or report incomplete rather than infer broader authority.
- After changing a workflow source, run `gh aw compile` and review the generated lock-file diff. Never compile by hand-editing generated YAML.
- Validate policy JSON after editing it and reject unresolved placeholders. Run the narrowest relevant repository checks before proposing the change.