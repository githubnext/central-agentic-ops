import type { MarkdownInstance } from "astro";
import { parse } from "yaml";

type PackageReadme = MarkdownInstance<Record<string, unknown>>;

type PackageManifest = {
  name?: unknown;
  description?: unknown;
  "min-version"?: unknown;
  includes?: unknown;
};

export type CatalogEntry = {
  slug: string;
  name: string;
  description: string;
  minVersion: string;
  includes: string[];
  manifestFile: string;
  readmePath?: string;
  ReadmeContent?: PackageReadme["Content"];
};

const manifests = import.meta.glob<string>("../../*/aw.{yml,yaml}", {
  query: "?raw",
  import: "default",
  eager: true,
});
const readmes = import.meta.glob<PackageReadme>("../../*/README.md", { eager: true });

function requiredString(value: unknown, field: string, manifestPath: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${manifestPath} must define a non-empty ${field}`);
  }
  return value.trim();
}

function stringList(value: unknown, field: string, manifestPath: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${manifestPath} must define ${field} as a list of paths`);
  }
  return value;
}

export const catalogEntries: CatalogEntry[] = Object.entries(manifests)
  .map(([manifestPath, source]) => {
    const slug = manifestPath.split("/").at(-2);
    if (!slug) throw new Error(`Could not derive a package slug from ${manifestPath}`);
    const manifestFile = manifestPath.split("/").at(-1);
    if (!manifestFile) throw new Error(`Could not derive a manifest filename from ${manifestPath}`);

    const manifest = parse(source) as PackageManifest;
    const readmePath = `../../${slug}/README.md`;
    const readme = readmes[readmePath];

    return {
      slug,
      name: requiredString(manifest.name, "name", manifestPath),
      description: requiredString(manifest.description, "description", manifestPath),
      minVersion: requiredString(manifest["min-version"], "min-version", manifestPath),
      includes: stringList(manifest.includes, "includes", manifestPath),
      manifestFile,
      readmePath: readme ? `${slug}/README.md` : undefined,
      ReadmeContent: readme?.Content,
    };
  })
  .sort((left, right) => {
    const advisoryRank = (entry: CatalogEntry) => /advisor(y|ies)?/i.test(entry.name) ? 1 : 0;
    return advisoryRank(left) - advisoryRank(right) || left.name.localeCompare(right.name);
  });