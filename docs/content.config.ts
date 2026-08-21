import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const docs = defineCollection({
  loader: glob({
    base: "./docs",
    pattern: "**/*.md",
    generateId: ({ entry }) => entry === "README.md"
      ? "index"
      : entry.replace(/\.md$/, ""),
  }),
  schema: docsSchema(),
});

export const collections = { docs };