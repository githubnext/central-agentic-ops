import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const outputDirectory = process.env.REPORT_OUTPUT || "_site";
const inventoryPath = process.env.REPORT_INVENTORY;
const valueReportRoot = process.env.REPORT_VALUE_ROOT || ".github/value";
const deployedWorkflowsPath = process.env.REPORT_DEPLOYED_WORKFLOWS || "_inventory/deployed-workflows.json";

if (!repository || !token || !inventoryPath) {
  throw new Error("GITHUB_REPOSITORY, GITHUB_TOKEN, and REPORT_INVENTORY are required");
}

const [owner, repo] = repository.split("/");
const apiRoot = "https://api.github.com";
const generatedAt = new Date().toISOString();
const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
const deployedInventory = existsSync(deployedWorkflowsPath)
  ? JSON.parse(readFileSync(deployedWorkflowsPath, "utf8"))
  : { schemaVersion: 1, organization: owner, repositoryCount: 0, bundles: [], workflows: [] };
if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.workflows) || !Array.isArray(inventory.bundles)) {
  throw new Error(`Unsupported or invalid control-plane inventory: ${inventoryPath}`);
}
const bundleDefinitions = inventory.bundles;
const standaloneDefinitions = inventory.standalone;
const workerDefinitions = bundleDefinitions.flatMap((bundle) => bundle.workers.map((worker) => ({ ...worker, bundleId: bundle.id, bundleName: bundle.name })));
const workerIds = new Set(workerDefinitions.map((worker) => worker.id));

async function loadValueTimelines() {
  const timelines = new Map();
  let paths = [];
  try {
    paths = await readdir(valueReportRoot, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const relativePath of paths.filter((candidate) => candidate.endsWith("-timeline.json"))) {
    const timelinePath = path.join(valueReportRoot, relativePath);
    const timeline = JSON.parse(readFileSync(timelinePath, "utf8"));
    if (timeline.schemaVersion !== 2 || !workerIds.has(timeline.workflowSlug) || !Array.isArray(timeline.snapshots) || timeline.snapshots.length < 2) continue;
    timelines.set(timeline.workflowSlug, {
      timeline,
      timelinePath,
      svgPath: timelinePath.replace(/-timeline\.json$/, "-timeline.svg"),
      definitionsPath: timelinePath.replace(/-timeline\.json$/, "-definitions.md"),
    });
  }
  return timelines;
}

const valueTimelines = await loadValueTimelines();
const reportDefinitions = [
  ...bundleDefinitions,
  ...standaloneDefinitions.map((workflow) => ({ ...workflow, workers: [], missingWorkers: [] })),
];

async function github(pathname) {
  const response = await fetch(`${apiRoot}${pathname}`, {
    headers: {
      Accept: "application/vnd.github.full+json",
      Authorization: `Bearer ${token}`,
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

function bundleFor(...values) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return reportDefinitions.find((definition) => {
    const terms = [definition.id, definition.name, ...(definition.workers || []).flatMap((worker) => [worker.id, worker.name, worker.trackerId])];
    return terms.filter(Boolean).some((term) => text.includes(String(term).toLowerCase()));
  }) || null;
}

function workflowFrom(body = "") {
  const heading = body.match(/^###\s+(.+)$/m)?.[1]?.trim();
  const provenance = body.match(/Generated from \[([^\]]+)\]\([^)]*\/actions\/runs\/\d+\)/)?.[1];
  return provenance || heading || "Agentic workflow";
}

function runUrlFrom(body = "") {
  return body.match(/https:\/\/github\.com\/[^\s)]+\/actions\/runs\/\d+/)?.[0] || "";
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

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[character]);
}

function formatDate(value) {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDay(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function recordFromIssue(issue) {
  const workflow = workflowFrom(issue.body || "");
  const generatedSafeOutput = /Generated (?:from|with) \[[^\]]+\]\([^)]*\/actions\/runs\/\d+\)/.test(issue.body || "");
  const bundle = bundleFor(issue.title, workflow, issue.body);
  const generatedSafeOutputTitle = /^\[[^\]]+\]\s/.test(issue.title) && bundle;
  if (!generatedSafeOutputTitle && !generatedSafeOutput) return null;
  if (!bundle || issue.title === "[aw] No-Op Runs") return null;
  return {
    id: `${issue.pull_request ? "pr" : "issue"}-${issue.number}`,
    bundle: bundle.id,
    kind: issue.pull_request ? "pull-request" : "issue",
    title: issue.title,
    summary: summarize(issue.body),
    bodyHtml: issue.body_html || "",
    state: issue.state.toLowerCase(),
    url: safeUrl(issue.html_url),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    workflow,
    runUrl: runUrlFrom(issue.body),
    bundleId: markerFrom(issue.body, "bundle"),
    correlationId: markerFrom(issue.body, "correlation"),
    aic: aicFrom(issue.body),
    warning: hasReportWarning(issue.body_html),
  };
}

function recordFromComment(comment, issueByUrl) {
  const issue = issueByUrl.get(comment.issue_url);
  const body = comment.body || "";
  const workflow = workflowFrom(body);
  const bundle = bundleFor(workflow, issue?.title, body);
  const generatedSafeOutput = /Generated from \[[^\]]+\]\([^)]*\/actions\/runs\/\d+\)/.test(body);
  if (!bundle || !generatedSafeOutput) return null;
  const noop = issue?.title === "[aw] No-Op Runs";
  return {
    id: `comment-${comment.id}`,
    bundle: bundle.id,
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
    bundleId: markerFrom(body, "bundle"),
    correlationId: markerFrom(body, "correlation"),
    aic: aicFrom(body),
    warning: hasReportWarning(comment.body_html),
  };
}

async function recordFromArtifact(artifact) {
  if (artifact.expired || !artifact.name.startsWith("review-")) return null;
  const runId = artifact.workflow_run?.id;
  if (!runId) return null;
  const run = await github(`/repos/${owner}/${repo}/actions/runs/${runId}`);
  const bundle = bundleFor(run.name, run.display_title, artifact.name);
  if (!bundle) return null;
  return {
    id: `artifact-${artifact.id}`,
    bundle: bundle.id,
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
    bundleId: "",
    correlationId: String(runId),
    conclusion: run.conclusion || "unknown",
    aic: null,
    warning: false,
  };
}

function statusClass(record) {
  if (["open", "available", "published"].includes(record.state)) return "status-attention";
  if (record.kind === "noop" || ["complete", "closed", "merged"].includes(record.state)) return "status-success";
  return "status-muted";
}

function itemMarkup(record) {
  const runUrl = safeUrl(record.runUrl);
  return `<article class="discussion-row" id="${escapeHtml(record.id)}">
    <div class="discussion-vote" aria-hidden="true">${octicon("issue")}<span>0</span></div>
    <div class="discussion-category">${octicon(record.kind === "noop" ? "check-circle" : "issue")}</div>
    <div class="discussion-main">
      <h3><a href="../outcomes/${escapeHtml(record.id)}.html">${escapeHtml(record.title)}</a></h3>
      <p>${escapeHtml(record.summary || "No summary was provided.")}</p>
      <div class="discussion-meta"><span class="mode-badge mode-${escapeHtml(record.mode)}">${escapeHtml(record.mode)}</span><span class="kind">${escapeHtml(record.kind.replaceAll("-", " "))}</span><span class="status ${statusClass(record)}">${escapeHtml(record.state)}</span><span>${escapeHtml(record.workflow)}</span><span>updated ${escapeHtml(formatDate(record.updatedAt))}</span>${runUrl ? `<a href="${escapeHtml(runUrl)}">workflow run</a>` : ""}</div>
    </div>
  </article>`;
}

function outcomeListing(recordsForPage) {
  const actionable = recordsForPage.filter((record) => record.kind !== "noop").length;
  return `<div class="discussion-layout">
    <aside class="discussion-sidebar" aria-label="Outcome categories">
      <h2>Categories</h2>
      <div class="category-current">${octicon("issue")}<span>All outcomes</span><strong>${recordsForPage.length}</strong></div>
      <div>${octicon("play")}<span>Actionable</span><strong>${actionable}</strong></div>
      <div>${octicon("check-circle")}<span>No action</span><strong>${recordsForPage.length - actionable}</strong></div>
    </aside>
    <section class="discussion-list" aria-labelledby="outcomes-heading">
      <div class="discussion-toolbar"><h2 id="outcomes-heading">Outcomes</h2><span>Latest activity</span></div>
      <div class="records">${recordsForPage.map(itemMarkup).join("\n") || '<p class="empty">No outcomes have been recorded yet.</p>'}</div>
    </section>
  </div>`;
}

function findingsListing(recordsForPage) {
  const open = recordsForPage.filter((record) => ["open", "available", "published"].includes(record.state)).length;
  const resolved = recordsForPage.length - open;
  const rows = recordsForPage.map((record) => `<article class="finding-row" id="${escapeHtml(record.id)}">
    <div class="finding-icon">${octicon(record.kind === "noop" ? "check-circle" : "issue")}</div>
    <div class="finding-report">
      <h3><a href="../outcomes/${escapeHtml(record.id)}.html" title="${escapeHtml(record.title)}">${escapeHtml(record.title)}</a></h3>
      <p title="${escapeHtml(record.summary || "No report summary was provided.")}">${escapeHtml(record.summary || "No report summary was provided.")}</p>
    </div>
    <span class="status ${statusClass(record)}">${escapeHtml(record.state)}</span>
    <span class="finding-workflow" title="Workflow">${escapeHtml(record.workflow)}</span>
    <span class="kind">${escapeHtml(record.kind.replaceAll("-", " "))}</span>
    <time datetime="${escapeHtml(record.updatedAt)}">${escapeHtml(formatDate(record.updatedAt))}</time>
  </article>`).join("\n");
  return `<section class="findings-index" aria-labelledby="findings-heading">
    <div class="findings-search" aria-hidden="true">${octicon("issue")}<span>Filter reports</span></div>
    <div class="findings-header">
      <h2 id="findings-heading">Reports</h2>
      <div><strong>${open}</strong> Open <span><strong>${resolved}</strong> Resolved</span></div>
    </div>
    <div class="finding-columns" aria-hidden="true"><span>Report</span><span>Status</span><span>Workflow</span><span>Type</span><span>Updated</span></div>
    <div class="finding-rows">${rows || '<p class="empty">No reports have been recorded for this mode.</p>'}</div>
  </section>`;
}

function modeSummary(recordsForBundle, mode) {
  const modeRecords = recordsForBundle.filter((record) => record.mode === mode);
  const latest = modeRecords[0];
  return `${modeRecords.length}${latest ? ` · ${formatDate(latest.updatedAt)}` : ""}`;
}

function modeTabs(bundle, selectedMode) {
  const tabs = [
    ["staged", "Staged", "No writes"],
    ["review", "Review", "Proposals"],
    ["live", "Live", "Production"],
  ];
  return `<nav class="mode-tabs" aria-label="Output mode">${tabs.map(([mode, label, detail]) => `<a href="${bundle.id}-${mode}.html"${selectedMode === mode ? ' aria-current="page"' : ""}><span>${label}</span><small>${detail}</small></a>`).join("")}</nav>`;
}

function configuredModeFor(bundle) {
  const mode = repositoryVariables.get(bundle.rolloutModeVariable) || "staged";
  return normalizeMode(mode) === "unknown" ? "staged" : normalizeMode(mode);
}

function modeIndicator(mode) {
  const icons = { staged: "eye", review: "beaker", live: "rocket" };
  const label = `${mode[0].toUpperCase()}${mode.slice(1)}`;
  return `<span class="mode-indicator mode-${mode}" title="Configured mode: ${label}">${octicon(icons[mode])}<span>${label}</span></span>`;
}

function octicon(name, className = "") {
  return `<svg class="octicon octicon-${name}${className ? ` ${className}` : ""}" aria-hidden="true" focusable="false"><use href="#octicon-${name}"></use></svg>`;
}

function octiconSprite() {
  return `<svg class="octicon-sprite" aria-hidden="true" focusable="false">
    <symbol id="octicon-mark-github" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.64 0 8.13c0 3.59 2.29 6.64 5.47 7.71.4.08.55-.18.55-.39 0-.19-.01-.82-.01-1.49-2.01.44-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.59 1.23.83.72 1.22 1.87.88 2.33.67.07-.53.28-.88.51-1.08-1.78-.21-3.64-.91-3.64-4.02 0-.89.31-1.62.82-2.19-.08-.2-.36-1.04.08-2.16 0 0 .67-.22 2.2.84A7.5 7.5 0 0 1 8 3.85a7.5 7.5 0 0 1 2 .27c1.53-1.06 2.2-.84 2.2-.84.44 1.12.16 1.96.08 2.16.51.57.82 1.3.82 2.19 0 3.12-1.87 3.81-3.65 4.02.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.47.55.39A8.01 8.01 0 0 0 16 8.13C16 3.64 12.42 0 8 0Z"></path></symbol>
    <symbol id="octicon-code" viewBox="0 0 16 16"><path d="M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L.47 8.53a.75.75 0 0 1 0-1.06Zm6.56 0 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L13.94 8l-3.72-3.72a.75.75 0 1 1 1.06-1.06Z"></path></symbol>
    <symbol id="octicon-issue" viewBox="0 0 16 16"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11Zm-.75-9.25a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0ZM8 9.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"></path></symbol>
    <symbol id="octicon-pull-request" viewBox="0 0 16 16"><path d="M3.25 1.75a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM2.5 6.75v5.19a1.75 1.75 0 1 0 1.5 0V6.75a.75.75 0 0 0-1.5 0Zm10.25 4a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM8.5 2.5a.75.75 0 0 0 0 1.5h1.75A1.75 1.75 0 0 1 12 5.75v3a.75.75 0 0 0 1.5 0v-3a3.25 3.25 0 0 0-3.25-3.25Z"></path></symbol>
    <symbol id="octicon-play" viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm6.25-2.11a.75.75 0 0 1 1.14-.64l3 1.86a.75.75 0 0 1 0 1.28l-3 1.86a.75.75 0 0 1-1.14-.64Z"></path></symbol>
    <symbol id="octicon-eye" viewBox="0 0 16 16"><path d="M8 2c3.7 0 6.5 3.2 7.5 5.3a1.6 1.6 0 0 1 0 1.4C14.5 10.8 11.7 14 8 14S1.5 10.8.5 8.7a1.6 1.6 0 0 1 0-1.4C1.5 5.2 4.3 2 8 2Zm0 1.5c-2.9 0-5.3 2.6-6.1 4.4a.2.2 0 0 0 0 .2c.8 1.8 3.2 4.4 6.1 4.4s5.3-2.6 6.1-4.4a.2.2 0 0 0 0-.2C13.3 6.1 10.9 3.5 8 3.5Zm0 1.75a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5Zm0 1.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"></path></symbol>
    <symbol id="octicon-home" viewBox="0 0 16 16"><path d="M6.906.664a1.749 1.749 0 0 1 2.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0 1 13.25 15h-3.5a.75.75 0 0 1-.75-.75V9H7v5.25a.75.75 0 0 1-.75.75h-3.5A1.75 1.75 0 0 1 1 13.25V6.23c0-.531.242-1.034.657-1.366l5.25-4.2Zm1.25 1.171a.25.25 0 0 0-.312 0l-5.25 4.2a.25.25 0 0 0-.094.196v7.019c0 .138.112.25.25.25H5.5V8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v5.25h2.75a.25.25 0 0 0 .25-.25V6.23a.251.251 0 0 0-.094-.195Z"></path></symbol>
    <symbol id="octicon-shield" viewBox="0 0 16 16"><path d="M7.467.133a1.748 1.748 0 0 1 1.066 0l5.25 1.68A1.75 1.75 0 0 1 15 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.697 1.697 0 0 1-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 0 1 1.217-1.667Zm.61 1.429a.25.25 0 0 0-.153 0l-5.25 1.68a.25.25 0 0 0-.174.238V7c0 1.358.275 2.666 1.057 3.86.784 1.194 2.121 2.34 4.366 3.297a.196.196 0 0 0 .154 0c2.245-.956 3.582-2.104 4.366-3.298C13.225 9.666 13.5 8.36 13.5 7V3.48a.251.251 0 0 0-.174-.237l-5.25-1.68ZM8.75 4.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 1.5 0ZM9 10.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></symbol>
    <symbol id="octicon-meter" viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 1 0 6.016 4.035.75.75 0 0 1 1.388-.57 8 8 0 1 1-4.37-4.37.75.75 0 1 1-.569 1.389A6.473 6.473 0 0 0 8 1.5Zm6.28.22a.75.75 0 0 1 0 1.06l-4.063 4.064a2.5 2.5 0 1 1-1.06-1.06L13.22 1.72a.75.75 0 0 1 1.06 0ZM7 8a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z"></path></symbol>
    <symbol id="octicon-goal" viewBox="0 0 16 16"><path d="M13.637 2.363h-.001l1.676.335c.09.018.164.084.19.173a.25.25 0 0 1-.062.249l-1.373 1.374a.876.876 0 0 1-.619.256H12.31L9.45 7.611A1.5 1.5 0 1 1 6.5 8a1.501 1.501 0 0 1 1.889-1.449l2.861-2.862V2.552c0-.232.092-.455.256-.619L12.88.559a.25.25 0 0 1 .249-.062c.089.026.155.1.173.19Z"></path><path d="M2 8a6 6 0 1 0 11.769-1.656.751.751 0 1 1 1.442-.413 7.502 7.502 0 0 1-12.513 7.371A7.501 7.501 0 0 1 10.069.789a.75.75 0 0 1-.413 1.442A6.001 6.001 0 0 0 2 8Z"></path><path d="M5 8a3.002 3.002 0 0 0 4.699 2.476 3 3 0 0 0 1.28-2.827.748.748 0 0 1 1.045-.782.75.75 0 0 1 .445.61A4.5 4.5 0 1 1 8.516 3.53a.75.75 0 1 1-.17 1.49A3 3 0 0 0 5 8Z"></path></symbol>
    <symbol id="octicon-graph" viewBox="0 0 16 16"><path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"></path></symbol>
    <symbol id="octicon-codescan" viewBox="0 0 16 16"><path d="M8.47 4.97a.75.75 0 0 0 0 1.06L9.94 7.5 8.47 8.97a.75.75 0 1 0 1.06 1.06l2-2a.75.75 0 0 0 0-1.06l-2-2a.75.75 0 0 0-1.06 0ZM6.53 6.03a.75.75 0 0 0-1.06-1.06l-2 2a.75.75 0 0 0 0 1.06l2 2a.75.75 0 1 0 1.06-1.06L5.06 7.5l1.47-1.47Z"></path><path d="M12.246 13.307a7.501 7.501 0 1 1 1.06-1.06l2.474 2.473a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM1.5 7.5a6.002 6.002 0 0 0 3.608 5.504 6.002 6.002 0 0 0 6.486-1.117.748.748 0 0 1 .292-.293A6 6 0 1 0 1.5 7.5Z"></path></symbol>
    <symbol id="octicon-dependabot" viewBox="0 0 16 16"><path d="M5.75 7.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm5.25.75a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0v-1.5Z"></path><path d="M6.25 0h2A.75.75 0 0 1 9 .75V3.5h3.25a2.25 2.25 0 0 1 2.25 2.25V8h.75a.75.75 0 0 1 0 1.5h-.75v2.75a2.25 2.25 0 0 1-2.25 2.25h-8.5a2.25 2.25 0 0 1-2.25-2.25V9.5H.75a.75.75 0 0 1 0-1.5h.75V5.75A2.25 2.25 0 0 1 3.75 3.5H7.5v-2H6.25a.75.75 0 0 1 0-1.5ZM3 5.75v6.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-6.5a.75.75 0 0 0-.75-.75h-8.5a.75.75 0 0 0-.75.75Z"></path></symbol>
    <symbol id="octicon-key" viewBox="0 0 16 16"><path d="M10.5 0a5.499 5.499 0 1 1-1.288 10.848l-.932.932a.749.749 0 0 1-.53.22H7v.75a.749.749 0 0 1-.22.53l-.5.5a.749.749 0 0 1-.53.22H5v.75a.749.749 0 0 1-.22.53l-.5.5a.749.749 0 0 1-.53.22h-2A1.75 1.75 0 0 1 0 14.25v-2c0-.199.079-.389.22-.53l4.932-4.932A5.5 5.5 0 0 1 10.5 0Zm-4 5.5c-.001.431.069.86.205 1.269a.75.75 0 0 1-.181.768L1.5 12.56v1.69c0 .138.112.25.25.25h1.69l.06-.06v-1.19a.75.75 0 0 1 .75-.75h1.19l.06-.06v-1.19a.75.75 0 0 1 .75-.75h1.19l1.023-1.025a.75.75 0 0 1 .768-.18A4 4 0 1 0 6.5 5.5ZM11 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></symbol>
    <symbol id="octicon-beaker" viewBox="0 0 16 16"><path d="M5 5.782V2.5h-.25a.75.75 0 0 1 0-1.5h6.5a.75.75 0 0 1 0 1.5H11v3.282l3.666 5.76C15.619 13.04 14.543 15 12.767 15H3.233c-1.776 0-2.852-1.96-1.899-3.458Zm-2.4 6.565a.75.75 0 0 0 .633 1.153h9.534a.75.75 0 0 0 .633-1.153L12.225 10.5h-8.45ZM9.5 2.5h-3V6c0 .143-.04.283-.117.403L4.73 9h6.54L9.617 6.403A.746.746 0 0 1 9.5 6Z"></path></symbol>
    <symbol id="octicon-rocket" viewBox="0 0 16 16"><path d="M14.064 0h.186C15.216 0 16 .784 16 1.75v.186a8.752 8.752 0 0 1-2.564 6.186l-.458.459c-.314.314-.641.616-.979.904v3.207c0 .608-.315 1.172-.833 1.49l-2.774 1.707a.749.749 0 0 1-1.11-.418l-.954-3.102a1.214 1.214 0 0 1-.145-.125L3.754 9.816a1.218 1.218 0 0 1-.124-.145L.528 8.717a.749.749 0 0 1-.418-1.11l1.71-2.774A1.748 1.748 0 0 1 3.31 4h3.204c.288-.338.59-.665.904-.979l.459-.458A8.749 8.749 0 0 1 14.064 0ZM8.938 3.623h-.002l-.458.458c-.76.76-1.437 1.598-2.02 2.5l-1.5 2.317 2.143 2.143 2.317-1.5c.902-.583 1.74-1.26 2.499-2.02l.459-.458a7.25 7.25 0 0 0 2.123-5.127V1.75a.25.25 0 0 0-.25-.25h-.186a7.249 7.249 0 0 0-5.125 2.123ZM3.56 14.56c-.732.732-2.334 1.045-3.005 1.148a.234.234 0 0 1-.201-.064.234.234 0 0 1-.064-.201c.103-.671.416-2.273 1.15-3.003a1.502 1.502 0 1 1 2.12 2.12Zm6.94-3.935c-.088.06-.177.118-.266.175l-2.35 1.521.548 1.783 1.949-1.2a.25.25 0 0 0 .119-.213ZM3.678 8.116 5.2 5.766c.058-.09.117-.178.176-.266H3.309a.25.25 0 0 0-.213.119l-1.2 1.95ZM12 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></symbol>
    <symbol id="octicon-gear" viewBox="0 0 16 16"><path d="M8 3.75a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Zm0 4a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm5.66.28-.28-.38a1.75 1.75 0 0 1 0-2.1l.28-.38a1.75 1.75 0 0 0-1.58-2.74l-.47.07a1.75 1.75 0 0 1-1.83-1l-.2-.43a1.75 1.75 0 0 0-3.16 0l-.2.43a1.75 1.75 0 0 1-1.83 1l-.47-.07a1.75 1.75 0 0 0-1.58 2.74l.28.38a1.75 1.75 0 0 1 0 2.1l-.28.38a1.75 1.75 0 0 0 1.58 2.74l.47-.07a1.75 1.75 0 0 1 1.83 1l.2.43a1.75 1.75 0 0 0 3.16 0l.2-.43a1.75 1.75 0 0 1 1.83-1l.47.07a1.75 1.75 0 0 0 1.58-2.74Z"></path></symbol>
    <symbol id="octicon-settings" viewBox="0 0 16 16"><path d="M1.75 3.25h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5Zm9 0h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5ZM9 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 1.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1ZM1.75 7.25h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5Zm5 0h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5ZM5 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 1.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Zm-3.25 3.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Zm10 0h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5ZM10 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 1.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z"></path></symbol>
    <symbol id="octicon-check-circle" viewBox="0 0 16 16"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm3.03 2.97a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 0 1 1.06-1.06L7 8.44l2.97-2.97a.75.75 0 0 1 1.06 0Z"></path></symbol>
    <symbol id="octicon-package" viewBox="0 0 16 16"><path d="m8.88.49 5.75 2.88c.23.11.37.34.37.59v8.08c0 .25-.14.48-.37.59l-5.75 2.88a1.97 1.97 0 0 1-1.76 0l-5.75-2.88A.66.66 0 0 1 1 12.04V3.96c0-.25.14-.48.37-.59L7.12.49a1.97 1.97 0 0 1 1.76 0ZM8 1.83 3.02 4.32 8 6.81l4.98-2.49L8 1.83Zm-5.5 3.7v6.11l4.75 2.38V7.91L2.5 5.53Zm6.25 8.49 4.75-2.38V5.53L8.75 7.91v6.11Z"></path></symbol>
    <symbol id="octicon-external-link" viewBox="0 0 16 16"><path d="M3.75 2h3a.75.75 0 0 1 0 1.5h-3a.25.25 0 0 0-.25.25v8.5c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3a.75.75 0 0 1 1.5 0v3A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.78 2.78 2 3.75 2Zm5.5-.75A.75.75 0 0 1 10 0h5.25c.41 0 .75.34.75.75V6a.75.75 0 0 1-1.5 0V2.56L8.78 8.28a.75.75 0 0 1-1.06-1.06l5.72-5.72H10a.75.75 0 0 1-.75-.75Z"></path></symbol>
  </svg>`;
}

function layout({ title, description, content, nested = false, navigation = "", configuredMode = "", overviewMode = "", campaignType = "", activeSection = "", activeBundle = "" }) {
  const root = nested ? "../" : "./";
  const stylesheetLink = `<${"link"} rel="stylesheet" href="${root}styles.css">`;
  const overviewCurrent = nested || campaignType || activeSection ? "" : ' aria-current="page"';
  const campaignsCurrent = campaignType ? ' aria-current="page"' : "";
  const insightLinks = bundleDefinitions.map((bundle) => {
    const current = activeSection === "insights" && activeBundle === bundle.id ? ' aria-current="page"' : "";
    const icon = bundle.id.includes("dependabot") ? "dependabot" : "graph";
    return `<a href="${root}insights/${bundle.id}.html"${current}>${octicon(icon)}<span>${escapeHtml(bundle.name)}</span></a>`;
  }).join("\n");
  const findingLinks = bundleDefinitions.map((bundle) => {
    const current = activeSection === "findings" && activeBundle === bundle.id ? ' aria-current="page"' : "";
    const icon = bundle.id.includes("dependabot") ? "dependabot" : "codescan";
    return `<a href="${root}bundles/${bundle.id}.html"${current}>${octicon(icon)}<span>${escapeHtml(bundle.name)}</span></a>`;
  }).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>
  ${stylesheetLink}
</head>
<body>
  ${octiconSprite()}
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="app-shell">
    <aside class="org-sidebar" aria-label="Central Agentic Ops navigation">
      <a class="sidebar-brand" href="${root}">Central Agentic Ops</a>
      <nav class="primary-nav" aria-label="Primary">
        <a href="${root}"${overviewCurrent}>${octicon("home")}<span>Overview</span></a>
        <a href="${root}campaigns.html"${campaignsCurrent}>${octicon("goal")}<span>Campaigns</span></a>
      </nav>
      <div class="sidebar-group">
        <p>Insights</p>
        <nav aria-label="Insights">${insightLinks}</nav>
      </div>
      <div class="sidebar-group findings-nav">
        <p>Findings</p>
        <nav aria-label="Findings">${findingLinks}</nav>
      </div>
      <div class="sidebar-repository"><span>Repository</span><a href="https://github.com/${escapeHtml(repository)}">${escapeHtml(repository)}</a></div>
    </aside>
    <div class="app-main">
      ${navigation}
      <main id="main">
        <header class="overview-header" aria-labelledby="page-title">
          <div>
            <div class="title-area"><h1 id="page-title">${escapeHtml(title)}</h1>${configuredMode ? modeIndicator(configuredMode) : ""}</div>
            <p class="lede">${escapeHtml(description)}</p>
          </div>
          ${nested ? `<p class="freshness">Last updated ${escapeHtml(formatDate(generatedAt))}</p>` : ""}
        </header>
        ${campaignType || activeSection === "workflows" ? "" : `<div class="toolbar" aria-label="Report controls">
          <div class="filter-control"><span class="scope-label">${octicon("issue")}<strong>Filter</strong><span class="count-badge">3</span></span><code>mode:staged mode:review mode:live</code><span class="search-control" aria-hidden="true">${octicon("eye")}</span></div>
          <span class="scope-period">${overviewMode ? "Last 30 days" : "All recorded"}</span>
          <a class="export-control" href="${root}records.json">Export JSON</a>
        </div>`}
        ${nested || campaignType || activeSection === "workflows" ? "" : '<p class="scope-note">Results are based on the workflows and durable outputs available in this repository.</p>'}
        <div class="report-body">${content}</div>
      </main>
      <footer>Generated deterministically from GitHub repository data. <a href="https://github.com/${escapeHtml(repository)}/actions">View workflow provenance</a>.</footer>
    </div>
  </div>
</body>
</html>`;
}

const [issues, comments, artifactResponse, variableResponse] = await Promise.all([
  githubPages(`/repos/${owner}/${repo}/issues?state=all&sort=updated&direction=desc`),
  githubPages(`/repos/${owner}/${repo}/issues/comments?sort=updated&direction=desc`),
  github(`/repos/${owner}/${repo}/actions/artifacts?per_page=100`),
  githubOptional(`/repos/${owner}/${repo}/actions/variables?per_page=100`, { variables: [] }),
]);
const repositoryVariables = new Map((variableResponse.variables || []).map((variable) => [variable.name, variable.value]));
const issueByUrl = new Map(issues.map((issue) => [issue.url, issue]));
const runCache = new Map();
function normalizeMode(mode) {
  if (mode === "preview") return "staged";
  return ["staged", "review", "live"].includes(mode) ? mode : "unknown";
}

async function metadataFromRunUrl(runUrl) {
  const match = runUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)/);
  if (!match) return { mode: "unknown", conclusion: "unknown", repository: "" };
  const [, runOwner, runRepository, runId] = match;
  const cacheKey = `${runOwner}/${runRepository}/${runId}`;
  if (!runCache.has(cacheKey)) {
    runCache.set(cacheKey, githubOptional(`/repos/${runOwner}/${runRepository}/actions/runs/${runId}`, null));
  }
  const run = await runCache.get(cacheKey);
  const mode = run?.display_title?.match(/(?:^|\s[·|:-]\s)(preview|staged|review|live)$/i)?.[1]?.toLowerCase();
  const targetRepository = run?.display_title?.match(/\b([a-z0-9][a-z0-9-]*\/[a-z0-9._-]+)\b/i)?.[1];
  return {
    mode: normalizeMode(mode),
    conclusion: run?.conclusion || "unknown",
    repository: targetRepository || `${runOwner}/${runRepository}`,
  };
}

const discoveredRecords = [
  ...issues.map(recordFromIssue).filter(Boolean),
  ...comments.map((comment) => recordFromComment(comment, issueByUrl)).filter(Boolean),
  ...(await Promise.all((artifactResponse.artifacts || []).map(recordFromArtifact))).filter(Boolean),
];
const records = (await Promise.all(discoveredRecords.map(async (record) => {
  const metadata = record.mode && record.conclusion
    ? { mode: record.mode, conclusion: record.conclusion }
    : await metadataFromRunUrl(record.runUrl);
  const bundle = bundleDefinitions.find((definition) => definition.id === record.bundle);
  return {
    ...record,
    mode: normalizeMode(record.mode) !== "unknown" ? normalizeMode(record.mode) : (metadata.mode !== "unknown" ? metadata.mode : configuredModeFor(bundle)),
    conclusion: record.conclusion || metadata.conclusion,
    repository: record.repository || metadata.repository || "",
  };
}))).sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
const reportRecords = records.filter((record) => ["staged", "review", "live"].includes(record.mode));

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "records.json"), `${JSON.stringify({ generatedAt, repository, inventory, records }, null, 2)}\n`);

const trendDays = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(generatedAt);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (29 - index));
  return date;
});
const trendCounts = (recordsForMode) => trendDays.map((date) => {
  const endOfDay = new Date(date.getTime() + 86400000);
  return recordsForMode.filter((record) => new Date(record.createdAt) < endOfDay).length;
});
const trendPoints = (values, maximum) => values.map((value, index) => `${58 + (index * 714 / 29)},${200 - (value * 150 / maximum)}`).join(" ");
const modeLabels = { live: "Live", review: "Review", staged: "Staged" };

function chartPoints(series, maximum) {
  return trendDays.map((day, index) => {
    const x = 58 + (index * 714 / 29);
    const tooltipX = Math.min(578, Math.max(4, x - 95));
    const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(day);
    const values = Object.fromEntries(Object.entries(series).map(([status, counts]) => [status, counts[index]]));
    const accessibleLabel = `${date}: ${values.successful} successful, ${values.failed} failed, ${values.cancelled} cancelled runs`;
    return `<g class="chart-point" tabindex="0" role="img" aria-label="${escapeHtml(accessibleLabel)}">
      <rect class="point-hit" x="${x - 12}" y="40" width="24" height="170"></rect>
      ${Object.entries(values).map(([status, value]) => `<circle class="point-marker point-marker-${status}" cx="${x}" cy="${200 - (value * 150 / maximum)}" r="5"></circle>`).join("")}
      <g class="point-tooltip" transform="translate(${tooltipX} 44)" aria-hidden="true">
        <rect width="190" height="92" rx="6"></rect>
        <text class="tooltip-date" x="12" y="20">${escapeHtml(date)}</text>
        <text class="tooltip-swatch tooltip-swatch-successful" x="12" y="42">—</text><text class="tooltip-label" x="28" y="42">Successful</text><text class="tooltip-value" x="178" y="42" text-anchor="end">${values.successful}</text>
        <text class="tooltip-swatch tooltip-swatch-failed" x="12" y="62">–</text><text class="tooltip-label" x="28" y="62">Failed</text><text class="tooltip-value" x="178" y="62" text-anchor="end">${values.failed}</text>
        <text class="tooltip-swatch tooltip-swatch-cancelled" x="12" y="82">–·</text><text class="tooltip-label" x="28" y="82">Cancelled</text><text class="tooltip-value" x="178" y="82" text-anchor="end">${values.cancelled}</text>
      </g>
    </g>`;
  }).join("\n");
}

function overviewTrend(mode, modeRecords) {
  const runs = collectRuns(modeRecords);
  const series = {
    successful: trendCounts(runs.filter((run) => runStatus(run) === "successful")),
    failed: trendCounts(runs.filter((run) => runStatus(run) === "failed")),
    cancelled: trendCounts(runs.filter((run) => runStatus(run) === "cancelled")),
  };
  const maximum = Math.max(1, ...series.successful, ...series.failed, ...series.cancelled);
  const label = modeLabels[mode];
  return `<section class="trend-panel" aria-labelledby="trend-heading">
  <header><div><h2 id="trend-heading">${label} runs over time</h2><p><strong>${runs.length}</strong><span>as of ${escapeHtml(formatDate(generatedAt))}</span></p></div><span class="trend-group">Group by: <strong>Status</strong><b aria-hidden="true">···</b></span></header>
  <div class="chart-legend"><span><i class="legend-successful"></i>Successful</span><span><i class="legend-failed"></i>Failed</span><span><i class="legend-cancelled"></i>Cancelled</span></div>
  <div class="trend-chart"><svg role="group" focusable="false" aria-labelledby="trend-chart-title trend-chart-description" viewBox="0 0 800 240" preserveAspectRatio="xMinYMin meet">
    <title id="trend-chart-title">${label} runs by status over the last 30 days</title>
    <desc id="trend-chart-description">Daily cumulative successful, failed, and cancelled run counts. Hover or focus a date for its values.</desc>
    <line x1="58" y1="50" x2="772" y2="50"></line><line x1="58" y1="125" x2="772" y2="125"></line><line x1="58" y1="200" x2="772" y2="200"></line>
    <line class="vertical-grid" x1="58" y1="50" x2="58" y2="200"></line><line class="vertical-grid" x1="201" y1="50" x2="201" y2="200"></line><line class="vertical-grid" x1="344" y1="50" x2="344" y2="200"></line><line class="vertical-grid" x1="487" y1="50" x2="487" y2="200"></line><line class="vertical-grid" x1="630" y1="50" x2="630" y2="200"></line><line class="vertical-grid" x1="772" y1="50" x2="772" y2="200"></line>
    <text x="8" y="54">${maximum}</text><text x="8" y="129">${Number.isInteger(maximum / 2) ? maximum / 2 : (maximum / 2).toFixed(1)}</text><text x="8" y="204">0</text>
    <polyline class="chart-successful" points="${trendPoints(series.successful, maximum)}"></polyline>
    <polyline class="chart-failed" points="${trendPoints(series.failed, maximum)}"></polyline>
    <polyline class="chart-cancelled" points="${trendPoints(series.cancelled, maximum)}"></polyline>
    ${chartPoints(series, maximum)}
  </svg><div class="chart-axis"><span>${escapeHtml(formatDate(trendDays[0]))}</span><span>${escapeHtml(formatDate(trendDays[29]))}</span></div></div>
</section>`;
}

const failedConclusions = new Set(["action_required", "failure", "stale", "startup_failure", "timed_out"]);

function isFailureRecord(record) {
  return failedConclusions.has(record.conclusion) || /\b(?:failed jobs?|workflow failure|workflow .+ failed)\b/i.test(`${record.title} ${record.summary}`);
}

function collectRuns(recordsForMode) {
  const runs = new Map();
  for (const record of recordsForMode) {
    if (!record.runUrl) continue;
    const run = runs.get(record.runUrl) || { conclusion: "unknown", failed: false, warning: false, aic: null, createdAt: record.createdAt, repository: record.repository };
    if (record.conclusion !== "unknown") run.conclusion = record.conclusion;
    run.failed ||= isFailureRecord(record);
    run.warning ||= record.warning;
    if (new Date(record.createdAt) < new Date(run.createdAt)) run.createdAt = record.createdAt;
    if (Number.isFinite(record.aic)) run.aic = Math.max(run.aic || 0, record.aic);
    runs.set(record.runUrl, run);
  }
  return [...runs.values()];
}

function runStatus(run) {
  if (run.conclusion === "cancelled") return "cancelled";
  if (run.failed) return "failed";
  if (run.conclusion === "success") return "successful";
  return "other";
}

function summarizeRuns(recordsForMode) {
  const values = collectRuns(recordsForMode);
  return {
    total: values.length,
    successful: values.filter((run) => run.conclusion === "success" && !run.failed).length,
    failed: values.filter((run) => run.failed).length,
    warnings: values.filter((run) => run.warning).length,
    other: values.filter((run) => run.conclusion !== "success" && !run.failed).length,
    aic: values.reduce((total, run) => total + (run.aic || 0), 0),
    aicRuns: values.filter((run) => run.aic !== null).length,
  };
}

function formatAic(value) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);
}

function overviewMetrics(mode, modeRecords) {
  const runs = summarizeRuns(modeRecords);
  const definitions = [
    ["Successful runs", runs.successful, `${runs.other} non-success run${runs.other === 1 ? "" : "s"} without failure excluded`],
    ["Failed runs", runs.failed, "Failed Actions conclusions and explicit failure reports"],
    ["Total AIC", formatAic(runs.aic), `Across ${runs.aicRuns} of ${runs.total} reported runs`],
  ];
  return `<section class="metric-section" aria-label="${modeLabels[mode]} operational summary">
  <dl class="metrics">
    ${definitions.map(([name, value, description]) => `<div><dt>${name}</dt><dd>${value}</dd><p>${description}</p></div>`).join("\n")}
  </dl>
</section>`;
}

function overviewTable(mode, modeRecords) {
  const rows = bundleDefinitions.map((bundle) => {
    const bundleRecords = modeRecords.filter((record) => record.bundle === bundle.id);
    const latest = bundleRecords[0];
    const runs = summarizeRuns(bundleRecords);
    const inventoryWarnings = (bundle.compiled ? 0 : 1) + bundle.missingWorkers.length;
    return `<tr><th scope="row"><a href="bundles/${bundle.id}-${mode}.html">${escapeHtml(bundle.name)}</a></th><td>${runs.total}</td><td>${runs.successful}</td><td>${runs.failed}</td><td>${runs.warnings}</td><td>${inventoryWarnings}</td><td>${formatAic(runs.aic)}</td><td>${escapeHtml(latest ? formatDate(latest.updatedAt) : "No outputs yet")}</td></tr>`;
  }).join("\n");
  return `<section class="impact-analysis" aria-labelledby="bundles-heading">
  <h2 id="bundles-heading">${modeLabels[mode]} output by bundle</h2>
  <p>Durable outputs and inventory health for each control-plane bundle.</p>
  <div class="table-region" role="region" aria-labelledby="bundles-heading" tabindex="0">
    <table><caption>${modeLabels[mode]} operational summary by bundle</caption><thead><tr><th scope="col">Bundle</th><th scope="col">Runs</th><th scope="col">Successful</th><th scope="col">Failed</th><th scope="col">Run warnings</th><th scope="col">Inventory warnings</th><th scope="col">AIC</th><th scope="col">Latest activity</th></tr></thead><tbody>${rows || '<tr><td colspan="8">No bundles discovered.</td></tr>'}</tbody></table>
  </div>
</section>`;
}

function overviewContent(mode) {
  const windowStart = trendDays[0].getTime();
  const modeRecords = reportRecords.filter((record) => record.mode === mode && new Date(record.createdAt).getTime() >= windowStart);
  const tabs = `<nav class="report-tabs" aria-label="Bundle output mode">
    <a href="./"${mode === "live" ? ' aria-current="page"' : ""}>Live</a>
    <a href="overview-review.html"${mode === "review" ? ' aria-current="page"' : ""}>Review</a>
    <a href="overview-staged.html"${mode === "staged" ? ' aria-current="page"' : ""}>Staged</a>
  </nav>`;
  return `${deployedWorkflowContent()}<div class="overview-section-heading"><h2>Bundle activity</h2><p>Control-plane bundle runs and durable outputs, grouped by rollout mode.</p></div>${tabs}${overviewTrend(mode, modeRecords)}${overviewMetrics(mode, modeRecords)}${overviewTable(mode, modeRecords)}`;
}

await writeFile(path.join(outputDirectory, "styles.css"), stylesheet());
for (const [mode, filename] of [["live", "index.html"], ["review", "overview-review.html"], ["staged", "overview-staged.html"]]) {
  await writeFile(path.join(outputDirectory, filename), layout({
    title: "Overview",
    description: `${modeLabels[mode]} workflow trends and operational health across your organization.`,
    content: overviewContent(mode),
    overviewMode: mode,
  }));
}

const campaignCandidates = reportRecords.filter((record) => record.kind !== "noop" && ["open", "available", "published"].includes(record.state));
const secretCampaignCandidates = campaignCandidates.filter((record) => /\bsecret(?:s| scanning)?\b/i.test(`${record.title} ${record.summary} ${record.workflow}`));
const codeCampaignCandidates = campaignCandidates.filter((record) => !secretCampaignCandidates.includes(record));

function campaignContent(selectedType) {
  const candidates = selectedType === "secrets" ? secretCampaignCandidates : codeCampaignCandidates;
  const typeLabel = selectedType === "secrets" ? "Secrets" : "Code";
  const issueBody = `## Objective\n\nDescribe the improvement, remediation, or defined body of work.\n\n## Scope\n\nList the repositories, organizations, or other targets this campaign should coordinate across.\n\n## Time frame\n\n- Start date:\n- Target completion:\n\n## Agentic execution\n\nDescribe how agents should perform, track, and report the work.\n\n## Current signals\n\n${candidates.length} related ${typeLabel.toLowerCase()} output${candidates.length === 1 ? "" : "s"} currently available in the control plane.`;
  const creationUrl = `https://github.com/${repository}/issues/new?title=${encodeURIComponent(`[campaign] ${typeLabel} initiative`)}&body=${encodeURIComponent(issueBody)}`;
  return `<nav class="campaign-tabs" aria-label="Campaign type">
    <a href="campaigns.html"${selectedType === "code" ? ' aria-current="page"' : ""}>${octicon("codescan")}<span>Code</span><strong>${codeCampaignCandidates.length}</strong></a>
    <a href="campaigns-secrets.html"${selectedType === "secrets" ? ' aria-current="page"' : ""}>${octicon("key")}<span>Secrets</span><strong>${secretCampaignCandidates.length}</strong></a>
  </nav>
  <section class="campaign-empty" aria-labelledby="campaign-empty-heading">
    ${octicon("goal", "campaign-empty-icon")}
    <h2 id="campaign-empty-heading">Start a new campaign</h2>
    <p>Launch a time-bound agentic initiative to improve, remediate, or complete defined ${typeLabel.toLowerCase()} work across repositories and organizations.</p>
    <a href="${escapeHtml(creationUrl)}" class="campaign-create">Create campaign</a>
  </section>`;
}

for (const [campaignType, filename] of [["code", "campaigns.html"], ["secrets", "campaigns-secrets.html"]]) {
  await writeFile(path.join(outputDirectory, filename), layout({
    title: "Campaigns",
    description: "Coordinate time-bound agentic initiatives across repositories and organizations.",
    content: campaignContent(campaignType),
    campaignType,
  }));
}

function deployedWorkflowContent() {
  const workflows = deployedInventory.workflows || [];
  const workflowByKey = new Map(workflows.map((workflow) => [`${workflow.repository}:${workflow.path}`, workflow]));
  const discoveredBundles = [...(deployedInventory.bundles || [])];
  const bundleKeys = new Set(discoveredBundles.map((bundle) => `${bundle.repository}:${bundle.name}`));
  for (const bundle of bundleDefinitions) {
    const key = `${repository}:${bundle.name}`;
    if (bundleKeys.has(key)) continue;
    const memberPaths = [bundle.workflow.replace(/\.md$/, ".lock.yml"), ...bundle.workers.map((worker) => worker.lockPath)];
    discoveredBundles.push({
      repository,
      name: bundle.name,
      path: bundle.workflow,
      description: bundle.description,
      workflows: memberPaths.map((lockPath) => {
        const deployed = workflowByKey.get(`${repository}:${lockPath}`);
        return { lockPath, name: deployed?.name || lockPath.split("/").at(-1).replace(/\.lock\.yml$/, ""), state: deployed?.state || "unknown" };
      }),
    });
  }
  const active = workflows.filter((workflow) => workflow.state === "active").length;
  const disabled = workflows.filter((workflow) => workflow.state.startsWith("disabled")).length;
  const health = summarizeWorkflowHealth(workflows);
  const healthLabel = deployedInventory.runHealth?.available
    ? `${deployedInventory.runHealth.complete ? "Complete" : "Partial"} ${deployedInventory.runHealth.windowHours || 24}-hour audit-log window`
    : "Organization audit log unavailable";
  const spend = contributionSpendFor();
  const repositoriesWithWorkflows = new Set(workflows.map((workflow) => workflow.repository));
  const bundleRows = discoveredBundles.sort((left, right) => left.repository.localeCompare(right.repository) || left.name.localeCompare(right.name)).map((bundle) => {
    const activeMembers = bundle.workflows.filter((workflow) => workflow.state === "active").length;
    const memberNames = bundle.workflows.map((workflow) => workflow.name).join(", ") || "No workflow sources declared";
    const repositoryUrl = repositoriesWithWorkflows.has(bundle.repository)
      ? `repositories/${repositoryPageName(bundle.repository)}.html`
      : `https://github.com/${bundle.repository}`;
    return `<tr><th scope="row">${escapeHtml(bundle.name)}</th><td><a href="${escapeHtml(repositoryUrl)}">${escapeHtml(bundle.repository)}</a></td><td title="${escapeHtml(memberNames)}">${bundle.workflows.length}</td><td>${activeMembers}</td><td><code>${escapeHtml(bundle.path)}</code></td></tr>`;
  }).join("\n");
  const rows = workflows.map((workflow) => `<tr>
    <th scope="row"><a href="repositories/${escapeHtml(repositoryPageName(workflow.repository))}.html">${escapeHtml(workflow.repository)}</a></th>
    <td><a href="${escapeHtml(workflow.htmlUrl)}">${escapeHtml(workflow.name)}</a><code>${escapeHtml(workflow.path)}</code></td>
    <td><span class="status ${workflow.state === "active" ? "status-success" : workflow.state.startsWith("disabled") ? "status-attention" : "status-muted"}">${escapeHtml(workflow.state.replaceAll("_", " "))}</span></td>
    <td>${workflow.runHealth?.runs ?? "—"}</td>
    <td>${workflow.runHealth?.failed ?? "—"}</td>
    <td>${escapeHtml(workflow.visibility)}</td>
    <td><time datetime="${escapeHtml(workflow.updatedAt || "")}">${escapeHtml(formatDay(workflow.updatedAt))}</time></td>
  </tr>`).join("\n");
  return `<section class="deployed-summary" aria-label="Deployed agentic workflow summary">
    <dl class="metrics">
      <div><dt>Repositories</dt><dd>${deployedInventory.repositoryCount || 0}</dd><p>Repositories with compiled agentic workflows</p></div>
      <div><dt>Bundles</dt><dd>${discoveredBundles.length}</dd><p>Organization manifests and installed control-plane bundles</p></div>
      <div><dt>Installed workflows</dt><dd>${workflows.length}</dd><p>Distinct compiled workflow registrations</p></div>
      <div><dt>Active workflows</dt><dd>${active}</dd><p>Registered and enabled in GitHub Actions</p></div>
      <div><dt>Disabled workflows</dt><dd>${disabled}</dd><p>Registered but currently disabled</p></div>
      <div><dt>Runs</dt><dd>${deployedInventory.runHealth?.available ? health.runs : "—"}</dd><p>${escapeHtml(healthLabel)}</p></div>
      <div><dt>Failures</dt><dd>${deployedInventory.runHealth?.available ? health.failed : "—"}</dd><p>${escapeHtml(healthLabel)}</p></div>
      <div><dt>AI Credits</dt><dd>${spend.available ? formatAic(spend.total) : "—"}</dd><p>Across ${spend.reportedRuns} reported contribution run${spend.reportedRuns === 1 ? "" : "s"}</p></div>
    </dl>
  </section>
  ${biggestSpendersContent(spend)}
  <section class="organization-bundles" aria-labelledby="organization-bundles-heading">
    <h2 id="organization-bundles-heading">Organization bundles</h2>
    <p>Agentic workflow packages discovered from organization <code>aw.yml</code> manifests and this repository's installed control plane.</p>
    <div class="table-region" role="region" aria-labelledby="organization-bundles-heading" tabindex="0"><table><thead><tr><th scope="col">Bundle</th><th scope="col">Repository</th><th scope="col">Workflows</th><th scope="col">Active</th><th scope="col">Definition</th></tr></thead><tbody>${bundleRows || '<tr><td colspan="5">No organization bundles were discovered.</td></tr>'}</tbody></table></div>
  </section>
  <section class="deployed-workflows" aria-labelledby="deployed-workflows-heading">
    <h2 id="deployed-workflows-heading">Installed workflows</h2>
    <p>Compiled <code>.github/workflows/*.lock.yml</code> workflows visible to the report token in ${escapeHtml(deployedInventory.organization || owner)}.</p>
    <div class="table-region" role="region" aria-labelledby="deployed-workflows-heading" tabindex="0">
      <table class="deployed-workflows-table"><thead><tr><th scope="col">Repository</th><th scope="col">Workflow</th><th scope="col">State</th><th scope="col">Runs</th><th scope="col">Failed</th><th scope="col">Visibility</th><th scope="col">Updated</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No compiled agentic workflows were discovered.</td></tr>'}</tbody></table>
    </div>
  </section>`;
}

function repositoryPageName(repositoryName) {
  return repositoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function summarizeWorkflowHealth(workflows) {
  return workflows.reduce((summary, workflow) => {
    for (const key of ["runs", "successful", "failed", "cancelled", "other"]) summary[key] += workflow.runHealth?.[key] || 0;
    return summary;
  }, { runs: 0, successful: 0, failed: 0, cancelled: 0, other: 0 });
}

function contributionSpendFor(repositoryNames) {
  const included = repositoryNames ? new Set(repositoryNames) : null;
  const reportedRuns = collectRuns(reportRecords).filter((run) => run.aic !== null && run.repository && (!included || included.has(run.repository)));
  const totals = new Map();
  for (const run of reportedRuns) totals.set(run.repository, (totals.get(run.repository) || 0) + run.aic);
  const repositories = [...totals].map(([repositoryName, aiCredits]) => ({ repository: repositoryName, aiCredits }))
    .filter((entry) => entry.aiCredits > 0)
    .sort((left, right) => right.aiCredits - left.aiCredits);
  return { available: reportedRuns.length > 0, reportedRuns: reportedRuns.length, repositories, total: reportedRuns.reduce((total, run) => total + run.aic, 0) };
}

function biggestSpendersContent(spend) {
  if (!spend.available) {
    return `<section class="spend-panel" aria-labelledby="spend-heading"><h2 id="spend-heading">Biggest spenders</h2><p class="empty">No AI Credit usage was reported by agentic workflow contributions.</p></section>`;
  }
  if (spend.total <= 0) {
    return `<section class="spend-panel" aria-labelledby="spend-heading"><h2 id="spend-heading">Biggest spenders</h2><p class="empty">Reported agentic workflow contributions consumed 0 AIC.</p></section>`;
  }
  const colors = ["#4493f8", "#3fb950", "#d29922", "#f85149", "#a371f7", "#8c959f"];
  const leading = spend.repositories.slice(0, 5);
  const other = spend.repositories.slice(5).reduce((total, entry) => total + entry.aiCredits, 0);
  const segments = other > 0 ? [...leading, { repository: "Other", aiCredits: other }] : leading;
  let offset = 0;
  const stops = segments.map((entry, index) => {
    const start = offset;
    offset += entry.aiCredits / spend.total * 100;
    return `${colors[index]} ${start.toFixed(3)}% ${offset.toFixed(3)}%`;
  }).join(", ");
  const chartLabel = segments.map((entry) => `${entry.repository}: ${formatAic(entry.aiCredits)} AI Credits`).join(", ");
  const legend = segments.map((entry, index) => `<li><i style="background:${colors[index]}"></i><span>${entry.repository === "Other" ? "Other" : `<a href="repositories/${escapeHtml(repositoryPageName(entry.repository))}.html">${escapeHtml(entry.repository)}</a>`}</span><strong>${formatAic(entry.aiCredits)}</strong><small>${new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 }).format(entry.aiCredits / spend.total)}</small></li>`).join("\n");
  return `<section class="spend-panel" aria-labelledby="spend-heading"><div><h2 id="spend-heading">Biggest spenders</h2><p>AI Credits reported by agentic workflow contributions, deduplicated by workflow run.</p></div><div class="spend-chart"><div class="spend-donut" role="img" aria-label="${escapeHtml(chartLabel)}" style="background:conic-gradient(${stops})"><span><strong>${formatAic(spend.total)}</strong><small>Total AIC</small></span></div><ol>${legend}</ol></div></section>`;
}

function repositoryWorkflowContent(repositoryName, workflows) {
  const active = workflows.filter((workflow) => workflow.state === "active").length;
  const disabled = workflows.filter((workflow) => workflow.state.startsWith("disabled")).length;
  const latest = workflows.map((workflow) => workflow.updatedAt).filter(Boolean).sort().at(-1);
  const health = summarizeWorkflowHealth(workflows);
  const healthAvailable = deployedInventory.runHealth?.available;
  const repositorySpend = contributionSpendFor([repositoryName]);
  const rows = workflows.map((workflow) => `<tr>
    <th scope="row"><a href="${escapeHtml(workflow.htmlUrl)}">${escapeHtml(workflow.name)}</a><code>${escapeHtml(workflow.path)}</code></th>
    <td><span class="status ${workflow.state === "active" ? "status-success" : workflow.state.startsWith("disabled") ? "status-attention" : "status-muted"}">${escapeHtml(workflow.state.replaceAll("_", " "))}</span></td>
    <td>${workflow.runHealth?.runs ?? "—"}</td>
    <td>${workflow.runHealth?.failed ?? "—"}</td>
    <td><time datetime="${escapeHtml(workflow.updatedAt || "")}">${escapeHtml(formatDay(workflow.updatedAt))}</time></td>
  </tr>`).join("\n");
  return `<section class="repository-workflow-summary" aria-label="Repository agentic workflow summary">
    <dl class="metrics">
      <div><dt>Installed workflows</dt><dd>${workflows.length}</dd><p>Compiled agentic workflows in this repository</p></div>
      <div><dt>Active workflows</dt><dd>${active}</dd><p>Registered and enabled in GitHub Actions</p></div>
      <div><dt>Runs</dt><dd>${healthAvailable ? health.runs : "—"}</dd><p>Agentic runs in the last ${deployedInventory.runHealth?.windowHours || 24} hours</p></div>
      <div><dt>Failures</dt><dd>${healthAvailable ? health.failed : "—"}</dd><p>${deployedInventory.runHealth?.complete ? "Complete audit-log window" : "Partial or unavailable audit-log window"}</p></div>
      <div><dt>AI Credits</dt><dd>${repositorySpend.available ? formatAic(repositorySpend.total) : "—"}</dd><p>Across ${repositorySpend.reportedRuns} reported contribution run${repositorySpend.reportedRuns === 1 ? "" : "s"}</p></div>
    </dl>
  </section>
  <section class="repository-workflows" aria-labelledby="repository-workflows-heading">
    <div class="section-heading"><div><h2 id="repository-workflows-heading">Installed workflows</h2><p>Compiled workflows under <code>.github/workflows/</code>. Latest registration update: ${escapeHtml(formatDay(latest))}. ${disabled} disabled.</p></div><a href="https://github.com/${escapeHtml(repositoryName)}/actions">View Actions${octicon("external-link")}</a></div>
    <div class="table-region" role="region" aria-labelledby="repository-workflows-heading" tabindex="0">
      <table><thead><tr><th scope="col">Workflow</th><th scope="col">State</th><th scope="col">Runs</th><th scope="col">Failed</th><th scope="col">Updated</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
  </section>`;
}

await mkdir(path.join(outputDirectory, "repositories"), { recursive: true });
const deployedByRepository = new Map();
for (const workflow of deployedInventory.workflows || []) {
  const workflows = deployedByRepository.get(workflow.repository) || [];
  workflows.push(workflow);
  deployedByRepository.set(workflow.repository, workflows);
}
for (const [repositoryName, workflows] of deployedByRepository) {
  const navigation = `<nav aria-label="Report navigation"><div class="shell"><a href="../">Overview</a><span aria-current="page">${escapeHtml(repositoryName)}</span></div></nav>`;
  await writeFile(path.join(outputDirectory, "repositories", `${repositoryPageName(repositoryName)}.html`), layout({
    title: repositoryName,
    description: "Agentic workflows installed and registered in this repository.",
    content: repositoryWorkflowContent(repositoryName, workflows),
    nested: true,
    navigation,
  }));
}

function presentedMetric(value, transform) {
  if (!Number.isFinite(value)) return null;
  return transform === "complement" ? 1 - value : value;
}

function formatGoalMeasure(value) {
  return value === null ? "Not observed" : new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function valueReportContent(worker, artifact, assetName) {
  if (!artifact) {
    return `<section class="value-report value-report-empty" aria-labelledby="${escapeHtml(worker.id)}-heading">
      <header><div><h2 id="${escapeHtml(worker.id)}-heading">${escapeHtml(worker.name)}</h2><p>${escapeHtml(worker.id)}</p></div><span class="status status-muted">Not evaluated</span></header>
      <div class="value-empty">${octicon("graph")}<h3>No evaluation observations yet</h3><p>Publish the canonical <code>.github/value/${escapeHtml(worker.id)}/${escapeHtml(worker.id)}-timeline.json</code> and sibling SVG artifacts to show this worker's value trend.</p></div>
      <div class="value-details-unavailable">Metric details unavailable</div>
    </section>`;
  }
  const timeline = artifact.timeline;
  const metrics = timeline.metricReview.metrics;
  const primaryMetric = metrics.find((metric) => metric.role === "primary");
  const latestSnapshot = timeline.snapshots.at(-1);
  const latestPrimary = primaryMetric ? presentedMetric(latestSnapshot.metrics[primaryMetric.id], primaryMetric.presentation?.transform) : null;
  const mode = timeline.evaluationMode || "baseline-comparable";
  const metricRows = metrics.map((metric) => {
    const latestValue = presentedMetric(latestSnapshot.metrics[metric.id], metric.presentation?.transform);
    return `<tr><th scope="row">${escapeHtml(metric.presentation?.name || metric.name)}</th><td>${escapeHtml(metric.role)}</td><td>${escapeHtml(formatGoalMeasure(latestValue))}</td></tr>`;
  }).join("\n");
  const observationRows = [...timeline.snapshots].reverse().map((snapshot) => `<tr><th scope="row"><time datetime="${escapeHtml(snapshot.observedAt)}">${escapeHtml(formatDate(snapshot.observedAt))}</time></th>${metrics.map((metric) => `<td>${escapeHtml(formatGoalMeasure(presentedMetric(snapshot.metrics[metric.id], metric.presentation?.transform)))}</td>`).join("")}</tr>`).join("\n");
  return `<section class="value-report" aria-labelledby="${escapeHtml(worker.id)}-heading">
    <header><div><h2 id="${escapeHtml(worker.id)}-heading">${escapeHtml(timeline.workflowName || worker.name)}</h2><p>${escapeHtml(timeline.summary?.nativeLabel || primaryMetric?.name || "Operational value attainment")}</p></div><div class="value-score"><strong>${escapeHtml(formatGoalMeasure(latestPrimary))}</strong><span>${mode === "attainment-only" ? "Latest attainment" : "Latest goal measure"}</span></div></header>
    <div class="value-chart"><img src="assets/${escapeHtml(assetName)}" alt="${escapeHtml(timeline.workflowName || worker.name)} value-function metrics over time"></div>
    <details class="value-details-disclosure">
      <summary>View metric details</summary>
      <div class="value-details">
        <section aria-labelledby="${escapeHtml(worker.id)}-metrics-heading"><h3 id="${escapeHtml(worker.id)}-metrics-heading">Latest measures</h3><p>${mode === "attainment-only" ? "Post-adoption attainment; no comparable pre-adoption baseline is available." : "Baseline-comparable measures before and after adoption."}</p><div class="table-region"><table><thead><tr><th scope="col">Measure</th><th scope="col">Role</th><th scope="col">Latest value</th></tr></thead><tbody>${metricRows}</tbody></table></div></section>
        <section aria-labelledby="${escapeHtml(worker.id)}-observations-heading"><h3 id="${escapeHtml(worker.id)}-observations-heading">Dated observations</h3><div class="table-region" role="region" tabindex="0"><table><thead><tr><th scope="col">Observed</th>${metrics.map((metric) => `<th scope="col">${escapeHtml(metric.presentation?.name || metric.name)}</th>`).join("")}</tr></thead><tbody>${observationRows}</tbody></table></div></section>
      </div>
    </details>
  </section>`;
}

await mkdir(path.join(outputDirectory, "insights", "assets"), { recursive: true });
for (const bundle of bundleDefinitions) {
  const navigation = `<nav aria-label="Report navigation"><div class="shell"><a href="../">Overview</a><span aria-current="page">${escapeHtml(bundle.name)} insights</span></div></nav>`;
  const sections = [];
  for (const worker of bundle.workers) {
    const artifact = valueTimelines.get(worker.id);
    const assetName = `${worker.id}-timeline.svg`;
    if (artifact) {
      try {
        await copyFile(artifact.svgPath, path.join(outputDirectory, "insights", "assets", assetName));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        valueTimelines.delete(worker.id);
      }
    }
    sections.push(valueReportContent(worker, valueTimelines.get(worker.id), assetName));
  }
  await writeFile(path.join(outputDirectory, "insights", `${bundle.id}.html`), layout({
    title: `${bundle.name} insights`,
    description: `Worker operational-value measurements from the ${bundle.name} value functions.`,
    content: sections.join("\n"),
    nested: true,
    navigation,
    activeSection: "insights",
    activeBundle: bundle.id,
  }));
}

await mkdir(path.join(outputDirectory, "bundles"), { recursive: true });
for (const bundle of bundleDefinitions) {
  const bundleRecords = reportRecords.filter((record) => record.bundle === bundle.id);
  const navigation = `<nav aria-label="Report navigation"><div class="shell"><a href="../">All bundles</a><span aria-current="page">${escapeHtml(bundle.name)}</span></div></nav>`;
  const configuredMode = configuredModeFor(bundle);
  const defaultMode = configuredMode;
  const modeIdentities = {
    staged: "Viewing staged output without repository writes",
    review: "Viewing proposals routed for human review",
    live: "Viewing production outputs from live operation",
  };
  for (const selectedMode of ["staged", "review", "live"]) {
    const modeRecords = bundleRecords.filter((record) => record.mode === selectedMode);
    const content = `<p class="mode-view-note">${escapeHtml(modeIdentities[selectedMode])}.</p>${modeTabs(bundle, selectedMode)}${findingsListing(modeRecords)}`;
    const page = layout({
      title: `${bundle.name} findings`,
      description: `Durable reports produced by the ${bundle.name} control-plane bundle.`,
      content,
      nested: true,
      navigation,
      configuredMode,
      activeSection: "findings",
      activeBundle: bundle.id,
    });
    await writeFile(path.join(outputDirectory, "bundles", `${bundle.id}-${selectedMode}.html`), page);
    if (selectedMode === defaultMode) await writeFile(path.join(outputDirectory, "bundles", `${bundle.id}.html`), page);
  }
}

await mkdir(path.join(outputDirectory, "workflows"), { recursive: true });
for (const workflow of standaloneDefinitions) {
  const workflowRecords = reportRecords.filter((record) => record.bundle === workflow.id);
  const navigation = `<nav aria-label="Report navigation"><div class="shell"><a href="../">All workflows</a><span aria-current="page">${escapeHtml(workflow.name)}</span></div></nav>`;
  const content = `<section aria-labelledby="inventory-heading"><h2 id="inventory-heading">Workflow inventory</h2><p>${workflow.compiled ? "Source and compiled lock file are present." : "Source is present without a matching compiled lock file."}</p><p><code>${escapeHtml(workflow.sourcePath)}</code></p></section>${outcomeListing(workflowRecords)}`;
  await writeFile(path.join(outputDirectory, "workflows", `${workflow.id}.html`), layout({
    title: workflow.name,
    description: workflow.description || "Standalone agentic workflow.",
    content,
    nested: true,
    navigation,
  }));
}

await mkdir(path.join(outputDirectory, "outcomes"), { recursive: true });
for (const record of reportRecords) {
  const runUrl = safeUrl(record.runUrl);
  const navigation = `<nav aria-label="Report navigation"><div class="shell"><a href="../">All workflows</a><span aria-current="page">Outcome</span></div></nav>`;
  const reportBody = record.bodyHtml || `<p>${escapeHtml(record.summary || "No report content was provided.")}</p>`;
  const content = `<div class="outcome-view">
    <article class="discussion-post">
      <header><div class="post-avatar">${octicon("mark-github")}</div><div><strong>github-actions[bot]</strong><p>published ${escapeHtml(formatDate(record.createdAt))} · updated ${escapeHtml(formatDate(record.updatedAt))}</p></div></header>
      <div class="markdown-body">${reportBody}</div>
    </article>
    <aside class="outcome-meta" aria-label="Outcome metadata">
      <section><h2>Status</h2><span class="status ${statusClass(record)}">${escapeHtml(record.state)}</span></section>
      <section><h2>Mode</h2><span class="mode-badge mode-${escapeHtml(record.mode)}">${escapeHtml(record.mode)}</span></section>
      <section><h2>Category</h2><p>${escapeHtml(record.kind.replaceAll("-", " "))}</p></section>
      <section><h2>Workflow</h2><p>${escapeHtml(record.workflow)}</p></section>
      <section><h2>Provenance</h2><p><a href="${escapeHtml(record.url)}">View source${octicon("external-link")}</a>${runUrl ? `<br><a href="${escapeHtml(runUrl)}">View workflow run${octicon("external-link")}</a>` : ""}</p></section>
    </aside>
  </div>`;
  await writeFile(path.join(outputDirectory, "outcomes", `${record.id}.html`), layout({
    title: record.title,
    description: `${record.workflow} · ${record.kind.replaceAll("-", " ")} · ${record.state}`,
    content,
    nested: true,
    navigation,
  }));
}

function stylesheet() {
  return `:root {
  --canvas: #0d1117;
  --canvas-subtle: #151b23;
  --canvas-inset: #010409;
  --header: #010409;
  --fg: #f0f6fc;
  --muted: #9198a1;
  --border: #3d444d;
  --border-muted: #21262d;
  --accent: #58a6ff;
  --accent-muted: #121d2f;
  --success: #3fb950;
  --success-muted: #12261e;
  --danger: #f85149;
  --cancelled: #8c959f;
  --attention: #d29922;
  --attention-muted: #272115;
  --neutral-muted: #6e768166;
  --focus: #58a6ff;
}
@media (prefers-color-scheme: light) {
  :root {
    --canvas: #ffffff;
    --canvas-subtle: #f6f8fa;
    --canvas-inset: #f6f8fa;
    --header: #f6f8fa;
    --fg: #1f2328;
    --muted: #59636e;
    --border: #d1d9e0;
    --border-muted: #d8dee4;
    --accent: #0969da;
    --accent-muted: #ddf4ff;
    --success: #1a7f37;
    --success-muted: #dafbe1;
    --danger: #cf222e;
    --cancelled: #656d76;
    --attention: #9a6700;
    --attention-muted: #fff8c5;
    --neutral-muted: #afb8c133;
    --focus: #0969da;
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--canvas); color: var(--fg); font: .875rem/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
.octicon-sprite { width: 0; height: 0; position: absolute; overflow: hidden; }
.octicon { width: 16px; height: 16px; flex: 0 0 16px; fill: currentColor; }
a { color: var(--accent); text-underline-offset: 2px; }
a:hover { text-decoration-thickness: 2px; }
a:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.skip-link { position: fixed; z-index: 10; top: -80px; left: 12px; padding: 7px 12px; border: 1px solid var(--focus); border-radius: 6px; background: var(--canvas); }
.skip-link:focus { top: 8px; }
.site-header { height: 64px; background: var(--header); color: var(--fg); }
.header-inner { height: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 24px; }
.brand { min-width: 0; display: flex; align-items: center; gap: 10px; color: var(--fg); font-weight: 600; text-decoration: none; }
.brand > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.github-mark { width: 32px; height: 32px; flex-basis: 32px; }
.repo-nav { height: 48px; overflow-x: auto; border-bottom: 1px solid var(--border); background: var(--header); }
.repo-nav > div { min-width: max-content; height: 100%; display: flex; align-items: flex-end; gap: 4px; padding: 0 16px; }
.repo-nav a { height: 40px; display: flex; align-items: center; gap: 7px; padding: 0 12px; border-bottom: 2px solid transparent; color: var(--fg); text-decoration: none; }
.repo-nav a:hover { background: var(--neutral-muted); border-radius: 6px 6px 0 0; }
.repo-nav a[aria-current="page"] { border-bottom-color: #f78166; font-weight: 600; }
.control-layout { min-height: calc(100vh - 112px); display: grid; grid-template-columns: 280px minmax(0, 1fr); }
.control-sidebar { min-width: 0; display: flex; flex-direction: column; border-right: 1px solid var(--border); background: var(--canvas-subtle); }
.sidebar-title { padding: 22px 18px 12px; font-size: 1.25rem; font-weight: 600; }
.sidebar-nav { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
.sidebar-nav a { min-height: 36px; display: flex; align-items: center; gap: 10px; position: relative; padding: 6px 10px; border-radius: 6px; color: var(--fg); font-weight: 500; text-decoration: none; }
.sidebar-nav a:hover { background: var(--neutral-muted); }
.sidebar-nav a[aria-current="page"] { background: var(--neutral-muted); font-weight: 600; }
.sidebar-nav a[aria-current="page"]::before { content: ""; width: 3px; height: 24px; position: absolute; left: -8px; border-radius: 0 6px 6px 0; background: var(--accent); }
.sidebar-nav .nav-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-label { margin: 18px 10px 5px; padding-top: 14px; border-top: 1px solid var(--border); color: var(--muted); font-size: .75rem; font-weight: 600; text-transform: uppercase; }
.nav-label-first { margin-top: 0; padding-top: 0; border-top: 0; }
.nav-icon { width: 22px; height: 22px; flex: 0 0 22px; padding: 4px; border: 1px solid var(--border); border-radius: 50%; background: var(--canvas); color: var(--muted); }
.sidebar-footer { margin-top: auto; padding: 16px 18px; border-top: 1px solid var(--border); font-size: .75rem; }
.sidebar-footer a { display: inline-flex; align-items: center; gap: 6px; }
.control-content { min-width: 0; display: flex; flex-direction: column; }
.control-content > nav { border-bottom: 1px solid var(--border); background: var(--canvas); }
.control-content > nav .shell { display: flex; gap: 8px; max-width: 1280px; margin: auto; padding: 10px 24px; }
.control-content > nav .shell > * + *::before { content: "/"; margin-right: 8px; color: var(--muted); }
main { width: min(1280px, 100%); flex: 1; margin: 0 auto; padding: 0 20px 40px; }
.intro { min-height: 136px; display: flex; align-items: center; justify-content: space-between; gap: 32px; padding: 24px 0; border-bottom: 1px solid var(--border); }
.page-header-content { min-width: 0; }
.eyebrow { margin: 0 0 3px; color: var(--muted); font-size: .75rem; font-weight: 600; text-transform: uppercase; }
.title-area { display: flex; align-items: center; gap: 8px; }
.leading-visual { width: 20px; height: 20px; color: var(--muted); }
.intro h1 { margin: 0; font-size: 1.5rem; line-height: 1.25; }
.lede { max-width: 760px; margin: 6px 0 0; color: var(--muted); }
.page-header-actions { flex: none; display: flex; align-items: center; gap: 16px; }
.page-action { min-height: 32px; display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); color: var(--fg); font-size: .75rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
.page-action:hover { background: var(--neutral-muted); }
.freshness { max-width: 310px; display: flex; align-items: flex-start; gap: 8px; color: var(--muted); font-size: .75rem; text-align: right; }
.status-dot { width: 8px; height: 8px; flex: 0 0 8px; margin-top: 5px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 3px var(--success-muted); }
.report-body { padding-top: 18px; }
.report-body > section { margin-bottom: 14px; padding: 16px; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.report-body > section:last-child { margin-bottom: 0; }
h2 { margin: 0 0 14px; font-size: 1rem; }
h3 { margin: 6px 0; font-size: .875rem; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.metrics div { min-width: 0; padding: 14px 16px; border-right: 1px solid var(--border); }
.metrics div:last-child { border-right: 0; }
.metrics dt { color: var(--muted); font-size: .75rem; font-weight: 600; text-transform: uppercase; }
.metrics dd { margin: 4px 0 0; font-size: 1.625rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.table-region { overflow-x: auto; border: 1px solid var(--border); border-radius: 6px; }
table { width: 100%; min-width: 600px; border-collapse: collapse; }
caption { padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); color: var(--muted); text-align: left; }
th, td { padding: 10px 14px; border-bottom: 1px solid var(--border-muted); text-align: left; font-variant-numeric: tabular-nums; }
thead th { background: var(--canvas-subtle); color: var(--muted); font-size: .75rem; font-weight: 600; }
tbody tr:last-child > * { border-bottom: 0; }
tbody tr:hover { background: var(--canvas-subtle); }
.discussion-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 24px; margin-top: 20px; }
.discussion-sidebar h2 { margin: 0 8px 10px; }
.discussion-sidebar > div { min-height: 38px; display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; color: var(--muted); }
.discussion-sidebar .category-current { background: var(--neutral-muted); color: var(--fg); font-weight: 600; }
.discussion-sidebar strong { min-width: 20px; padding: 0 6px; border-radius: 2em; background: var(--neutral-muted); color: var(--muted); font-size: .6875rem; text-align: center; }
.discussion-list { min-width: 0; }
.discussion-toolbar { min-height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--border); border-bottom: 0; border-radius: 6px 6px 0 0; background: var(--canvas-subtle); }
.discussion-toolbar h2 { margin: 0; }
.discussion-toolbar > span { color: var(--muted); font-size: .75rem; font-weight: 600; }
.records { overflow: hidden; border: 1px solid var(--border); border-radius: 0 0 6px 6px; }
.discussion-row { min-height: 94px; display: grid; grid-template-columns: 34px 42px minmax(0, 1fr); align-items: start; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border-muted); }
.discussion-row:last-child { border-bottom: 0; }
.discussion-row:hover { background: var(--canvas-subtle); }
.discussion-vote { display: flex; flex-direction: column; align-items: center; gap: 3px; padding-top: 4px; color: var(--muted); font-size: .6875rem; }
.discussion-category { width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); color: var(--muted); }
.discussion-main { min-width: 0; }
.discussion-main h3 { margin: 0; font-size: .9375rem; line-height: 1.35; overflow-wrap: anywhere; }
.discussion-main > p { display: -webkit-box; margin: 5px 0 8px; overflow: hidden; color: var(--muted); -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.discussion-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; color: var(--muted); font-size: .75rem; }
.findings-index { overflow: hidden !important; border: 1px solid var(--border) !important; border-radius: 6px !important; background: var(--canvas) !important; }
.findings-search { min-height: 34px; display: flex; align-items: center; gap: 8px; margin: 12px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); font-size: .75rem; }
.findings-header { min-height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-top: 1px solid var(--border); background: var(--canvas-subtle); }
.findings-header h2 { margin: 0; }
.findings-header > div { color: var(--muted); font-size: .75rem; }
.findings-header > div span { margin-left: 14px; }
.finding-columns { display: grid; grid-template-columns: minmax(298px, 1fr) 70px 145px 60px 100px; gap: 12px; padding: 7px 14px 7px 64px; border-top: 1px solid var(--border); color: var(--muted); font-size: .6875rem; font-weight: 600; }
.finding-row { min-height: 58px; display: grid; grid-template-columns: 38px minmax(248px, 1fr) 70px 145px 60px 100px; align-items: center; gap: 12px; padding: 8px 14px; border-top: 1px solid var(--border-muted); }
.finding-row:hover { background: var(--canvas-subtle); }
.finding-icon { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); }
.finding-report { min-width: 0; }
.finding-report h3 { margin: 0; overflow: hidden; }
.finding-report h3 a { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.finding-report p { margin: 3px 0 0; overflow: hidden; color: var(--muted); font-size: .75rem; text-overflow: ellipsis; white-space: nowrap; }
.finding-workflow, .finding-row time { overflow: hidden; color: var(--muted); font-size: .75rem; text-overflow: ellipsis; white-space: nowrap; }
.kind, .status, .mode-badge { display: inline-flex; align-items: center; min-height: 20px; padding: 0 7px; border: 1px solid var(--border); border-radius: 2em; color: var(--muted); font-size: .6875rem; font-weight: 600; text-transform: capitalize; white-space: nowrap; }
.finding-row > .kind, .finding-row > .status { justify-self: start; }
.status-success { border-color: color-mix(in srgb, var(--success) 45%, var(--border)); background: var(--success-muted); color: var(--success); }
.status-attention { border-color: color-mix(in srgb, var(--attention) 45%, var(--border)); background: var(--attention-muted); color: var(--attention); }
.status-muted { background: var(--neutral-muted); }
.mode-live { border-color: color-mix(in srgb, var(--success) 45%, var(--border)); background: var(--success-muted); color: var(--success); }
.mode-review { border-color: color-mix(in srgb, var(--attention) 45%, var(--border)); background: var(--attention-muted); color: var(--attention); }
.mode-staged { background: var(--neutral-muted); }
.mode-indicator { min-height: 22px; display: inline-flex; flex: none; align-items: center; gap: 5px; padding: 1px 7px; border: 1px solid var(--border); border-radius: 2em; font-size: .6875rem; font-weight: 600; text-transform: none; white-space: nowrap; }
.mode-indicator .octicon { width: 13px; height: 13px; flex-basis: 13px; }
.sidebar-nav .mode-indicator { margin-left: auto; }
.mode-view-note { margin: 0 0 14px; color: var(--muted); }
.mode-tabs { display: flex; margin: 20px 0 0; border-bottom: 1px solid var(--border); }
.mode-tabs a { min-width: 130px; display: flex; flex-direction: column; gap: 1px; position: relative; padding: 10px 16px; color: var(--muted); text-decoration: none; }
.mode-tabs a:hover { color: var(--fg); }
.mode-tabs a[aria-current="page"] { color: var(--fg); font-weight: 600; }
.mode-tabs a[aria-current="page"]::after { content: ""; height: 2px; position: absolute; right: 12px; bottom: -1px; left: 12px; border-radius: 2px 2px 0 0; background: #f78166; }
.mode-tabs small { font-size: .6875rem; font-weight: 400; }
.mode-tabs + .discussion-layout { margin-top: 16px; }
.outcome-view { display: grid; grid-template-columns: minmax(0, 1fr) 250px; align-items: start; gap: 24px; }
.discussion-post { min-width: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; }
.discussion-post > header { min-height: 56px; display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); }
.discussion-post > header p { margin: 1px 0 0; color: var(--muted); font-size: .75rem; }
.post-avatar { width: 32px; height: 32px; display: grid; flex: 0 0 32px; place-items: center; border-radius: 50%; background: var(--fg); color: var(--canvas); }
.markdown-body { padding: 24px 28px 32px; overflow-wrap: anywhere; font-size: .9375rem; }
.markdown-body > :first-child { margin-top: 0; }
.markdown-body > :last-child { margin-bottom: 0; }
.markdown-body h1, .markdown-body h2 { margin: 24px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border-muted); line-height: 1.25; }
.markdown-body h1 { font-size: 1.5rem; }
.markdown-body h2 { font-size: 1.25rem; }
.markdown-body h3 { margin: 20px 0 10px; font-size: 1.0625rem; }
.markdown-body p, .markdown-body ul, .markdown-body ol, .markdown-body blockquote, .markdown-body pre, .markdown-body table { margin-block: 0 16px; }
.markdown-body li + li { margin-top: 4px; }
.markdown-body blockquote { margin-inline: 0; padding: 0 16px; border-left: 4px solid var(--border); color: var(--muted); }
.markdown-body pre { max-width: 100%; overflow: auto; padding: 14px 16px; border-radius: 6px; background: var(--canvas-inset); }
.markdown-body pre code { padding: 0; background: transparent; }
.markdown-body img { max-width: 100%; height: auto; }
.markdown-body table { display: block; max-width: 100%; overflow-x: auto; }
.markdown-body table th, .markdown-body table td { border: 1px solid var(--border); }
.markdown-body .task-list-item { list-style: none; }
.outcome-meta section { padding: 14px 0; border-bottom: 1px solid var(--border); }
.outcome-meta section:first-child { padding-top: 0; }
.outcome-meta h2 { margin-bottom: 8px; color: var(--muted); font-size: .75rem; }
.outcome-meta p { margin: 0; overflow-wrap: anywhere; text-transform: capitalize; }
.outcome-meta a { display: inline-flex; align-items: center; gap: 5px; text-transform: none; }
.empty { margin: 0; padding: 28px 16px; color: var(--muted); text-align: center; }
.method p { max-width: 880px; margin-bottom: 0; color: var(--muted); }
code { padding: 2px 4px; border-radius: 4px; background: var(--neutral-muted); font: .75rem ui-monospace, SFMono-Regular, Consolas, monospace; }
footer { padding: 20px 24px; border-top: 1px solid var(--border); color: var(--muted); font-size: .75rem; }
footer a { min-height: 24px; display: inline-flex; align-items: center; }
.app-shell { min-height: 100vh; display: grid; grid-template-columns: 232px minmax(0, 1fr); }
.org-sidebar { min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 24px 16px 16px; border-right: 1px solid var(--border); background: var(--canvas-subtle); }
.sidebar-brand { display: block; margin: 0 8px 10px; overflow: hidden; color: var(--fg); font-size: 1.125rem; font-weight: 600; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
.primary-nav, .sidebar-group nav { display: flex; flex-direction: column; gap: 2px; }
.primary-nav a, .sidebar-group a { min-height: 32px; display: flex; align-items: center; gap: 10px; position: relative; padding: 6px 8px; border-radius: 6px; color: var(--fg); font-weight: 500; text-decoration: none; }
.primary-nav a > .octicon, .sidebar-group a > .octicon { color: var(--muted); }
.primary-nav a:hover, .sidebar-group a:hover { background: var(--neutral-muted); }
.primary-nav a[aria-current="page"], .sidebar-group a[aria-current="page"] { background: var(--neutral-muted); font-weight: 600; }
.primary-nav a[aria-current="page"]::before, .sidebar-group a[aria-current="page"]::before { content: ""; width: 3px; position: absolute; top: 5px; bottom: 5px; left: -16px; border-radius: 0 4px 4px 0; background: var(--accent); }
.sidebar-group { margin-top: 12px; padding-top: 18px; border-top: 1px solid var(--border); }
.sidebar-group > p { margin: 0 8px 6px; color: var(--muted); font-size: .75rem; font-weight: 600; text-transform: uppercase; }
.findings-nav { margin-top: 12px; }
.sidebar-repository { margin-top: auto; padding: 16px 8px 0; border-top: 1px solid var(--border); color: var(--muted); font-size: .75rem; }
.sidebar-repository span, .sidebar-repository a { display: block; }
.sidebar-repository a { margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-main { min-width: 0; display: flex; flex-direction: column; }
.app-main > nav { border-bottom: 1px solid var(--border); }
.app-main > nav .shell { display: flex; gap: 8px; max-width: 1280px; margin: auto; padding: 10px 24px; }
.app-main > nav .shell > a { min-height: 24px; display: inline-flex; align-items: center; }
.app-main > nav .shell > * + *::before { content: "/"; margin-right: 8px; color: var(--muted); }
.overview-header { min-height: 88px; display: flex; align-items: flex-start; justify-content: space-between; gap: 32px; padding: 18px 0 14px; }
.overview-header h1 { margin: 0; font-size: 1.5rem; line-height: 1.25; }
.overview-header .lede { margin: 3px 0 0; font-size: .875rem; }
.overview-header .freshness { flex: none; margin: 7px 0 0; color: var(--muted); font-size: .75rem; }
.toolbar { display: flex; align-items: center; gap: 8px; }
.filter-control { min-width: 240px; min-height: 30px; display: flex; flex: 1; align-items: stretch; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); font-size: .75rem; }
.scope-label, .scope-period, .export-control, .search-control { display: inline-flex; align-items: center; gap: 7px; padding: 4px 12px; }
.scope-label { border-right: 1px solid var(--border); }
.count-badge { min-width: 20px; padding: 0 6px; border-radius: 2em; background: var(--neutral-muted); font-size: .6875rem; text-align: center; }
.filter-control code { min-width: 0; flex: 1; padding: 5px 12px; overflow: hidden; background: transparent; color: var(--accent); text-overflow: ellipsis; white-space: nowrap; }
.search-control { padding-inline: 9px; border-left: 1px solid var(--border); color: var(--muted); }
.scope-period, .export-control { min-height: 30px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); color: var(--fg); font-size: .75rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
.scope-note { margin: 8px 0 15px; color: var(--muted); font-size: .75rem; }
.scope-note a { color: inherit; }
.report-tabs { display: flex; margin: 0 0 22px; border-bottom: 1px solid var(--border); }
.report-tabs a { position: relative; margin-bottom: -1px; padding: 8px 14px; border: 1px solid transparent; color: var(--muted); font-weight: 600; text-decoration: none; }
.report-tabs a:hover { color: var(--fg); }
.report-tabs a[aria-current="page"] { border-color: var(--border) var(--border) var(--canvas); border-radius: 6px 6px 0 0; background: var(--canvas); color: var(--fg); }
.campaign-tabs { display: flex; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid var(--border); }
.campaign-tabs a { display: inline-flex; align-items: center; gap: 8px; position: relative; padding: 10px 14px 12px; color: var(--fg); font-weight: 600; text-decoration: none; }
.campaign-tabs a > .octicon { color: var(--muted); }
.campaign-tabs a:hover { background: var(--canvas-subtle); }
.campaign-tabs a[aria-current="page"]::after { content: ""; height: 2px; position: absolute; right: 8px; bottom: -1px; left: 8px; background: #f78166; }
.campaign-tabs strong { min-width: 20px; padding: 0 6px; border-radius: 2em; background: var(--neutral-muted); color: var(--muted); font-size: .6875rem; text-align: center; }
.campaign-empty { min-height: 330px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 !important; padding: 40px 24px !important; border: 1px solid var(--border) !important; border-radius: 6px !important; text-align: center; }
.campaign-empty .campaign-empty-icon { width: 32px; height: 32px; flex-basis: 32px; color: var(--muted); }
.campaign-empty h2 { margin: 18px 0 6px; font-size: 1.25rem; }
.campaign-empty p { max-width: 620px; margin: 0; color: var(--muted); }
.campaign-create { display: inline-flex; align-items: center; min-height: 32px; margin-top: 22px; padding: 5px 16px; border: 1px solid #2ea043; border-radius: 6px; background: #238636; color: #fff; font-size: .875rem; font-weight: 600; text-decoration: none; }
.campaign-create:hover { background: #2ea043; text-decoration: none; }
.campaign-create:active { background: #238636; }
.report-body { padding-top: 0; }
.report-body > section, .report-body > section:last-child { margin: 0 0 24px; padding: 0; overflow: visible; border: 0; border-radius: 0; background: transparent; }
.value-report { overflow: hidden !important; border: 1px solid var(--border) !important; border-radius: 6px !important; background: var(--canvas) !important; }
.value-report > header { min-height: 76px; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 16px; border-bottom: 1px solid var(--border); }
.value-report > header h2 { margin: 0; font-size: 1.125rem; }
.value-report > header p { max-width: 760px; margin: 3px 0 0; color: var(--muted); font-size: .75rem; }
.value-score { flex: none; text-align: right; }
.value-score strong, .value-score span { display: block; }
.value-score strong { font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.value-score span { color: var(--muted); font-size: .6875rem; }
.value-chart { height: 400px; padding: 12px 16px; overflow: hidden; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); }
.value-chart img { width: 100%; height: 100%; display: block; object-fit: contain; object-position: center; }
.value-details-disclosure > summary, .value-details-unavailable { min-height: 44px; display: flex; align-items: center; padding: 10px 16px; color: var(--fg); font-size: .75rem; font-weight: 600; }
.value-details-disclosure > summary { cursor: pointer; }
.value-details-disclosure > summary:hover { background: var(--canvas-subtle); }
.value-details-disclosure[open] > summary { border-bottom: 1px solid var(--border); }
.value-details-unavailable { color: var(--muted); }
.value-details { display: grid; grid-template-columns: minmax(260px, .75fr) minmax(0, 1.25fr); gap: 0; }
.value-details > section { min-width: 0; padding: 16px; }
.value-details > section + section { border-left: 1px solid var(--border); }
.value-details h3 { margin: 0 0 4px; font-size: .875rem; }
.value-details h3 + p { margin: 0 0 12px; color: var(--muted); font-size: .75rem; }
.value-details .table-region { max-height: 340px; overflow: auto; border: 1px solid var(--border); border-radius: 6px; }
.value-details table { min-width: 100%; font-size: .75rem; }
.value-details th, .value-details td { padding: 8px 10px; white-space: nowrap; }
.value-details tbody th { font-weight: 500; }
.value-report-empty > header { align-items: center; }
.value-empty { height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 36px 24px; border-bottom: 1px solid var(--border); text-align: center; }
.value-empty > .octicon { width: 30px; height: 30px; color: var(--muted); }
.value-empty h3 { margin: 16px 0 5px; font-size: 1.125rem; }
.value-empty p { max-width: 620px; margin: 0; color: var(--muted); }
.deployed-summary { margin-top: 8px !important; }
.deployed-summary .metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.overview-section-heading { margin: 32px 0 12px; padding-top: 24px; border-top: 1px solid var(--border); }
.overview-section-heading h2 { margin: 0 0 3px; font-size: 1.25rem; }
.overview-section-heading p { margin: 0; color: var(--muted); }
.deployed-workflows > h2 { margin-bottom: 3px; font-size: 1.25rem; }
.deployed-workflows > p { margin: 0 0 12px; color: var(--muted); }
.organization-bundles > h2 { margin-bottom: 3px; font-size: 1.25rem; }
.organization-bundles > p { margin: 0 0 12px; color: var(--muted); }
.organization-bundles td:nth-child(3), .organization-bundles td:nth-child(4) { width: 90px; }
.deployed-workflows td:nth-child(2) a, .deployed-workflows td:nth-child(2) code { display: block; }
.deployed-workflows td:nth-child(2) code { width: fit-content; max-width: 420px; margin-top: 3px; overflow: hidden; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; }
.deployed-workflows-table { table-layout: fixed; }
.deployed-workflows-table :is(th, td):nth-child(1) { width: 18%; }
.deployed-workflows-table :is(th, td):nth-child(2) { width: 35%; }
.deployed-workflows-table :is(th, td):nth-child(3) { width: 14%; }
.deployed-workflows-table :is(th, td):nth-child(4), .deployed-workflows-table :is(th, td):nth-child(5) { width: 7%; }
.deployed-workflows-table :is(th, td):nth-child(6) { width: 9%; }
.deployed-workflows-table :is(th, td):nth-child(7) { width: 10%; }
.deployed-workflows-table td { overflow: hidden; text-overflow: ellipsis; }
.deployed-workflows-table td:first-child, .deployed-workflows-table td:nth-child(n + 3) { white-space: nowrap; }
.metric-date { font-size: 1.125rem !important; }
.repository-workflow-summary .metrics { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.spend-panel { display: grid; grid-template-columns: minmax(190px, .65fr) minmax(0, 1.35fr); align-items: center; gap: 24px; padding: 20px 24px !important; border: 1px solid var(--border) !important; border-radius: 6px !important; }
.spend-panel h2 { margin-bottom: 4px; font-size: 1.25rem; }
.spend-panel > div:first-child > p { margin: 0; color: var(--muted); }
.spend-chart { min-width: 0; display: grid; grid-template-columns: 180px minmax(0, 1fr); align-items: center; gap: 20px; }
.spend-donut { width: 180px; height: 180px; display: grid; place-items: center; border-radius: 50%; }
.spend-donut::before { content: ""; width: 108px; aspect-ratio: 1; grid-area: 1 / 1; border-radius: 50%; background: var(--canvas); }
.spend-donut span { z-index: 1; grid-area: 1 / 1; text-align: center; }
.spend-donut strong, .spend-donut small { display: block; }
.spend-donut strong { font-size: 1.375rem; font-variant-numeric: tabular-nums; }
.spend-donut small { color: var(--muted); font-size: .6875rem; }
.spend-chart ol { margin: 0; padding: 0; list-style: none; }
.spend-chart li { min-height: 30px; display: grid; grid-template-columns: 10px minmax(0, 1fr) auto 54px; align-items: center; gap: 9px; border-bottom: 1px solid var(--border-muted); font-size: .75rem; }
.spend-chart li:last-child { border-bottom: 0; }
.spend-chart li i { width: 9px; height: 9px; border-radius: 2px; }
.spend-chart li strong, .spend-chart li small { font-variant-numeric: tabular-nums; text-align: right; }
.spend-chart li small { color: var(--muted); }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 12px; }
.section-heading h2 { margin-bottom: 3px; font-size: 1.25rem; }
.section-heading p { margin: 0; color: var(--muted); }
.section-heading > a { display: inline-flex; align-items: center; gap: 5px; flex: none; }
.repository-workflows tbody th a, .repository-workflows tbody th code { display: block; }
.repository-workflows tbody th code { width: fit-content; max-width: 640px; margin-top: 3px; overflow: hidden; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; }
.repository-workflows td { white-space: nowrap; }
.trend-panel { overflow: hidden !important; border: 1px solid var(--border) !important; border-radius: 6px !important; background: var(--canvas) !important; }
.trend-panel > header { min-height: 72px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.trend-panel > header h2 { margin: 0; }
.trend-panel > header p { margin: 2px 0 0; color: var(--muted); font-size: .75rem; }
.trend-panel > header p strong { margin-right: 8px; color: var(--fg); font-size: 1.375rem; font-variant-numeric: tabular-nums; }
.trend-panel > header > span { color: var(--muted); font-size: .75rem; }
.trend-group { display: inline-flex; align-items: center; gap: 6px; }
.trend-group b { margin-left: 8px; color: var(--muted); font-size: 1rem; letter-spacing: 1px; }
.trend-chart { overflow-x: auto; padding: 6px 18px 0; }
.trend-chart svg { width: 100%; min-width: 760px; height: 240px; overflow: visible; }
.trend-chart line { stroke: var(--border-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
.trend-chart .vertical-grid { stroke-dasharray: 2 2; }
.trend-chart text { fill: var(--muted); font-size: .6875rem; }
.trend-chart polyline { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke; }
.chart-successful { stroke: var(--success); }
.chart-failed { stroke: var(--danger); stroke-dasharray: 8 5; }
.chart-cancelled { stroke: var(--cancelled); stroke-dasharray: 8 4 2 4; }
.chart-point { cursor: crosshair; outline: none; }
.point-hit { fill: transparent; pointer-events: all; }
.point-marker { fill: var(--canvas); stroke-width: 3; opacity: 0; pointer-events: none; vector-effect: non-scaling-stroke; }
.point-marker-successful { stroke: var(--success); }
.point-marker-failed { stroke: var(--danger); }
.point-marker-cancelled { stroke: var(--cancelled); }
.point-tooltip { opacity: 0; pointer-events: none; transition: opacity 80ms linear; }
.point-tooltip rect { fill: var(--canvas-subtle); stroke: var(--border); vector-effect: non-scaling-stroke; }
.trend-chart .point-tooltip .tooltip-date { fill: var(--muted); font-weight: 600; }
.trend-chart .point-tooltip .tooltip-label, .trend-chart .point-tooltip .tooltip-value { fill: var(--fg); font-weight: 600; }
.trend-chart .tooltip-swatch-successful { fill: var(--success); }
.trend-chart .tooltip-swatch-failed { fill: var(--danger); }
.trend-chart .tooltip-swatch-cancelled { fill: var(--cancelled); }
.chart-point:hover .point-marker, .chart-point:focus-visible .point-marker, .chart-point:hover .point-tooltip, .chart-point:focus-visible .point-tooltip { opacity: 1; }
.chart-point:focus-visible .point-hit { fill: color-mix(in srgb, var(--focus) 18%, transparent); stroke: var(--focus); stroke-width: 2; vector-effect: non-scaling-stroke; }
.chart-axis, .chart-legend { display: flex; justify-content: space-between; color: var(--muted); font-size: .6875rem; }
.chart-axis { padding: 0 30px; }
.chart-legend { justify-content: flex-start; gap: 20px; padding: 10px 16px 0; }
.chart-legend span { display: inline-flex; align-items: center; gap: 6px; }
.chart-legend i { width: 18px; height: 0; border-top-width: 2px; border-top-style: solid; }
.legend-successful { border-color: var(--success); }
.legend-failed { border-color: var(--danger); border-top-style: dashed !important; }
.legend-cancelled { border-color: var(--cancelled); border-top-style: dotted !important; }
.metric-section { border: 0 !important; }
.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 0; overflow: visible; border: 0; border-radius: 0; background: transparent; }
.metrics div, .metrics div:nth-child(2) { min-width: 0; min-height: 108px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.metrics dt { color: var(--fg); font-size: .875rem; font-weight: 600; text-transform: none; }
.metrics dd { margin: 4px 0 0; font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.metrics p { margin: 3px 0 0; color: var(--muted); font-size: .75rem; }
.impact-analysis > h2 { margin-bottom: 2px; font-size: 1.25rem; }
.impact-analysis > p { margin: 0 0 10px; color: var(--muted); }
.impact-tabs { display: flex; border-bottom: 1px solid var(--border); }
.impact-tabs a { position: relative; padding: 8px 13px; color: var(--fg); font-size: .75rem; font-weight: 600; text-decoration: none; }
.impact-tabs a[aria-current="page"]::after { content: ""; height: 2px; position: absolute; right: 8px; bottom: -1px; left: 8px; background: #f78166; }
.impact-tabs + .table-region { border-top: 0; border-radius: 0 0 6px 6px; }
@media (min-width: 701px) and (max-width: 900px) {
  .toolbar { align-items: stretch; flex-wrap: wrap; }
  .filter-control { flex: 1 1 calc(100% - 150px); }
  .scope-period { flex: 0 0 auto; justify-content: center; }
  .export-control { flex: 0 0 auto; }
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .repository-workflow-summary .metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .spend-panel { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .app-shell { display: block; }
  .org-sidebar { display: block; padding: 14px 12px 10px; border-right: 0; border-bottom: 1px solid var(--border); }
  .sidebar-brand { margin-bottom: 8px; font-size: 1rem; }
  .primary-nav { width: 100%; flex-direction: row; overflow-x: auto; }
  .primary-nav a { min-height: 44px; flex: none; }
  .sidebar-group, .sidebar-repository { display: none; }
  .overview-header { min-height: 0; padding: 24px 0 20px; }
  .toolbar { align-items: stretch; flex-wrap: wrap; }
  .filter-control { flex-basis: 100%; }
  .scope-period, .export-control { min-height: 44px; }
  .scope-period { flex: 1; justify-content: center; }
  .metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .deployed-summary .metrics, .repository-workflow-summary .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .spend-panel, .spend-chart { grid-template-columns: 1fr; }
  .spend-donut { margin: auto; }
  .app-main > nav .shell { padding-inline: 16px; }
  .site-header { height: 56px; }
  .header-inner { padding: 0 16px; }
  .repo-nav { height: 44px; }
  .repo-nav > div { padding-inline: 8px; }
  .repo-nav a { height: 36px; padding-inline: 10px; }
  .control-layout { min-height: calc(100vh - 100px); display: block; }
  .control-sidebar { display: block; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--border); }
  .sidebar-title, .nav-label, .sidebar-footer { display: none; }
  .sidebar-nav { width: max-content; flex-direction: row; padding: 8px; }
  .sidebar-nav a { min-height: 44px; padding: 5px 10px; }
  .sidebar-nav a[aria-current="page"]::before { width: auto; height: 2px; inset: auto 8px -8px; border-radius: 2px 2px 0 0; }
  .nav-icon { display: none; }
  main { padding: 0 14px 28px; }
  .intro { min-height: 0; display: block; padding: 20px 0; }
  .page-header-actions { margin-top: 16px; justify-content: space-between; }
  .freshness { text-align: left; }
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .metrics div:nth-child(2) { border-right: 0; }
  .metrics div:nth-child(-n + 2) { border-bottom: 1px solid var(--border); }
  .discussion-layout { grid-template-columns: 1fr; gap: 12px; }
  .finding-columns { display: none; }
  .finding-row { grid-template-columns: 38px minmax(0, 1fr) auto; gap: 10px; }
  .finding-row > .status { grid-column: 3; grid-row: 1; }
  .finding-workflow, .finding-row > .kind, .finding-row > time { display: none; }
  .value-report > header { flex-direction: column; gap: 8px; }
  .value-score { text-align: left; }
  .value-details { grid-template-columns: 1fr; }
  .value-details > section + section { border-top: 1px solid var(--border); border-left: 0; }
  .discussion-sidebar { display: flex; gap: 4px; overflow-x: auto; }
  .discussion-sidebar h2 { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .discussion-sidebar > div { min-width: max-content; display: flex; }
  .mode-tabs { overflow-x: auto; overflow-y: hidden; }
  .mode-tabs a { min-width: 120px; padding-inline: 12px; }
  .outcome-view { grid-template-columns: 1fr; }
  .outcome-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
  .control-content > nav .shell { padding-inline: 16px; }
  footer { padding-inline: 16px; }
}
@media (max-width: 420px) {
  .overview-header { display: block; }
  .overview-header .freshness { margin-top: 12px; }
  .metrics { grid-template-columns: 1fr; }
  .metrics div, .metrics div:nth-child(2) { border: 1px solid var(--border); }
  .trend-chart svg { height: 170px; }
  .github-mark { display: none; }
  .repo-nav a:nth-child(2), .repo-nav a:nth-child(3), .repo-nav a:nth-child(5) { display: none; }
  .page-header-actions { align-items: flex-start; flex-direction: column; gap: 10px; }
  .metrics { grid-template-columns: 1fr; }
  .metrics div, .metrics div:nth-child(2) { border-right: 0; border-bottom: 1px solid var(--border); }
  .metrics div:last-child { border-bottom: 0; }
  .discussion-row { grid-template-columns: 34px minmax(0, 1fr); padding-inline: 12px; }
  .discussion-vote { display: none; }
  .discussion-category { width: 32px; height: 32px; }
  .discussion-main > p { -webkit-line-clamp: 3; }
  .markdown-body { padding: 20px 16px 24px; }
  .outcome-meta { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
@media (prefers-contrast: more) {
  :root {
    --border: var(--fg);
    --border-muted: var(--muted);
  }
  a:focus-visible, [tabindex]:focus-visible { outline-width: 3px; }
}
@media (forced-colors: active) {
  :root {
    --canvas: Canvas;
    --canvas-subtle: Canvas;
    --canvas-inset: Canvas;
    --header: Canvas;
    --fg: CanvasText;
    --muted: CanvasText;
    --border: ButtonBorder;
    --border-muted: ButtonBorder;
    --accent: LinkText;
    --accent-muted: Canvas;
    --success: CanvasText;
    --success-muted: Canvas;
    --danger: CanvasText;
    --cancelled: CanvasText;
    --attention: CanvasText;
    --attention-muted: Canvas;
    --neutral-muted: Canvas;
    --focus: Highlight;
  }
}
@media print {
  .site-header, .repo-nav, .control-sidebar, .control-content > nav, .org-sidebar, .app-main > nav, .skip-link, .toolbar, .report-tabs { display: none; }
  .control-layout { display: block; }
  main { width: 100%; padding: 0; }
  a { color: inherit; text-decoration: underline; }
  .discussion-row, .discussion-post { break-inside: avoid; }
}`;
}

function legacyStylesheet() {
  return `:root{--canvas:#fff;--inset:#f6f8fa;--fg:#1f2328;--muted:#59636e;--border:#d1d9e0;--accent:#0969da;--success:#1a7f37;--attention:#9a6700;--focus:#0969da}
@media(prefers-color-scheme:dark){:root{--canvas:#0d1117;--inset:#161b22;--fg:#f0f6fc;--muted:#9198a1;--border:#3d444d;--accent:#58a6ff;--success:#3fb950;--attention:#d29922;--focus:#58a6ff}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--canvas);color:var(--fg);font: .875rem/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0}a{color:var(--accent);text-underline-offset:2px}a:hover{text-decoration-thickness:2px}a:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--focus);outline-offset:3px}.skip-link{position:absolute;left:16px;top:-80px;padding:8px 12px;background:var(--canvas);border:1px solid var(--focus);z-index:2}.skip-link:focus{top:8px}.shell{width:min(1120px,calc(100% - 32px));margin-inline:auto}.site-header{border-bottom:1px solid var(--border);background:var(--inset)}.site-header .shell{min-height:56px;display:flex;align-items:center;gap:12px;justify-content:space-between}.brand{font-size: 1rem;font-weight:600;color:var(--fg);text-decoration:none}.repository{color:var(--muted);font-family:ui-monospace,SFMono-Regular,Consolas,monospace}nav{border-bottom:1px solid var(--border)}nav .shell{display:flex;gap:16px;padding-block:10px}nav [aria-current=page]{font-weight:600}.intro{padding:40px 0 28px;border-bottom:1px solid var(--border)}.eyebrow{text-transform:uppercase;color:var(--muted);font-size: .75rem;font-weight:600;margin:0 0 6px}.intro h1{font-size: 2rem;line-height:1.2;margin:0}.lede{max-width:760px;font-size: 1.0625rem;margin:12px 0}.freshness,.metadata{color:var(--muted);font-size: .75rem}section{padding:28px 0}h2{font-size: 1.25rem;margin:0 0 16px}h3{font-size: 1rem;margin:8px 0}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-block:1px solid var(--border);margin:0}.metrics div{padding:16px;border-right:1px solid var(--border)}.metrics div:last-child{border-right:0}.metrics dt{color:var(--muted)}.metrics dd{font-size: 1.75rem;font-weight:600;margin:2px 0;font-variant-numeric:tabular-nums}.table-region{overflow-x:auto;border:1px solid var(--border);border-radius:6px}table{width:100%;border-collapse:collapse;min-width:600px}caption{text-align:left;padding:12px;color:var(--muted)}th,td{text-align:left;padding:10px 12px;border-top:1px solid var(--border)}thead{background:var(--inset)}.records{border-top:1px solid var(--border)}.record{padding:18px 0;border-bottom:1px solid var(--border)}.record-heading{display:flex;align-items:center;gap:8px}.kind{text-transform:uppercase;color:var(--muted);font-size: .6875rem;font-weight:600}.status{font-size: .75rem;font-weight:600}.status-success{color:var(--success)}.status-attention{color:var(--attention)}.status-muted{color:var(--muted)}.record p{max-width:860px;margin:6px 0}.empty{padding:24px;background:var(--inset);border:1px solid var(--border);border-radius:6px}.method{border-top:1px solid var(--border)}footer{border-top:1px solid var(--border);color:var(--muted);padding:24px 0;margin-top:24px}
@media(max-width:640px){.site-header .shell{align-items:flex-start;flex-direction:column;justify-content:center;padding-block:10px}.repository{overflow-wrap:anywhere}.intro{padding-top:28px}.intro h1{font-size: 1.625rem}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.metrics div:nth-child(2){border-right:0}.metrics div:nth-child(-n+2){border-bottom:1px solid var(--border)}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{.skip-link,nav{display:none}a{color:inherit;text-decoration:underline}.shell{width:100%}.record{break-inside:avoid}}`;
}

console.log(`Built ${records.length} safe-output records across ${bundleDefinitions.length} bundles in ${outputDirectory}`);