import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { startDashboardServer } from "../../dashboard/local-server.mjs";

const dashboard = (pageId) => JSON.stringify({
  "language-version": "1.0",
  dashboard: {
    navigation: [{ label: "Preview", pages: [pageId] }],
    pages: [{ id: pageId, title: pageId, route: pageId, views: [] }],
  },
}, null, 2);

async function waitForReload(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  while (!content.includes("event: reload")) {
    const { done, value } = await reader.read();
    if (done) throw new Error("live reload stream ended before an update");
    content += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
}

test("local dashboard server composes package dashboards and reloads after updates", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  const siteRoot = path.join(root, "site");
  const packageRoot = path.join(root, "packages");
  const packageDirectory = path.join(packageRoot, "example");
  await mkdir(packageDirectory, { recursive: true });
  await mkdir(siteRoot, { recursive: true });
  await writeFile(path.join(siteRoot, "index.html"), "<!doctype html><body>preview</body>");
  await writeFile(path.join(siteRoot, "dashboard.json"), dashboard("built-in"));
  await writeFile(path.join(packageDirectory, "dashboard.json"), dashboard("package-one"));
  const downloadData = async (destination) => {
    await mkdir(destination, { recursive: true });
    await writeFile(path.join(destination, "sources.json"), JSON.stringify({ repositories: { rows: [] } }));
  };

  const preview = await startDashboardServer({
    siteRoot,
    catalogRoot: packageRoot,
    installedDashboardsDirectory: path.join(root, "installed-dashboards"),
    downloadData,
    port: 0,
  });
  try {
    const indexResponse = await fetch(`${preview.url}/`);
    assert.equal(indexResponse.status, 200);
    assert.match(await indexResponse.text(), /new EventSource\("\/__dashboard_events"\)/);

    const dashboardResponse = await fetch(`${preview.url}/dashboard.json`);
    assert.equal(dashboardResponse.headers.get("cache-control"), "no-store");
    assert.deepEqual(
      (await dashboardResponse.json()).dashboard.pages.map(({ id }) => id),
      ["built-in", "package-one"],
    );
    const sourcesResponse = await fetch(`${preview.url}/sources.json`);
    assert.deepEqual(await sourcesResponse.json(), { repositories: { rows: [] } });

    const traversalResponse = await fetch(`${preview.url}/..%2Foutside.txt`);
    assert.equal(traversalResponse.status, 404);

    const eventsResponse = await fetch(`${preview.url}/__dashboard_events`);
    const reload = waitForReload(eventsResponse);
    await writeFile(path.join(packageDirectory, "dashboard.json"), dashboard("package-two"));
    await reload;

    const updatedResponse = await fetch(`${preview.url}/dashboard.json`);
    assert.deepEqual(
      (await updatedResponse.json()).dashboard.pages.map(({ id }) => id),
      ["built-in", "package-two"],
    );
  } finally {
    await preview.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("local dashboard server fails when dashboard data cannot be downloaded", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  await writeFile(path.join(root, "index.html"), "<!doctype html><body>preview</body>");
  await writeFile(path.join(root, "dashboard.json"), dashboard("built-in"));

  try {
    await assert.rejects(
      startDashboardServer({
        siteRoot: root,
        catalogRoot: null,
        installedDashboardsDirectory: path.join(root, "dashboards"),
        downloadData: async () => {
          throw new Error("artifact unavailable");
        },
        port: 0,
      }),
      /artifact unavailable/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("local dashboard server downloads the latest data artifact with GitHub CLI", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  const ghExecutable = path.join(root, "gh");
  await writeFile(path.join(root, "index.html"), "<!doctype html><body>preview</body>");
  await writeFile(path.join(root, "dashboard.json"), dashboard("built-in"));
  await writeFile(ghExecutable, `#!/bin/sh
if [ "$1" = "api" ]; then
  [ "$2" = "repos/acme/control/actions/artifacts?name=central-agentic-ops-dashboard-data&per_page=100" ] || exit 2
  printf '42\\n'
  exit
fi
[ "$1" = "run" ] &&
  [ "$2" = "download" ] &&
  [ "$3" = "42" ] &&
  [ "$4" = "--name" ] &&
  [ "$5" = "central-agentic-ops-dashboard-data" ] &&
  [ "$6" = "--dir" ] &&
  [ "$8" = "--repo" ] &&
  [ "$9" = "acme/control" ] || exit 3
mkdir -p "$7"
printf '{"repositories":{"rows":[{"repository":"control"}]}}' > "$7/sources.json"
`);
  await chmod(ghExecutable, 0o755);

  const preview = await startDashboardServer({
    siteRoot: root,
    catalogRoot: null,
    installedDashboardsDirectory: path.join(root, "dashboards"),
    repository: "acme/control",
    ghExecutable,
    port: 0,
  });
  try {
    const response = await fetch(`${preview.url}/sources.json`);
    assert.deepEqual(await response.json(), {
      repositories: { rows: [{ repository: "control" }] },
    });
  } finally {
    await preview.close();
    await rm(root, { recursive: true, force: true });
  }
});
