---
private: true
emoji: "🧪"
name: Dashboard Authoring Corpus
description: Synthesizes one agentic-workflow task, infers its operational value and dashboard, validates the pair, and grows a training corpus.
intent: Improve model reliability when authoring workflow-specific operational dashboards by accumulating novel, validated task, value, and dashboard examples.
on:
  schedule: weekly
  workflow_dispatch:
    inputs:
      focus:
        description: "Optional workflow persona, domain, or task family"
        required: false
        type: string
  skip-if-match: "is:pr is:open label:dashboard-authoring-corpus"
permissions:
  contents: read
  copilot-requests: write
  issues: read
  pull-requests: read
tracker-id: dashboard-authoring-corpus
max-turns: 300
max-ai-credits: 600
engine:
  id: pi
  model: copilot/gpt-5.4
strict: true
timeout-minutes: 45
concurrency:
  group: "${{ github.workflow }}"
  cancel-in-progress: false
  job-discriminator: "${{ github.run_id }}"
runtimes:
  node:
    version: "24"
network:
  allowed:
    - defaults
    - node
tools:
  bash:
    - "*"
skills:
  - .github/skills/dashboard-authoring
safe-outputs:
  create-pull-request:
    title-prefix: "[dashboard-corpus] "
    labels: [dashboard-authoring-corpus, ai-generated]
    draft: true
    if-no-changes: warn
    allowed-files:
      - ".github/skills/dashboard-authoring/corpus/index.json"
      - ".github/skills/dashboard-authoring/corpus/examples/*.json"
      - ".github/skills/dashboard-authoring/corpus/examples/*.dashboard.yml"
  noop:
features:
  gh-aw-detection: true
pre-agent-steps:
  - name: Install dashboard validator dependencies
    run: npm ci --prefix dashboard/site --ignore-scripts
evals:
  - id: synthetic-task-bounded
    question: Did the agent create exactly one bounded, novel synthetic agentic-workflow task or report a duplicate no-op?
  - id: operational-value-inferred
    question: Did the agent define a direct attainment metric, accepted evidence, maturation, zero, missing, and baseline rules without fabricating observed results?
  - id: dashboard-task-specific
    question: Did every dashboard view support operating the synthetic workflow and scope its source data to that workflow?
  - id: shared-grammar-used
    question: Did the YAML example use the same Dashboard Language grammar and semantics as the production strict JSON serialization, without format-specific vocabulary?
  - id: corpus-validated
    question: Did the agent run the deterministic corpus validator successfully before creating a pull request?
---

# Dashboard Authoring Corpus

Grow the dashboard-authoring skill's corpus by one validated example. Use the installed `dashboard-authoring` skill as the procedure and treat the Dashboard Language specification and validator as authoritative.

## Context

- Repository: `${{ github.repository }}`
- Optional focus: `${{ inputs.focus }}`
- Skill: `.github/skills/dashboard-authoring/SKILL.md`
- Corpus index: `.github/skills/dashboard-authoring/corpus/index.json`
- Specification: `docs/dashboard-language-specification.md`
- Validator: `dashboard/site/src/validator.js`

## Synthesize one task

Read the corpus index and metadata before choosing a candidate. Synthesize exactly one realistic, bounded agentic-workflow task for a repository operator. Use the optional focus when provided. The task must have a clear actor, subject, activation evidence, required effect, no-op conditions, and success conditions.

Reject a candidate whose intent, opportunity, attainment metric, or dashboard composition materially duplicates an indexed example. Call `noop` with the duplicate IDs when no novel candidate remains.

Do not create an executable workflow, grader, fabricated run, or fabricated evidence. This feature produces design examples only.

## Infer operational value

Infer a design-time contract from the task's intent. Bind each hypothetical run to a stable opportunity, enumerate accepted repository evidence and repositories, select exactly one direct metric in `[0,1]`, and define maturation, zero, and missing-evidence rules.

Use an attainment-only baseline with null value and cutoff. Synthetic tasks have no immutable pre-adoption evidence for a comparable baseline.

## Infer the dashboard

Create a YAML serialization of a Dashboard Language document for the synthetic workflow. Dashboard Language has one YAML 1.2 data model; production `dashboard.json` is a strict JSON serialization of that same grammar, not a separate schema. Use the same canonical kebab-case vocabulary, types, defaults, and semantics in both forms. Use only canonical sources and fields defined by the specification. Scope every view to the synthetic workflow with a `workflow` filter. Include only views that help an operator understand activation, execution, required effects, actionable exceptions, or operational-value attainment.

Keep the dashboard compact and deterministic. Do not add implementation-specific scripts, invented sources, measured values, or prose that claims the workflow has run.

## Validate and publish

Add one metadata/dashboard pair and update the sorted corpus index exactly as the skill requires. Run:

```text
npm --prefix dashboard/site run validate:corpus
```

If validation fails, repair the candidate and rerun it. Do not create a pull request unless validation passes. Use `create-pull-request` for exactly the new pair and index update. In the pull request body, summarize the synthetic task, value contract, selected views, duplicate check, and successful validation command.

Call `noop` when there is no novel candidate, required vocabulary cannot express the dashboard without invention, or validation cannot pass within the run.
