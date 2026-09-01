import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const source = new URL("../", import.meta.url);
const destination = new URL("../../../public/cao/", import.meta.url);
const yamlSource = new URL("./browser/", import.meta.resolve("yaml/package.json"));
const excluded = new Set([".gitignore", "node_modules", "test", "test-results"]);

// Maps documented static route segments (served under /cao/<route>/ on GitHub
// Pages) to the dashboard page id the single-page app should render. Most
// routes share their name with the page id; "runs" is the one documented
// route whose in-app hash target is the "runtime" page.
const staticRoutes = {
  overview: "overview",
  dispatches: "dispatches",
  packages: "packages",
  repositories: "repositories",
  workflows: "workflows",
  runs: "runtime",
  coverage: "coverage",
};

await rm(destination, { force: true, recursive: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, {
  recursive: true,
  filter: (path) => !excluded.has(basename(path)),
});
await cp(yamlSource, new URL("vendor/yaml/", destination), { recursive: true });

// GitHub Pages only serves files that exist on disk, so a direct request for
// /cao/<route>/ falls through to the repository's 404 page even though the
// client-side router understands the equivalent #page-<id> hash. Emit a tiny
// static redirect document for each documented route so direct links and
// deep-links behave the same as in-app navigation.
for (const [route, pageId] of Object.entries(staticRoutes)) {
  const routeDirectory = new URL(`${route}/`, destination);
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(new URL("index.html", routeDirectory), redirectDocument(pageId));
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

