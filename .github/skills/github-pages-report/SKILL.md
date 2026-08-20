---
name: github-pages-report
description: "Design, generate, or review polished reports published with GitHub Pages. Use for HTML, CSS, charts, dashboards, or other Pages reports derived from agentic operation outputs, including when a built-in issue report moves to Pages. Applies conventional Actions publishing, GitHub/Primer visual conventions, responsive report structure, and WCAG 2.2 AA accessibility basics."
argument-hint: "Describe the report, its data, and its GitHub Pages publishing path"
---

# Build a GitHub Pages Report

Produce a durable, accessible static report that feels at home on GitHub. Use this skill for every report whose primary rendered destination is GitHub Pages, whether the report belongs to a new operation or replaces a built-in issue report.

## Procedure

1. Identify the report's audience, primary decisions, update cadence, data sensitivity, trusted source data, and Pages base path. Do not publish private or sensitive operational data to a public Pages site.
2. Inspect an existing Pages report in the same repository and reuse its shell, tokens, components, and build process when present. Otherwise follow the contract below.
3. Put the decision summary and report freshness in the first viewport. Order the remaining content from actionable findings to supporting detail and methodology.
4. Generate semantic HTML first, then add restrained presentation and optional progressive enhancement. The report must remain understandable when JavaScript or charts fail.
5. Escape all repository-derived and model-generated values before inserting them into HTML. Never interpolate untrusted content into `innerHTML`, inline scripts, inline styles, or URL attributes without context-appropriate sanitization and protocol validation.
6. Test the built output at the repository's actual GitHub Pages project path, not only at `/`. Use relative links or a configured base URL so assets and navigation work at `/<repository>/`.
7. Complete the accessibility, responsive, and publishing checks before treating the report as ready.

## Report Contract

Every report must include:

- a descriptive document `<title>` and one visible `<h1>`
- a skip link and semantic `header`, `nav` when needed, `main`, and `footer` landmarks
- report scope, generated-at timestamp with timezone, data window, and source or methodology links
- a concise outcome summary before detailed findings
- explicit empty, loading, partial-data, stale-data, and error states when those states can occur
- stable deep links for major sections and visible focus when a heading anchor is targeted
- a provenance note linking to the generating workflow run or source revision when available
- explicit `review` or `live` provenance for every published outcome; never infer production identity from status, repository location, or visual treatment

Prefer this page order:

1. report identity, scope, and freshness
2. outcome summary and key metrics
3. prioritized findings or recommendations
4. trends and detailed evidence
5. methodology, caveats, and provenance

Do not turn each section into a floating card. Use full-width sections, compact metric groups, and cards only for repeated findings or genuinely bounded items. Keep key decisions visible; use disclosure widgets only for long evidence and raw detail.

## GitHub Visual Style

- Treat [Primer Product UI](https://primer.style/product/) as the normative design reference for the packaged control-plane report. Follow its foundations, primitives, component anatomy, interaction states, responsive behavior, and accessibility guidance even when implementing them locally without Primer packages.
- Prefer the repository's existing Primer dependencies. For a new build pipeline, use supported `@primer/css` primitives and Octicons rather than recreating GitHub components. Do not add a runtime CDN dependency solely for styling.
- Without Primer, define a small local token layer modeled on Primer semantics: canvas, inset canvas, foreground, muted foreground, border, accent, success, attention, danger, and focus colors. Provide light and dark values with `prefers-color-scheme`.
- Express typography with a semantic `rem` scale and unitless line heights so browser font-size preferences propagate through the interface. Use functional color variables rather than raw base colors in component rules.
- Use GitHub's platform-appropriate system font stack for interface text and a monospace stack for identifiers, code, and tabular numeric data.
- Keep content dense and scannable: a constrained reading width for prose, wider responsive regions for tables and charts, 6px or smaller radii, subtle borders, and little or no decorative shadow.
- Use GitHub-like status language and color semantics consistently. Pair every color with text, an icon, a pattern, or another non-color cue.
- Use Octicons when an icon improves scanning. Give icon-only controls an accessible name and tooltip; mark decorative SVGs `aria-hidden="true"` and `focusable="false"`.
- Avoid decorative gradients, oversized marketing typography, glass effects, and illustration-first layouts. This is an operational report, not a landing page.

## Accessibility Baseline

Meet WCAG 2.2 AA for the report's supported states:

- Use logical heading order, native controls, meaningful link text, and DOM order that matches visual order.
- Ensure all controls and disclosures work with a keyboard. Never use a clickable `div` or hover as the only way to reveal information.
- Show a clear `:focus-visible` indicator with at least 3:1 contrast against adjacent colors. Do not hide focused content behind sticky headers.
- Maintain at least 4.5:1 contrast for normal text, 3:1 for large text and meaningful graphics, and 3:1 for control boundaries and states.
- Do not rely on color, position, shape, or animation alone to communicate meaning.
- Respect `prefers-reduced-motion`; avoid auto-playing or nonessential animation and flashing content.
- Respect `prefers-color-scheme`, `prefers-contrast`, and `forced-colors`; preserve boundaries, focus, status meaning, and chart distinctions in each supported mode.
- Give data tables a `<caption>`, header cells with the correct `scope`, and a simple structure. Provide an accessible stacked alternative on narrow screens rather than converting headers into ambiguous data.
- Give each chart a nearby title, takeaway, units, legend, and text summary. Provide the underlying values as a table or download. Do not use canvas-only information.
- Use `aria-live` only for asynchronous status changes. Do not add ARIA where native HTML already supplies the correct semantics.
- Keep browser zoom and text resizing usable through 200%, with no clipped controls, overlapping text, or loss of information.

## Responsive and Data Design

- Start with a single-column document flow. Add columns only where comparison benefits, and collapse them before content becomes cramped.
- Bound report width while allowing tables and visualizations to use available space. Let wide data tables scroll inside a labeled region; never make the whole page scroll horizontally.
- Use tabular numerals and consistent precision for comparable metrics. Put units in headers or labels, not repeatedly in every cell.
- State denominators, time ranges, and timezone. Distinguish zero from unavailable, not applicable, withheld, and failed collection.
- Keep metric labels adjacent to values and trends. Never use unexplained percentages, unlabeled icon badges, or color-only sparklines.
- Preserve useful print output with legible colors, expanded essential details, visible link destinations when practical, and no clipped tables.

## Publishing Constraints

- Emit deterministic static assets and pin build dependencies. Do not require client-side GitHub API calls when data can be generated during the workflow.
- Keep the packaged control-plane report dependency-free. Use only Node.js built-in modules and web-platform APIs; do not add npm packages, package-manager install steps, browser JavaScript, external stylesheets, web fonts, CDN assets, or runtime network requests from the generated pages. Generate HTML, CSS, SVG charts, and the Octicon sprite locally during the build.
- Keep HTML, CSS, JavaScript, and data files separate unless the existing report pipeline intentionally produces a single self-contained artifact.
- Use hashed assets or another cache-busting strategy for generated releases. Do not cache mutable report data indefinitely.
- Include a custom `404.html` only when the site has meaningful navigation recovery. Do not use SPA routing for a static report without a concrete need.
- Publish with conventional GitHub Actions workflows that deterministically rebuild from trusted, durable source data. The control plane selects the review or production destination; the publishing workflow does not infer or promote modes.
- Minimize permissions and prefer GitHub's supported Pages artifact/deploy actions with separate build and deploy jobs. The build job needs `contents: read` and `pages: write` for `actions/configure-pages`; the deploy job independently needs `pages: write` and `id-token: write` and should use the protected `github-pages` environment.
- Do not pass generated HTML, shell commands, arbitrary paths, repository names, or deployment configuration through dispatch inputs. Dispatch selects a trusted build; it does not supply the site implementation.
- Treat workflow summaries and deployment URLs as supporting outputs, not substitutes for the report.
- Preserve issue-based reporting unless Pages materially improves navigation, history, visualization, or scale. When converting a built-in report from an issue to Pages, preserve its decision content, provenance, access expectations, and discoverability from the workflow run.

## Control-Plane Boundary

Pages report routing is part of the control plane, while deployment remains regular repository automation rather than an agent safe output. Agentic workflows produce source records through declared safe outputs. A conventional deterministic workflow renders and deploys the selected review or production site from trusted, durable inputs approved for that destination. Agents must not receive `pages: write`, invoke `actions/deploy-pages`, or promote their own output mode.

The control-plane modes govern agent-created source records, not the Pages deployment:

| Mode | Source-data behavior |
| --- | --- |
| `preview` | Stage proposed source outputs only. They are not durable inputs to the published report. |
| `review` | Route proposed source outputs to the private `safe_output_repo`, then publish them through that repository's access-controlled review Pages site. Never update production Pages. |
| `live` | Write the worker's declared source outputs to their normal live destination, then publish the production Pages site through its protected deterministic workflow. |

For Pages reports, `safe_output_repo` remains the review safe-output destination and also owns the review Pages site. Require it to be private and Pages access-controlled for the intended reviewers. If access-controlled Pages is unavailable, fail review publication closed; do not expose the report publicly or silently substitute an artifact. The production Pages repository and all source locations remain fixed in trusted control-plane configuration, not selected by an agent or arbitrary dispatch input.

Keep review and production deployments isolated with distinct repositories or environments, URLs, and concurrency groups. The deterministic publisher may run automatically after bounded source persistence or through an authorized control-plane dispatch, but the trigger must carry only fixed identifiers and validated mode. Keep target repository identity, correlation ID, central repository, source run URL, catalog or workflow identity, and generated-at time in durable source data and the rendered report when available.

If an agent needs a new kind of durable source record, represent that write with a declared safe output before allowing the Pages workflow to consume it. Do not use `post-steps`, shell commands, or workflow dispatch as a substitute for a safe output. If immediate autonomous agent publication becomes a requirement, design and review a dedicated safe-output boundary separately rather than expanding the deterministic publisher.

## Control-Plane Inventory Discovery

Control-plane reports must derive their navigation and workflow inventory from the installed repository rather than a hardcoded bundle catalog. Perform repository discovery in a deterministic build step before rendering. That step emits normalized, schema-versioned inventory JSON; the static renderer consumes the prepared inventory and must not rediscover or reinterpret repository files.

1. Recursively discover `aw.yml` manifests. Use their `name`, `description`, and workflow `includes` as package metadata, preferring the most specific nested manifest when a root catalog and a bundle manifest include the same workflow.
2. Discover agentic workflow sources from `.github/workflows/*.md`, excluding reusable files under `.github/workflows/shared/` and conventional non-agentic `.yml` workflows.
3. Match each source `<name>.md` with its generated `<name>.lock.yml`. Report source-only and lock-only entries as inventory warnings; never treat generated lock files as editable source.
4. Identify bundle orchestrators from the `shared/control.md` import with `role: orchestrator`. Treat `safe-outputs.dispatch-workflow.workflows` as the authoritative worker membership list.
5. Validate workers against discovered source files, their `role: worker` import, and stable `tracker-id` when present. Report dispatched workers that are missing or not compiled.
6. Treat remaining discovered source/lock workflow pairs as standalone workflows. Show them independently rather than dropping records that do not belong to a bundle.
7. Derive display names, descriptions, icons or emoji hints, source paths, compile state, and bundle relationships from parsed metadata. Use generic visual fallbacks when optional metadata is absent.
8. Associate durable outputs using discovered workflow IDs, tracker IDs, and display names. Do not hardcode workflow-specific issue prefixes, marker namespaces, or bundle-name regular expressions.
9. Emit the discovered inventory in a machine-readable report asset so the rendered navigation and supporting data can be audited together. Fail the render when the prepared inventory is absent or has an unsupported schema version.
10. Present review proposals separately from live production outcomes. Show the bundle's configured mode independently from the selected history view. Derive each record's mode from its attributed workflow run or trusted source route; do not add hidden mode markers to report content or display records whose mode cannot be established.

Repository-local discovery is the required baseline and must work with the Pages job's `contents: read` permission. Organization-wide discovery across other repositories is optional and must be explicitly configured with a bounded repository inventory and credentials authorized to read those repositories. Clearly label partial or inaccessible organization results; never imply that a repository-scoped token scanned the full organization.

## Worker Value Artifacts

Pages consumes durable worker-value outputs; it does not execute value functions or perform evaluations during the report build. Store each worker's canonical artifacts under `.github/value/<workflow>/`:

| Artifact | Report use |
| --- | --- |
| `<workflow>-timeline.svg` | Before/after or attainment-only plot |
| `<workflow>-timeline.json` | Structured evidence, scores, provenance, and frozen function definition |
| `<workflow>-definitions.md` | Plain-language metrics, evidence rules, direction, and limitations |
| `<workflow>-evidence-archive.json` | Function-fingerprinted valid observations retained across evaluations |

The workflow slug in the timeline JSON and all four filename stems must match the discovered worker ID. The renderer recursively discovers `*-timeline.json` beneath `.github/value`, uses its sibling SVG for the chart, and may use the definitions and evidence archive for supporting detail. Treat these committed artifacts as trusted, durable report inputs produced by the separate value-evaluation process. Rebuild Pages when `.github/value/**` changes, but never package the evaluator into the Pages capability or regenerate evidence during publication. Show an explicit "No evaluation observations yet" state when a worker has no valid timeline and never substitute workflow run counts for operational value.

## Validation

Before finishing:

1. Build the report with the same command and base path used by the Pages workflow.
2. Check for broken internal links, missing assets, invalid HTML, console errors, and unsanitized generated content.
3. Run the repository's accessibility checker when available. At minimum, inspect headings and landmarks, tab through every control, and verify labels, focus visibility, and table or chart alternatives.
4. Verify text and meaningful UI colors with an automated contrast checker in both light and dark schemes.
5. Capture desktop and mobile views. Check the first viewport, 200% zoom, long labels, empty and error states, table overflow, and overlap.
6. Verify with reduced motion, JavaScript disabled when enhancement is optional, and print preview.
7. Open the deployed or locally emulated `/<repository>/` URL and confirm canonical navigation, asset paths, provenance links, and the reported generation time.
8. Confirm preview does not deploy, review deploys only to access-controlled review Pages, and live deploys only to production Pages.
9. Confirm the Pages workflows are conventional Actions automation, accept no untrusted build or deployment inputs, isolate review and production environments, and grant no Pages permissions to an agent job.

Report the generated files, publishing path, data and sanitization approach, accessibility checks, responsive viewports, and any known limitations.