# Control Operations

## Installation

Install the full catalog or an individual bundle into a private central control repository. Use an enterprise-operated repository hosted in a designated organization for cross-organization scope, or an organization-operated repository for organization scope. The installer configures:

- optional GitHub App credentials;
- optional fine-grained PAT authentication;
- independent bundle modes, defaulting to staged;
- independent private review repositories;
- Copilot authentication and generated workflows;
- no Pages publisher by default; Pages is an explicit add-on.

GitHub Actions always provides the control repository's `GITHUB_TOKEN`. That token is sufficient for bounded staged scans of public repositories, so an App or PAT is optional for that profile. Configure an App or PAT before reading private or internal targets, using an alternate review repository, or enabling live target writes. Keep the control-plane repository private and restrict administration of Actions secrets, variables, environments, and workflow files.

## Initial Activation

For each installed bundle:

1. Confirm App or PAT repository coverage and least-privilege permissions, or explicitly choose the public read-only profile and verify every target is public.
2. Confirm the generated orchestrator and worker workflows are present and enabled.
3. Confirm the private control-plane repository is suitable for review safe outputs. For a manual review run that needs another private destination, supply `safe_output_repo`. Do not install Pages unless the repository and Pages site are access-controlled.
4. Trigger a staged mode `workflow_dispatch` run against one representative `target_repo` with `max_repos: 1`.
5. Inspect the orchestrator workflow's candidate selection and worker workflow eligibility summary.
6. Inspect worker workflow prompts, staged safe outputs, correlation data, and AI Credit use.
7. Continue through the promotion plan in [Rollout and safe output Routing](rollout-and-routing.md).

### Production Canary

Before scheduled live operation, run one target through three manual checks:

1. `staged`: verify selection, worker completion, staged outputs, and correlation.
2. `review`: set the worker `MAX_MODE` to `review`; verify the private review destination and no target writes.
3. `live`: set the worker `MAX_MODE` to `live`; use one low-risk target and verify the declared output and downstream CI.

Record the three run URLs and restore the intended worker ceiling after the canary. A failed check returns the worker and bundle to `staged`.

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

With default repository caps, one Dependabot orchestration is bounded by 850 AI Credits (250 for the orchestrator plus one 600-credit worker), and one Optimization orchestration is bounded by 1,100 AI Credits (250 plus one 350-credit auditor and one 500-credit optimizer). Declared dispatch ceilings keep deliberately expanded runs finite: at most 30,250 AI Credits for Dependabot and 10,250 for Optimization if only its highest-credit worker remains eligible. These are hard worst-case envelopes, not expected consumption. Every workflow also has a timeout and same-scope concurrency cancellation.

### Queuing and Resource Exhaustion

The control plane does not implement a durable work queue. GitHub Actions accepts workflow dispatches, while each orchestrator and each target-scoped worker uses `cancel-in-progress: true`: a newer same-scope run supersedes an older running or pending run instead of building an unbounded backlog.

API and budget failures are fail-closed:

- a discovery API failure, including rate limiting, produces no candidates and no worker dispatches, then an incomplete orchestrator report;
- a required control-source or workflow-resolution API failure stops precomputation before dispatch;
- a dispatch failure is recorded as deferred and is not retried within the same run;
- a worker that reaches an API limit, workflow AI Credit cap, or broader budget limit after startup stops additional work and reports incomplete without self-dispatch or a wait loop; if budget enforcement rejects startup, the failed Actions run is the audit record;
- work resumes only through a later scheduled run or an authorized manual run, which is a new bounded attempt.

This favors bounded failure over eventual delivery. Operations that require guaranteed eventual processing need a separately governed durable queue with deduplication, attempt limits, not-before timestamps, dead-letter handling, and budget/rate-limit admission checks; those capabilities are not provided by the current workflows.

Observability imports for Sentry, Grafana, and Datadog are shared control-plane context. They do not replace GitHub Actions run history and correlation metadata as the primary execution audit trail.

## Publishing Pages Reports

### Activating Pages

Pages is not part of the core catalog. After verifying that the control repository is private and its Pages site is access-controlled, install the view explicitly:

```bash
gh aw add-wizard githubnext/central-agentic-ops/pages@<catalog-release>
```

The add-on installs the following report components in the control-plane repository:

- `.github/workflows/pages.yml`, the conventional build and deployment workflow;
- `.github/skills/github-pages-report/SKILL.md`, the report authoring and review guidance;
- `.github/skills/github-pages-report/inventory.mjs`, the dependency-free control-plane inventory extractor;
- `.github/skills/github-pages-report/report.mjs`, the trusted static renderer.

After running `gh aw add-wizard githubnext/central-agentic-ops@<catalog-release>`:

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

1. Open the control repository's **Settings > Actions > General** and disable Actions for the repository. An organization or enterprise administrator may instead apply an Actions policy that disables the repository.
2. Cancel every queued or running orchestrator and worker run from the repository's **Actions** page. Disabling future execution does not replace canceling work that has already started.
3. Revoke the GitHub App installation or PAT when credentials may be exposed or when repository access must be removed independently of Actions execution.
4. Record the stop time, initiating administrator, reason, active correlation IDs, affected targets, and any safe outputs already created.
5. Verify that the control repository has no queued or in-progress runs and that no new run can be manually dispatched.

This is intentionally a GitHub-native administrative control rather than a workflow variable. A variable is evaluated only after a workflow starts and therefore cannot be the authoritative stop for all execution.

The stop applies to one central control repository. In a deployment with an enterprise control repository and additional organization control repositories, an enterprise incident commander must identify and stop every participating control repository that falls within the incident scope.

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

If shared authentication or shared control caused the incident, perform the control-plane-wide emergency stop. Otherwise, preserve unaffected bundle operation.

## Adding a Bundle

A new bundle should:

1. Define an orchestrator with a schedule and manual inputs.
2. Add an independent mode installer variable; review safe outputs default to the control-plane repository.
3. Import `shared/control.md` as `role: orchestrator` with those variables.
4. Keep GitHub tools read-only.
5. Declare only worker workflow dispatches as orchestrator workflow safe outputs.
6. Document discovery, ranking, dispatch, completion, and no-op behavior.
7. Start in staged mode and complete all promotion gates independently.

## Adding a Worker

A new worker should:

1. Require the standard control envelope inputs.
2. Import `shared/control.md` as `role: worker`.
3. Use a target checkout separate from the safe-output repository when needed.
4. Request minimum permissions, tools, network access, and AI credits.
5. Declare narrow safe outputs with explicit count, file, branch, and destination limits.
6. Avoid repository discovery and downstream dispatch.
7. Support staged and review modes before live operation.
8. Be added to exactly the orchestrators that are allowed to dispatch it.
9. Receive a worker ceiling when its risk or maturity differs from its bundle peers.

## Change Validation

Control changes should be validated with the pinned minimum `gh-aw` version. Compile every executable workflow affected by shared imports, not only the directly edited file. Then check:

- zero compile errors and warnings;
- no duplicated workflow-local authentication blocks;
- package manifests and docs agree on variables and modes;
- staged and review routing remain fail closed;
- worker safe-output limits remain intact;
- `git diff --check` passes;
- compile-generated metadata is handled according to repository policy.

Do not promote a control change and a new high-risk worker to live in the same step. Validate shared policy first, then promote worker behavior separately.
