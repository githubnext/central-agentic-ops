import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const apiRoot = "https://api.github.com";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizeMode(mode) {
  return ["review", "live"].includes(mode) ? mode : "unknown";
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function plainText(markdown = "") {
  return markdown
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/```[^]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[#>*+-]+\s*/gm, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function summarize(markdown = "") {
  const text = plainText(markdown.replace(/>\s*Generated from[^]*$/m, ""));
  return text.length > 700 ? `${text.slice(0, 697)}...` : text;
}

function workflowFrom(body = "") {
  const heading = body.match(/^###\s+(.+)$/m)?.[1]?.trim();
  const provenance = body.match(/Generated from \[([^\]]+)\]\([^)]*\/actions\/runs\/\d+\)/)?.[1];
  return provenance || heading || "GitHub Agentic Workflow";
}

function runUrlFrom(body = "") {
  return body.match(/https:\/\/github\.com\/[^\s)]+\/actions\/runs\/\d+/)?.[0] || "";
}

function repositoryFrom(body = "") {
  return body.match(/(?:target repository|target repo):\s*`?([a-z0-9][a-z0-9-]*\/[a-z0-9._-]+)/i)?.[1] || "";
}

function markerFrom(body = "", marker) {
  return body.match(new RegExp(`<!--\\s*[\\w-]+:${marker}=([^>]+?)\\s*-->`, "i"))?.[1]?.trim() || "";
}

function aicFrom(body = "") {
  const provenance = plainText(body).match(/Generated (?:from|by)[^·]*·\s*(?:[a-z][\w.-]*\s+)?([\d,.]+)\s+AIC\b/i);
  return provenance ? Number(provenance[1].replaceAll(",", "")) : null;
}

function hasReportWarning(bodyHtml = "") {
  return /markdown-alert-warning/i.test(bodyHtml);
}

function configuredModeFor(bundle, controlSettings) {
  return normalizeMode(controlSettings.packages?.[bundle.controlPackage]?.mode);
}

function bundleFor(reportDefinitions, ...values) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return reportDefinitions.find((definition) => {
    const terms = [definition.id, definition.name, ...(definition.workers || []).flatMap((worker) => [worker.id, worker.name, worker.trackerId])];
    return terms.filter(Boolean).some((term) => text.includes(String(term).toLowerCase()));
  }) || null;
}

function targetRepositoryFromRun(run, fallback, allowedRepositories, owner) {
  const candidates = [...(run?.display_title || "").matchAll(/\b([a-z0-9][a-z0-9-]*\/[a-z0-9._-]+)\b/gi)]
    .map((candidate) => candidate[1]);
  return candidates.find((candidate) => allowedRepositories.size === 0
    ? candidate.split("/")[0].toLowerCase() === owner.toLowerCase()
    : allowedRepositories.has(candidate.toLowerCase())) || fallback;
}

function recordFromIssue(issue, outputRepository, reportDefinitions) {
  const body = issue.body || "";
  const workflow = workflowFrom(body);
  const generatedSafeOutput = /Generated (?:from|with) \[[^\]]+\]\([^)]*\/actions\/runs\/\d+\)/.test(body);
  const bundle = bundleFor(reportDefinitions, issue.title, workflow, body);
  const generatedSafeOutputTitle = /^\[[^\]]+\]\s/.test(issue.title) && bundle;
  if (!generatedSafeOutputTitle && !generatedSafeOutput) return null;
  if (issue.title === "[aw] No-Op Runs") return null;
  return {
    id: `${outputRepository}-${issue.pull_request ? "pr" : "issue"}-${issue.number}`,
    number: issue.number,
    bundle: bundle?.id || "",
    kind: issue.pull_request ? "pull-request" : "issue",
    title: issue.title,
    summary: summarize(issue.body),
    bodyHtml: issue.body_html || "",
    state: issue.state.toLowerCase(),
    url: safeUrl(issue.html_url),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    workflow,
    runUrl: runUrlFrom(body),
    repository: repositoryFrom(body) || outputRepository,
    outputRepository,
    bundleId: markerFrom(body, "bundle"),
    correlationId: markerFrom(body, "correlation"),
    aic: aicFrom(body),
    warning: hasReportWarning(issue.body_html),
  };
}

function recordFromComment(comment, issueByUrl, outputRepository, reportDefinitions) {
  const issue = issueByUrl.get(comment.issue_url);
  const body = comment.body || "";
  const workflow = workflowFrom(body);
  const bundle = bundleFor(reportDefinitions, workflow, issue?.title, body);
  const generatedSafeOutput = /Generated from \[[^\]]+\]\([^)]*\/actions\/runs\/\d+\)/.test(body);
  if (!generatedSafeOutput) return null;
  const noop = issue?.title === "[aw] No-Op Runs";
  return {
    id: `${outputRepository}-comment-${comment.id}`,
    bundle: bundle?.id || "",
    kind: noop ? "noop" : "comment",
    title: noop ? `${workflow} completed with no action` : `Comment on ${issue?.title || "safe output"}`,
    summary: summarize(body),
    bodyHtml: comment.body_html || "",
    state: noop ? "complete" : issue?.state?.toLowerCase() || "published",
    url: safeUrl(comment.html_url),
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    workflow,
    runUrl: runUrlFrom(body),
    repository: repositoryFrom(body) || outputRepository,
    outputRepository,
    bundleId: markerFrom(body, "bundle"),
    correlationId: markerFrom(body, "correlation"),
    aic: aicFrom(body),
    warning: hasReportWarning(comment.body_html),
  };
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

export async function collectDashboardRecords({
  repository,
  token,
  pagesToken = token,
  controlSettings,
  inventory,
  deployedInventory,
  requestedRepositories = [],
  fetchImpl = fetch,
  generatedAt = new Date().toISOString(),
}) {
  const [owner, repo] = repository.split("/");
  const policyRepositories = [...new Set((controlSettings.allowed_repositories || []).map((value) => value.toLowerCase()))];
  const normalizedRequestedRepositories = [...new Set(requestedRepositories
    .map((value) => value.trim().toLowerCase()).filter(Boolean))];
  if (policyRepositories.length > 0 && normalizedRequestedRepositories.some((value) => !policyRepositories.includes(value))) {
    throw new Error("REPORT_ALLOWED_REPOS cannot widen checked-in control policy");
  }
  const allowedRepositories = new Set(normalizedRequestedRepositories.length > 0 ? normalizedRequestedRepositories : policyRepositories);
  const bundleDefinitions = inventory.bundles;
  const reportDefinitions = [
    ...bundleDefinitions,
    ...(inventory.standalone || []).map((workflow) => ({ ...workflow, workers: [], missingWorkers: [] })),
  ];

  async function github(pathname, authToken = token) {
    const response = await fetchImpl(`${apiRoot}${pathname}`, {
      headers: {
        Accept: "application/vnd.github.full+json",
        Authorization: `Bearer ${authToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status} for ${pathname}`);
    return response.json();
  }

  async function githubOptional(pathname, fallback) {
    try {
      return await github(pathname);
    } catch (error) {
      console.warn(`${error.message}; continuing without optional repository metadata`);
      return fallback;
    }
  }

  const hasPrivateData = deployedInventory.includePrivate === true
    || (deployedInventory.workflows || []).some((workflow) => workflow.visibility === "private")
    || (deployedInventory.bundles || []).some((bundle) => bundle.visibility === "private");
  if (hasPrivateData) {
    const pages = await github(`/repos/${owner}/${repo}/pages`, pagesToken);
    if (pages.public !== false) {
      throw new Error(`Refusing to publish private repository data because GitHub Pages for ${repository} is not private`);
    }
  }

  async function githubPages(pathname, maxPages = 10) {
    const separator = pathname.includes("?") ? "&" : "?";
    const items = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const batch = await github(`${pathname}${separator}per_page=100&page=${page}`);
      if (!Array.isArray(batch)) throw new Error(`Expected an array from ${pathname}`);
      items.push(...batch);
      if (batch.length < 100) break;
    }
    return items;
  }

  async function repositoryReportSources(repositoryName) {
    const required = repositoryName.toLowerCase() === repository.toLowerCase();
    const optional = async (loader, fallback) => {
      try {
        return await loader();
      } catch (error) {
        if (required) throw error;
        console.warn(`${error.message}; durable reports will be incomplete for ${repositoryName}`);
        return fallback;
      }
    };
    const [issues, comments, artifacts] = await Promise.all([
      optional(() => githubPages(`/repos/${repositoryName}/issues?state=all&sort=updated&direction=desc`), []),
      optional(() => githubPages(`/repos/${repositoryName}/issues/comments?sort=updated&direction=desc`), []),
      optional(() => github(`/repos/${repositoryName}/actions/artifacts?per_page=100`), { artifacts: [] }),
    ]);
    return { repository: repositoryName, issues, comments, artifacts: artifacts.artifacts || [] };
  }

  async function recordFromArtifact(artifact, outputRepository) {
    if (artifact.expired || !artifact.name.startsWith("review-")) return null;
    const runId = artifact.workflow_run?.id;
    if (!runId) return null;
    const run = await github(`/repos/${outputRepository}/actions/runs/${runId}`);
    const bundle = bundleFor(reportDefinitions, run.name, run.display_title, artifact.name);
    return {
      id: `${outputRepository}-artifact-${artifact.id}`,
      bundle: bundle?.id || "",
      kind: "review-bundle",
      mode: "review",
      title: artifact.name,
      summary: `Artifact-backed proposal from ${run.display_title || run.name}.`,
      state: "available",
      url: safeUrl(run.html_url),
      createdAt: artifact.created_at,
      updatedAt: artifact.updated_at,
      workflow: run.name,
      runUrl: safeUrl(run.html_url),
      repository: targetRepositoryFromRun(run, outputRepository, allowedRepositories, owner),
      outputRepository,
      runtimeRepository: outputRepository,
      workflowPath: run.path || "",
      workflowId: run.path?.split("/").at(-1)?.replace(/\.lock\.yml$/, "") || "",
      bundleId: "",
      correlationId: String(runId),
      conclusion: run.conclusion || "unknown",
      aic: null,
      warning: false,
    };
  }

  const reportRepositoryNames = [...new Set([
    repository,
    ...(deployedInventory.workflows || []).map((workflow) => workflow.repository),
    ...(deployedInventory.allowedRepositories || []),
    ...allowedRepositories,
  ].filter(Boolean))].sort();
  const reportSources = await mapWithConcurrency(reportRepositoryNames, 4, repositoryReportSources);
  const issueByUrl = new Map(reportSources.flatMap((source) => source.issues.map((issue) => [issue.url, issue])));
  const runCache = new Map();

  async function metadataFromRunUrl(runUrl) {
    const match = runUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)/);
    if (!match) return { mode: "unknown", conclusion: "unknown", repository: "", runtimeRepository: "", workflowPath: "", workflowId: "", workflowName: "" };
    const [, runOwner, runRepository, runId] = match;
    const cacheKey = `${runOwner}/${runRepository}/${runId}`;
    if (!runCache.has(cacheKey)) {
      runCache.set(cacheKey, githubOptional(`/repos/${runOwner}/${runRepository}/actions/runs/${runId}`, null));
    }
    const run = await runCache.get(cacheKey);
    const mode = run?.display_title?.match(/(?:^|\s[·|:-]\s)(review|live)$/i)?.[1]?.toLowerCase();
    const workflowPath = run?.path || "";
    return {
      mode: normalizeMode(mode),
      conclusion: run?.conclusion || "unknown",
      repository: targetRepositoryFromRun(run, `${runOwner}/${runRepository}`, allowedRepositories, owner),
      runtimeRepository: `${runOwner}/${runRepository}`,
      workflowPath,
      workflowId: workflowPath.split("/").at(-1)?.replace(/\.lock\.yml$/, "") || "",
      workflowName: run?.name || "",
    };
  }

  const discoveredRecords = [
    ...reportSources.flatMap((source) => source.issues
      .map((issue) => recordFromIssue(issue, source.repository, reportDefinitions)).filter(Boolean)),
    ...reportSources.flatMap((source) => source.comments
      .map((comment) => recordFromComment(comment, issueByUrl, source.repository, reportDefinitions)).filter(Boolean)),
    ...(await Promise.all(reportSources.flatMap((source) => source.artifacts
      .map((artifact) => recordFromArtifact(artifact, source.repository))))).filter(Boolean),
  ];
  const records = (await Promise.all(discoveredRecords.map(async (record) => {
    const metadata = record.mode && record.conclusion
      ? { mode: record.mode, conclusion: record.conclusion, runtimeRepository: "", workflowPath: "", workflowId: "", workflowName: "" }
      : await metadataFromRunUrl(record.runUrl);
    const producerBundle = metadata.runtimeRepository?.toLowerCase() === repository.toLowerCase()
      ? bundleDefinitions.find((definition) => definition.workers.some((worker) => worker.id === metadata.workflowId))
      : null;
    const bundle = bundleDefinitions.find((definition) => definition.id === record.bundle) || producerBundle;
    const inferredMode = record.outputRepository?.toLowerCase() === record.repository?.toLowerCase() ? "live" : "review";
    return {
      ...record,
      bundle: bundle?.id || "",
      mode: normalizeMode(record.mode) !== "unknown"
        ? normalizeMode(record.mode)
        : metadata.mode !== "unknown"
          ? metadata.mode
          : bundle
            ? configuredModeFor(bundle, controlSettings)
            : inferredMode,
      conclusion: record.conclusion || metadata.conclusion,
      repository: record.repository || metadata.repository || "",
      runtimeRepository: record.runtimeRepository || metadata.runtimeRepository || "",
      workflowPath: record.workflowPath || metadata.workflowPath || "",
      workflowId: record.workflowId || metadata.workflowId || "",
      workflow: metadata.workflowName || record.workflow,
    };
  }))).sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  const scopedRecords = allowedRepositories.size === 0
    ? records
    : records.filter((record) => allowedRepositories.has(record.repository.toLowerCase()));
  return { generatedAt, repository, inventory, records: scopedRecords };
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const controlSettingsPath = process.env.REPORT_CONTROL_SETTINGS;
  const inventoryPath = process.env.REPORT_INVENTORY;
  const deployedWorkflowsPath = process.env.REPORT_DEPLOYED_WORKFLOWS || "_inventory/deployed-workflows.json";
  const outputPath = process.env.REPORT_RECORDS;
  if (!repository || !token || !controlSettingsPath || !inventoryPath || !outputPath) {
    throw new Error("GITHUB_REPOSITORY, GITHUB_TOKEN, REPORT_CONTROL_SETTINGS, REPORT_INVENTORY, and REPORT_RECORDS are required");
  }
  const inventory = readJson(inventoryPath);
  if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.workflows) || !Array.isArray(inventory.bundles)) {
    throw new Error(`Unsupported or invalid control-plane inventory: ${inventoryPath}`);
  }
  const deployedInventory = existsSync(deployedWorkflowsPath)
    ? readJson(deployedWorkflowsPath)
    : { schemaVersion: 1, organization: repository.split("/")[0], repositoryCount: 0, bundles: [], workflows: [] };
  const records = await collectDashboardRecords({
    repository,
    token,
    pagesToken: process.env.REPORT_PAGES_TOKEN || token,
    controlSettings: readJson(controlSettingsPath),
    inventory,
    deployedInventory,
    requestedRepositories: (process.env.REPORT_ALLOWED_REPOS || "").split(","),
  });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(records, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}