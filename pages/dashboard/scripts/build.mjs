import { cp, mkdir, rm } from "node:fs/promises";
import { basename } from "node:path";

const source = new URL("../", import.meta.url);
const destination = new URL("../../../public/ymao/", import.meta.url);
const yamlSource = new URL("./browser/", import.meta.resolve("yaml/package.json"));
const excluded = new Set([".gitignore", "node_modules", "test", "test-results"]);

await rm(destination, { force: true, recursive: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, {
  recursive: true,
  filter: (path) => !excluded.has(basename(path)),
});
await cp(yamlSource, new URL("vendor/yaml/", destination), { recursive: true });
