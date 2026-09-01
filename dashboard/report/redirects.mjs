import { readFile } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function repositoryName(row) {
  const repository = String(row.repository || "");
  return repository.includes("/") ? repository : `${row.organization || ""}/${repository}`.replace(/^\//, "");
}

function repositoryPageName(repository) {
  return repository.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function authoredWorkflowPath(workflowPath = "") {
  return workflowPath.replace(/\.lock\.yml$/, ".md");
}

function repositoryWorkflowPageName(repository, workflowPath) {
  const workflowName = authoredWorkflowPath(workflowPath).split("/").at(-1)?.replace(/\.md$/, "") || "workflow";
  const workflowSlug = workflowName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${repositoryPageName(repository)}--workflow--${workflowSlug}`;
}

function outcomePageName(recordId) {
  return String(recordId).replaceAll("/", "--").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function redirectDocument(target) {
  const escapedTarget = escapeHtml(target);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="0;url=${escapedTarget}">
    <title>Dashboard moved</title>
  </head>
  <body>
    <p>This dashboard view moved to <a href="${escapedTarget}">the current dashboard</a>.</p>
    <script>window.location.replace(${JSON.stringify(target)});</script>
  </body>
</html>
`;
}

async function writeRedirect(outputDirectory, relativePath, target) {
  const destination = path.join(outputDirectory, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, redirectDocument(`../${target}`));
}

export async function writeLegacyDashboardRedirects(outputDirectory, sources) {
  const redirects = new Map([
    ["runtime/index.html", "#page-runtime"],
    ["dispatches/index.html", "#page-dispatches"],
    ["security/index.html", "#page-security"],
    ["value/index.html", "#page-operational-value"],
    ["cost/index.html", "#page-cost"],
    ["repositories/index.html", "#page-repositories"],
    ["workflows/index.html", "#page-workflows"],
    ["runs/index.html", "#page-runs"],
    ["runs/failed.html", "#page-runs?filter=failed"],
    ["runs/action-required.html", "#page-runs?filter=action-required"],
    ["coverage/index.html", "#page-coverage"],
    ["packages/index.html", "#page-packages"],
    ["packages/review.html", "?mode=review#page-packages"],
    ["packages/live.html", "?mode=live#page-packages"],
  ]);

  const workflows = Array.isArray(sources.workflows?.rows) ? sources.workflows.rows : [];
  const repositories = new Set(
    (Array.isArray(sources.repositories?.rows) ? sources.repositories.rows : [])
      .map(repositoryName)
      .filter(Boolean),
  );
  for (const workflow of workflows) {
    const repository = repositoryName(workflow);
    const workflowPath = authoredWorkflowPath(String(workflow.workflow || ""));
    if (repository) repositories.add(repository);
    if (!repository || !workflowPath) continue;
    const route = `${encodeURIComponent(repository)}:${encodeURIComponent(workflowPath)}`;
    const pageName = repositoryWorkflowPageName(repository, workflowPath);
    redirects.set(`repositories/${pageName}.html`, `#page-workflow-detail?workflow=${route}`);
    redirects.set(`repositories/${pageName}-insights.html`, `#page-workflow-runtime?workflow=${route}`);
  }

  for (const repository of repositories) {
    const route = `#page-repository-detail?repository=${encodeURIComponent(repository)}`;
    const pageName = repositoryPageName(repository);
    redirects.set(`repositories/${pageName}.html`, route);
    redirects.set(`repositories/${pageName}-reports.html`, route);
    redirects.set(`repositories/${pageName}-insights.html`, route);
  }

  const packages = new Set(workflows.map((workflow) => String(workflow.package || "")).filter(Boolean));
  for (const packageId of packages) {
    const packageRoute = `package=${encodeURIComponent(packageId)}`;
    redirects.set(`packages/${packageId}.html`, `#page-package-detail?${packageRoute}`);
    redirects.set(`packages/${packageId}-reports.html`, `#page-package-reports?${packageRoute}`);
    redirects.set(`packages/${packageId}-review.html`, `?package-report-table.rollout-mode=review#page-package-reports?${packageRoute}`);
    redirects.set(`packages/${packageId}-live.html`, `?package-report-table.rollout-mode=live#page-package-reports?${packageRoute}`);
    redirects.set(`packages/${packageId}-reports-review.html`, `?package-report-table.rollout-mode=review#page-package-reports?${packageRoute}`);
    redirects.set(`packages/${packageId}-reports-live.html`, `?package-report-table.rollout-mode=live#page-package-reports?${packageRoute}`);
    redirects.set(`insights/${packageId}.html`, `#page-operational-value?${packageRoute}`);
  }

  const outcomes = Array.isArray(sources.outcomes?.rows) ? sources.outcomes.rows : [];
  for (const outcome of outcomes) {
    const id = String(outcome["safe-output"] || "");
    if (id) redirects.set(`outcomes/${outcomePageName(id)}.html`, `#page-outcome-detail?outcome=${encodeURIComponent(id)}`);
  }

  await Promise.all([...redirects].map(([relativePath, route]) => writeRedirect(outputDirectory, relativePath, route)));
}

async function main() {
  const outputDirectory = process.env.REPORT_OUTPUT;
  const sourcesPath = process.env.REPORT_DASHBOARD_SOURCES;
  if (!outputDirectory || !sourcesPath) {
    throw new Error("REPORT_OUTPUT and REPORT_DASHBOARD_SOURCES are required");
  }
  const sources = JSON.parse(await readFile(sourcesPath, "utf8"));
  await writeLegacyDashboardRedirects(outputDirectory, sources);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}