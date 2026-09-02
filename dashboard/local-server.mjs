#!/usr/bin/env node

import { createServer } from "node:http";
import {
  copyFile,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
} from "node:fs/promises";
import { watch } from "node:fs";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { bundleDashboardFiles } from "./report/bundle-dashboards.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultCatalogRoot = basename(resolve(scriptDirectory, "..", "..")) === ".github"
  ? null
  : resolve(scriptDirectory, "..");
const reloadEndpoint = "/__dashboard_events";
const reloadScript = `<script>
  new EventSource("${reloadEndpoint}").addEventListener("reload", () => location.reload());
</script>`;
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

async function existingDirectories(paths) {
  const directories = [];
  for (const path of paths) {
    const entry = await stat(path).catch(() => null);
    if (entry?.isDirectory()) directories.push(path);
  }
  return directories;
}

async function packageDashboardPaths(catalogRoot, installedDashboardsDirectory) {
  const paths = [];
  const installed = await readdir(installedDashboardsDirectory, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  for (const entry of installed) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      paths.push(join(installedDashboardsDirectory, entry.name));
    }
  }

  if (catalogRoot) {
    const catalogEntries = await readdir(catalogRoot, { withFileTypes: true }).catch((error) => {
      if (error?.code === "ENOENT") return [];
      throw error;
    });
    for (const entry of catalogEntries) {
      if (!entry.isDirectory()) continue;
      const path = join(catalogRoot, entry.name, "dashboard.json");
      if ((await stat(path).catch(() => null))?.isFile()) paths.push(path);
    }
  }
  return [...new Set(paths)].toSorted();
}

async function sourceSignature(paths) {
  const entries = await Promise.all(paths.map(async (path) => `${path}\0${await readFile(path, "utf8")}`));
  return entries.join("\n");
}

function injectReloadScript(html) {
  return html.includes("</body>")
    ? html.replace("</body>", `${reloadScript}\n  </body>`)
    : `${html}\n${reloadScript}\n`;
}

function isWithin(root, candidate) {
  const path = relative(root, candidate);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

/**
 * Starts the dependency-free local dashboard server.
 *
 * @param {{
 *   siteRoot?: string,
 *   catalogRoot?: string | null,
 *   installedDashboardsDirectory?: string,
 *   host?: string,
 *   port?: number,
 * }} options
 */
export async function startDashboardServer({
  siteRoot = join(scriptDirectory, "site"),
  catalogRoot = defaultCatalogRoot,
  installedDashboardsDirectory = resolve(scriptDirectory, "..", "dashboards"),
  host = "127.0.0.1",
  port = 4173,
} = {}) {
  const resolvedSiteRoot = await realpath(siteRoot);
  const baseDashboardPath = join(resolvedSiteRoot, "dashboard.json");
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "cao-dashboard-preview-"));
  const bundledDashboardPath = join(temporaryDirectory, "dashboard.json");
  const clients = new Set();
  const watchers = new Map();
  let dashboardContent = "";
  let signature = "";
  let refreshTimer;
  let refreshPromise = Promise.resolve();
  let closed = false;

  const broadcastReload = () => {
    for (const client of clients) client.write("event: reload\ndata: dashboard\n\n");
  };

  const rebuild = async (notify = true) => {
    const packagePaths = await packageDashboardPaths(catalogRoot, installedDashboardsDirectory);
    const nextSignature = await sourceSignature([baseDashboardPath, ...packagePaths]);
    if (nextSignature === signature) return packagePaths;

    await copyFile(baseDashboardPath, bundledDashboardPath);
    await bundleDashboardFiles(bundledDashboardPath, packagePaths);
    dashboardContent = await readFile(bundledDashboardPath, "utf8");
    signature = nextSignature;
    if (notify) broadcastReload();
    return packagePaths;
  };

  const refreshWatchers = async (packagePaths) => {
    if (closed) return;
    const candidates = new Set([
      resolvedSiteRoot,
      installedDashboardsDirectory,
      ...packagePaths.map(dirname),
    ]);
    if (catalogRoot) candidates.add(catalogRoot);
    for (const directory of await existingDirectories(candidates)) {
      if (watchers.has(directory)) continue;
      const watcher = watch(directory, () => scheduleRefresh());
      watcher.on("error", (error) => {
        process.stderr.write(`Dashboard watcher failed for ${directory}: ${error.message}\n`);
        watcher.close();
        watchers.delete(directory);
      });
      watchers.set(directory, watcher);
    }
  };

  const refresh = async () => {
    if (closed) return;
    try {
      const packagePaths = await rebuild();
      await refreshWatchers(packagePaths);
    } catch (error) {
      process.stderr.write(`Dashboard update failed: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  };

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshPromise = refreshPromise.then(refresh, refresh);
    }, 75);
  }

  try {
    const initialPackagePaths = await rebuild(false);
    await refreshWatchers(initialPackagePaths);
  } catch (error) {
    for (const watcher of watchers.values()) watcher.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }

      const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
      if (url.pathname === reloadEndpoint) {
        response.writeHead(200, {
          "Cache-Control": "no-store",
          "Content-Type": "text/event-stream",
          Connection: "keep-alive",
        });
        response.flushHeaders();
        if (request.method === "HEAD") {
          response.end();
          return;
        }
        response.write("event: connected\ndata: ready\n\n");
        clients.add(response);
        request.on("close", () => clients.delete(response));
        return;
      }

      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        response.writeHead(400).end("Bad request\n");
        return;
      }
      if (pathname === "/") pathname = "/index.html";
      const candidate = resolve(resolvedSiteRoot, `.${pathname}`);
      if (!isWithin(resolvedSiteRoot, candidate)) {
        response.writeHead(404).end("Not found\n");
        return;
      }

      let filePath = candidate;
      let metadata = await stat(filePath).catch(() => null);
      if (metadata?.isDirectory()) {
        filePath = join(filePath, "index.html");
        metadata = await stat(filePath).catch(() => null);
      }
      if (!metadata?.isFile()) {
        response.writeHead(404).end("Not found\n");
        return;
      }
      const canonicalPath = await realpath(filePath);
      if (!isWithin(resolvedSiteRoot, canonicalPath)) {
        response.writeHead(404).end("Not found\n");
        return;
      }

      let content = pathname === "/dashboard.json"
        ? dashboardContent
        : await readFile(canonicalPath);
      if (extname(canonicalPath) === ".html") {
        content = injectReloadScript(content.toString("utf8"));
      }
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentTypes.get(extname(canonicalPath)) || "application/octet-stream",
      });
      response.end(request.method === "HEAD" ? undefined : content);
    } catch (error) {
      process.stderr.write(`Dashboard request failed: ${error instanceof Error ? error.message : String(error)}\n`);
      if (!response.headersSent) response.writeHead(500);
      response.end("Internal server error\n");
    }
  });

  try {
    await new Promise((accept, reject) => {
      server.once("error", reject);
      server.listen(port, host, accept);
    });
  } catch (error) {
    for (const watcher of watchers.values()) watcher.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("dashboard server did not bind to a TCP port");

  return {
    url: `http://${address.address.includes(":") ? `[${address.address}]` : address.address}:${address.port}`,
    async close() {
      if (closed) return;
      closed = true;
      clearTimeout(refreshTimer);
      for (const watcher of watchers.values()) watcher.close();
      for (const client of clients) client.end();
      await new Promise((accept, reject) => server.close((error) => error ? reject(error) : accept()));
      await refreshPromise;
      await rm(temporaryDirectory, { recursive: true, force: true });
    },
  };
}

function parseArguments(arguments_) {
  const options = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--help") return { help: true };
    if (argument === "--host") {
      options.host = arguments_[index += 1];
      if (!options.host) throw new Error("--host requires a value");
    }
    else if (argument === "--port") options.port = Number(arguments_[index += 1]);
    else throw new Error(`unknown argument: ${argument}`);
  }
  if (!options.host) options.host = "127.0.0.1";
  if (!Number.isInteger(options.port ?? 4173) || (options.port ?? 4173) < 1 || (options.port ?? 4173) > 65535) {
    throw new Error("--port must be an integer from 1 through 65535");
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write("usage: local-server.mjs [--host HOST] [--port PORT]\n");
    return;
  }
  const preview = await startDashboardServer(options);
  process.stdout.write(`Dashboard preview: ${preview.url}/?fixtures\n`);
  const shutdown = () => void preview.close().then(() => process.exit());
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
