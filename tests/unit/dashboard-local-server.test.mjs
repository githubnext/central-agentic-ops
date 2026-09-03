import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
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

async function openDashboardSocket(previewUrl) {
  const url = new URL(previewUrl);
  url.protocol = "ws:";
  url.pathname += "/__dashboard_socket";
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return socket;
}

async function nextDashboard(socket) {
  return new Promise((resolve, reject) => {
    socket.addEventListener("message", (event) => resolve(JSON.parse(event.data)), { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
}

async function requestWithHost(url, host) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const outgoing = request({
      hostname: target.hostname,
      port: target.port,
      path: target.pathname,
      headers: { Host: host },
    }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    });
    outgoing.on("error", reject);
    outgoing.end();
  });
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
    assert.equal(new URL(indexResponse.url).searchParams.get("local-preview"), "enabled");
    const index = await indexResponse.text();
    assert.doesNotMatch(index, /location\.reload/);
    assert.doesNotMatch(index, /<script[^>]+src=.*copilot-prompt/);

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
    assert.equal(await requestWithHost(`${preview.url}/sources.json`, "attacker.example"), 400);
    const unprotectedUrl = new URL(preview.url);
    unprotectedUrl.pathname = "/sources.json";
    assert.equal((await fetch(unprotectedUrl)).status, 404);

    const socket = await openDashboardSocket(preview.url);
    const update = nextDashboard(socket);
    await writeFile(path.join(packageDirectory, "dashboard.json"), dashboard("package-two"));
    assert.deepEqual(
      (await update).dashboard.pages.map(({ id }) => id),
      ["built-in", "package-two"],
    );
    socket.close();

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

test("local dashboard server optionally prompts Copilot to update the active view", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  const packageRoot = path.join(root, "packages");
  const packageDirectory = path.join(packageRoot, "example");
  await mkdir(packageDirectory, { recursive: true });
  await writeFile(path.join(root, "index.html"), "<!doctype html><body><div id=\"root\"></div></body>");
  await writeFile(path.join(root, "dashboard.json"), dashboard("built-in"));
  await writeFile(path.join(packageDirectory, "dashboard.json"), dashboard("package-one"));
  const prompts = [];
  let runtimeClosed = false;

  const preview = await startDashboardServer({
    siteRoot: root,
    catalogRoot: packageRoot,
    installedDashboardsDirectory: path.join(root, "dashboards"),
    downloadData: async (destination) => {
      await mkdir(destination, { recursive: true });
      await writeFile(path.join(destination, "sources.json"), "{}");
    },
    copilot: true,
    createCopilotRuntime: async () => ({
      prompt: async (payload) => prompts.push(payload),
      close: async () => {
        runtimeClosed = true;
      },
    }),
    port: 0,
  });
  try {
    const indexResponse = await fetch(`${preview.url}/`);
    assert.equal(new URL(indexResponse.url).searchParams.get("local-preview"), "copilot");
    const index = await indexResponse.text();
    assert.doesNotMatch(index, /Ask Copilot to update this view/);
    assert.doesNotMatch(index, /<script[^>]+src=.*copilot-prompt/);
    assert.doesNotMatch(index, /eval\(/);

    const response = await fetch(`${preview.url}/__dashboard_copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: new URL(preview.url).origin,
      },
      body: JSON.stringify({ view: "package-one", request: "Add a failure trend" }),
    });
    assert.equal(response.status, 200);
    assert.equal(prompts.length, 1);
    assert.equal(prompts[0].view, "package-one");
    assert.equal(prompts[0].request, "Add a failure trend");
    assert.equal(prompts[0].viewDashboardPath, path.join(packageDirectory, "dashboard.json"));
    assert.deepEqual(prompts[0].editableDashboardPaths, [
      path.join(root, "dashboard.json"),
      path.join(packageDirectory, "dashboard.json"),
    ]);
    assert.match(prompts[0].bundledDashboardPath, /cao-dashboard-preview-.*dashboard\.json$/);

    const invalidOrigin = await fetch(`${preview.url}/__dashboard_copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://attacker.example",
      },
      body: JSON.stringify({ view: "package-one", request: "Change it" }),
    });
    assert.equal(invalidOrigin.status, 400);
  } finally {
    await preview.close();
    await rm(root, { recursive: true, force: true });
  }
  assert.equal(runtimeClosed, true);
});

test("local dashboard server downloads the latest data artifact with GitHub CLI", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dashboard-local-server-"));
  const ghExecutable = path.join(root, "gh");
  await writeFile(path.join(root, "index.html"), "<!doctype html><body>preview</body>");
  await writeFile(path.join(root, "dashboard.json"), dashboard("built-in"));
  await writeFile(ghExecutable, `#!/bin/sh
if [ "$1" = "api" ]; then
  if [ "$2" = "repos/acme/control" ]; then
    printf 'main\\n'
    exit
  fi
  if [ "$2" = "repos/acme/control/actions/artifacts?name=central-agentic-ops-dashboard-data&per_page=100" ]; then
    printf '42\\n'
    exit
  fi
  if [ "$2" = "repos/acme/control/actions/runs/42" ]; then
    printf 'success\\tmain\\t.github/workflows/dashboard.yml\\n'
    exit
  fi
  exit 2
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
