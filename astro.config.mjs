import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import starlight from "@astrojs/starlight";
import starlightThemeGalaxy from "starlight-theme-galaxy";
import rewriteDocsLinks from "./docs/rewrite-docs-links.mjs";

// Galaxy 0.8.0 ships Astro-scoped selectors in global CSS and one unused custom-media rule.
const galaxyCssCompatibility = {
  postcssPlugin: "galaxy-css-compatibility",
  AtRule: {
    "custom-media": (atRule) => {
      if (
        atRule.source?.input.file?.includes("starlight-theme-galaxy") &&
        atRule.params === "--motionSafe (prefers-reduced-motion: no-preference)"
      ) {
        atRule.remove();
      }
    },
  },
  Rule(rule) {
    if (
      rule.source?.input.file?.includes("starlight-theme-galaxy") &&
      rule.selector.startsWith(".sl-banner :global(")
    ) {
      rule.selector = rule.selector.replaceAll(/:global\(([^)]+)\)/g, "$1");
    }
  },
};

export default defineConfig({
  site: "https://githubnext.github.io",
  base: "/central-agentic-ops",
  srcDir: "./docs",
  vite: {
    css: {
      postcss: {
        plugins: [galaxyCssCompatibility],
      },
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [[rewriteDocsLinks, { base: "/central-agentic-ops" }]],
    }),
  },
  integrations: [
    starlight({
      title: "Central Agentic Ops",
      description: "Enterprise control planes for GitHub Agentic Workflows.",
      logo: {
        src: "./docs/assets/logo.svg",
        alt: "",
      },
      favicon: "/favicon.svg",
      customCss: ["./docs/styles/branding.css"],
      markdown: {
        processedDirs: ["."],
      },
      plugins: [starlightThemeGalaxy()],
      components: {
        Banner: "./docs/components/ExperimentalBanner.astro",
        Footer: "./docs/components/SiteFooter.astro",
        Hero: "./docs/components/HierarchyHero.astro",
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
            { label: "Quickstart", link: "/getting-started/" },
            { label: "Package catalog", link: "/catalog/" },
            { label: "Configure authentication", link: "/authentication/" },
            { label: "Optional bootstrap setup", link: "/bootstrap-configuration/" },
          ],
        },
        {
          label: "Run safely",
          items: [
            { label: "Control plane status", link: "/control-plane/" },
            { label: "Roll out an operation", link: "/rollout-and-routing/" },
            { label: "Monitor and recover", link: "/operations/" },
            { label: "Emergency stop", link: "/operations/#emergency-stop" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Configuration", link: "/configuration/" },
            { label: "Control plane overview", link: "/architecture/" },
            { label: "Deployment and governance", link: "/deployment-and-governance/" },
            { label: "Execution and safety", link: "/execution-and-safety/" },
            { label: "Orchestrators and workers", link: "/orchestrators-and-workers/" },
          ],
        },
        {
          label: "Maintain",
          items: [
            { label: "Add a package", link: "/operations/#adding-a-package" },
            { label: "Add a worker", link: "/operations/#adding-a-worker" },
            { label: "Validate changes", link: "/operations/#change-validation" },
          ],
        },
      ],
    }),
  ],
});