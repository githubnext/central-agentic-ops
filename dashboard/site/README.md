# Dashboard Language Renderer

Production Dashboard Language validator and presenter for the Central Agentic Ops dashboard package.

The reusable dashboard builder copies this directory to its configured `site-path`. The browser loads the built-in configuration from `dashboard.json`, package-specific custom dashboards from `package-dashboards.json`, and generated data from `sources.json`, then derives presentation-only data and renders the `/cao` experience without page-specific HTML generation.

## Data pipeline

1. Dashboard collectors write inventory, deployed-workflow, AI Credit, and operational-value JSON.
2. `dashboard/report/records.mjs` normalizes durable issues, pull requests, comments, review artifacts, and run attribution into `records.json`.
3. `dashboard/report/dashboard-language-sources.mjs` adapts collector and record data into `sources.json`.
4. This renderer composes `dashboard.json` with the separately validated `package-dashboards.json`, validates `sources.json`, then renders all configured pages and route-scoped details.

`sources.json` is the default deployed input. Add `?fixtures` locally to use the illustrative fixture data.

## Quality gates

```bash
npm install
npm run build
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

The build copies production assets to `public/cao/` for the documentation site. Application source is browser-compatible JavaScript ESM with no runtime dependencies; build and test tooling remains development-only.