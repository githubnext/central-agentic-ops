import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { composeDashboardDocuments } from "../../report/compose-dashboard-documents.mjs";

const source = new URL("../", import.meta.url);
const yamlSource = new URL("./browser/", import.meta.resolve("yaml/package.json"));
const excluded = new Set([".gitignore", "node_modules", "test", "test-results"]);
const dashboardSourcePath = new URL("../dashboard.json", import.meta.url);

export async function buildDashboardSite({
  destination = new URL("../../../public/cao/", import.meta.url),
  repositoryRoot = new URL("../../../", import.meta.url),
} = {}) {
  await rm(destination, { force: true, recursive: true });
  await mkdir(destination, { recursive: true });
  await cp(source, destination, {
    recursive: true,
    filter: (path) => !excluded.has(basename(path)),
  });
  await cp(yamlSource, new URL("vendor/yaml/", destination), { recursive: true });

  const dashboard = composeDashboardDocuments(
    JSON.parse(await readFile(dashboardSourcePath, "utf8")),
    await packageDashboardDocuments(repositoryRoot),
  );
  await writeFile(new URL("dashboard.json", destination), `${JSON.stringify(dashboard, null, 2)}\n`);

  // GitHub Pages only serves files that exist on disk, so a direct request for
  // /cao/<page-id>/ falls through to the repository's 404 page even though the
  // client-side router understands the equivalent #page-<id> hash. Emit a tiny
  // static redirect document for every page the compiled dashboard.json can
  // render without additional hash query parameters, so direct links and
  // deep-links resolve to the same view as in-app navigation.
  const pages = Array.isArray(dashboard.dashboard?.pages) ? dashboard.dashboard.pages : [];
  for (const page of pages) {
    if (typeof page?.id !== "string" || !page.id || requiresHashQueryParameter(page)) continue;
    const routeDirectory = new URL(`${page.id}/`, destination);
    await mkdir(routeDirectory, { recursive: true });
    await writeFile(new URL("index.html", routeDirectory), redirectDocument(page.id));
  }
}

async function packageDashboardDocuments(repositoryRoot) {
  const entries = await readdir(repositoryRoot, { withFileTypes: true });
  const documents = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    const packageRoot = new URL(`${entry.name}/`, repositoryRoot);
    const manifestSource = await readFile(new URL("aw.yml", packageRoot), "utf8").catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (!manifestSource) continue;
    const manifest = parse(manifestSource);
    const contributesDashboard = Array.isArray(manifest?.resources) && manifest.resources.some(
      (resource) => resource?.source === "dashboard.json"
        && /^\.github\/aw\/dashboards\/[^/]+\.json$/.test(resource?.destination),
    );
    if (!contributesDashboard) continue;
    documents.push(JSON.parse(await readFile(new URL("dashboard.json", packageRoot), "utf8")));
  }
  return documents;
}

/** @param {Record<string, unknown>} page */
function requiresHashQueryParameter(page) {
  const route = page.route;
  return typeof route === "object" && route !== null && typeof route["hash-query-parameter"] === "string";
}

/** @param {string} pageId */
function redirectDocument(pageId) {
  const hash = `#page-${encodeURIComponent(pageId)}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=../${hash}" />
    <link rel="canonical" href="../" />
    <title>Central Agentic Ops Dashboard</title>
    <script>window.location.replace("../${hash}");</script>
  </head>
  <body>
    <p>Redirecting to the <a href="../${hash}">dashboard</a>.</p>
  </body>
</html>
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await buildDashboardSite();
}
