import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import starlight from "@astrojs/starlight";
import starlightThemeGalaxy from "starlight-theme-galaxy";
import rewriteDocsLinks from "./docs/rewrite-docs-links.mjs";

export default defineConfig({
  site: "https://githubnext.github.io",
  base: "/central-agentic-ops",
  srcDir: "./docs",
  markdown: {
    processor: unified({
      remarkPlugins: [[rewriteDocsLinks, { base: "/central-agentic-ops" }]],
    }),
  },
  integrations: [
    starlight({
      title: "Central Agentic Ops",
      description: "Enterprise control planes for GitHub Agentic Workflows.",
      plugins: [starlightThemeGalaxy()],
      components: {
        Banner: "./docs/components/ExperimentalBanner.astro",
      },
      editLink: {
        baseUrl: "https://github.com/githubnext/central-agentic-ops/edit/main/",
      },
      social: [
        {
          icon: "github",
          label: "GitHub repository",
          href: "https://github.com/githubnext/central-agentic-ops",
        },
      ],
      sidebar: [
        { label: "Overview", link: "/" },
        {
          label: "Get started",
          items: [
            { label: "Install and first run", link: "/getting-started/" },
            { label: "Choose credentials", link: "/authentication/" },
          ],
        },
        {
          label: "Run safely",
          items: [
            { label: "Roll out a bundle", link: "/rollout-and-routing/" },
            { label: "Monitor and recover", link: "/operations/" },
            { label: "Emergency stop", link: "/operations/#emergency-stop" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Configuration", link: "/configuration/" },
            { label: "How the control plane works", link: "/architecture/" },
            { label: "Orchestrators and workers", link: "/orchestrators-and-workers/" },
          ],
        },
        {
          label: "Maintain",
          items: [
            { label: "Add a bundle", link: "/operations/#adding-a-bundle" },
            { label: "Add a worker", link: "/operations/#adding-a-worker" },
            { label: "Validate changes", link: "/operations/#change-validation" },
          ],
        },
      ],
    }),
  ],
});