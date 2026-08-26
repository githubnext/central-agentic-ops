---
title: Monitor, Recover, and Maintain
description: Monitor control-plane runs, stop unsafe activity, recover from incidents, and maintain installed bundles.
---

Use this page after installation to answer the urgent operator questions: Is the control plane healthy? How do I stop it? What evidence should I collect? How do I recover safely?

| Need | Start here |
| --- | --- |
| Check scheduled runs | [Routine monitoring](#routine-monitoring) |
| Investigate cancelled or incomplete work | [Queuing and resource exhaustion](#queuing-and-resource-exhaustion) |
| Stop one worker, one bundle, or everything | [Emergency stop](#emergency-stop) |
| Respond to an unsafe output or exposed credential | [Incident response](#incident-response) |
| Add or update catalog workflows | [Maintain the catalog](#adding-a-bundle) |

For installation and the first write-free run, begin with [Install and run safely](getting-started.md).

```text
Is unsafe activity active or broadly possible?
	|
	+-- yes --> disable Actions, cancel runs, revoke credentials if needed
	|
	+-- no ---> isolate one bundle or worker, collect evidence, return to staged
```

:::danger[Stop first when scope is unclear]
If shared control, authentication, or multiple bundles may be affected, use the control-plane-wide emergency stop before investigating.
:::

## Validate Before Scheduled Live Runs

Before scheduled live operation, run one target through three manual checks:

1. `staged`: verify selection, worker completion, staged outputs, and correlation.
2. `review`: set the worker `MAX_MODE` to `review`; verify the private review destination and no target writes.
3. `live`: set the worker `MAX_MODE` to `live`; use one low-risk target and verify the declared output and downstream CI.

Record the three run URLs and restore the intended worker ceiling after the canary. A failed check returns the worker and bundle to `staged`.

Use the same bounded profile in every gate:

```yaml
target_repo: acme/disposable-canary
max_repos: 1
rollout_percent: 100
expected_target_writes:
	staged: 0
	review: 0
	live: declared outputs only
```

:::tip[Change one dimension at a time]
Keep the target and repository limits fixed while changing the mode. That makes routing differences attributable to the promotion gate rather than a different repository sample.
:::

The catalog source repository's `Staged smoke` Actions workflow automates the first check for catalog maintainers. It is repository-only test tooling and is not installed by `aw.yml`. Run it manually, select one bundle, and provide one explicit `OWNER/REPO` target. It dispatches that orchestrator with `max_repos: 1`, `rollout_percent: 100`, and `safe_output_mode: staged`, waits for the orchestrator and correlated workers, and verifies that target issue and branch snapshots remain unchanged. It has no schedule and cannot request review or live processing.

The repository-only `Enterprise canary` Actions workflow automates all three modes for catalog maintainers while keeping review and live deliberate:

1. Create repository environments named `central-agentic-ops-staged`, `central-agentic-ops-review`, and `central-agentic-ops-live`. Require reviewers for review and live; restricting deployment branches to the default branch is recommended.
2. Add `GH_AW_E2E_TOKEN` to the environments when the built-in token cannot read the target/review repository or inspect cross-repository refs and issues. Scope it only to the dedicated canary repositories and required metadata, issues, pull requests, contents, and Actions access.
3. Use dedicated disposable target and private review repositories under an allowed owner. Never point review or live canaries at production repositories.
4. For review, enter `REVIEW OWNER/REPO` in `confirmation`; for live, enter `LIVE OWNER/REPO`. Staged requires no confirmation.
5. Leave `require_output` false when a legitimate no-op is acceptable. Set it true only after preparing repository evidence that should deterministically produce a durable output. Review then requires a review-repository change; live requires a target-repository change.

The canary snapshots issues, pull requests (through the issues API), and branch refs before dispatch. Staged and review must leave the target snapshot unchanged. Review may change only its private review destination; live may change only the dedicated target. Repository snapshots are a routing guard, not semantic approval of generated content, so operators must still inspect the output and correlation metadata.

The repository-only `Enterprise staged stress` workflow sends only `2`, `3`, or `5` same-scope staged runs and requires `STRESS OWNER/REPO RUNS` confirmation plus approval through the `central-agentic-ops-stress` environment. It verifies that concurrency supersedes all but the newest run and that the target snapshot remains unchanged. Real stress remains manual because every run consumes AI Credits; `npm run test:load` supplies the CI-scale test with 100,000 synthetic repositories and no model calls.

## Routine Monitoring

Review the following for scheduled runs:

| Signal | Expected condition |
| --- | --- |
| Authentication | App token or PAT resolves without exposing credential data |
| Candidate selection | Targets match bundle discovery rules and configured limits |
| worker workflow eligibility | Installed worker workflows match and disabled worker workflows are skipped |
| safe output routing | staged mode performs no GitHub API writes, review routes privately, and live targets the selected repository |
| Correlation | worker workflow safe outputs identify the orchestrator workflow run |
| safe outputs | Type, count, branch, files, and destination stay within declarations |
| Quality | safe outputs are actionable, non-duplicative, and supported by evidence |
| Cost | AI Credits and run volume remain within workflow limits and expectations |

List recent runs from the command line when correlating orchestrators and workers:

```bash
CONTROL_REPO="acme/central-agentic-ops"

gh run list \
	--repo "$CONTROL_REPO" \
	--limit 20 \
	--json databaseId,displayTitle,event,status,conclusion,url
```

With default repository caps, one Dependabot orchestration is bounded by 850 AI Credits (250 for the orchestrator plus one 600-credit worker), and one Optimization orchestration is bounded by 1,100 AI Credits (250 plus one 350-credit auditor and one 500-credit optimizer). Declared dispatch ceilings keep deliberately expanded runs finite: at most 30,250 AI Credits for Dependabot and 10,250 for Optimization if only its highest-credit worker remains eligible. These are hard worst-case envelopes, not expected consumption. Every workflow also has a timeout and same-scope concurrency cancellation.

### Queuing and Resource Exhaustion

The control plane does not implement a durable work queue. GitHub Actions accepts workflow dispatches, while each orchestrator and each target-scoped worker uses `cancel-in-progress: true`: a newer same-scope run supersedes an older running or pending run instead of building an unbounded backlog.

API and budget failures are fail-closed:

- a discovery API failure, including rate limiting, produces no candidates and no worker dispatches, then an incomplete orchestrator report;
- a required control-source or workflow-resolution API failure stops precomputation before dispatch;
- a dispatch failure is recorded as deferred and is not retried within the same run;
- a worker that reaches an API limit, workflow AI Credit cap, or broader budget limit after startup stops additional work and reports incomplete without self-dispatch or a wait loop; if budget enforcement rejects startup, the failed Actions run is the audit record;
- work resumes only through a later scheduled run or an authorized manual run, which is a new bounded attempt.

This favors bounded failure over eventual delivery. Guaranteed eventual processing is not provided by the current workflows.

Observability imports for Sentry, Grafana, and Datadog are shared control-plane context. They do not replace GitHub Actions run history and correlation metadata as the primary execution audit trail.

## Publishing Pages Reports

### Activating Pages

Pages is not part of the Agentic Workflow package catalog. After verifying that the control repository is private and its Pages site is access-controlled, copy the conventional workflow and report scripts from a checkout pinned to the desired catalog release or commit:

```bash
control_repository=/path/to/control-repository
mkdir -p "$control_repository/.github/workflows" "$control_repository/.github/scripts/pages-report"
cp pages/pages.yml "$control_repository/.github/workflows/pages.yml"
cp .github/scripts/pages-report/*.mjs "$control_repository/.github/scripts/pages-report/"
```

:::note[Do not create `REPORT_PAGES_TOKEN`]
The Pages publisher does not use a `REPORT_PAGES_TOKEN` secret. Its build job reads report data with the automatic `github.token` and explicit job-scoped permissions. Its deploy job uses GitHub Pages OIDC with `pages: write` and `id-token: write`. If a copied workflow requests `REPORT_PAGES_TOKEN`, it did not come from the current catalog release and should be reviewed or updated rather than supplied with a PAT.
:::

:::caution[The report can contain private repository data]
The generated site includes data from its private control-plane repository, including repository identity, issue and pull request content, comments, artifact-derived summaries, workflow names and states, and run links. A private source repository does not by itself make its Pages site private. Configure Pages access control for the intended audience before the first deployment, and do not use this bundle when that boundary is unavailable.

Organization discovery excludes unrelated private repositories by default. `REPORT_INCLUDE_PRIVATE` is a boolean flag, not a credential, and there is no `REPORT_INCLUDE_TOKEN`. The current catalog workflow does not set the flag or accept a cross-repository credential, so it cannot discover unrelated private repositories out of the box.

A deliberate custom extension should mint a short-lived GitHub App token installed only on the selected repositories and grant `Metadata: read`, `Contents: read`, and `Actions: read`. The optional organization audit-log health query requires a compatible user token or fine-grained PAT with organization `Administration: read`; discovery continues without that health data when access is unavailable. Do not use a broad classic PAT.
:::

The add-on installs the following report components in the control-plane repository:

- `.github/workflows/pages.yml`, the conventional build and deployment workflow;
- `.github/scripts/pages-report/aic-usage.mjs`, the bounded AI Credit usage collector;
- `.github/scripts/pages-report/deployed-workflows.mjs`, the deployed workflow and run-health collector;
- `.github/scripts/pages-report/inventory.mjs`, the dependency-free control-plane inventory extractor;
- `.github/scripts/pages-report/report.mjs`, the trusted static renderer.

After copying the report files from the pinned catalog checkout:

1. Commit and push the installed files.
2. In **Settings > Pages**, select **GitHub Actions** as the source and apply the required access controls.
3. Run **Pages** from the repository's **Actions** page, or wait for its scheduled or repository-event trigger.
4. Verify the deployment URL and confirm that the report shows data only from the intended control-plane repository.

The workflow first runs `inventory.mjs` against the checked-out control-plane repository. It discovers manifests, bundle relationships, standalone workflows, and source/lock status, then writes normalized schema-versioned JSON to the runner's temporary directory. `report.mjs` consumes that prepared inventory and combines it with durable issues, pull requests, comments, and available review artifacts. It does not reinterpret repository workflow files. Workflow completions trigger report rebuilds but are not published as report records themselves. The renderer writes the static site and a copy of the inventory to `_site`; the workflow uploads that directory as a Pages artifact and deploys it. Generated HTML and inventory are not committed to the repository.

Report implementation changes are released through this catalog. Install the newer catalog release in the control-plane repository to refresh the packaged workflow and renderer, then review, commit, and push the resulting changes. Use `gh aw update` for installed agentic workflows that retain source tracking.

Pages report destinations are selected by the control-plane mode, while conventional GitHub Actions workflows perform the builds and deployments:

| Mode | Published result |
| --- | --- |
| `staged` | No Pages deployment. |
| `review` | Access-controlled review Pages in the private `safe_output_repo`. |
| `live` | Production Pages. |

To operate a report publisher:

1. Confirm the required source records are durable, approved for publication to the selected review or production audience, and free of data that audience must not receive.
2. Confirm the effective mode and that review routes only to `safe_output_repo` while live routes only to the production destination.
3. Confirm the build used fixed trusted source locations and the expected source revisions. Trigger inputs must not select arbitrary repositories, paths, commands, or generated site bundles.
4. Review the build and deploy jobs, including accessibility and link checks, the protected environment approval when configured, and the resulting deployment URL.
5. Verify report freshness, provenance, project-path assets, representative desktop and mobile views, and a visible review or production identity.

Review Pages must be private and access-controlled for the intended reviewers. If the repository plan or policy cannot provide that boundary, review publication fails closed. Never publish review content to a public fallback site. Agents must not receive `pages: write`, `id-token: write`, or authority to promote review content to production.

Changing a bundle to `staged` prevents new Pages deployments but does not remove an already deployed site. Changing from `live` to `review` redirects future publication to review Pages but does not unpublish production. To stop or roll back either site, disable its conventional Pages workflow, use its protected environment to block deployment, or redeploy a known-good source revision through normal repository procedures. Handle sensitive-data exposure as a Pages incident in addition to stopping the affected agentic bundle.

## Emergency Stop

Disabling GitHub Actions for the private control repository is the control-plane-wide stop. It prevents new orchestrator and worker runs from starting, including manual dispatches. A repository administrator, or an organization or enterprise administrator with authority over Actions policy, should:

:::caution[Mode changes are not an all-stop]
Changing a bundle variable cannot stop a run that has already started and does not prevent authorized manual dispatches. Disable Actions and cancel active runs when a complete stop is required.
:::

1. Open the control repository's **Settings > Actions > General** and disable Actions for the repository. An organization or enterprise administrator may instead apply an Actions policy that disables the repository.
2. Cancel every queued or running orchestrator and worker run from the repository's **Actions** page. Disabling future execution does not replace canceling work that has already started.
3. Revoke the GitHub App installation or PAT when credentials may be exposed or when repository access must be removed independently of Actions execution.
4. Record the stop time, initiating administrator, reason, active correlation IDs, affected targets, and any safe outputs already created.
5. Verify that the control repository has no queued or in-progress runs and that no new run can be manually dispatched.

This is intentionally a GitHub-native administrative control rather than a workflow variable. A variable is evaluated only after a workflow starts and therefore cannot be the authoritative stop for all execution.

The stop applies to one central control repository. In a deployment with an enterprise control repository and additional organization control repositories, an enterprise incident commander must identify and stop every participating control repository that falls within the incident scope.

There is no global workflow-level kill switch across independent control repositories. Keep the approved control-repository inventory available outside any one runtime so incident commanders can enumerate affected installations even when a repository is unavailable. For each affected runtime, disable Actions, cancel active runs, and revoke its credential independently.

Use narrower controls when a full stop is unnecessary:

| Scope | Control | Limitation |
| --- | --- | --- |
| One scheduled bundle | Clear its recognized mode or set it to an unrecognized value | Stops scheduled selection and worker workflow dispatch, but `workflow_dispatch` runs remain possible. |
| One Orchestrator or worker workflow | Disable that workflow in GitHub Actions | Other enabled workflows can continue. |
| Repository credentials | Revoke the App installation or PAT | Does not itself prevent runs that can use another available credential. |
| Entire control plane | Disable Actions for the control repository and cancel active runs | Also stops unrelated Actions workflows in that repository. |

To resume after an all-stop:

1. Resolve the incident and rotate or narrow credentials when needed.
2. Set every installed bundle to `staged`.
3. Re-enable Actions for the control repository.
4. Run one `workflow_dispatch` target with `max_repos: 1` and verify routing, permissions, and safe outputs.
5. Promote each bundle independently through the normal review gates.

## Incident Response

For unexpected writes, unsafe routing, excessive dispatch, or credential concerns:

1. Use the [emergency stop](#emergency-stop) when the incident affects shared control, authentication, or multiple bundles.
2. Otherwise, move the affected bundle to staged mode or clear its recognized mode and disable a specific worker workflow when the incident is worker-local.
3. Cancel active orchestrator and worker runs; mode changes do not alter runs already in progress.
4. Revoke or rotate credentials when exposure is possible.
5. Trace `correlation_id`, `central_repo`, and `control_plane_run_url` across safe outputs.
6. Record affected targets and safe outputs.
7. Revert or close safe outputs through normal repository procedures.
8. Fix and compile the affected workflows.
9. Resume with a one-repository staged run, then review, before returning to live.

Capture enough evidence to reconstruct the boundary and the outcome:

```yaml
stopped_at: 2026-08-25T14:30:00Z
central_repo: acme/central-agentic-ops
bundle: optimization
correlation_ids:
	- optimization-2026-08-25-001
affected_targets:
	- acme/example-service
safe_outputs:
	- https://github.com/acme/example-service/issues/123
credential_action: app-installation-revoked
```

Do not include tokens, private keys, or secret values in the incident record.

If shared authentication or shared control caused the incident, perform the control-plane-wide emergency stop. Otherwise, preserve unaffected bundle operation.

### Catalog Release Revocation

A catalog maintainer cannot remotely disable workflows already installed in independent control repositories. When a package release is unsafe:

1. publish the affected release or commit and a known-good replacement;
2. identify installations through package manifests and the approved control-repository inventory;
3. move affected bundles to `staged` and cancel active runs in every installation;
4. revoke credentials when repository access must stop immediately;
5. pin or restore the known-good package revision, compile affected workflows, and validate one staged target;
6. update projected catalog versions and lifecycle status after validation;
7. resume each runtime through review and limited-live promotion.

Removing or retagging the catalog source does not revoke installed files. Revocation is complete only after every affected runtime is stopped, repaired, or has its repository access removed.

## Adding a Bundle

A new bundle should:

1. Define an orchestrator with a schedule and manual inputs.
2. Add an independent mode installer variable; review safe outputs default to the control-plane repository.
3. Import `shared/control.md` as `role: orchestrator` with those variables.
4. Pass a stable lowercase bundle slug to shared control and document the matching target authority entry.
5. Keep GitHub tools read-only.
6. Declare only worker workflow dispatches as orchestrator workflow safe outputs.
7. Document discovery, ranking, dispatch, completion, and no-op behavior.
8. Start in staged mode and complete all promotion gates independently.

## Adding a Worker

A new worker should:

1. Require the standard control envelope inputs.
2. Import `shared/control.md` as `role: worker` with the same stable bundle slug as its orchestrator.
3. Use a target checkout separate from the safe-output repository when needed.
4. Request minimum permissions, tools, network access, and AI credits.
5. Declare narrow safe outputs with explicit count, file, branch, and destination limits.
6. Avoid repository discovery and downstream dispatch.
7. Support staged and review modes before live operation.
8. Be added to exactly the orchestrators that are allowed to dispatch it.
9. Receive a worker ceiling when its risk or maturity differs from its bundle peers.

## Change Validation

Control changes should be validated with the pinned minimum `gh-aw` version. Compile every executable workflow affected by shared imports, not only the directly edited file. Then check:

```bash
npm test
npm run test:load
npm run compile
npm run docs:build
git diff --check
```

- zero compile errors and warnings;
- no duplicated workflow-local authentication blocks;
- package manifests and docs agree on variables and modes;
- staged and review routing remain fail closed;
- worker safe-output limits remain intact;
- `git diff --check` passes;
- compile-generated metadata is handled according to repository policy.

Do not promote a control change and a new high-risk worker to live in the same step. Validate shared policy first, then promote worker behavior separately.
