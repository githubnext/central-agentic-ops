import { dirname, join, normalize, relative, sep } from "node:path";

export default function rewriteDocsLinks({ base }) {
  const docsRoot = join(process.cwd(), "docs");

  return (tree, file) => {
    const sourceDirectory = dirname(relative(docsRoot, file.path));

    visit(tree, (node) => {
      if (node.type !== "link" || typeof node.url !== "string") return;

      const match = node.url.match(/^([^?#]+)\.md([?#].*)?$/);
      if (!match || match[1].includes(":")) return;

      const target = normalize(join(sourceDirectory, match[1]))
        .split(sep)
        .join("/");
      if (target.startsWith("../")) return;

      const route = target === "README" ? "" : `${target}/`;
      node.url = `${base}/${route}${match[2] || ""}`;
    });
  };
}

function visit(node, visitor) {
  visitor(node);
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) visit(child, visitor);
}