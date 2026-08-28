import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const checkOnly = process.argv.includes("--check");
const workflowsDirectory = resolve(".github/workflows");
const htmlEscapes = new Map([
  ["0026", "&"],
  ["003c", "<"],
  ["003e", ">"],
]);

let changedFiles = 0;
let replacementCount = 0;

for (const name of readdirSync(workflowsDirectory).filter((entry) => entry.endsWith(".lock.yml"))) {
  const lockPath = resolve(workflowsDirectory, name);
  const source = readFileSync(lockPath, "utf8");
  let fileReplacements = 0;
  const repaired = source.replace(/\$\{\{[\s\S]*?\}\}/g, (expression) => (
    expression.replace(/\\+u(0026|003c|003e)/gi, (_, codePoint) => {
      fileReplacements += 1;
      return htmlEscapes.get(codePoint.toLowerCase());
    })
  ));

  if (fileReplacements === 0) continue;
  changedFiles += 1;
  replacementCount += fileReplacements;
  if (!checkOnly) writeFileSync(lockPath, repaired);
}

if (checkOnly && replacementCount > 0) {
  console.error(`Found ${replacementCount} escaped operator(s) in ${changedFiles} compiled workflow(s).`);
  process.exitCode = 1;
} else {
  console.log(`Repaired ${replacementCount} escaped operator(s) in ${changedFiles} compiled workflow(s).`);
}