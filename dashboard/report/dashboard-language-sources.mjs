import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { actionsLog as log } from "../../activity/actions-log.mjs";
import { firstText } from "./text-utils.mjs";

const sourceNames = [
  "organizations",
  "repositories",
  "workflows",
  "runs",
  "run-performance",
  "job-performance",
  "experiments",
  "experiment-assignments",
  "graders",
  "grader-observations",
  "evals",
  "eval-observations",
  "usage",
  "security-observations",
  "coverage-diagnostics",
  "repository-coverage",
  "outcomes",
  "findings",
  "operational-values",
];
const AIC_TO_USD = 0.01;

function repositoryParts(repository = "") {
  const [organization = "", name = ""] = repository.split("/");
  return { organization, repository: name };
}

export function parseRolloutMode(value) {
  const text = String(value ?? "").trim();
  if (!text) return "unknown";
  const normalized = text.toLowerCase();
  if (normalized === "review" || normalized === "live") return normalized;
  const match = normalized.match(/(?:^|[^a-z0-9])((review|live))\s*$/i);
  return match?.[1]?.toLowerCase() || "unknown";
}

function rolloutMode(value) {
  return parseRolloutMode(value);
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

function coverageDiagnosticRows(deployed, usage, controlSettings, report) {
  const diagnostics = [];
  if (report.error) diagnostics.push({
    kind: report.errorStatus === 403 ? "github-api-rate-limit-403" : "durable-output-unavailable",
    title: "Durable output collection unavailable",
    effect: report.error,
    endpoint: report.errorEndpoint || "",
    "rate-limit-reset": report.rateLimitResetAt || "",
    "snapshot-age-seconds": report.snapshotAgeSeconds ?? "",
  });
  if (report.stale) diagnostics.push({
    title: "Durable output snapshot is stale",
    effect: `Retained the last successful snapshot from ${report.snapshotGeneratedAt || "an unknown time"}.`,
    "snapshot-age-seconds": report.snapshotAgeSeconds ?? "",
  });
  if (controlSettings.policy_resolution?.status === "unavailable") diagnostics.push({
    title: "Control policy resolution unavailable",
    effect: controlSettings.policy_resolution.reason || "The dashboard is limited to fail-closed control-repository data.",
  });
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

function repositoryCoverageRows(deployed) {
  const discovered = new Map();
  for (const item of [...(deployed.workflows || []), ...(deployed.bundles || [])]) {
    const repository = String(item.repository || "");
    if (!repository) continue;
    discovered.set(repository, ["public", "private", "internal"].includes(item.visibility)
      ? item.visibility
      : "unknown");
  }
  const discoveredCounts = { public: 0, private: 0, internal: 0, unknown: 0 };
  for (const visibility of discovered.values()) discoveredCounts[visibility] += 1;
  const organization = deployed.organizationRepositories || {};
  const count = (value) => Number.isFinite(value) ? String(value) : "Unknown";
  return [
    { label: "Discovery scope", value: deployed.repositoryScope === "allowlist" ? "Configured allowlist" : "Organization" },
    { label: "Repositories in scope", value: count(deployed.repositoryCount) },
    { label: "Discovered public", value: String(discoveredCounts.public) },
    { label: "Discovered private", value: String(discoveredCounts.private) },
    { label: "Discovered internal", value: String(discoveredCounts.internal) },
    { label: "Unknown visibility", value: String(discoveredCounts.unknown) },
    { label: "Organization total", value: count(organization.total) },
    { label: "Organization public", value: count(organization.public) },
    { label: "Organization private", value: count(organization.private) },
    { label: "Organization internal", value: count(organization.internal) },
  ];
}

function packageAliasMap(inventory = {}) {
  const aliases = new Map();
  for (const bundle of inventory.bundles || []) {
    const canonicalId = String(bundle.id || "").trim();
    const legacyId = String(bundle.controlPackage || "").trim();
    if (canonicalId && legacyId && legacyId !== canonicalId) aliases.set(legacyId, canonicalId);
  }
  return aliases;
}

function packageMemberships(deployed, packageAliases = new Map()) {
  const memberships = new Map();
  for (const bundle of deployed.bundles || []) {
    for (const workflow of bundle.workflows || []) {
      const key = `${bundle.repository}:${workflow.lockPath}`;
      const discoveredId = bundle.path?.replace(/\/aw\.yml$|^aw\.yml$/g, "") || bundle.name;
      const membership = {
        id: packageAliases.get(discoveredId) || discoveredId,
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

function workflowAdmission(controlSettings, packageName, role, workflowId) {
  if (!Object.hasOwn(controlSettings, "packages")) return null;
  if (controlSettings.policy_resolution?.status === "unavailable") {
    return { status: "unavailable", reason: controlSettings.policy_resolution.reason || "policy-resolution-unavailable" };
  }
  const packagePolicy = controlSettings.packages?.[packageName];
  if (!packagePolicy) return { status: "blocked", reason: "package-undeclared" };
  if (packagePolicy.enabled === false) return { status: "blocked", reason: "package-disabled" };
  if (role === "worker") {
    const workerPolicy = packagePolicy.worker_policies?.[workflowId];
    if (!workerPolicy) return { status: "blocked", reason: "worker-undeclared" };
    if (workerPolicy.enabled === false) return { status: "blocked", reason: "worker-disabled" };
  }
  return { status: "authorized", reason: "authorized" };
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
    const policyId = String(
      bundle.controlPackage
      || bundle.id
      || String(bundle.path || "").replace(/\/aw\.yml$|^aw\.yml$/g, "")
    ).trim();
    const packagePolicy = controlSettings.packages?.[policyId]
      || controlSettings.packages?.[bundle.id];
    const configuredMode = rolloutMode(packagePolicy?.mode);
    const rolloutPercent = Number(packagePolicy?.["rollout-percent"] ?? packagePolicy?.rollout_percent);
    const targetPolicies = new Map(Object.entries(packagePolicy?.targets ?? packagePolicy?.target_policies ?? {})
      .map(([repository, targetPolicy]) => [repository.toLowerCase(), { repository, targetPolicy }]));
    const targetRepositories = new Map();
    for (const repository of controlSettings.allowed_repositories ?? []) {
      const name = String(repository).trim();
      if (name) targetRepositories.set(name.toLowerCase(), name);
    }
    for (const [repository, { repository: name }] of targetPolicies) targetRepositories.set(repository, name);
    const packageTargets = [...targetRepositories.entries()]
      .map(([key, repository]) => ({
        repository,
        mode: rolloutMode(targetPolicies.get(key)?.targetPolicy?.mode ?? configuredMode),
        explicit: targetPolicies.has(key),
      }))
      .filter((target) => target.mode !== "unknown" && target.repository);
    const packageId = String(bundle.id || bundle.controlPackage || "").trim();
    const packageName = String(bundle.name || packageId).trim();
    const packageMembership = packageId ? { id: packageId, name: packageName || packageId } : undefined;
    const packageIcon = packagePolicy?.icon || "package";
    const workers = bundle.workers || [];
    const ready = bundle.compiled === true
      && (bundle.missingWorkers || []).length === 0
      && workers.every((worker) => worker.compiled !== false);
    const inventoryWarnings = (bundle.compiled === true ? 0 : 1) + (bundle.missingWorkers || []).length;
    const packageAllowance = [bundle.maxAiCredits, ...workers.map((worker) => worker.maxAiCredits)]
      .filter((value) => Number.isFinite(value) && value > 0)
      .reduce((total, value) => total + value, 0);
    const packageWorkflows = [
      { sourcePath: bundle.workflow, lockPath: bundle.workflow?.replace(/\.md$/, ".lock.yml"), maxAiCredits: bundle.maxAiCredits, role: "orchestrator", id: bundle.id },
      ...workers.map((worker) => ({ ...worker, role: "worker" })),
    ];
    for (const workflow of packageWorkflows) {
      const admission = workflowAdmission(controlSettings, bundle.controlPackage, workflow.role, workflow.id);
      for (const workflowPath of [workflow.sourcePath, workflow.lockPath].filter(Boolean)) {
        details.set(workflowPath, {
          ...details.get(workflowPath),
          maxAiCredits: workflow.maxAiCredits ?? details.get(workflowPath)?.maxAiCredits,
          inventoryReady: ready,
          packageInventoryWarnings: inventoryWarnings,
          packageAllowance: packageAllowance > 0 ? packageAllowance : null,
          packageWorkerCount: workers.length,
          ...(Number.isFinite(rolloutPercent) ? { packageRolloutPercent: rolloutPercent } : {}),
          ...(packageTargets.length > 0 ? { packageTargets } : {}),
          ...(packageMembership ? { packageMembership } : {}),
          packageIcon,
          ...(configuredMode !== "unknown" ? { configuredMode } : {}),
          ...(admission ? { admissionStatus: admission.status, admissionReason: admission.reason } : {}),
        });
      }
    }
  }
  return details;
}

function workflowRows(deployed, generatedAt, inventory, controlSettings) {
  const memberships = packageMemberships(deployed, packageAliasMap(inventory));
  const inventoryDetails = inventoryWorkflowDetails(inventory, controlSettings);
  return (deployed.workflows || []).map((workflow) => {
    const names = repositoryParts(workflow.repository);
    const details = inventoryDetails.get(workflow.path);
    const discoveredMemberships = memberships.get(`${workflow.repository}:${workflow.path}`) || [];
    const workflowMemberships = details?.packageMembership
      ? [details.packageMembership]
      : discoveredMemberships;
    const membership = workflowMemberships.at(-1);
    const packageIcon = details?.packageIcon
      || controlSettings.packages?.[membership?.id]?.icon
      || "package";
    const recentMode = rolloutMode(workflow.runHealth?.runRecords?.[0]?.displayTitle);
    const workflowRepository = String(workflow.repository ?? "").toLowerCase();
    const packageTargets = (details?.packageTargets ?? [])
      .filter((target) => target.explicit || target.repository.toLowerCase() !== workflowRepository)
      .map(({ repository, mode }) => ({ repository, mode }));
    return {
     ...names,
     ...(membership ? { package: membership.id, "package-name": membership.name } : {}),
     ...(membership ? { "package-icon": packageIcon } : {}),
     ...(workflowMemberships.length > 0 ? { "package-memberships": workflowMemberships } : {}),
     ...(Number.isFinite(details?.maxAiCredits) ? { "max-ai-credits": details.maxAiCredits } : {}),
     ...(Number.isFinite(details?.packageAllowance) ? { "package-aic-allowance": details.packageAllowance } : {}),
     ...(Number.isFinite(details?.packageWorkerCount) ? { "package-worker-count": details.packageWorkerCount } : {}),
     ...(Number.isFinite(details?.packageInventoryWarnings) ? { "package-inventory-warnings": details.packageInventoryWarnings } : {}),
    ...(Number.isFinite(details?.packageRolloutPercent) ? { "package-rollout-percent": details.packageRolloutPercent } : {}),
    ...(packageTargets.length > 0 ? { "package-targets": packageTargets } : {}),
     ...(typeof details?.inventoryReady === "boolean" ? { "inventory-ready": details.inventoryReady } : {}),
     ...(details?.admissionStatus ? { "admission-status": details.admissionStatus } : {}),
     ...(details?.admissionReason ? { "admission-reason": details.admissionReason } : {}),
     "workflow-role": workflow.role || (membership ? "worker" : "standalone"),
      workflow: workflow.path?.replace(/\.lock\.yml$/, ".md") || "",
      "workflow-name": workflow.name || workflow.path || "Unknown workflow",
      "workflow-active": workflow.state === "active"
        ? "true"
        : String(workflow.state).startsWith("disabled") ? "false" : "unknown",
      "gh-aw-version": workflow.ghAwVersion || "unknown",
      "gh-aw-update-state": workflow.updateState || "unknown",
      "gh-aw-metadata": workflow.ghAwMetadata || null,
      "gh-aw-manifest": workflow.ghAwManifest || null,
      "rollout-mode": details?.packageTargets?.find(
        (target) => target.repository.toLowerCase() === workflowRepository,
      )?.mode || details?.configuredMode || recentMode,
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
        ...(run.admissionStatus ? { "admission-status": run.admissionStatus } : {}),
        ...(run.admissionReason ? { "admission-reason": run.admissionReason } : {}),
        ...(run.failureJob ? { "failure-job": run.failureJob } : {}),
        ...(run.failureMessage ? { "failure-message": run.failureMessage } : {}),
        ...(run.failureStep ? { "failure-step": run.failureStep } : {}),
        ...(run.resource ? { resource: run.resource } : {}),
        ...(run.resourceResetAt ? { "resource-reset-at": run.resourceResetAt } : {}),
        ...(Number.isFinite(run.resourceWaitHours) ? { "resource-wait-hours": run.resourceWaitHours } : {}),
        "rollout-mode": rolloutMode(run.displayTitle),
        engine: firstText(run.engine, run.agenticEngine, run.agentic_engine) || "unknown",
        "engine-version": firstText(run.engineVersion, run.engine_version, run.agenticEngineVersion, run.agentic_engine_version) || "unknown",
        "requested-model": firstText(run.requestedModel, run.requested_model, run.model) || "unknown",
        "resolved-model": firstText(run.resolvedModel, run.resolved_model, run.model) || "unknown",
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
    engine: firstText(run.engine, run.agenticEngine, run.agentic_engine) || "unknown",
    "engine-version": firstText(run.engineVersion, run.engine_version, run.agenticEngineVersion, run.agentic_engine_version) || "unknown",
    "requested-model": firstText(run.requestedModel, run.requested_model, run.model) || "unknown",
    "resolved-model": firstText(run.resolvedModel, run.resolved_model, run.model) || "unknown",
    "sandbox-runtime": firstText(run.agentRuntime, run.agent_runtime) || "unknown",
    "rollout-mode": run.mode || "unknown",
    "input-tokens": null,
    "output-tokens": null,
    "cache-read-tokens": null,
    "cache-write-tokens": null,
    "reasoning-tokens": null,
    aic: run.aic,
    "estimated-usd": run.aic !== null && run.aic !== undefined && run.aic !== "" && Number.isFinite(Number(run.aic))
      ? Number(run.aic) * AIC_TO_USD
      : null,
    "observed-at": run.createdAt || usage.generatedAt,
    "run-link": link("run", workflowRunUrl(run.repository, run.runId), `Run ${run.runId}`),
  }));
}

function durationSeconds(start, end) {
  const duration = Date.parse(String(end || "")) - Date.parse(String(start || ""));
  return Number.isFinite(duration) && duration >= 0 ? duration / 1000 : null;
}

function performanceRows(deployed, usage) {
  const metadataByRun = new Map((usage.runs || []).map((run) => [
    `${String(run.repository || "").toLowerCase()}:${run.runId}`,
    {
      engine: firstText(run.engine, run.agenticEngine, run.agentic_engine) || "unknown",
      "sandbox-runtime": firstText(run.agentRuntime, run.agent_runtime) || "unknown",
      model: firstText(run.resolvedModel, run.resolved_model, run.requestedModel, run.requested_model, run.model) || "unknown",
    },
  ]));
  const runs = [];
  const jobs = [];
  for (const workflow of deployed.workflows || []) {
    const repository = String(workflow.repository || "");
    const names = repositoryParts(repository);
    for (const run of workflow.runHealth?.runRecords || []) {
      const runDuration = durationSeconds(run.startedAt || run.createdAt, run.status === "completed" ? run.updatedAt : null);
      const metadata = metadataByRun.get(`${repository.toLowerCase()}:${run.runId}`) || {
        engine: "unknown",
        "sandbox-runtime": "unknown",
        model: "unknown",
      };
      const common = {
        ...names,
        workflow: workflow.path?.replace(/\.lock\.yml$/, ".md") || "",
        run: String(run.runId),
        "started-at": run.startedAt || run.createdAt,
        "run-conclusion": runConclusion(run.conclusion),
        "rollout-mode": rolloutMode(run.displayTitle),
        ...metadata,
        "run-link": link("run", workflowRunUrl(repository, run.runId), `View run ${run.runId}`),
      };
      if (runDuration !== null) {
        runs.push({ ...common, "run-duration-seconds": runDuration });
      }
      for (const job of run.jobs || []) {
        const jobDuration = durationSeconds(job.startedAt, job.completedAt);
        if (jobDuration === null) continue;
        const labels = Array.isArray(job.labels) ? job.labels.filter(Boolean) : [];
        jobs.push({
          ...common,
          job: job.name || "Unknown job",
          runner: labels.join(", ") || job.runnerName || "unknown",
          "runner-name": job.runnerName || "unknown",
          "runner-group": job.runnerGroupName || "unknown",
          "job-duration-seconds": jobDuration,
        });
      }
    }
  }
  return { runs, jobs };
}

function positiveCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function securityObservation(run, feature, analysis, signal, status, count, subject = "") {
  return {
    ...repositoryParts(run.repository),
    workflow: run.workflowPath?.replace(/\.lock\.yml$/, ".md") || run.workflowName || "",
    run: String(run.runId),
    "security-observation": JSON.stringify([run.repository, run.runId, feature, analysis, signal, subject]),
    "security-feature": feature,
    "security-analysis": analysis,
    "security-signal": signal,
    "security-status": status,
    "security-subject": subject,
    "security-count": count,
    "observed-at": run.createdAt,
    "run-link": link("run", workflowRunUrl(run.repository, run.runId), `Run ${run.runId}`),
  };
}

function unavailableSecurityObservation(run, feature) {
  return securityObservation(run, feature, "summary", "Telemetry unavailable", "unavailable", 1);
}

function accessControlRows(run) {
  const access = run.security?.accessControl;
  if (!access?.available) return [unavailableSecurityObservation(run, "access-control")];
  const rows = [];
  const fileDenials = Object.entries(access.fileDenials || {})
    .map(([kind, count]) => [kind, positiveCount(count)])
    .filter(([, count]) => count > 0);
  const toolDenials = Object.entries(access.toolDenials || {})
    .map(([kind, count]) => [kind, positiveCount(count)])
    .filter(([, count]) => count > 0);
  const guardPolicy = access.guardPolicy || {};
  const guardDenials = {
    "Repository scope": positiveCount(guardPolicy.repo_scope_blocked),
    "General access": positiveCount(guardPolicy.access_denied),
    "Blocked user": positiveCount(guardPolicy.blocked_user_denied),
    "Insufficient permission": positiveCount(guardPolicy.permission_denied),
    "Private repository": positiveCount(guardPolicy.private_repo_denied),
  };
  const fileTotal = fileDenials.reduce((total, [, count]) => total + count, 0);
  const toolTotal = toolDenials.reduce((total, [, count]) => total + count, 0)
    + Object.values(guardDenials).reduce((total, count) => total + count, 0);
  rows.push(
    securityObservation(run, "access-control", "summary", "File access denied", "denied", fileTotal),
    securityObservation(run, "access-control", "summary", "Tool access denied", "denied", toolTotal),
  );
  for (const [kind, count] of fileDenials) {
    rows.push(securityObservation(run, "access-control", "detail", `${kind} denied`, "denied", count, "Filesystem"));
  }
  for (const [kind, count] of toolDenials) {
    rows.push(securityObservation(run, "access-control", "detail", `${kind} denied`, "denied", count, "Agent tool"));
  }
  for (const [signal, count] of Object.entries(guardDenials).filter(([, count]) => count > 0)) {
    rows.push(securityObservation(run, "access-control", "detail", signal, "denied", count, "MCP guard"));
  }
  if (fileTotal + toolTotal === 0) {
    rows.push(securityObservation(run, "access-control", "detail", "No denials observed", "clear", 0));
  }
  return rows;
}

function firewallRows(run) {
  const firewall = run.security?.firewall;
  if (!firewall?.available) return [unavailableSecurityObservation(run, "firewall")];
  const analysis = firewall.analysis || {};
  const rows = [
    securityObservation(run, "firewall", "summary", "Allowed requests", "allowed", positiveCount(analysis.allowed_requests)),
    securityObservation(run, "firewall", "summary", "Blocked requests", "blocked", positiveCount(analysis.blocked_requests)),
  ];
  for (const [domain, counts] of Object.entries(analysis.requests_by_domain || {})) {
    const allowed = positiveCount(counts?.allowed);
    const blocked = positiveCount(counts?.blocked);
    if (allowed > 0) rows.push(securityObservation(run, "firewall", "detail", "Allowed request", "allowed", allowed, domain));
    if (blocked > 0) rows.push(securityObservation(run, "firewall", "detail", "Blocked request", "blocked", blocked, domain));
  }
  return rows;
}

function integrityRows(run) {
  const integrity = run.security?.integrity;
  if (!integrity?.available) return [unavailableSecurityObservation(run, "integrity-filtering")];
  const summary = integrity.summary || {};
  const filtered = positiveCount(summary.total_filtered);
  const passed = Math.max(0, positiveCount(integrity.totalToolCalls) - filtered);
  const rows = [
    securityObservation(run, "integrity-filtering", "summary", "Passed interactions", "passed", passed),
    securityObservation(run, "integrity-filtering", "summary", "Filtered interactions", "filtered", filtered),
  ];
  for (const [tool, count] of Object.entries(summary.filtered_tool_counts || {})) {
    rows.push(securityObservation(run, "integrity-filtering", "detail", "Filtered tool", "filtered", positiveCount(count), tool));
  }
  for (const [reason, count] of Object.entries(summary.filtered_reason_counts || {})) {
    rows.push(securityObservation(run, "integrity-filtering", "detail", "Filter reason", "filtered", positiveCount(count), reason));
  }
  if (filtered === 0) {
    rows.push(securityObservation(run, "integrity-filtering", "detail", "No interactions filtered", "clear", 0));
  }
  return rows;
}

function threatDetectionRows(run) {
  const detection = run.security?.threatDetection;
  if (!detection?.available) return [unavailableSecurityObservation(run, "threat-detection")];
  const verdict = detection.verdict || {};
  const categories = [
    ["Prompt injection", verdict.promptInjection],
    ["Secret leak", verdict.secretLeak],
    ["Malicious patch", verdict.maliciousPatch],
  ];
  const rows = categories.flatMap(([signal, detected]) => [
    securityObservation(run, "threat-detection", "summary", signal, detected ? "detected" : "clear", 1),
    securityObservation(run, "threat-detection", "detail", signal, detected ? "detected" : "clear", 1),
  ]);
  for (const warning of verdict.warnings || []) {
    rows.push(securityObservation(
      run,
      "threat-detection",
      "detail",
      "Inspection warning",
      "warning",
      1,
      [warning.field, warning.code].filter(Boolean).join(": "),
    ));
  }
  return rows;
}

function securityObservationRows(usage) {
  return (usage.securityRuns || []).flatMap((run) => [
    ...accessControlRows(run),
    ...firewallRows(run),
    ...integrityRows(run),
    ...threatDetectionRows(run),
  ]);
}

function recordLink(record, relation) {
  const expectedKind = relation === "issue" ? "issue" : "pull-request";
  return record.kind === expectedKind ? link(relation, record.url, `View ${relation.replaceAll("-", " ")}`) : undefined;
}

function recordWorkflowRoleResolver(workflows) {
  const roleByRuntimeWorkflow = new Map(workflows.map((row) => [
    `${row.organization}/${row.repository}:${row.workflow}`.toLowerCase(),
    row["workflow-role"],
  ]));
  return (record) => {
    const workflow = record.workflowPath?.replace(/\.lock\.yml$/, ".md") || "";
    const scoped = `${record.runtimeRepository || ""}:${workflow}`.toLowerCase();
    return roleByRuntimeWorkflow.get(scoped) || "unknown";
  };
}

function findingRows(records, workflowRoleFor = () => "unknown") {
  return records.map((record) => ({
    ...repositoryParts(record.repository),
    workflow: record.workflowPath?.replace(/\.lock\.yml$/, ".md") || record.workflow || "",
    "workflow-role": workflowRoleFor(record),
    run: String(record.runUrl?.match(/\/runs\/(\d+)/)?.[1] || ""),
    "safe-output": record.id,
    finding: record.id,
    "finding-kind": record.warning ? "authored-warning" : "record",
    "finding-severity": record.warning ? "medium" : "informational",
    "finding-status": record.state === "open" ? "open" : record.state === "closed" ? "resolved" : "unknown",
    "finding-summary": record.summary || record.title,
    "observed-at": record.updatedAt || record.createdAt,
    engine: firstText(record.engine, record.agenticEngine) || "unknown",
    "engine-version": firstText(record.engineVersion, record.agenticEngineVersion) || "unknown",
    "requested-model": firstText(record.requestedModel, record.requested_model) || "unknown",
    "resolved-model": firstText(record.resolvedModel, record.resolved_model, record.requestedModel, record.requested_model) || "unknown",
    "issue-link": recordLink(record, "issue"),
    "pull-request-link": recordLink(record, "pull-request"),
    "run-link": link("run", record.runUrl, "View workflow run"),
    "external-link": {
      ...link("external", record.url, "View output"),
      "dashboard-href": `#page-outcome-detail?outcome=${encodeURIComponent(record.id)}`,
      "dashboard-label": `View ${record.title || record.id}`,
    },
  }));
}

function outcomeRows(records, workflowRoleFor = () => "unknown") {
  return records.map((record) => ({
    ...repositoryParts(record.repository),
    "runtime-repository": record.runtimeRepository || record.repository,
    ...(record.bundle ? { package: record.bundle } : {}),
    workflow: record.workflowPath?.replace(/\.lock\.yml$/, ".md") || record.workflow || "",
    "workflow-role": workflowRoleFor(record),
    "workflow-name": record.workflow || record.workflowPath?.replace(/\.lock\.yml$/, ".md") || "Unknown workflow",
    run: String(record.runUrl?.match(/\/runs\/(\d+)/)?.[1] || ""),
    "safe-output": record.id,
    "outcome-number": record.number,
    "outcome-title": record.title || record.id,
    "outcome-summary": record.summary || "",
    "outcome-body-html": record.bodyHtml || "",
    "outcome-category": record.kind || "unknown",
    "outcome-status": record.state || "unknown",
    "outcome-state": record.state === "closed"
      ? "lifecycle-close"
      : record.kind === "noop" ? "ignored" : "pending",
    "evidence-strength": record.kind === "review-bundle" ? "proposal" : "durable",
    "outcome-warning": record.warning ? "Warning" : "None",
    "run-conclusion": runConclusion(record.conclusion),
    "rollout-mode": rolloutMode(record.mode),
    engine: firstText(record.engine, record.agenticEngine) || "unknown",
    "engine-version": firstText(record.engineVersion, record.agenticEngineVersion) || "unknown",
    "requested-model": firstText(record.requestedModel, record.requested_model) || "unknown",
    "resolved-model": firstText(record.resolvedModel, record.resolved_model, record.requestedModel, record.requested_model) || "unknown",
    "published-at": record.createdAt,
    "observed-at": record.updatedAt || record.createdAt,
    "issue-link": recordLink(record, "issue"),
    "pull-request-link": recordLink(record, "pull-request"),
    "run-link": link("run", record.runUrl, "View workflow run"),
    "external-link": link("external", record.url, "View output"),
  }));
}

function operationalValueRows(values) {
  const definitions = new Map((values.definitions || []).map((definition) => [
    `${definition.repository}:${definition.workflowId}:${definition.evaluatorDigest || ""}`,
    definition,
  ]));
  return (values.records || []).filter((record) => record.observation).map((record) => {
    const target = record.observation.case?.targetRepo || record.observation.subject?.repository || record.repository;
    const repository = repositoryParts(target);
    const runAttempt = Number(record.runAttempt || record.run?.attempt || 1);
    const observationId = record.observationId || ([
      record.repository,
      record.workflowId,
      record.runId,
      runAttempt,
      record.evaluatorDigest,
    ].every((part) => part !== undefined && part !== null && String(part) !== "")
      ? `${record.repository}:${record.workflowId}:${record.runId}:${runAttempt}:${record.evaluatorDigest}`
      : undefined);
    const definition = definitions.get(`${record.repository}:${record.workflowId}:${record.evaluatorDigest || ""}`);
    return {
      ...repository,
      "repository-name": repository.repository,
      workflow: record.workflowPath?.replace(/\.lock\.yml$/, ".md") || record.workflowId || "",
      run: String(record.runId),
      "run-attempt": runAttempt,
      "observation-id": observationId,
      experiment: record.observation.experiment || "",
      "operational-case": record.observation.opportunityKey || record.workflowId || "unknown",
      "evaluator-digest": record.evaluatorDigest || "",
      "rollout-mode": "unknown",
      "operational-value": record.value,
      "operational-value-definition": record.workflowId || "operational-value",
      "requested-evidence-at": record.observation.subject?.createdAt || record.observation.evidenceAt,
      "evidence-cutoff": record.observation.evidenceCutoff || record.observation.evidenceAt,
      "maturity-at": record.observation.maturesAt || record.observation.evidenceAt,
      "maturity-status": record.observation.mature ? "matured" : "interim",
      "baseline-value": record.baselineValue,
      "delta-from-baseline": record.deltaFromBaseline,
      "observed-at": record.observation.evidenceAt,
      "accepted-evidence-provenance": record.observation.provenance || [],
      diagnostics: record.diagnostics || {},
      "diagnostic-definitions": definition?.diagnosticMetrics || [],
      "evidence-link": link("evidence", record.runUrl, `View run ${record.runId}`),
      "run-link": link("run", record.runUrl, `Run ${record.runId}`),
    };
  });
}

function operationalValueSource(name, rows, values, generatedAt, available) {
  const complete = values.complete === true;
  const retrievedAt = values.generatedAt || generatedAt;
  const result = source(name, rows, retrievedAt, available, complete);
  const coverageStart = values.window?.startAt || values.windowStart;
  const coverageEnd = values.window?.endAt;
  result.metadata["as-of"] = coverageEnd || retrievedAt;
  if (coverageStart) result.metadata["coverage-start"] = coverageStart;
  if (coverageEnd) result.metadata["coverage-end"] = coverageEnd;
  return result;
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
  const performance = performanceRows(deployed, usage);
  const records = report.records || [];
  const workflowRoleForRecord = recordWorkflowRoleResolver(workflows);
  const findings = findingRows(records, workflowRoleForRecord);
  const outcomes = outcomeRows(records, workflowRoleForRecord);
  const reportAvailable = Array.isArray(report.records) && (report.error ? report.records.length > 0 : true);
  const reportComplete = !report.error;
  const values = operationalValueRows(operationalValues);
  const graderObservations = operationalValueGraderRows(operationalValues);
  const repositories = new Map();
  for (const row of [...workflows, ...runs, ...findings, ...values]) {
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
  const workflowsAvailable = discoveryAvailable || workflows.length > 0;
  const runAvailable = deployed.runHealth?.available === true;
  const runComplete = deployed.runHealth?.complete === true;
  const usageAvailable = usage.available === true;
  const usageComplete = usage.complete === true;
  const valueAvailable = operationalValues.records !== undefined;

  const sources = Object.fromEntries(sourceNames.map((name) => [name, source(name, [], generatedAt, false, false)]));
  sources.organizations = source("organizations", organizations, generatedAt, discoveryAvailable, deployed.discovery?.complete === true);
  sources.repositories = source("repositories", [...repositories.values()], generatedAt, discoveryAvailable, deployed.discovery?.complete === true);
  sources.workflows = source("workflows", workflows, generatedAt, workflowsAvailable, deployed.discovery?.complete === true);
  sources.runs = source("runs", runs, generatedAt, runAvailable, runComplete);
  sources["run-performance"] = source(
    "run-performance",
    performance.runs,
    generatedAt,
    runAvailable,
    runComplete && usageComplete,
  );
  sources["job-performance"] = source(
    "job-performance",
    performance.jobs,
    generatedAt,
    runAvailable,
    runComplete && usageComplete,
  );
  if (Number.isFinite(deployed.runHealth?.windowHours) && deployed.runHealth.windowHours > 0) {
    sources.runs.metadata["coverage-end"] = generatedAt;
    sources.runs.metadata["coverage-start"] = new Date(
      Date.parse(generatedAt) - deployed.runHealth.windowHours * 3_600_000,
    ).toISOString();
    for (const name of ["run-performance", "job-performance"]) {
      sources[name].metadata["coverage-end"] = generatedAt;
      sources[name].metadata["coverage-start"] = sources.runs.metadata["coverage-start"];
    }
  }
  sources.usage = source("usage", usageRows(usage), generatedAt, usageAvailable, usageComplete);
  sources["security-observations"] = source(
    "security-observations",
    securityObservationRows(usage),
    generatedAt,
    usage.securityAvailable === true,
    usage.securityComplete === true,
  );
  if (Number.isFinite(usage.windowHours) && usage.windowHours > 0) {
    sources.usage.metadata["coverage-end"] = generatedAt;
    sources.usage.metadata["coverage-start"] = new Date(
      Date.parse(generatedAt) - usage.windowHours * 3_600_000,
    ).toISOString();
  }
  sources["coverage-diagnostics"] = source(
    "coverage-diagnostics",
    coverageDiagnosticRows(deployed, usage, controlSettings, report),
    generatedAt,
  );
  sources["repository-coverage"] = source(
    "repository-coverage",
    repositoryCoverageRows(deployed),
    generatedAt,
    discoveryAvailable,
    deployed.discovery?.complete === true,
  );
  sources.outcomes = source("outcomes", outcomes, generatedAt, reportAvailable, reportComplete);
  sources.findings = source("findings", findings, generatedAt, reportAvailable, reportComplete);
  if (report.stale) {
    sources.outcomes.metadata.freshness = "stale";
    sources.findings.metadata.freshness = "stale";
  }
  sources["grader-observations"] = operationalValueSource("grader-observations", graderObservations, operationalValues, generatedAt, valueAvailable);
  sources["operational-values"] = operationalValueSource("operational-values", values, operationalValues, generatedAt, valueAvailable);
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
  log.group`Build Dashboard Language sources`;
  try {
    const [deployed, usage, operationalValues, report, inventory, controlSettings] = await Promise.all(
      [deployedPath, usagePath, operationalValuesPath, reportPath, inventoryPath, controlSettingsPath]
        .map(async (file) => JSON.parse(await readFile(file, "utf8"))),
    );
    const sources = buildDashboardLanguageSources({ deployed, usage, operationalValues, report, inventory, controlSettings });
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(sources, null, 2)}\n`);
    log.info`Wrote ${Object.keys(sources).length} dashboard sources to ${outputPath}`;
  } finally {
    log.endGroup();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    log.error`${error.stack || error.message || error}`;
    process.exitCode = 1;
  });
}
