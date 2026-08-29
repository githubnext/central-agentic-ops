---
title: Control Policy Specification
description: The authoritative, version-controlled policy model for Central Agentic Ops control and target repositories.
sidebar:
  order: 1361
---

# Central Agentic Ops Control Policy Specification

**Version:** 0.2.0
**Status:** Working Draft

## Abstract

This specification defines `.github/central-agentic-ops.json` as the authoritative, version-controlled source of persistent, non-secret Central Agentic Ops policy. It defines the document model, trust boundaries, resolution order, runtime record, dispatch constraints, credential separation, failure behavior, migration requirements, and conformance criteria.

The same path serves two repository roles. A control repository uses `control-plane` to govern installed operations. A target repository uses `target-authority` to identify the one control repository authorized to perform live work for each package. A repository that has both roles may contain both sections.

## Status of This Document

This document is a Working Draft intended to govern implementation. Normative requirements use the terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** as described by RFC 2119.

## 1. Decision

1. `.github/central-agentic-ops.json` is the only persistent authority for non-secret Central Agentic Ops policy.
2. `CENTRAL_AGENTIC_OPS_*` GitHub Actions variables are removed. Runtime code does not read them as defaults, overrides, or compatibility fallbacks.
3. GitHub Secrets remain authoritative for credentials.
4. `workflow_dispatch` inputs may narrow one run but may not widen checked-in policy.
5. The shared control import contributes one deterministic resolver step to the gh-aw agent job. A denied run emits gh-aw's native `noop` safe output before the model harness starts.
6. `/tmp/gh-aw/agent/control-precompute.json` is the single effective policy and provenance record for one run. It is derived state, not persistent configuration.
7. gh-aw framework-level `GH_AW_*` variables and generated environment variables are outside the CAO policy model. CAO does not require or treat them as policy authority.
8. Operational workflow code, policy, credentials, and AI execution are trusted only through a protected default-branch deployment boundary.
9. gh-aw remains authoritative for workflow execution mechanics, including engines, tools, permissions, per-workflow AI Credit limits, generated jobs, authentication, and safe outputs. CAO policy does not duplicate those settings.

## 2. Goals and Non-Goals

### 2.1 Goals

- provide one reviewable overview of control-plane policy;
- make policy changes attributable through Git history and protected review;
- validate the complete policy as one typed document;
- prevent target repository content, dispatch inputs, inherited variables, or process environment from broadening authority;
- stop disabled or unauthorized runs before model invocation;
- preserve independent worker enforcement and target consent for live operation;
- expose the exact policy revision and digest used by every run; and
- give the dashboard and deterministic add-ons the same policy source as agentic workflows.

### 2.2 Non-Goals

- storing credentials, tokens, private keys, or OTLP authorization headers;
- replacing `aw.yml`, which remains the gh-aw package manifest;
- replacing `.github/cao/*.md`, which remains optional consumer-owned steering;
- replacing gh-aw frontmatter such as `engine`, `tools`, `network`, `permissions`, `safe-outputs`, `max-turns`, or `max-ai-credits`;
- replacing GitHub rulesets, Actions policy, protected environments, CODEOWNERS, or credential scoping;
- continuously reconciling repository settings from the file;
- eliminating runner environment variables used as process transport; or
- eliminating optional `vars.*` expressions generated internally by gh-aw.

## 3. Authority Model

| Record | Authority | Trust source |
| --- | --- | --- |
| Control policy | Persistent non-secret CAO policy | `.github/central-agentic-ops.json` at an exact commit on the control repository's protected default branch |
| Target authority | Consent for live work on one target | `target-authority` in `.github/central-agentic-ops.json` at an exact commit on the target repository's protected default branch |
| Credentials | Authentication capability | GitHub Actions secrets or the run-scoped `GITHUB_TOKEN` |
| Dispatch inputs | One-run requested narrowing | GitHub Actions event payload |
| Effective policy | Validated result for one run | `control-precompute.json` derived by the shared deterministic resolver step |
| Package inventory | Installed workflow files and minimum gh-aw version | `aw.yml` and package manifests |
| Steering | Optional selection and reasoning guidance | `.github/cao/<package>.md` |

Possession of credentials does not grant CAO policy authority. Inclusion in a control allowlist does not grant target consent. Target consent does not grant a mode, permission, or scope absent from control policy. All applicable boundaries are cumulative.

## 4. Document Model

### 4.1 Location and Encoding

- The file **MUST** be named `.github/central-agentic-ops.json`.
- It **MUST** contain one JSON document encoded as UTF-8.
- The root **MUST** be a mapping.
- `version` **MUST** be the integer `1`.
- At least one of `control-plane` or `target-authority` **MUST** be present.
- Unknown keys **MUST** fail validation at every schema level.
- Duplicate object keys **MUST** be rejected.
- JSON values **MUST NOT** contain GitHub Actions expressions such as `${{ ... }}`.
- Earlier experimental shapes, including a root `bundles` mapping, **MUST** be rejected. Version 1 has no legacy aliases.

### 4.2 Minimal Control-Plane Example

Authors should omit values that match schema defaults. This policy enables one package and worker in the default `review` mode for two repositories. All unlisted packages and workers are disabled by absence. Advanced inventory, rollout, budget, and publishing settings are added only when needed.

```json
{
  "version": 1,
  "control-plane": {
    "scope": {
      "allowed-repositories": [
        "acme/payments-api",
        "acme/storefront"
      ]
    },
    "packages": {
      "dependabot": {
        "workers": {
          "release-train-updater": {}
        }
      }
    }
  }
}
```

### 4.3 `control-plane.scope`

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `allowed-owners` | unique array of GitHub owner names | No | Control repository owner | Owners eligible for targets and review destinations |
| `allowed-repositories` | unique array of `owner/repository` names | No | Empty | Optional repository-level restriction beneath `allowed-owners` |

Owner and repository checks are cumulative. When `allowed-repositories` is non-empty, a repository **MUST** satisfy both lists. Wildcards are not supported in version 1.

### 4.4 `control-plane.inventory`

| Field | Type | Default | Constraint |
| --- | --- | --- | --- |
| `max-scan-repositories` | integer | `1000` | `1..100000` |
| `cell-count` | integer | `1` | `1..1000` |
| `cell-index` | integer | `0` | `0 <= value < cell-count` |
| `batch-size` | integer | `100000` | `1..100000` |
| `batch-index` | integer | `0` | `value >= 0` |

Inventory slicing **MUST** remain deterministic for the same repository inventory and effective values.

### 4.5 `control-plane.defaults`

| Field | Type | Default | Constraint |
| --- | --- | --- | --- |
| `mode` | string | `review` | `review` or `live` |
| `max-repositories` | integer | `1` | `1..1000` |
| `rollout-percent` | integer | `100` | `1..100` |
| `monthly-ai-credit-budget` | integer | `0` | `0` or a positive integer |

Defaults apply only when the corresponding package field is omitted. Schema defaults are the final fallback and are not another mutable authority.

Per-workflow hard limits remain native gh-aw `max-ai-credits` frontmatter. CAO's monthly budget is a cross-run admission policy and does not replace or raise that native limit.

### 4.6 `control-plane.packages`

Version 1 recognizes these package identifiers:

- `advisory`
- `ambient-context`
- `aw-maintenance`
- `dependabot`
- `eu-cra-compliance`
- `optimization`

Each package accepts:

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enabled` | Boolean | `true` | Package run and dispatch gate |
| `mode` | string | `control-plane.defaults.mode` | Package output mode |
| `max-repositories` | integer | `control-plane.defaults.max-repositories` | Scheduled selection ceiling |
| `rollout-percent` | integer | `control-plane.defaults.rollout-percent` | Scheduled percentage ceiling |
| `monthly-ai-credit-budget` | integer | `control-plane.defaults.monthly-ai-credit-budget` | Package monthly AIC ceiling; `0` disables tuning |
| `workers` | mapping | Empty | Worker gates and mode ceilings; undeclared workers are disabled |

An absent package entry is disabled. A package entry that is present may omit `enabled`, in which case it defaults to `true`. This makes package installation inert until the consumer explicitly declares the package in policy.

Version 1 recognizes these worker identifiers:

| Package | Workers |
| --- | --- |
| `advisory` | `uk-ai-operational-resilience` |
| `ambient-context` | `agents-md-curator`, `skills-curator` |
| `aw-maintenance` | `failures-investigator`, `upgrade` |
| `dependabot` | `release-train-updater` |
| `eu-cra-compliance` | `scope-classifier`, `security-requirements-auditor`, `supply-chain-sbom-auditor`, `vulnerability-handling-auditor`, `article-14-reporting-readiness`, `conformity-release-evidence` |
| `optimization` | `ai-credit-auditor`, `ai-credit-optimizer` |

An absent worker entry is disabled. A worker entry that is present accepts `enabled`, defaulting to `true`, and `max-mode`, defaulting to `review`. A worker's effective mode is the less permissive of the package mode, dispatch request, and worker ceiling.

### 4.7 `control-plane.publishing`

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enabled` | Boolean | `false` | Enables the deterministic Ops Publish add-on |
| `control-repositories` | unique repository array | Current repository | Repositories whose reviewed outputs may be published |
| `reviewers` | unique user-login array | Empty | Users authorized to approve publication |

When publishing is enabled, `reviewers` **MUST** be non-empty. Publication targets **MUST** also satisfy `control-plane.scope`. Publishing credentials remain in `CENTRAL_AGENTIC_OPS_PUBLISH_CONTROL_TOKEN` and `CENTRAL_AGENTIC_OPS_PUBLISH_TARGET_TOKEN` secrets when App authentication is unavailable.

### 4.8 `target-authority`

`target-authority.packages` maps a package identifier to exactly one `authority` repository in `owner/repository` form. It grants consent only for that package and only when the effective control mode is `live`.

```json
{
  "version": 1,
  "target-authority": {
    "packages": {
      "optimization": {
        "authority": "acme/central-agentic-ops"
      }
    }
  }
}
```

A target authority declaration does not grant credential access, workflow permissions, package enablement, or broader repository scope. Review mode does not require target authority because it cannot mutate the target.

## 5. Resolution Lifecycle

### 5.1 Shared Deterministic Resolver

Each orchestrator and worker **MUST** import `shared/control.md`. The shared component contributes a deterministic top-level `steps:` resolver that runs in gh-aw's generated agent job before the model harness starts. It follows this order:

1. Record `github.workflow_sha` as the exact operational workflow revision.
2. Fetch `.github/central-agentic-ops.json` from the control repository at `github.workflow_sha`. Workflow code and control policy are therefore one atomic, reviewable revision; the resolver does not perform a second "latest default branch" lookup.
3. Parse the file with the Node.js JSON parser, reject duplicate object keys, and validate it against the versioned schema.
4. Select the statically declared package, role, and worker identifier supplied by the importing workflow. `worker` is required when `role` is `worker` and forbidden for orchestrators.
5. Resolve defaults, package policy, worker ceilings, dispatch narrowing, inventory, monthly budget admission, and routing.
6. For a live worker, independently resolve the target's current default branch to an exact commit SHA, then fetch and validate target authority from that SHA.
7. Write `/tmp/gh-aw/agent/control-precompute.json`, including effective policy and provenance.
8. If policy denies the run, append a `noop` record with a stable reason to `$GH_AW_SAFE_OUTPUTS`. If policy integrity cannot be established, fail the step. Otherwise, allow normal gh-aw execution to continue.

The resolver performs no model invocation and **MUST NOT** execute repository code from the control or target repository. Fetching policy as data is not equivalent to checking out and executing that revision.

The shared control import **MUST** receive package, role, and worker identifiers as static workflow-source values. It **MUST NOT** derive them from dispatch inputs, environment variables, repository content, or display names.

### 5.2 Permission and Environment Boundary

The repository **MUST** provide a protected GitHub Actions environment named `central-agentic-ops`. Its deployment branch policy **MUST** admit only the protected default branch. Every operational source workflow **MUST** declare `environment: central-agentic-ops`; gh-aw propagates that boundary to its generated jobs. Operational secrets **MUST** be environment secrets, not unrestricted repository secrets.

The environment declaration remains in each source workflow because it is a deployment boundary, not CAO policy, and shared imports do not currently inherit it. A compile-time conformance test **MUST** reject an operational workflow that imports `shared/control.md` without this environment.

The unprivileged policy-fetch portion requires `contents: read`. Effective-policy resolution additionally requires these permissions when the corresponding capability is enabled:

| Operation | Run token or App permission |
| --- | --- |
| Read control and target policy files | Contents read |
| Inspect workflow availability and monthly AIC history | Actions read |
| Enumerate installed repositories and read repository metadata | Metadata read and the installation or organization access required by the selected GitHub API endpoint |
| Emit review or live outputs | The separate least-privilege permissions declared by that safe-output job |

The resolver uses the job-local token supplied through native gh-aw authentication. It **MUST NOT** mint a second token or transport a token through an output or artifact. A PAT fallback must have equivalent or narrower repository reach.

An in-workflow ref check protects against accidental branch selection but is not a security boundary because untrusted workflow source can remove it. The protected environment, restricted secret placement, default-branch protection, and restricted control-repository write access are the external enforcement boundary.

### 5.3 gh-aw-Native Short Circuit

The control layer **MUST NOT** add a `cao_policy` job, custom job outputs, or `jobs.<built-in>.needs` wiring. The imported resolver runs as a normal gh-aw `steps:` contribution. On an expected denial it writes a native safe-output record before the harness starts:

```json
{"type":"noop","message":"central-agentic-ops: <stable reason>"}
```

gh-aw detects the `noop` at harness startup and exits without model inference or AI Credit use. Denied runs may still allocate compiler-generated jobs and execute gh-aw bootstrap steps; version 1 guarantees no model invocation, not zero runner allocation.

### 5.4 Native Authentication

`shared/control.md` **SHOULD** declare gh-aw's top-level `github-app` fallback. The App identifier and private key **SHOULD** both come from environment Secrets. gh-aw owns job-local token minting and propagation to activation, checkout, GitHub tools, safe outputs, and conclusion jobs.

GitHub App identity is bootstrap configuration, not CAO policy, and **MUST NOT** appear in `.github/central-agentic-ops.json`. No App token, PAT, or private key may appear in a policy record, job output, artifact, dispatch input, or prompt. When native App authentication is absent, the run may use `GH_AW_GITHUB_TOKEN` or the run-scoped `GITHUB_TOKEN` only where its permission and repository reach are sufficient; otherwise resolution fails closed.

### 5.5 Runtime Records

The resolver produces exactly one record: `/tmp/gh-aw/agent/control-precompute.json`. gh-aw preserves files under `/tmp/gh-aw/agent/` for agent consumption, so no policy artifact upload/download path is required.

The record **MUST** include the effective policy plus the control repository, workflow and policy commit SHA, policy SHA-256 digest, schema version, package, role, worker identifier when applicable, resolution time, and, for live workers, target authority repository, commit SHA, and digest. For control policy, the workflow and policy commit SHA are both `github.workflow_sha`. A digest is lowercase hexadecimal SHA-256 over the exact fetched file bytes before parsing.

Runtime environment variables may expose individual derived values to scripts, but changing those variables **MUST NOT** alter the validated effective policy record. A second provenance file or compatibility copy is forbidden in version 1.

### 5.6 Parent and Worker Policy

An orchestrator includes its policy SHA and digest in the dispatch envelope for correlation. A worker **MUST NOT** trust that reference as current authority. It independently reads current control policy and computes the intersection of:

- the parent dispatch envelope;
- current control policy;
- the worker's current package and worker ceilings;
- current credential reach; and
- current target authority for live mode.

This permits revocation after orchestration to stop a worker. A newer policy may not widen an already-dispatched envelope.

## 6. Precedence and Narrowing

Persistent values resolve in this order:

```text
schema defaults < control-plane.defaults < package < worker ceiling
```

Dispatch authorization values are then intersected with the persistent result. They are requests, not a higher-precedence authority.

| Dispatch input | Permitted effect |
| --- | --- |
| `safe_output_mode` | Keep or lower `live` to `review`; never promote `review` to `live` |
| `target_repo` | Select one repository already admitted by scope and policy |
| `safe_output_repo` | Select one admitted private review destination |
| `max_repos` | Lower the effective repository cap |
| `rollout_percent` | Lower the effective rollout percentage |
| `cell_count` | Select a valid deterministic partitioning scheme within the authorized candidate universe |
| `cell_index` | Select one valid cell from that scheme |
| `batch_size` | Preserve or lower the policy batch-size ceiling |
| `batch_index` | Select one valid batch within the selected cell |

An input requesting broader authority **MUST** fail with a specific policy error. It **MUST NOT** be silently accepted, persisted, or converted into a broader effective value.

`cell_count`, `cell_index`, and `batch_index` are scheduling selectors, not monotonic policy ceilings. They may select a different set than the scheduled defaults, but the resulting repositories **MUST** remain a subset of the candidate universe authorized by owner, repository, mode, credential, target-authority, scan, rollout, repository-count, dispatch, and budget limits. Implementations **MUST NOT** describe a different cell or batch as a set-theoretic narrowing of the configured cell or batch.

## 7. Secrets and Runtime Environment

The policy file **MUST NOT** contain credentials. At minimum, these values remain GitHub Secrets where used:

- `GH_AW_GITHUB_APP_ID`;
- `GH_AW_GITHUB_APP_PRIVATE_KEY`;
- `GH_AW_GITHUB_TOKEN`;
- `GH_AW_CI_TOKEN`;
- `CENTRAL_AGENTIC_OPS_PUBLISH_CONTROL_TOKEN`;
- `CENTRAL_AGENTIC_OPS_PUBLISH_TARGET_TOKEN`; and
- OTLP endpoints or headers classified as secret by the selected backend configuration.

No GitHub Actions variable is required for CAO policy or App bootstrap. Environment variables remain valid for passing GitHub expressions, secrets, and normalized values to a process. Expressions **SHOULD** be assigned through a step `env` mapping rather than interpolated into shell source. Scripts **MUST** parse structured JSON with the native parser and **MUST NOT** use `eval`.

No environment variable whose name begins with `CENTRAL_AGENTIC_OPS_` may override policy. Internal derived environment variables with that prefix should be removed or renamed where practical to make the authority boundary unambiguous.

## 8. Failure and Emergency Behavior

The resolver **MUST** fail closed for:

- a missing policy file;
- an unavailable workflow revision, target default branch, or target commit;
- invalid JSON or schema violations;
- unknown package or worker identifiers;
- invalid or contradictory bounds;
- a dispatch request that widens policy;
- a target or review destination outside the effective scope;
- unavailable required authentication;
- an absent, malformed, or mismatched live target authority; or
- unreadable budget evidence when a budget is enabled.

Expected policy denials, including disabled packages or workers, **MUST** write a stable reason code to `control-precompute.json`, emit `noop`, and perform no model invocation. Integrity failures **MUST** fail the resolver step visibly before model execution.

The emergency stop outside the policy file is GitHub's workflow disable control. Operators may additionally cancel active runs, revoke or rotate credentials, or apply organization Actions policy. These controls stop execution capability; they are not alternative CAO policy stores.

## 9. Security Requirements

- **CAO-POL-SEC-001:** A run whose executable workflow does not come from the protected default branch **MUST NOT** receive operational secrets, invoke an AI engine, mint an App token, or perform writes.
- **CAO-POL-SEC-002:** Control policy **MUST** be fetched at the exact `github.workflow_sha`; live target authority **MUST** be fetched at an exact commit resolved from the target's current default branch.
- **CAO-POL-SEC-003:** Effective policy and provenance **MUST** be recorded together before model execution.
- **CAO-POL-SEC-004:** Target content **MUST NOT** override control policy.
- **CAO-POL-SEC-005:** A live worker **MUST** validate target authority from the target's default branch before model execution.
- **CAO-POL-SEC-006:** A worker **MUST** apply the least permissive result across its dispatch envelope and independently resolved current policy.
- **CAO-POL-SEC-007:** Secrets and minted tokens **MUST NOT** appear in policy artifacts, job outputs, logs, dispatch inputs, or agent prompts.
- **CAO-POL-SEC-008:** Policy and workflow paths **MUST** require CODEOWNERS review and default-branch protection in an operational control repository.
- **CAO-POL-SEC-009:** Actions **MUST** be pinned according to repository policy. The resolver **MUST NOT** require third-party runtime or build dependencies.
- **CAO-POL-SEC-010:** Validation errors **MUST NOT** print secret values or untrusted document content unnecessarily.

## 10. Other Consumers

### 10.1 Dashboard

The dashboard build reads the same exact-SHA control policy and reports configured package modes, enablement, bounds, and scope from it. It **MUST NOT** ingest `toJSON(vars)` or infer CAO configuration from repository variables.

### 10.2 Ops Publish

Ops Publish reads `control-plane.publishing` and `control-plane.scope` before token minting or publication. Reviewer, control-repository, owner, and repository checks all remain cumulative. Its tokens remain secrets.

### 10.3 Bootstrap and Updates

`aw.yml config:` may bootstrap files or settings but is not runtime authority. Installation tooling may create a conservative policy file only when the destination does not exist. Package updates **MUST NOT** overwrite a consumer-owned policy file.

## 11. Migration

The migration has no dual-read period. The new resolver accepts only this specification's version 1 document model. Existing experimental target files using `bundles.<package>.authority` are not version 1 documents under this specification and **MUST** be replaced before migrated workflows are enabled.

1. Add the version 1 schema, parser, shared resolver step, and representative fixtures. Add negative fixtures proving that root `bundles` and other earlier shapes are rejected.
2. Add a one-time migration command that may read existing repository variables and generate a reviewable policy draft. The command is migration tooling, not runtime fallback.
3. Replace every enrolled target's earlier authority document with `target-authority.packages` and protect it before deploying migrated workflows. Until then, keep the affected package disabled or in review mode.
4. Commit and protect `.github/central-agentic-ops.json` in each control repository before deploying migrated workflows.
5. Move shared precomputation into the imported resolver step and use native `noop` for expected denials.
6. Migrate every orchestrator and worker source to the shared import, protected environment, and native gh-aw authentication; compile lock files, then migrate Dashboard and Ops Publish.
7. Update installation, configuration, rollout, emergency-stop, and authentication documentation.
8. Remove bootstrap creation and runtime reads of all `CENTRAL_AGENTIC_OPS_*` variables.
9. Delete obsolete repository variables after the migrated workflows are deployed and verified in review mode.

Rollback restores the previous reviewed workflow and policy revisions together. It does not introduce variable fallback into the new resolver.

## 12. Conformance and Acceptance Criteria

An implementation conforms to version 1 when all of the following are true:

- [ ] A strict, versioned schema accepts valid control-only, target-only, and combined documents and rejects unknown, unsafe, and earlier experimental shapes including root `bundles`.
- [ ] All orchestrators and workers load control policy at their exact `github.workflow_sha`.
- [ ] Operational jobs and secrets are bound to a protected environment that permits only the protected default branch.
- [ ] Disabled packages and workers emit native `noop` before the harness starts and consume no AI Credits.
- [ ] An undeclared package or worker is disabled.
- [ ] All workers independently resolve current policy; live workers also resolve current target authority.
- [ ] Every worker supplies a static package, role, and worker identifier to shared control.
- [ ] Manual inputs can lower mode and limits but cannot raise them.
- [ ] One `control-precompute.json` contains effective policy and provenance without passing credentials through artifacts or outputs.
- [ ] The dashboard derives configured state from the policy file.
- [ ] Ops Publish derives reviewer and repository scope from the policy file.
- [ ] Source workflows, deterministic add-ons, documentation, tests, and bootstrap logic contain no runtime reads of `vars.CENTRAL_AGENTIC_OPS_*`.
- [ ] Compiled CAO lock files contain no runtime reads of `vars.CENTRAL_AGENTIC_OPS_*`.
- [ ] No CAO policy decision depends on an inherited repository, environment, organization, or enterprise Actions variable.
- [ ] Existing secret-based authentication and gh-aw-managed short-lived App token minting continue to work without App identity in policy.
- [ ] `gh aw compile --validate`, unit tests, integration tests, dashboard tests, and the documentation build pass.

Required negative tests include:

- dispatch from a feature branch with a conflicting policy file;
- a feature-branch workflow attempting to access the protected environment or operational secrets;
- missing, malformed, duplicate-key, expression-bearing, and future-version documents;
- package and worker identifier typos;
- absent package and worker entries;
- requested live mode under review policy;
- requested limits above configured ceilings;
- a disabled package and disabled worker;
- an allowlisted owner with a repository excluded by the repository list;
- an orchestrator dispatch followed by policy revocation before worker start;
- missing and mismatched live target authority;
- an earlier target authority document using root `bundles`;
- missing App identity or private key with and without an authorized fallback;
- a denied run reaching model harness startup instead of native `noop`; and
- attempts to smuggle policy through environment variables or dispatch fields.

## 13. Open Implementation Decisions

The following choices do not change the authority model and may be settled during implementation:

1. Whether the resolver implementation is embedded in the shared component or distributed as a package resource.
2. The stable reason-code vocabulary for expected denials.
3. Whether the one-time variable migration command ships in this repository or in gh-aw installation tooling.
4. Whether installation tooling creates the protected `central-agentic-ops` environment or validates an operator-created environment.

## 14. Change Log

### 0.2.0

- Replaced the standalone policy job and built-in job gating with one imported deterministic resolver step and gh-aw's native `noop` short circuit.
- Bound control policy to `github.workflow_sha`, folded provenance into `control-precompute.json`, and removed the second control-branch lookup and provenance artifact.
- Removed App identity and per-workflow AI Credit limits from CAO policy in favor of native gh-aw authentication and `max-ai-credits` ownership.

### 0.1.0

- Defined the version 1 file, authority model, runtime resolution, narrowing, security, migration, and acceptance criteria.
- Required explicit package and worker declarations, added static worker identity, defined executable provenance and environment protection, completed App dependency requirements, and separated scheduling selectors from policy ceilings.
- Established `target-authority.packages` as the only target authority shape and rejected earlier experimental `bundles` documents without runtime compatibility.