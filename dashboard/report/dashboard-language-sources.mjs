import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourceNames = [
  "organizations",
  "repositories",
  "workflows",
  "runs",
  "experiments",
  "experiment-assignments",
  "graders",
  "grader-observations",
  "evals",
  "eval-observations",
  "usage",
  "coverage-diagnostics",
  "outcomes",
  "findings",
  "operational-values",
];

function repositoryParts(repository = "") {
  const [organization = "", name = ""] = repository.split("/");
  return { organization, repository: name };
}

function rolloutMode(value) {
  const match = String(value || "").match(/(?:^|\s[·|:\-]\s)(review|live)$/i);
  return match?.[1]?.toLowerCase() || (["review", "live"].includes(value) ? value : "unknown");
}

function runConclusion(value) {
  const normalized = String(value || "unknown").replaceAll("_", "-");
  return [
    "success", "failure", "cancelled", "timed-out", "action-required",
    "neutral", "skipped", "stale", "startup-failure",
  ].includes(normalized) ? normalized : "unknown";
}

function link(relation, href, label) {
  return typeof href === "string" && href.startsWith("https://")
    ? { relation, href, label }
    : undefined;
}

function workflowRunUrl(repository, runId) {
  const parts = String(repository || "").split("/");
  const id = String(runId ?? "");
  return parts.length === 2 && parts.every(Boolean) && /^\d+$/.test(id)
    ? `https://github.com/${parts[0]}/${parts[1]}/actions/runs/${id}`
    : undefined;
}

function sourceMetadata(name, generatedAt, available, complete) {
  return {
    "source-id": `central-agentic-ops-${name}`,
    "source-kind": "github",
    "as-of": generatedAt,
    "retrieved-at": generatedAt,
    completeness: complete ? "complete" : "partial",
    freshness: available ? "fresh" : "unknown",
    availability: available ? "available" : "unavailable",
  };
}

function source(name, rows, generatedAt, available = true, complete = true) {
  return {
    source: name,
    rows,
    metadata: sourceMetadata(name, generatedAt, available, complete),
  };
}

function coverageDiagnosticRows(deployed, usage) {
  const diagnostics = [];
  if (!deployed.includePrivate) diagnostics.push({
    title: "Private repository discovery is off",
    effect: "Private repositories are excluded from workflow inventory and run-health totals.",
  });
  if (!deployed.runHealth?.available) diagnostics.push({
    title: "Run telemetry is unavailable",
    effect: "Run status and failure counts cannot be determined.",
  });
  else if (!deployed.runHealth.complete) diagnostics.push({
    title: "Run telemetry is partial",
    effect: "Run status totals cover only the Actions data returned within the configured audit limit.",
  });
  if (!usage.available) diagnostics.push({
    title: "AIC telemetry is unavailable",
    effect: "AI Credit totals cannot be calculated from the retained usage artifacts.",
  });
  else if (!usage.complete) diagnostics.push({
    title: "AIC telemetry is partial",
    effect: "AI Credit totals exclude runs whose usage artifacts could not be collected.",
  });
  return diagnostics;
}

function packageMemberships(deployed) {
  const memberships = new Map();
  for (const bundle of deployed.bundles || []) {
    for (const workflow of bundle.workflows || []) {
      const key = `${bundle.repository}:${workflow.lockPath}`;
      const membership = {
        id: bundle.path?.replace(/\/aw\.yml$|^aw\.yml$/g, "") || bundle.name,
        name: bundle.name,
      };
      const workflowMemberships = memberships.get(key) || [];
      if (!workflowMemberships.some((candidate) => candidate.id === membership.id)) {
        workflowMemberships.push(membership);
        workflowMemberships.sort((left, right) => left.name.localeCompare(right.name));
        memberships.set(key, workflowMemberships);
      }
    }
  }
  return memberships;
}

function inventoryWorkflowDetails(inventory = {}, controlSettings = {}) {
  const details = new Map();
  for (const workflow of inventory.workflows || []) {
    for (const workflowPath of [workflow.sourcePath, workflow.lockPath].filter(Boolean)) {
      details.set(workflowPath, {
        maxAiCredits: workflow.maxAiCredits,
        inventoryReady: workflow.compiled,
      });
    }
  }
  for (const bundle of inventory.bundles || []) {
    const configuredMode = rolloutMode(controlSettings.packages?.[bundle.controlPackage]?.mode);
    const workers = bundle.workers || [];
    const ready = bundle.compiled === true
      && (bundle.missingWorkers || []).length === 0
      && workers.every((worker) => worker.compiled !== false);
    const inventoryWarnings = (bundle.compiled === true ? 0 : 1) + (bundle.missingWorkers || []).length;
    const packageAllowance = [bundle.maxAiCredits, ...workers.map((worker) => worker.maxAiCredits)]
      .filter((value) => Number.isFinite(value) && value > 0)
      .reduce((total, value) => total + value, 0);
    const packageWorkflows = [
      { sourcePath: bundle.workflow, lockPath: bundle.workflow?.replace(/\.md$/, ".lock.yml"), maxAiCredits: bundle.maxAiCredits },
      ...workers,
    ];
    for (const workflow of packageWorkflows) {
      for (const workflowPath of [workflow.sourcePath, workflow.lockPath].filter(Boolean)) {
        details.set(workflowPath, {
          ...details.get(workflowPath),
          maxAiCredits: workflow.maxAiCredits ?? details.get(workflowPath)?.maxAiCredits,
          inventoryReady: ready,
          packageInventoryWarnings: inventoryWarnings,
          packageAllowance: packageAllowance > 0 ? packageAllowance : null,
          packageWorkerCount: workers.length,
          ...(configuredMode !== "unknown" ? { configuredMode } : {}),
        });
      }
    }
  }
  return details;
}

function workflowRows(deployed, generatedAt, inventory, controlSettings) {
  const memberships = packageMemberships(deployed);
  const inventoryDetails = inventoryWorkflowDetails(inventory, controlSettings);
  return (deployed.workflows || []).map((workflow) => {
    const names = repositoryParts(workflow.repository);
    const workflowMemberships = memberships.get(`${workflow.repository}:${workflow.path}`) || [];
    const membership = workflowMemberships.at(-1);
    const details = inventoryDetails.get(workflow.path);
    const recentMode = rolloutMode(workflow.runHealth?.runRecords?.[0]?.displayTitle);
    return {
      ...names,
      ...(membership ? { package: membership.id, "package-name": membership.name } : {}),
      ...(workflowMemberships.length > 0 ? { "package-memberships": workflowMemberships } : {}),
      ...(Number.isFinite(details?.maxAiCredits) ? { "max-ai-credits": details.maxAiCredits } : {}),
      ...(Number.isFinite(details?.packageAllowance) ? { "package-aic-allowance": details.packageAllowance } : {}),
      ...(Number.isFinite(details?.packageWorkerCount) ? { "package-worker-count": details.packageWorkerCount } : {}),
      ...(Number.isFinite(details?.packageInventoryWarnings) ? { "package-inventory-warnings": details.packageInventoryWarnings } : {}),
      ...(typeof details?.inventoryReady === "boolean" ? { "inventory-ready": details.inventoryReady } : {}),
      "workflow-role": workflow.role || (membership ? "worker" : "standalone"),
      workflow: workflow.path?.replace(/\.lock\.yml$/, ".md") || "",
      "workflow-name": workflow.name || workflow.path || "Unknown workflow",
      "workflow-active": workflow.state === "active"
        ? "true"
        : String(workflow.state).startsWith("disabled") ? "false" : "unknown",
      "rollout-mode": details?.configuredMode || recentMode,
      "observed-at": workflow.updatedAt || generatedAt,
    };
  });
}

function runRows(deployed) {
  const rows = new Map();
  for (const workflow of deployed.workflows || []) {
    const names = repositoryParts(workflow.repository);
    for (const run of workflow.runHealth?.runRecords || []) {
      const key = `${workflow.repository}:${run.runId}`;
      rows.set(key, {
        ...names,
        workflow: workflow.path?.replace(/\.lock\.yml$/, ".md") || "",
        run: String(run.runId),
        event: run.event || "unknown",
        "run-title": run.displayTitle || `Run ${run.runId}`,
        "started-at": run.startedAt || run.createdAt,
        "ended-at": run.status === "completed" ? run.updatedAt : undefined,
        "run-status": run.status === "in_progress" ? "in-progress" : run.status || "unknown",
        "run-conclusion": runConclusion(run.conclusion),
        "rollout-mode": rolloutMode(run.displayTitle),
        engine: "unknown",
        "requested-model": "unknown",
        "resolved-model": "unknown",
        "run-link": link("run", `https://github.com/${workflow.repository}/actions/runs/${run.runId}`, `View run ${run.runId}`),
      });
    }
  }
  return [...rows.values()];
}

function usageRows(usage) {
  return (usage.runs || []).map((run, index) => ({
    ...repositoryParts(run.repository),
    workflow: run.workflowPath?.replace(/\.lock\.yml$/, ".md") || run.workflowName || "",
    run: String(run.runId),
    invocation: `${run.repository}:${run.runId}:${index}`,
    engine: "unknown",
    "requested-model": "unknown",
    "resolved-model": "unknown",
    "rollout-mode": run.mode || "unknown",
    "input-tokens": null,
    "output-tokens": null,
    "cache-read-tokens": null,
    "cache-write-tokens": null,
    "reasoning-tokens": null,
    aic: run.aic,
    "observed-at": run.createdAt || usage.generatedAt,
    "run-link": link("run", workflowRunUrl(run.repository, run.runId), `Run ${run.runId}`),
  }));
}

function recordLink(record, relation) {
  const expectedKind = relation === "issue" ? "issue" : "pull-request";
  return record.kind === expectedKind ? link(relation, record.url, `View ${relation.replaceAll("-", " ")}`) : undefined;
}

function findingRows(records) {
  return records.map((record) => ({
    ...repositoryParts(record.repository),
    workflow: record.workflowPath?.replace(/\.lock\.yml$/, ".md") || record.workflow || "",
    run: String(record.runUrl?.match(/\/runs\/(\d+)/)?.[1] || ""),
    finding: record.id,
    "finding-kind": record.warning ? "authored-warning" : "record",
    "finding-severity": record.warning ? "medium" : "informational",
    "finding-status": record.state === "open" ? "open" : record.state === "closed" ? "resolved" : "unknown",
    "finding-summary": record.summary || record.title,
    "observed-at": record.updatedAt || record.createdAt,
    "issue-link": recordLink(record, "issue"),
    "pull-request-link": recordLink(record, "pull-request"),
    "run-link": link("run", record.runUrl, "View workflow run"),
    "external-link": link("external", record.url, "View output"),
  }));
}

function outcomeRows(records) {
  return records.map((record) => ({
    ...repositoryParts(record.repository),
    "runtime-repository": record.runtimeRepository || record.repository,
    ...(record.bundle ? { package: record.bundle } : {}),
    workflow: record.workflowPath?.replace(/\.lock\.yml$/, ".md") || record.workflow || "",
    "workflow-name": record.workflow || record.workflowPath?.replace(/\.lock\.yml$/, ".md") || "Unknown workflow",
    run: String(record.runUrl?.match(/\/runs\/(\d+)/)?.[1] || ""),
    "safe-output": record.id,
    "outcome-title": record.title || record.id,
    "outcome-summary": record.summary || "",
    "outcome-body-html": record.bodyHtml || "",
    "outcome-category": record.kind || "unknown",
    "outcome-status": record.state || "unknown",
    "outcome-state": record.state === "closed"
      ? "lifecycle-close"
      : record.kind === "noop" ? "ignored" : "pending",
    "evidence-strength": record.kind === "review-bundle" ? "proposal" : "durable",
    "rollout-mode": rolloutMode(record.mode),
    "published-at": record.createdAt,
    "observed-at": record.updatedAt || record.createdAt,
    "issue-link": recordLink(record, "issue"),
    "pull-request-link": recordLink(record, "pull-request"),
    "run-link": link("run", record.runUrl, "View workflow run"),
    "external-link": link("external", record.url, "View output"),
  }));
}

function operationalValueRows(values) {
  return (values.records || []).filter((record) => record.observation).map((record) => {
    const target = record.observation.case?.targetRepo || record.observation.subject?.repository || record.repository;
    return {
      ...repositoryParts(target),
      workflow: record.workflowPath?.replace(/\.lock\.yml$/, ".md") || record.workflowId || "",
      run: String(record.runId),
      experiment: record.observation.experiment || "",
      "operational-case": record.observation.opportunityKey || record.workflowId || "unknown",
      "evaluator-digest": record.evaluatorDigest || "",
      "rollout-mode": "unknown",
      "operational-value": record.value,
      "operational-value-definition": record.workflowId || "operational-value",
      "requested-evidence-at": record.observation.subject?.createdAt || record.observation.evidenceAt,
      "evidence-cutoff": record.observation.evidenceAt,
      "maturity-at": record.observation.maturesAt || record.observation.evidenceAt,
      "maturity-status": record.observation.mature ? "matured" : "interim",
      "baseline-value": record.baselineValue,
      "delta-from-baseline": record.deltaFromBaseline,
      "observed-at": record.observation.evidenceAt,
      "evidence-link": link("evidence", record.runUrl, `View run ${record.runId}`),
      "run-link": link("run", record.runUrl, `Run ${record.runId}`),
    };
  });
}

function operationalValueGraderRows(values) {
  return (values.records || []).map((record) => {
    const target = record.observation?.case?.targetRepo
      || record.observation?.subject?.repository
      || record.repository;
    return {
      ...repositoryParts(target),
      workflow: record.workflowPath?.replace(/\.lock\.yml$/, ".md") || record.workflowId || "",
      run: record.runId == null ? "Unavailable" : String(record.runId),
      grader: record.workflowId || "Unknown workflow",
      status: record.status || "unavailable",
      value: record.value,
      "maturity-status": !record.observation
        ? "unavailable"
        : record.observation.mature ? "matured" : "interim",
      "baseline-value": record.baselineValue,
      "delta-from-baseline": record.deltaFromBaseline,
      "evaluator-digest": record.evaluatorDigest || "",
      "observed-at": record.observation?.evidenceAt || record.run?.createdAt,
      "run-link": link(
        "run",
        record.runUrl || workflowRunUrl(record.repository, record.runId),
        `Run ${record.runId}`,
      ),
    };
  });
}

export function buildDashboardLanguageSources({ deployed, usage, operationalValues, report, inventory = {}, controlSettings = {} }) {
  const generatedAt = report.generatedAt || deployed.generatedAt || new Date().toISOString();
  const workflows = workflowRows(deployed, generatedAt, inventory, controlSettings);
  const runs = runRows(deployed);
  const records = report.records || [];
  const values = operationalValueRows(operationalValues);
  const graderObservations = operationalValueGraderRows(operationalValues);
  const repositories = new Map();
  for (const row of [...workflows, ...runs, ...findingRows(records), ...values]) {
    if (!row.organization || !row.repository) continue;
    repositories.set(`${row.organization}/${row.repository}`, {
      organization: row.organization,
      repository: row.repository,
      "repository-name": row.repository,
      "rollout-mode": row["rollout-mode"] || "unknown",
      "observed-at": row["observed-at"] || generatedAt,
    });
  }
  const organizations = [...new Set([...repositories.values()].map((row) => row.organization))].map((organization) => ({
    organization,
    "organization-name": organization,
    "observed-at": generatedAt,
  }));
  const discoveryAvailable = deployed.discovery?.complete !== false;
  const runAvailable = deployed.runHealth?.available === true;
  const runComplete = deployed.runHealth?.complete === true;
  const usageAvailable = usage.available === true;
  const usageComplete = usage.complete === true;
  const valueAvailable = operationalValues.records !== undefined;

  const sources = Object.fromEntries(sourceNames.map((name) => [name, source(name, [], generatedAt, false, false)]));
  sources.organizations = source("organizations", organizations, generatedAt, discoveryAvailable, deployed.discovery?.complete === true);
  sources.repositories = source("repositories", [...repositories.values()], generatedAt, discoveryAvailable, deployed.discovery?.complete === true);
  sources.workflows = source("workflows", workflows, generatedAt, discoveryAvailable, deployed.discovery?.complete === true);
  sources.runs = source("runs", runs, generatedAt, runAvailable, runComplete);
  if (Number.isFinite(deployed.runHealth?.windowHours) && deployed.runHealth.windowHours > 0) {
    sources.runs.metadata["coverage-end"] = generatedAt;
    sources.runs.metadata["coverage-start"] = new Date(
      Date.parse(generatedAt) - deployed.runHealth.windowHours * 3_600_000,
    ).toISOString();
  }
  sources.usage = source("usage", usageRows(usage), generatedAt, usageAvailable, usageComplete);
  sources["coverage-diagnostics"] = source(
    "coverage-diagnostics",
    coverageDiagnosticRows(deployed, usage),
    generatedAt,
  );
  sources.outcomes = source("outcomes", outcomeRows(records), generatedAt);
  sources.findings = source("findings", findingRows(records), generatedAt);
  sources["grader-observations"] = source("grader-observations", graderObservations, generatedAt, valueAvailable, true);
  sources["operational-values"] = source("operational-values", values, generatedAt, valueAvailable, true);
  return sources;
}

async function main() {
  const deployedPath = process.env.REPORT_DEPLOYED_WORKFLOWS;
  const usagePath = process.env.REPORT_AIC_USAGE;
  const operationalValuesPath = process.env.REPORT_OPERATIONAL_VALUES;
  const reportPath = process.env.REPORT_RECORDS;
  const inventoryPath = process.env.REPORT_INVENTORY;
  const controlSettingsPath = process.env.REPORT_CONTROL_SETTINGS;
  const outputPath = process.env.REPORT_DASHBOARD_SOURCES;
  if (!deployedPath || !usagePath || !operationalValuesPath || !reportPath || !inventoryPath || !controlSettingsPath || !outputPath) {
    throw new Error("REPORT_DEPLOYED_WORKFLOWS, REPORT_AIC_USAGE, REPORT_OPERATIONAL_VALUES, REPORT_RECORDS, REPORT_INVENTORY, REPORT_CONTROL_SETTINGS, and REPORT_DASHBOARD_SOURCES are required");
  }
  const [deployed, usage, operationalValues, report, inventory, controlSettings] = await Promise.all(
    [deployedPath, usagePath, operationalValuesPath, reportPath, inventoryPath, controlSettingsPath]
      .map(async (file) => JSON.parse(await readFile(file, "utf8"))),
  );
  const sources = buildDashboardLanguageSources({ deployed, usage, operationalValues, report, inventory, controlSettings });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(sources, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
