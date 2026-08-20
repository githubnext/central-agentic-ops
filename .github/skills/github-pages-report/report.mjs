import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const outputDirectory = process.env.REPORT_OUTPUT || "_site";
const inventoryPath = process.env.REPORT_INVENTORY;

if (!repository || !token || !inventoryPath) {
  throw new Error("GITHUB_REPOSITORY, GITHUB_TOKEN, and REPORT_INVENTORY are required");
}

const [owner, repo] = repository.split("/");
const apiRoot = "https://api.github.com";
const generatedAt = new Date().toISOString();
const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.workflows) || !Array.isArray(inventory.bundles)) {
  throw new Error(`Unsupported or invalid control-plane inventory: ${inventoryPath}`);
}
const bundleDefinitions = inventory.bundles;
const standaloneDefinitions = inventory.standalone;
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
    <div class="discussion-category">${octicon(record.kind === "noop" ? "gear" : "issue")}</div>
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
      <div>${octicon("gear")}<span>No action</span><strong>${recordsForPage.length - actionable}</strong></div>
    </aside>
    <section class="discussion-list" aria-labelledby="outcomes-heading">
      <div class="discussion-toolbar"><h2 id="outcomes-heading">Outcomes</h2><span>Latest activity</span></div>
      <div class="records">${recordsForPage.map(itemMarkup).join("\n") || '<p class="empty">No outcomes have been recorded yet.</p>'}</div>
    </section>
  </div>`;
}

function modeSummary(recordsForBundle, mode) {
  const modeRecords = recordsForBundle.filter((record) => record.mode === mode);
  const latest = modeRecords[0];
  return `${modeRecords.length}${latest ? ` · ${formatDate(latest.updatedAt)}` : ""}`;
}

function modeTabs(bundle, selectedMode, unknownCount) {
  const tabs = [
    ["review", "Review", "Proposals"],
    ["live", "Live", "Production"],
    ...(unknownCount ? [["unknown", "Unknown", "Unavailable provenance"]] : []),
  ];
  return `<nav class="mode-tabs" aria-label="Output mode">${tabs.map(([mode, label, detail]) => `<a href="${bundle.id}-${mode}.html"${selectedMode === mode ? ' aria-current="page"' : ""}><span>${label}</span><small>${detail}</small></a>`).join("")}</nav>`;
}

function octicon(name, className = "") {
  return `<svg class="octicon${className ? ` ${className}` : ""}" aria-hidden="true"><use href="#octicon-${name}"></use></svg>`;
}

function octiconSprite() {
  return `<svg class="octicon-sprite" aria-hidden="true">
    <symbol id="octicon-mark-github" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.64 0 8.13c0 3.59 2.29 6.64 5.47 7.71.4.08.55-.18.55-.39 0-.19-.01-.82-.01-1.49-2.01.44-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.59 1.23.83.72 1.22 1.87.88 2.33.67.07-.53.28-.88.51-1.08-1.78-.21-3.64-.91-3.64-4.02 0-.89.31-1.62.82-2.19-.08-.2-.36-1.04.08-2.16 0 0 .67-.22 2.2.84A7.5 7.5 0 0 1 8 3.85a7.5 7.5 0 0 1 2 .27c1.53-1.06 2.2-.84 2.2-.84.44 1.12.16 1.96.08 2.16.51.57.82 1.3.82 2.19 0 3.12-1.87 3.81-3.65 4.02.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.47.55.39A8.01 8.01 0 0 0 16 8.13C16 3.64 12.42 0 8 0Z"></path></symbol>
    <symbol id="octicon-code" viewBox="0 0 16 16"><path d="M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L.47 8.53a.75.75 0 0 1 0-1.06Zm6.56 0 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L13.94 8l-3.72-3.72a.75.75 0 1 1 1.06-1.06Z"></path></symbol>
    <symbol id="octicon-issue" viewBox="0 0 16 16"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11Zm-.75-9.25a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0ZM8 9.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"></path></symbol>
    <symbol id="octicon-pull-request" viewBox="0 0 16 16"><path d="M3.25 1.75a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM2.5 6.75v5.19a1.75 1.75 0 1 0 1.5 0V6.75a.75.75 0 0 0-1.5 0Zm10.25 4a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM8.5 2.5a.75.75 0 0 0 0 1.5h1.75A1.75 1.75 0 0 1 12 5.75v3a.75.75 0 0 0 1.5 0v-3a3.25 3.25 0 0 0-3.25-3.25Z"></path></symbol>
    <symbol id="octicon-play" viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm6.25-2.11a.75.75 0 0 1 1.14-.64l3 1.86a.75.75 0 0 1 0 1.28l-3 1.86a.75.75 0 0 1-1.14-.64Z"></path></symbol>
    <symbol id="octicon-gear" viewBox="0 0 16 16"><path d="M8 3.75a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Zm0 4a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm5.66.28-.28-.38a1.75 1.75 0 0 1 0-2.1l.28-.38a1.75 1.75 0 0 0-1.58-2.74l-.47.07a1.75 1.75 0 0 1-1.83-1l-.2-.43a1.75 1.75 0 0 0-3.16 0l-.2.43a1.75 1.75 0 0 1-1.83 1l-.47-.07a1.75 1.75 0 0 0-1.58 2.74l.28.38a1.75 1.75 0 0 1 0 2.1l-.28.38a1.75 1.75 0 0 0 1.58 2.74l.47-.07a1.75 1.75 0 0 1 1.83 1l.2.43a1.75 1.75 0 0 0 3.16 0l.2-.43a1.75 1.75 0 0 1 1.83-1l.47.07a1.75 1.75 0 0 0 1.58-2.74Z"></path></symbol>
    <symbol id="octicon-package" viewBox="0 0 16 16"><path d="m8.88.49 5.75 2.88c.23.11.37.34.37.59v8.08c0 .25-.14.48-.37.59l-5.75 2.88a1.97 1.97 0 0 1-1.76 0l-5.75-2.88A.66.66 0 0 1 1 12.04V3.96c0-.25.14-.48.37-.59L7.12.49a1.97 1.97 0 0 1 1.76 0ZM8 1.83 3.02 4.32 8 6.81l4.98-2.49L8 1.83Zm-5.5 3.7v6.11l4.75 2.38V7.91L2.5 5.53Zm6.25 8.49 4.75-2.38V5.53L8.75 7.91v6.11Z"></path></symbol>
    <symbol id="octicon-external-link" viewBox="0 0 16 16"><path d="M3.75 2h3a.75.75 0 0 1 0 1.5h-3a.25.25 0 0 0-.25.25v8.5c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3a.75.75 0 0 1 1.5 0v3A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.78 2.78 2 3.75 2Zm5.5-.75A.75.75 0 0 1 10 0h5.25c.41 0 .75.34.75.75V6a.75.75 0 0 1-1.5 0V2.56L8.78 8.28a.75.75 0 0 1-1.06-1.06l5.72-5.72H10a.75.75 0 0 1-.75-.75Z"></path></symbol>
  </svg>`;
}

function layout({ title, description, content, nested = false, navigation = "" }) {
  const root = nested ? "../" : "./";
  const stylesheetLink = `<${"link"} rel="stylesheet" href="${root}styles.css">`;
  const overviewCurrent = nested ? "" : ' aria-current="page"';
  const bundleLinks = bundleDefinitions.map((bundle) => {
    const current = title.startsWith(bundle.name) ? ' aria-current="page"' : "";
    return `<a href="${root}bundles/${bundle.id}.html"${current}>${octicon("package", "nav-icon")}${escapeHtml(bundle.name)}</a>`;
  }).join("\n");
  const standaloneLinks = standaloneDefinitions.map((workflow) => {
    const current = title.startsWith(workflow.name) ? ' aria-current="page"' : "";
    return `<a href="${root}workflows/${workflow.id}.html"${current}>${octicon("gear", "nav-icon")}${escapeHtml(workflow.name)}</a>`;
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
  <header class="site-header"><div class="header-inner">
    <a class="brand" href="${root}" aria-label="Central Agentic Ops home">${octicon("mark-github", "github-mark")}<span>${escapeHtml(repository)}</span></a>
    <a class="github-link" href="https://github.com/${escapeHtml(repository)}/actions">Open in GitHub${octicon("external-link")}</a>
  </div></header>
  <nav class="repo-nav" aria-label="Repository navigation"><div>
    <a href="https://github.com/${escapeHtml(repository)}">${octicon("code")}Code</a>
    <a href="https://github.com/${escapeHtml(repository)}/issues">${octicon("issue")}Issues</a>
    <a href="https://github.com/${escapeHtml(repository)}/pulls">${octicon("pull-request")}Pull requests</a>
    <a href="${root}" aria-current="page">${octicon("play")}Actions</a>
    <a href="https://github.com/${escapeHtml(repository)}/settings">${octicon("gear")}Settings</a>
  </div></nav>
  <div class="control-layout">
    <aside class="control-sidebar" aria-label="Control navigation">
      <div class="sidebar-title">Actions</div>
      <nav class="sidebar-nav">
        <a href="${root}"${overviewCurrent}>${octicon("play", "nav-icon")}All workflows</a>
        ${bundleLinks ? '<div class="nav-label">Bundles</div>' : ""}
        ${bundleLinks}
        ${standaloneLinks ? '<div class="nav-label">Standalone</div>' : ""}
        ${standaloneLinks}
      </nav>
      <div class="sidebar-footer"><a href="https://github.com/${escapeHtml(repository)}/actions">${octicon("play")}Workflow runs</a></div>
    </aside>
    <div class="control-content">
      ${navigation}
      <main id="main">
        <section class="intro page-header" aria-labelledby="page-title">
          <div class="page-header-content">
            <p class="eyebrow">Control plane</p>
            <div class="title-area">${octicon("play", "leading-visual")}<h1 id="page-title">${escapeHtml(title)}</h1></div>
            <p class="lede">${escapeHtml(description)}</p>
          </div>
          <div class="page-header-actions">
            <a class="page-action" href="https://github.com/${escapeHtml(repository)}/actions">${octicon("play")}View workflows</a>
            <div class="freshness"><span class="status-dot" aria-hidden="true"></span><span>Updated ${escapeHtml(formatDate(generatedAt))}<br>UTC · repository outputs and review artifacts</span></div>
          </div>
        </section>
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
async function modeFromRunUrl(runUrl) {
  const match = runUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)/);
  if (!match) return "unknown";
  const [, runOwner, runRepository, runId] = match;
  const cacheKey = `${runOwner}/${runRepository}/${runId}`;
  if (!runCache.has(cacheKey)) {
    runCache.set(cacheKey, githubOptional(`/repos/${runOwner}/${runRepository}/actions/runs/${runId}`, null));
  }
  const run = await runCache.get(cacheKey);
  const mode = run?.display_title?.match(/(?:^|\s[·|:-]\s)(preview|review|live)$/i)?.[1]?.toLowerCase();
  return mode === "review" || mode === "live" ? mode : "unknown";
}

const discoveredRecords = [
  ...issues.map(recordFromIssue).filter(Boolean),
  ...comments.map((comment) => recordFromComment(comment, issueByUrl)).filter(Boolean),
  ...(await Promise.all((artifactResponse.artifacts || []).map(recordFromArtifact))).filter(Boolean),
];
const records = (await Promise.all(discoveredRecords.map(async (record) => ({
  ...record,
  mode: record.mode || await modeFromRunUrl(record.runUrl),
})))).sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "records.json"), `${JSON.stringify({ generatedAt, repository, inventory, records }, null, 2)}\n`);

const totals = {
  outputs: records.length,
  actionable: records.filter((record) => record.kind !== "noop").length,
  noops: records.filter((record) => record.kind === "noop").length,
  workflows: inventory.workflows.length,
};
const metrics = `<section aria-labelledby="summary-heading">
  <h2 id="summary-heading">Outcome summary</h2>
  <dl class="metrics">
    <div><dt>Recorded outputs</dt><dd>${totals.outputs}</dd></div>
    <div><dt>Actionable outputs</dt><dd>${totals.actionable}</dd></div>
    <div><dt>No-op outcomes</dt><dd>${totals.noops}</dd></div>
    <div><dt>Workflows</dt><dd>${totals.workflows}</dd></div>
  </dl>
</section>`;
const bundleRows = bundleDefinitions.map((bundle) => {
  const bundleRecords = records.filter((record) => record.bundle === bundle.id);
  const latest = bundleRecords[0];
  const health = [bundle.compiled ? "compiled" : "source only", bundle.missingWorkers.length ? `${bundle.missingWorkers.length} missing worker(s)` : `${bundle.workers.length} worker(s)`].join(" · ");
  const configuredMode = repositoryVariables.get(bundle.rolloutModeVariable) || "preview";
  return `<tr><th scope="row"><a href="bundles/${bundle.id}.html">${escapeHtml(bundle.name)}</a></th><td><span class="mode-badge mode-${escapeHtml(configuredMode)}">${escapeHtml(configuredMode)}</span></td><td>${escapeHtml(modeSummary(bundleRecords, "review"))}</td><td>${escapeHtml(modeSummary(bundleRecords, "live"))}</td><td>${escapeHtml(health)}</td><td>${escapeHtml(latest ? formatDate(latest.updatedAt) : "No outputs yet")}</td></tr>`;
}).join("\n");
const standaloneRows = standaloneDefinitions.map((workflow) => {
  const workflowRecords = records.filter((record) => record.bundle === workflow.id);
  const latest = workflowRecords[0];
  return `<tr><th scope="row"><a href="workflows/${workflow.id}.html">${escapeHtml(workflow.name)}</a></th><td>${workflowRecords.length}</td><td>${workflow.compiled ? "compiled" : "source only"}</td><td>${escapeHtml(latest ? formatDate(latest.updatedAt) : "No outputs yet")}</td></tr>`;
}).join("\n");
const inventoryWarnings = [
  ...inventory.workflows.filter((workflow) => !workflow.compiled).map((workflow) => `${workflow.id}: source has no matching lock file`),
  ...bundleDefinitions.flatMap((bundle) => bundle.missingWorkers.map((worker) => `${bundle.id}: dispatched worker ${worker} is missing`)),
  ...inventory.lockOnly.map((workflow) => `${workflow}: lock file has no matching source`),
];
const indexContent = `${metrics}
<section aria-labelledby="bundles-heading">
  <h2 id="bundles-heading">Bundles</h2>
  <div class="table-region" role="region" aria-labelledby="bundles-heading" tabindex="0">
    <table><caption>Discovered orchestrator and worker bundles</caption><thead><tr><th scope="col">Bundle</th><th scope="col">Mode</th><th scope="col">Review</th><th scope="col">Live</th><th scope="col">Inventory</th><th scope="col">Latest activity</th></tr></thead><tbody>${bundleRows || '<tr><td colspan="6">No bundles discovered.</td></tr>'}</tbody></table>
  </div>
</section>
${standaloneDefinitions.length ? `<section aria-labelledby="standalone-heading">
  <h2 id="standalone-heading">Standalone workflows</h2>
  <div class="table-region" role="region" aria-labelledby="standalone-heading" tabindex="0">
    <table><caption>Workflows not assigned to a discovered bundle</caption><thead><tr><th scope="col">Workflow</th><th scope="col">Outputs</th><th scope="col">Inventory</th><th scope="col">Latest activity</th></tr></thead><tbody>${standaloneRows}</tbody></table>
  </div>
</section>` : ""}
${inventoryWarnings.length ? `<section aria-labelledby="inventory-heading"><h2 id="inventory-heading">Inventory warnings</h2><ul>${inventoryWarnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></section>` : ""}
<section aria-labelledby="method-heading" class="method"><h2 id="method-heading">Method and limitations</h2><p>The inventory is derived from repository <code>aw.yml</code> manifests, workflow source frontmatter, orchestrator dispatch lists, and matching <code>.lock.yml</code> files. The report reads durable issues, pull requests, generated safe-output comments, and unexpired <code>review-*</code> artifacts. Organization-wide remote discovery requires credentials with access to each repository and is not attempted with the repository-scoped Pages token.</p></section>`;

await writeFile(path.join(outputDirectory, "styles.css"), stylesheet());
await writeFile(path.join(outputDirectory, "index.html"), layout({
  title: "Control",
  description: "Operate installed bundles and review safe outputs, no-op outcomes, and recent control-plane activity.",
  content: indexContent,
}));

await mkdir(path.join(outputDirectory, "bundles"), { recursive: true });
for (const bundle of bundleDefinitions) {
  const bundleRecords = records.filter((record) => record.bundle === bundle.id);
  const navigation = `<nav aria-label="Report navigation"><div class="shell"><a href="../">All bundles</a><span aria-current="page">${escapeHtml(bundle.name)}</span></div></nav>`;
  const workerItems = bundle.workers.map((worker) => `<li><strong>${escapeHtml(worker.name)}</strong> · ${worker.compiled ? "compiled" : "source only"}${worker.description ? ` · ${escapeHtml(worker.description)}` : ""}</li>`).join("");
  const configuredMode = repositoryVariables.get(bundle.rolloutModeVariable) || "preview";
  const unknownCount = bundleRecords.filter((record) => record.mode === "unknown").length;
  const defaultMode = bundleRecords.some((record) => record.mode === "review") ? "review" : "live";
  for (const selectedMode of ["review", "live", ...(unknownCount ? ["unknown"] : [])]) {
    const modeRecords = bundleRecords.filter((record) => record.mode === selectedMode);
    const modeIdentity = selectedMode === "review" ? "Viewing proposals routed for human review" : selectedMode === "live" ? "Viewing production outputs from live operation" : "Viewing outputs whose attributed workflow run is unavailable";
    const content = `<section class="bundle-state" aria-labelledby="bundle-state-heading"><div><h2 id="bundle-state-heading">Configured mode</h2><span class="mode-badge mode-${escapeHtml(configuredMode)}">${escapeHtml(configuredMode)}</span></div><p>${escapeHtml(modeIdentity)}.</p></section><section aria-labelledby="workers-heading"><h2 id="workers-heading">Workers</h2><ul>${workerItems || "<li>No workers discovered.</li>"}</ul></section>${modeTabs(bundle, selectedMode, unknownCount)}${outcomeListing(modeRecords)}`;
    const page = layout({
      title: `${bundle.name} outputs`,
      description: `Safe-output history for the ${bundle.name} control-plane bundle.`,
      content,
      nested: true,
      navigation,
    });
    await writeFile(path.join(outputDirectory, "bundles", `${bundle.id}-${selectedMode}.html`), page);
    if (selectedMode === defaultMode) await writeFile(path.join(outputDirectory, "bundles", `${bundle.id}.html`), page);
  }
}

await mkdir(path.join(outputDirectory, "workflows"), { recursive: true });
for (const workflow of standaloneDefinitions) {
  const workflowRecords = records.filter((record) => record.bundle === workflow.id);
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
for (const record of records) {
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
    --attention: #9a6700;
    --attention-muted: #fff8c5;
    --neutral-muted: #afb8c133;
    --focus: #0969da;
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--canvas); color: var(--fg); font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
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
.github-link { flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border: 1px solid var(--border); border-radius: 6px; color: var(--fg); background: var(--canvas-subtle); font-size: 12px; font-weight: 600; text-decoration: none; }
.github-link:hover { background: var(--neutral-muted); }
.repo-nav { height: 48px; overflow-x: auto; border-bottom: 1px solid var(--border); background: var(--header); }
.repo-nav > div { min-width: max-content; height: 100%; display: flex; align-items: flex-end; gap: 4px; padding: 0 16px; }
.repo-nav a { height: 40px; display: flex; align-items: center; gap: 7px; padding: 0 12px; border-bottom: 2px solid transparent; color: var(--fg); text-decoration: none; }
.repo-nav a:hover { background: var(--neutral-muted); border-radius: 6px 6px 0 0; }
.repo-nav a[aria-current="page"] { border-bottom-color: #f78166; font-weight: 600; }
.control-layout { min-height: calc(100vh - 112px); display: grid; grid-template-columns: 280px minmax(0, 1fr); }
.control-sidebar { min-width: 0; display: flex; flex-direction: column; border-right: 1px solid var(--border); background: var(--canvas-subtle); }
.sidebar-title { padding: 22px 18px 12px; font-size: 20px; font-weight: 600; }
.sidebar-nav { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
.sidebar-nav a { min-height: 36px; display: flex; align-items: center; gap: 10px; position: relative; padding: 6px 10px; border-radius: 6px; color: var(--fg); font-weight: 500; text-decoration: none; }
.sidebar-nav a:hover { background: var(--neutral-muted); }
.sidebar-nav a[aria-current="page"] { background: var(--neutral-muted); font-weight: 600; }
.sidebar-nav a[aria-current="page"]::before { content: ""; width: 3px; height: 24px; position: absolute; left: -8px; border-radius: 0 6px 6px 0; background: var(--accent); }
.nav-label { margin: 18px 10px 5px; padding-top: 14px; border-top: 1px solid var(--border); color: var(--muted); font-size: 12px; font-weight: 600; text-transform: uppercase; }
.nav-icon { width: 22px; height: 22px; flex: 0 0 22px; padding: 4px; border: 1px solid var(--border); border-radius: 50%; background: var(--canvas); color: var(--muted); }
.sidebar-footer { margin-top: auto; padding: 16px 18px; border-top: 1px solid var(--border); font-size: 12px; }
.sidebar-footer a { display: inline-flex; align-items: center; gap: 6px; }
.control-content { min-width: 0; display: flex; flex-direction: column; }
.control-content > nav { border-bottom: 1px solid var(--border); background: var(--canvas); }
.control-content > nav .shell { display: flex; gap: 8px; max-width: 1280px; margin: auto; padding: 10px 24px; }
.control-content > nav .shell > * + *::before { content: "/"; margin-right: 8px; color: var(--muted); }
main { width: min(1280px, 100%); flex: 1; margin: 0 auto; padding: 0 20px 40px; }
.intro { min-height: 136px; display: flex; align-items: center; justify-content: space-between; gap: 32px; padding: 24px 0; border-bottom: 1px solid var(--border); }
.page-header-content { min-width: 0; }
.eyebrow { margin: 0 0 3px; color: var(--muted); font-size: 12px; font-weight: 600; text-transform: uppercase; }
.title-area { display: flex; align-items: center; gap: 8px; }
.leading-visual { width: 20px; height: 20px; color: var(--muted); }
.intro h1 { margin: 0; font-size: 24px; line-height: 1.25; }
.lede { max-width: 760px; margin: 6px 0 0; color: var(--muted); }
.page-header-actions { flex: none; display: flex; align-items: center; gap: 16px; }
.page-action { min-height: 32px; display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); color: var(--fg); font-size: 12px; font-weight: 600; text-decoration: none; white-space: nowrap; }
.page-action:hover { background: var(--neutral-muted); }
.freshness { max-width: 310px; display: flex; align-items: flex-start; gap: 8px; color: var(--muted); font-size: 12px; text-align: right; }
.status-dot { width: 8px; height: 8px; flex: 0 0 8px; margin-top: 5px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 3px var(--success-muted); }
.report-body { padding-top: 18px; }
.report-body > section { margin-bottom: 14px; padding: 16px; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.report-body > section:last-child { margin-bottom: 0; }
h2 { margin: 0 0 14px; font-size: 16px; }
h3 { margin: 6px 0; font-size: 14px; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.metrics div { min-width: 0; padding: 14px 16px; border-right: 1px solid var(--border); }
.metrics div:last-child { border-right: 0; }
.metrics dt { color: var(--muted); font-size: 12px; font-weight: 600; text-transform: uppercase; }
.metrics dd { margin: 4px 0 0; font-size: 26px; font-weight: 600; font-variant-numeric: tabular-nums; }
.table-region { overflow-x: auto; border: 1px solid var(--border); border-radius: 6px; }
table { width: 100%; min-width: 600px; border-collapse: collapse; }
caption { padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); color: var(--muted); text-align: left; }
th, td { padding: 10px 14px; border-bottom: 1px solid var(--border-muted); text-align: left; font-variant-numeric: tabular-nums; }
thead th { background: var(--canvas-subtle); color: var(--muted); font-size: 12px; font-weight: 600; }
tbody tr:last-child > * { border-bottom: 0; }
tbody tr:hover { background: var(--canvas-subtle); }
.discussion-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 24px; margin-top: 20px; }
.discussion-sidebar h2 { margin: 0 8px 10px; }
.discussion-sidebar > div { min-height: 38px; display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; color: var(--muted); }
.discussion-sidebar .category-current { background: var(--neutral-muted); color: var(--fg); font-weight: 600; }
.discussion-sidebar strong { min-width: 20px; padding: 0 6px; border-radius: 2em; background: var(--neutral-muted); color: var(--muted); font-size: 11px; text-align: center; }
.discussion-list { min-width: 0; }
.discussion-toolbar { min-height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--border); border-bottom: 0; border-radius: 6px 6px 0 0; background: var(--canvas-subtle); }
.discussion-toolbar h2 { margin: 0; }
.discussion-toolbar > span { color: var(--muted); font-size: 12px; font-weight: 600; }
.records { overflow: hidden; border: 1px solid var(--border); border-radius: 0 0 6px 6px; }
.discussion-row { min-height: 94px; display: grid; grid-template-columns: 34px 42px minmax(0, 1fr); align-items: start; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border-muted); }
.discussion-row:last-child { border-bottom: 0; }
.discussion-row:hover { background: var(--canvas-subtle); }
.discussion-vote { display: flex; flex-direction: column; align-items: center; gap: 3px; padding-top: 4px; color: var(--muted); font-size: 11px; }
.discussion-category { width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); color: var(--muted); }
.discussion-main { min-width: 0; }
.discussion-main h3 { margin: 0; font-size: 15px; line-height: 1.35; overflow-wrap: anywhere; }
.discussion-main > p { display: -webkit-box; margin: 5px 0 8px; overflow: hidden; color: var(--muted); -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.discussion-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; color: var(--muted); font-size: 12px; }
.kind, .status, .mode-badge { display: inline-flex; align-items: center; min-height: 20px; padding: 0 7px; border: 1px solid var(--border); border-radius: 2em; color: var(--muted); font-size: 11px; font-weight: 600; text-transform: capitalize; white-space: nowrap; }
.status-success { border-color: color-mix(in srgb, var(--success) 45%, var(--border)); background: var(--success-muted); color: var(--success); }
.status-attention { border-color: color-mix(in srgb, var(--attention) 45%, var(--border)); background: var(--attention-muted); color: var(--attention); }
.status-muted { background: var(--neutral-muted); }
.mode-live { border-color: color-mix(in srgb, var(--success) 45%, var(--border)); background: var(--success-muted); color: var(--success); }
.mode-review { border-color: color-mix(in srgb, var(--attention) 45%, var(--border)); background: var(--attention-muted); color: var(--attention); }
.mode-preview, .mode-unknown { background: var(--neutral-muted); }
.bundle-state { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.bundle-state > div { display: flex; align-items: center; gap: 10px; }
.bundle-state h2, .bundle-state p { margin: 0; }
.bundle-state p { color: var(--muted); text-align: right; }
.mode-tabs { display: flex; margin: 20px 0 0; border-bottom: 1px solid var(--border); }
.mode-tabs a { min-width: 130px; display: flex; flex-direction: column; gap: 1px; position: relative; padding: 10px 16px; color: var(--muted); text-decoration: none; }
.mode-tabs a:hover { color: var(--fg); }
.mode-tabs a[aria-current="page"] { color: var(--fg); font-weight: 600; }
.mode-tabs a[aria-current="page"]::after { content: ""; height: 2px; position: absolute; right: 12px; bottom: -1px; left: 12px; border-radius: 2px 2px 0 0; background: #f78166; }
.mode-tabs small { font-size: 11px; font-weight: 400; }
.mode-tabs + .discussion-layout { margin-top: 16px; }
.outcome-view { display: grid; grid-template-columns: minmax(0, 1fr) 250px; align-items: start; gap: 24px; }
.discussion-post { min-width: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; }
.discussion-post > header { min-height: 56px; display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); }
.discussion-post > header p { margin: 1px 0 0; color: var(--muted); font-size: 12px; }
.post-avatar { width: 32px; height: 32px; display: grid; flex: 0 0 32px; place-items: center; border-radius: 50%; background: var(--fg); color: var(--canvas); }
.markdown-body { padding: 24px 28px 32px; overflow-wrap: anywhere; font-size: 15px; }
.markdown-body > :first-child { margin-top: 0; }
.markdown-body > :last-child { margin-bottom: 0; }
.markdown-body h1, .markdown-body h2 { margin: 24px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border-muted); line-height: 1.25; }
.markdown-body h1 { font-size: 24px; }
.markdown-body h2 { font-size: 20px; }
.markdown-body h3 { margin: 20px 0 10px; font-size: 17px; }
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
.outcome-meta h2 { margin-bottom: 8px; color: var(--muted); font-size: 12px; }
.outcome-meta p { margin: 0; overflow-wrap: anywhere; text-transform: capitalize; }
.outcome-meta a { display: inline-flex; align-items: center; gap: 5px; text-transform: none; }
.empty { margin: 0; padding: 28px 16px; color: var(--muted); text-align: center; }
.method p { max-width: 880px; margin-bottom: 0; color: var(--muted); }
code { padding: 2px 4px; border-radius: 4px; background: var(--neutral-muted); font: 12px ui-monospace, SFMono-Regular, Consolas, monospace; }
footer { padding: 20px 24px; border-top: 1px solid var(--border); color: var(--muted); font-size: 12px; }
@media (max-width: 960px) {
  .site-header { height: 56px; }
  .header-inner { padding: 0 16px; }
  .github-link { padding: 5px 8px; }
  .repo-nav { height: 44px; }
  .repo-nav > div { padding-inline: 8px; }
  .repo-nav a { height: 36px; padding-inline: 10px; }
  .control-layout { min-height: calc(100vh - 100px); display: block; }
  .control-sidebar { display: block; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--border); }
  .sidebar-title, .nav-label, .sidebar-footer { display: none; }
  .sidebar-nav { width: max-content; flex-direction: row; padding: 8px; }
  .sidebar-nav a { min-height: 32px; padding: 5px 10px; }
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
  .discussion-sidebar { display: flex; gap: 4px; overflow-x: auto; }
  .discussion-sidebar h2 { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .discussion-sidebar > div { min-width: max-content; display: flex; }
  .bundle-state { align-items: flex-start; flex-direction: column; gap: 8px; }
  .bundle-state p { text-align: left; }
  .mode-tabs { overflow-x: auto; overflow-y: hidden; }
  .mode-tabs a { min-width: 120px; padding-inline: 12px; }
  .outcome-view { grid-template-columns: 1fr; }
  .outcome-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
  .control-content > nav .shell { padding-inline: 16px; }
  footer { padding-inline: 16px; }
}
@media (max-width: 420px) {
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
@media print {
  .site-header, .repo-nav, .control-sidebar, .control-content > nav, .skip-link { display: none; }
  .control-layout { display: block; }
  main { width: 100%; padding: 0; }
  a { color: inherit; text-decoration: underline; }
  .discussion-row, .discussion-post { break-inside: avoid; }
}`;
}

function legacyStylesheet() {
  return `:root{--canvas:#fff;--inset:#f6f8fa;--fg:#1f2328;--muted:#59636e;--border:#d1d9e0;--accent:#0969da;--success:#1a7f37;--attention:#9a6700;--focus:#0969da}
@media(prefers-color-scheme:dark){:root{--canvas:#0d1117;--inset:#161b22;--fg:#f0f6fc;--muted:#9198a1;--border:#3d444d;--accent:#58a6ff;--success:#3fb950;--attention:#d29922;--focus:#58a6ff}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--canvas);color:var(--fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0}a{color:var(--accent);text-underline-offset:2px}a:hover{text-decoration-thickness:2px}a:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--focus);outline-offset:3px}.skip-link{position:absolute;left:16px;top:-80px;padding:8px 12px;background:var(--canvas);border:1px solid var(--focus);z-index:2}.skip-link:focus{top:8px}.shell{width:min(1120px,calc(100% - 32px));margin-inline:auto}.site-header{border-bottom:1px solid var(--border);background:var(--inset)}.site-header .shell{min-height:56px;display:flex;align-items:center;gap:12px;justify-content:space-between}.brand{font-size:16px;font-weight:600;color:var(--fg);text-decoration:none}.repository{color:var(--muted);font-family:ui-monospace,SFMono-Regular,Consolas,monospace}nav{border-bottom:1px solid var(--border)}nav .shell{display:flex;gap:16px;padding-block:10px}nav [aria-current=page]{font-weight:600}.intro{padding:40px 0 28px;border-bottom:1px solid var(--border)}.eyebrow{text-transform:uppercase;color:var(--muted);font-size:12px;font-weight:600;margin:0 0 6px}.intro h1{font-size:32px;line-height:1.2;margin:0}.lede{max-width:760px;font-size:17px;margin:12px 0}.freshness,.metadata{color:var(--muted);font-size:12px}section{padding:28px 0}h2{font-size:20px;margin:0 0 16px}h3{font-size:16px;margin:8px 0}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-block:1px solid var(--border);margin:0}.metrics div{padding:16px;border-right:1px solid var(--border)}.metrics div:last-child{border-right:0}.metrics dt{color:var(--muted)}.metrics dd{font-size:28px;font-weight:600;margin:2px 0;font-variant-numeric:tabular-nums}.table-region{overflow-x:auto;border:1px solid var(--border);border-radius:6px}table{width:100%;border-collapse:collapse;min-width:600px}caption{text-align:left;padding:12px;color:var(--muted)}th,td{text-align:left;padding:10px 12px;border-top:1px solid var(--border)}thead{background:var(--inset)}.records{border-top:1px solid var(--border)}.record{padding:18px 0;border-bottom:1px solid var(--border)}.record-heading{display:flex;align-items:center;gap:8px}.kind{text-transform:uppercase;color:var(--muted);font-size:11px;font-weight:600}.status{font-size:12px;font-weight:600}.status-success{color:var(--success)}.status-attention{color:var(--attention)}.status-muted{color:var(--muted)}.record p{max-width:860px;margin:6px 0}.empty{padding:24px;background:var(--inset);border:1px solid var(--border);border-radius:6px}.method{border-top:1px solid var(--border)}footer{border-top:1px solid var(--border);color:var(--muted);padding:24px 0;margin-top:24px}
@media(max-width:640px){.site-header .shell{align-items:flex-start;flex-direction:column;justify-content:center;padding-block:10px}.repository{overflow-wrap:anywhere}.intro{padding-top:28px}.intro h1{font-size:26px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.metrics div:nth-child(2){border-right:0}.metrics div:nth-child(-n+2){border-bottom:1px solid var(--border)}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{.skip-link,nav{display:none}a{color:inherit;text-decoration:underline}.shell{width:100%}.record{break-inside:avoid}}`;
}

console.log(`Built ${records.length} safe-output records across ${bundleDefinitions.length} bundles in ${outputDirectory}`);