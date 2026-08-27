<!-- Advisory outputs are advisory and non-binding. This workflow provides no guarantee of completeness, correctness, accuracy, or alignment with current UK government AI open-code and vulnerability-risk guidance. -->

# Advisory

> [!WARNING]
> Advisory outputs are non-binding. They are not a security assessment, accreditation, or authorization to open, restrict, hide, or decommission code. They provide no guarantee of completeness, correctness, accuracy, or alignment with current UK government guidance. Human review against authoritative sources is required.

The Advisory package applies the UK government [AI open-code and vulnerability-risk guidance for the public sector](https://www.gov.uk/guidance/ai-open-code-and-vulnerability-risk-in-the-public-sector) from a private Central Agentic Ops control repository. It uses recent changes and available security evidence to identify operational-resilience gaps; it cannot observe every organizational, deployment, incident, or confidential control.

## Package Contents

| Workflow | Responsibility |
| --- | --- |
| [`advisory`](../.github/workflows/advisory.md) | Discovers, ranks, selects, and dispatches repository-level work. |
| [`advisory-uk-ai-operational-resilience`](../.github/workflows/advisory-uk-ai-operational-resilience.md) | Produces one evidence-backed, non-binding operational resilience advisory for a selected repository. |

The orchestrator dispatches at most 50 workers per run. Each worker uses a fixed seven-day lookback, treats proposed A/B/C/D tiers as human-review priorities rather than authorization, and creates at most one consolidated issue through declared safe outputs.

## Install and Configure

```bash
gh aw add-wizard githubnext/central-agentic-ops/advisory@<catalog-release>
```

Configure the shared GitHub App or PAT described in the [authentication guide](../docs/authentication.md). Start with one representative repository and:

- `CENTRAL_AGENTIC_OPS_ADVISORY_MODE=staged`
- `CENTRAL_AGENTIC_OPS_ADVISORY_MAX_REPOS=1`
- `CENTRAL_AGENTIC_OPS_ADVISORY_ROLLOUT_PERCENT=100`
- `CENTRAL_AGENTIC_OPS_ADVISORY_UK_AI_OPERATIONAL_RESILIENCE_ENABLED=true`
- `CENTRAL_AGENTIC_OPS_ADVISORY_UK_AI_OPERATIONAL_RESILIENCE_MAX_MODE=staged`

Run the **Advisory** workflow manually with an explicit `target_repo`, `max_repos` set to `1`, and `safe_output_mode` set to `staged`. Review repository selection, the worker's staged issue, source accessibility, sensitive-data handling, and control-plane correlation before promoting to `review` or `live`.

## Safety Boundaries

- The orchestrator selects repositories but performs no target analysis.
- The worker reads one target and cannot discover or dispatch to other repositories.
- Repository content and metadata are untrusted evidence, never control-plane policy.
- Missing required guidance or repository evidence makes a run incomplete; the workflow does not guess.
- Safe outputs contain no secrets, exploit details, personal data, private advisories, or confidential incident evidence.
- Findings do not authorize opening, restricting, hiding, or decommissioning code.
- Review mode routes the issue to a private review repository; live mode creates it in the selected target.
- Operational-value evaluation is pending post-adoption evidence and is not represented by a placeholder grader.
