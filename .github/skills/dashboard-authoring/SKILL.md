---
name: dashboard-authoring
description: Define one agentic-workflow dashboard intent and its operational-value contract.
---

# Dashboard Authoring

Create one dashboard that helps an operator decide whether a specific agentic workflow is running, producing accepted outcomes, and attaining its intended operational value.

## Procedure

1. Define one bounded workflow task and a concise, outcome-oriented intent.
2. Derive activation, required-effect, no-op, success, and uncertainty conditions.
3. Infer a design-time operational-value contract:
   - bind each run to one stable opportunity;
   - name accepted repository evidence and evidence repositories;
   - choose one direct attainment metric in `[0,1]`;
   - define maturation, zero, and missing-evidence rules;
   - use `attainment-only` unless immutable pre-adoption evidence supports a comparable baseline.
4. Define a compact dashboard intent with no more than four essential views per page. Prefer an operational summary, actionable findings, outcomes, and an operational-value trend.
5. Pass the intent and operational-value contract to `generate-dashboard-ir` with the provided Dashboard Language specification and validator.

## Package file convention

- Store an operation package's production Dashboard Language document at `<package>/dashboard.json`.
- Declare it in `<package>/aw.yml` as a resource whose destination is `.github/aw/dashboards/<package>.json`, where `<package>` is the package's canonical identifier.
- Keep each package dashboard independently valid. The dashboard package bundles installed `.github/aw/dashboards/*.json` documents into the single deployed `dashboard.json` that the browser loads.
- Do not add package pages directly to `dashboard/site/dashboard.json`; that file contains the built-in dashboard configuration.
