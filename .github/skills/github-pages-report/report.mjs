import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const outputDirectory = process.env.REPORT_OUTPUT || "_site";

if (!repository || !token) {
  throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required");
}

const [owner, repo] = repository.split("/");
const apiRoot = "https://api.github.com";
const generatedAt = new Date().toISOString();
const bundleCandidates = [
  { id: "dependabot", name: "Dependabot", match: /dependabot|release train/i, workflow: ".github/workflows/dependabot.md" },
  { id: "optimization", name: "Optimization", match: /optimization|ai credit/i, workflow: ".github/workflows/optimization.md" },
];
const installedBundles = bundleCandidates.filter((bundle) => existsSync(bundle.workflow));
const bundleDefinitions = installedBundles.length > 0 ? installedBundles : bundleCandidates;

async function github(pathname) {
  const response = await fetch(`${apiRoot}${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${pathname}`);
  return response.json();
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
  const text = values.filter(Boolean).join(" ");
  return bundleDefinitions.find((bundle) => bundle.match.test(text)) || null;
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
  return body.match(new RegExp(`<!--\\s*smart-dependabot:${marker}=([^>]+?)\\s*-->`, "i"))?.[1]?.trim() || "";
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
  const safeOutputPrefix = /^\[(dependabot-agent|optimization:[^\]]+)\]\s/i.test(issue.title);
  const generatedSafeOutput = /Generated (?:from|with) \[[^\]]+\]\([^)]*\/actions\/runs\/\d+\)/.test(issue.body || "");
  if (!safeOutputPrefix && !generatedSafeOutput) return null;
  const bundle = bundleFor(issue.title, workflow, issue.body);
  if (!bundle || issue.title === "[aw] No-Op Runs") return null;
  return {
    id: `${issue.pull_request ? "pr" : "issue"}-${issue.number}`,
    bundle: bundle.id,
    kind: issue.pull_request ? "pull-request" : "issue",
    title: issue.title,
    summary: summarize(issue.body),
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
  const metadata = [record.workflow, formatDate(record.updatedAt)].filter(Boolean).join(" | ");
  return `<article class="record" id="${escapeHtml(record.id)}">
    <div class="record-heading">
      <span class="kind">${escapeHtml(record.kind.replaceAll("-", " "))}</span>
      <span class="status ${statusClass(record)}">${escapeHtml(record.state)}</span>
    </div>
    <h3><a href="${escapeHtml(record.url)}">${escapeHtml(record.title)}</a></h3>
    <p>${escapeHtml(record.summary || "No summary was provided.")}</p>
    <p class="metadata">${escapeHtml(metadata)}${runUrl ? ` | <a href="${escapeHtml(runUrl)}">workflow run</a>` : ""}</p>
  </article>`;
}

function layout({ title, description, content, nested = false, navigation = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>
  <style>${stylesheet()}</style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="shell">
    <a class="brand" href="${nested ? "../" : "./"}">Central Agentic Ops</a>
    <span class="repository">${escapeHtml(repository)}</span>
  </div></header>
  ${navigation}
  <main id="main" class="shell">
    <section class="intro">
      <p class="eyebrow">Safe-output report</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">${escapeHtml(description)}</p>
      <p class="freshness">Generated ${escapeHtml(formatDate(generatedAt))} | UTC | durable repository outputs and available review artifacts</p>
    </section>
    ${content}
  </main>
  <footer><div class="shell">Generated deterministically from GitHub repository data. <a href="https://github.com/${escapeHtml(repository)}/actions">View workflow provenance</a>.</div></footer>
</body>
</html>`;
}

const [issues, comments, artifactResponse] = await Promise.all([
  githubPages(`/repos/${owner}/${repo}/issues?state=all&sort=updated&direction=desc`),
  githubPages(`/repos/${owner}/${repo}/issues/comments?sort=updated&direction=desc`),
  github(`/repos/${owner}/${repo}/actions/artifacts?per_page=100`),
]);
const issueByUrl = new Map(issues.map((issue) => [issue.url, issue]));
const records = [
  ...issues.map(recordFromIssue).filter(Boolean),
  ...comments.map((comment) => recordFromComment(comment, issueByUrl)).filter(Boolean),
  ...(await Promise.all((artifactResponse.artifacts || []).map(recordFromArtifact))).filter(Boolean),
].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "records.json"), `${JSON.stringify({ generatedAt, repository, records }, null, 2)}\n`);

const totals = {
  outputs: records.length,
  actionable: records.filter((record) => record.kind !== "noop").length,
  noops: records.filter((record) => record.kind === "noop").length,
};
const metrics = `<section aria-labelledby="summary-heading">
  <h2 id="summary-heading">Outcome summary</h2>
  <dl class="metrics">
    <div><dt>Recorded outputs</dt><dd>${totals.outputs}</dd></div>
    <div><dt>Actionable outputs</dt><dd>${totals.actionable}</dd></div>
    <div><dt>No-op outcomes</dt><dd>${totals.noops}</dd></div>
    <div><dt>Bundles</dt><dd>${bundleDefinitions.length}</dd></div>
  </dl>
</section>`;
const bundleRows = bundleDefinitions.map((bundle) => {
  const bundleRecords = records.filter((record) => record.bundle === bundle.id);
  const latest = bundleRecords[0];
  return `<tr><th scope="row"><a href="bundles/${bundle.id}.html">${escapeHtml(bundle.name)}</a></th><td>${bundleRecords.length}</td><td>${bundleRecords.filter((record) => record.kind === "noop").length}</td><td>${escapeHtml(latest ? formatDate(latest.updatedAt) : "No outputs yet")}</td></tr>`;
}).join("\n");
const indexContent = `${metrics}
<section aria-labelledby="bundles-heading">
  <h2 id="bundles-heading">Bundles</h2>
  <div class="table-region" role="region" aria-labelledby="bundles-heading" tabindex="0">
    <table><caption>Safe outputs grouped by control-plane bundle</caption><thead><tr><th scope="col">Bundle</th><th scope="col">Outputs</th><th scope="col">No-ops</th><th scope="col">Latest activity</th></tr></thead><tbody>${bundleRows}</tbody></table>
  </div>
</section>
<section aria-labelledby="recent-heading"><h2 id="recent-heading">Recent outcomes</h2><div class="records">${records.slice(0, 12).map(itemMarkup).join("\n") || '<p class="empty">No safe outputs have been recorded yet.</p>'}</div></section>
<section aria-labelledby="method-heading" class="method"><h2 id="method-heading">Method and limitations</h2><p>The report reads durable issues, pull requests, and generated safe-output comments in this repository. It also includes unexpired <code>review-*</code> artifacts. Outputs without recognized workflow provenance are omitted. Artifact links expire according to repository retention policy.</p></section>`;

await writeFile(path.join(outputDirectory, "index.html"), layout({
  title: "Bundle safe outputs",
  description: "Review issues, pull requests, comments, review bundles, and successful no-op outcomes produced by the installed operations.",
  content: indexContent,
}));

await mkdir(path.join(outputDirectory, "bundles"), { recursive: true });
for (const bundle of bundleDefinitions) {
  const bundleRecords = records.filter((record) => record.bundle === bundle.id);
  const navigation = `<nav aria-label="Report navigation"><div class="shell"><a href="../">All bundles</a><span aria-current="page">${escapeHtml(bundle.name)}</span></div></nav>`;
  const content = `<section aria-labelledby="outcomes-heading"><h2 id="outcomes-heading">Outcomes</h2><p>${bundleRecords.length} recorded output${bundleRecords.length === 1 ? "" : "s"}; ${bundleRecords.filter((record) => record.kind === "noop").length} completed with no action required.</p><div class="records">${bundleRecords.map(itemMarkup).join("\n") || '<p class="empty">No outputs have been recorded for this bundle.</p>'}</div></section>`;
  await writeFile(path.join(outputDirectory, "bundles", `${bundle.id}.html`), layout({
    title: `${bundle.name} outputs`,
    description: `Safe-output history for the ${bundle.name} control-plane bundle.`,
    content,
    nested: true,
    navigation,
  }));
}

function stylesheet() {
  return `:root{--canvas:#fff;--inset:#f6f8fa;--fg:#1f2328;--muted:#59636e;--border:#d1d9e0;--accent:#0969da;--success:#1a7f37;--attention:#9a6700;--focus:#0969da}
@media(prefers-color-scheme:dark){:root{--canvas:#0d1117;--inset:#161b22;--fg:#f0f6fc;--muted:#9198a1;--border:#3d444d;--accent:#58a6ff;--success:#3fb950;--attention:#d29922;--focus:#58a6ff}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--canvas);color:var(--fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0}a{color:var(--accent);text-underline-offset:2px}a:hover{text-decoration-thickness:2px}a:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--focus);outline-offset:3px}.skip-link{position:absolute;left:16px;top:-80px;padding:8px 12px;background:var(--canvas);border:1px solid var(--focus);z-index:2}.skip-link:focus{top:8px}.shell{width:min(1120px,calc(100% - 32px));margin-inline:auto}.site-header{border-bottom:1px solid var(--border);background:var(--inset)}.site-header .shell{min-height:56px;display:flex;align-items:center;gap:12px;justify-content:space-between}.brand{font-size:16px;font-weight:600;color:var(--fg);text-decoration:none}.repository{color:var(--muted);font-family:ui-monospace,SFMono-Regular,Consolas,monospace}nav{border-bottom:1px solid var(--border)}nav .shell{display:flex;gap:16px;padding-block:10px}nav [aria-current=page]{font-weight:600}.intro{padding:40px 0 28px;border-bottom:1px solid var(--border)}.eyebrow{text-transform:uppercase;color:var(--muted);font-size:12px;font-weight:600;margin:0 0 6px}.intro h1{font-size:32px;line-height:1.2;margin:0}.lede{max-width:760px;font-size:17px;margin:12px 0}.freshness,.metadata{color:var(--muted);font-size:12px}section{padding:28px 0}h2{font-size:20px;margin:0 0 16px}h3{font-size:16px;margin:8px 0}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-block:1px solid var(--border);margin:0}.metrics div{padding:16px;border-right:1px solid var(--border)}.metrics div:last-child{border-right:0}.metrics dt{color:var(--muted)}.metrics dd{font-size:28px;font-weight:600;margin:2px 0;font-variant-numeric:tabular-nums}.table-region{overflow-x:auto;border:1px solid var(--border);border-radius:6px}table{width:100%;border-collapse:collapse;min-width:600px}caption{text-align:left;padding:12px;color:var(--muted)}th,td{text-align:left;padding:10px 12px;border-top:1px solid var(--border)}thead{background:var(--inset)}.records{border-top:1px solid var(--border)}.record{padding:18px 0;border-bottom:1px solid var(--border)}.record-heading{display:flex;align-items:center;gap:8px}.kind{text-transform:uppercase;color:var(--muted);font-size:11px;font-weight:600}.status{font-size:12px;font-weight:600}.status-success{color:var(--success)}.status-attention{color:var(--attention)}.status-muted{color:var(--muted)}.record p{max-width:860px;margin:6px 0}.empty{padding:24px;background:var(--inset);border:1px solid var(--border);border-radius:6px}.method{border-top:1px solid var(--border)}footer{border-top:1px solid var(--border);color:var(--muted);padding:24px 0;margin-top:24px}
@media(max-width:640px){.site-header .shell{align-items:flex-start;flex-direction:column;justify-content:center;padding-block:10px}.repository{overflow-wrap:anywhere}.intro{padding-top:28px}.intro h1{font-size:26px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.metrics div:nth-child(2){border-right:0}.metrics div:nth-child(-n+2){border-bottom:1px solid var(--border)}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{.skip-link,nav{display:none}a{color:inherit;text-decoration:underline}.shell{width:100%}.record{break-inside:avoid}}`;
}

console.log(`Built ${records.length} safe-output records across ${bundleDefinitions.length} bundles in ${outputDirectory}`);