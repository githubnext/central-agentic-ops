import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeDashboardDocuments } from "./compose-dashboard-documents.mjs";

/**
 * @typedef {{
 *   "language-version": string,
 *   dashboard: {
 *     pages: Array<Record<string, unknown>>,
 *     navigation?: Array<{ label: string, pages: string[] }>,
 *     [key: string]: unknown
 *   },
 *   [key: string]: unknown
 * }} DashboardDocument
 */

/**
 * @param {unknown} value
 * @param {string} source
 * @returns {DashboardDocument}
 */
function dashboard(value, source) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${source} is not a dashboard document`);
  }
  const candidate = /** @type {Record<string, unknown>} */ (value);
  if (!candidate.dashboard || typeof candidate.dashboard !== "object" || Array.isArray(candidate.dashboard)) {
    throw new Error(`${source} is not a dashboard document`);
  }
  const dashboardCandidate = /** @type {Record<string, unknown>} */ (candidate.dashboard);
  if (!Array.isArray(dashboardCandidate.pages) || dashboardCandidate.pages.length === 0) {
    throw new Error(`${source} is not a dashboard document`);
  }
  return /** @type {DashboardDocument} */ (value);
}

/**
 * @param {string} outputPath
 * @param {string} dashboardsDirectory
 */
export async function bundleDashboards(outputPath, dashboardsDirectory) {
  const primary = dashboard(JSON.parse(await readFile(outputPath, "utf8")), outputPath);
  const filenames = await readdir(dashboardsDirectory).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const additions = await Promise.all(
    filenames.filter((filename) => filename.endsWith(".json")).sort().map(async (filename) => {
      const source = path.join(dashboardsDirectory, filename);
      return dashboard(JSON.parse(await readFile(source, "utf8")), source);
    }),
  );
  await writeFile(outputPath, `${JSON.stringify(composeDashboardDocuments(primary, additions), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , outputPath, dashboardsDirectory] = process.argv;
  if (!outputPath || !dashboardsDirectory) {
    throw new Error("usage: bundle-dashboards.mjs OUTPUT_DASHBOARD DASHBOARDS_DIRECTORY");
  }
  await bundleDashboards(path.resolve(outputPath), path.resolve(dashboardsDirectory));
}
