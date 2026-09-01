import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "yaml";

const dashboardPackageRoot = new URL("../../", import.meta.url);
const installedDashboardRoot = ".github/aw/dashboard";
const installedSiteRoot = `${installedDashboardRoot}/site`;

export async function buildDashboardSite({
  destination = new URL("../../../public/cao/", import.meta.url),
  repositoryRoot = new URL("../../../", import.meta.url),
} = {}) {
  const targetRoot = await mkdtemp(join(tmpdir(), "central-agentic-ops-dashboard-install-"));
  try {
    await installPackageFiles(fileURLToPath(dashboardPackageRoot), targetRoot);
    await installPackageDashboards(fileURLToPath(repositoryRoot), targetRoot);

    await rm(destination, { force: true, recursive: true });
    await mkdir(destination, { recursive: true });
    await cp(join(targetRoot, installedSiteRoot), destination, { recursive: true });

    const { bundleDashboards } = await import(pathToFileURL(
      join(targetRoot, installedDashboardRoot, "report", "bundle-dashboards.mjs"),
    ).href);
    await bundleDashboards(
      fileURLToPath(new URL("dashboard.json", destination)),
      join(targetRoot, ".github/aw/dashboards"),
    );
    const dashboard = JSON.parse(await readFile(new URL("dashboard.json", destination), "utf8"));

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
  } finally {
    await rm(targetRoot, { force: true, recursive: true });
  }
}

async function installPackageFiles(packageRoot, targetRoot) {
  const manifest = parse(await readFile(join(packageRoot, "aw.yml"), "utf8"));
  const includes = Array.isArray(manifest?.includes) ? manifest.includes : [];
  const resources = Array.isArray(manifest?.resources) ? manifest.resources : [];
  for (const include of includes) {
    await copyManifestEntry(
      packageRoot,
      targetRoot,
      typeof include === "string" ? { source: include, destination: include } : include,
    );
  }
  for (const resource of resources) {
    await copyManifestEntry(packageRoot, targetRoot, resource);
  }
}

async function installPackageDashboards(repositoryRoot, targetRoot) {
  const entries = await readdir(repositoryRoot, { withFileTypes: true });
  for (const entry of entries.filter((candidate) => candidate.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    const packageRoot = join(repositoryRoot, entry.name);
    const manifestSource = await readFile(join(packageRoot, "aw.yml"), "utf8").catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (!manifestSource) continue;
    const manifest = parse(manifestSource);
    const dashboardResources = Array.isArray(manifest?.resources) ? manifest.resources.filter(
      (resource) => resource?.source === "dashboard.json"
        && /^\.github\/aw\/dashboards\/[^/]+\.json$/.test(resource?.destination),
    ) : [];
    for (const resource of dashboardResources) {
      await copyManifestEntry(packageRoot, targetRoot, resource);
    }
  }
}

async function copyManifestEntry(packageRoot, targetRoot, entry) {
  if (typeof entry?.source !== "string" || typeof entry?.destination !== "string") {
    throw new Error("dashboard package manifest entries require source and destination paths");
  }
  const source = resolveManifestPath(packageRoot, entry.source);
  const destination = resolveManifestPath(targetRoot, entry.destination);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}

function resolveManifestPath(root, manifestPath) {
  if (!manifestPath || isAbsolute(manifestPath)) {
    throw new Error(`dashboard package manifest path must be relative: ${manifestPath}`);
  }
  const resolved = resolve(root, manifestPath);
  const relativePath = relative(root, resolved);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`dashboard package manifest path escapes its root: ${manifestPath}`);
  }
  return resolved;
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
