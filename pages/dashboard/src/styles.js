/**
 * GitHub Primer CSS tokens and element styles cloned from CAO dashboard.
 */

/**
 * @returns {string}
 */
export function primerStylesheet() {
  return `:root {
  --canvas: #0d1117;
  --canvas-subtle: #151b23;
  --canvas-inset: #010409;
  --header: #010409;
  --fg: #f0f6fc;
  --muted: #9198a1;
  --border: #3d444d;
  --border-muted: #21262d;
  --accent: #58a6ff;
  --accent-muted: #121d2f;
  --success: #3fb950;
  --success-muted: #12261e;
  --danger: #f85149;
  --cancelled: #8c959f;
  --attention: #d29922;
  --attention-muted: #272115;
  --neutral-muted: #6e768166;
  --focus: #58a6ff;
}
@media (prefers-color-scheme: light) {
  :root {
    --canvas: #ffffff;
    --canvas-subtle: #f6f8fa;
    --canvas-inset: #f6f8fa;
    --header: #f6f8fa;
    --fg: #1f2328;
    --muted: #59636e;
    --border: #d1d9e0;
    --border-muted: #d8dee4;
    --accent: #0969da;
    --accent-muted: #ddf4ff;
    --success: #1a7f37;
    --success-muted: #dafbe1;
    --danger: #cf222e;
    --cancelled: #656d76;
    --attention: #9a6700;
    --attention-muted: #fff8c5;
    --neutral-muted: #afb8c133;
    --focus: #0969da;
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--canvas); color: var(--fg); font: .875rem/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
.dashboard-root { min-height: 100vh; background: var(--canvas); color: var(--fg); font: .875rem/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.octicon-sprite { width: 0; height: 0; position: absolute; overflow: hidden; }
.octicon { width: 16px; height: 16px; flex: 0 0 16px; fill: currentColor; vertical-align: text-bottom; }
a { color: var(--accent); text-decoration: none; text-underline-offset: 2px; transition: color 120ms ease; }
a:hover { text-decoration: underline; text-decoration-thickness: 2px; }
a:focus-visible, [tabindex]:focus-visible, button:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.skip-link { position: fixed; z-index: 10; top: -80px; left: 12px; padding: 7px 12px; border: 1px solid var(--focus); border-radius: 6px; background: var(--canvas); color: var(--accent); font-weight: 600; text-decoration: none; transition: top 120ms ease, color 120ms ease; }
.skip-link:focus { top: 8px; }
.app-shell { min-height: 100vh; display: grid; grid-template-columns: 232px minmax(0, 1fr); }
.org-sidebar { min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 24px 16px 16px; border-right: 1px solid var(--border); background: var(--canvas-subtle); }
.sidebar-brand { display: flex; align-items: center; gap: 8px; margin: 0 8px 10px; overflow: hidden; color: var(--fg); font-size: 1rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
.sidebar-brand-mark { width: 24px; height: 24px; flex: 0 0 24px; overflow: visible; }
.sidebar-brand > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.primary-nav { display: flex; flex-direction: column; gap: 2px; }
.primary-nav a, .nav-parent { min-height: 32px; display: flex; align-items: center; gap: 10px; position: relative; padding: 6px 8px; border-radius: 6px; color: var(--fg); font-weight: 500; text-decoration: none; transition: background-color 120ms ease, color 120ms ease; }
.primary-nav :is(a, .nav-parent) > .octicon { color: var(--muted); }
.primary-nav a:hover { background: var(--neutral-muted); }
.primary-nav a[aria-current="page"] { background: var(--neutral-muted); font-weight: 600; }
.primary-nav a[aria-current="page"]::before { content: ""; width: 3px; position: absolute; top: 5px; bottom: 5px; left: -16px; border-radius: 0 4px 4px 0; background: var(--accent); }
.app-main { min-width: 0; display: flex; flex-direction: column; }
.app-main > nav { border-bottom: 1px solid var(--border); background: var(--canvas); }
.app-main > nav .shell { display: flex; align-items: center; gap: 8px; max-width: 1280px; margin: auto; padding: 10px 24px; }
.app-main > nav .shell > a { min-height: 24px; display: inline-flex; align-items: center; }
.app-main > nav .shell > * + *:not(.report-actions)::before { content: "/"; margin-right: 8px; color: var(--muted); }
.report-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.freshness { max-width: none; flex: none; display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: .75rem; white-space: nowrap; }
.repository-link { width: 28px; height: 28px; display: grid; flex: 0 0 28px; place-items: center; border-radius: 6px; color: var(--muted); text-decoration: none; transition: background-color 120ms ease, color 120ms ease; }
.repository-link:hover { background: var(--neutral-muted); color: var(--fg); }
.repository-link .octicon { width: 18px; height: 18px; }
main.dashboard-prototype { width: min(1280px, 100%); flex: 1; margin: 0 auto; padding: 0 20px 40px; }
.overview-header { min-height: 88px; display: flex; align-items: flex-start; justify-content: space-between; gap: 32px; padding: 18px 0 14px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
.overview-header h1 { margin: 0; font-size: 1.5rem; line-height: 1.25; font-weight: 600; }
.overview-header .lede { max-width: 760px; margin: 6px 0 0; color: var(--muted); font-size: .875rem; }
.title-area { display: flex; align-items: center; gap: 8px; }
.dashboard-pages { display: flex; flex-direction: column; gap: 24px; }
.dashboard-page { padding: 0; }
.dashboard-page[hidden] { display: none; }
.dashboard-page > h2 { margin: 0 0 14px; font-size: 1.25rem; font-weight: 600; }
.custom-view-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
.custom-view { min-width: 0; grid-column: span 12; }
.custom-view[data-view-layout="half"] { grid-column: span 6; }
.custom-view[data-view-layout="third"] { grid-column: span 4; }
.chart-widget { min-height: 180px; display: grid; place-items: center; margin: 12px 0; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.chart-widget svg { width: min(100%, 420px); max-height: 220px; overflow: visible; }
.pie-chart-track { stroke: var(--border-muted); }
.pie-chart-segment { transform: rotate(-90deg); transform-origin: center; stroke: var(--accent); }
.chart-series-1 { stroke: var(--success); }
.chart-series-2 { stroke: var(--attention); }
.chart-series-3 { stroke: var(--danger); }
.chart-series-4 { stroke: var(--accent); }
.chart-series-5 { stroke: var(--muted); }
.line-chart-axis { stroke: var(--border); stroke-width: 1; }
.line-chart-series { stroke: var(--accent); stroke-width: 2; vector-effect: non-scaling-stroke; }
.line-chart-point { fill: var(--canvas); stroke-width: 2; vector-effect: non-scaling-stroke; }
.chart-point { cursor: crosshair; }
.point-tooltip { opacity: 0; pointer-events: none; transition: opacity 80ms linear; }
.point-tooltip rect { fill: var(--canvas-subtle); stroke: var(--border); vector-effect: non-scaling-stroke; }
.point-tooltip text { fill: var(--fg); font-size: 3px; font-weight: 600; }
.chart-point:hover .point-tooltip, .chart-point:focus-visible .point-tooltip { opacity: 1; }
.chart-point:focus-visible .line-chart-point { stroke: var(--focus); stroke-width: 3; }
.bar-chart-axis { stroke: var(--border); stroke-width: 1; }
.bar-chart-bar { fill: var(--accent); stroke: var(--canvas); stroke-width: .5; }
.chart-widget [tabindex]:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; stroke: var(--focus); stroke-width: 3; }
.chart-widget .chart-series-1 { stroke: var(--success); }
.chart-widget .chart-series-2 { stroke: var(--attention); }
.chart-widget .chart-series-3 { stroke: var(--danger); }
.chart-widget .chart-series-4 { stroke: var(--accent); }
.chart-widget .chart-series-5 { stroke: var(--muted); }
.bar-chart-bar.chart-series-1 { fill: var(--success); }
.bar-chart-bar.chart-series-2 { fill: var(--attention); }
.bar-chart-bar.chart-series-3 { fill: var(--danger); }
.bar-chart-bar.chart-series-4 { fill: var(--accent); }
.bar-chart-bar.chart-series-5 { fill: var(--muted); }
.metric-link a, .custom-table a { display: inline-flex; align-items: center; gap: 4px; border-radius: 4px; transition: background-color 120ms ease, color 120ms ease; }
.metric-link a:hover, .custom-table a:hover { background: var(--neutral-muted); }
.metric-link .octicon, .custom-table a .octicon { width: 12px; height: 12px; }
h3 { margin: 16px 0 8px; font-size: 1rem; font-weight: 600; }
.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 0 0 20px; overflow: visible; }
.metrics div, .data-state-summary > div { min-width: 0; min-height: 90px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.data-state-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 0 0 20px; }
.data-state-summary dt, .metrics dt { color: var(--muted); font-size: .75rem; font-weight: 600; text-transform: uppercase; margin: 0; }
.data-state-summary dd, .metrics dd { margin: 4px 0 0; font-size: 1.375rem; font-weight: 600; font-variant-numeric: tabular-nums; text-transform: capitalize; }
.data-state-summary dd[data-state-axis="availability"],
.data-state-summary dd[data-state-axis="completeness"],
.data-state-summary dd[data-state-axis="freshness"] { color: var(--fg); }
.summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px; }
.summary-card { padding: 14px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.summary-card h4 { margin: 0 0 8px; font-size: .875rem; color: var(--muted); font-weight: 600; text-transform: uppercase; }
.summary-list, .run-status-counts, .run-conclusion-counts, .run-outcome-counts { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.summary-list li, .run-status-counts li, .run-conclusion-counts li, .run-outcome-counts li { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--border); border-radius: 2em; background: var(--canvas-subtle); font-size: .75rem; font-weight: 600; }
.table-region { overflow-x: auto; border: 1px solid var(--border); border-radius: 6px; margin: 12px 0 20px; background: var(--canvas); }
table { width: 100%; min-width: 600px; border-collapse: collapse; font-size: .875rem; }
caption { padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); color: var(--muted); text-align: left; font-weight: 600; font-size: .8125rem; }
th, td { padding: 10px 14px; border-bottom: 1px solid var(--border-muted); text-align: left; font-variant-numeric: tabular-nums; }
thead th { background: var(--canvas-subtle); color: var(--muted); font-size: .75rem; font-weight: 600; border-bottom: 1px solid var(--border); white-space: nowrap; }
tbody tr:last-child > * { border-bottom: 0; }
tbody tr:hover { background: var(--canvas-subtle); }
.kind, .status, .mode-badge, .workflow-badge { display: inline-flex; align-items: center; min-height: 20px; padding: 0 7px; border: 1px solid var(--border); border-radius: 2em; color: var(--muted); font-size: .6875rem; font-weight: 600; text-transform: capitalize; white-space: nowrap; }
.status-success { border-color: color-mix(in srgb, var(--success) 45%, var(--border)); background: var(--success-muted); color: var(--success); }
.status-attention { border-color: color-mix(in srgb, var(--attention) 45%, var(--border)); background: var(--attention-muted); color: var(--attention); }
.status-danger { border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); background: var(--danger-muted, #f851491a); color: var(--danger); }
.status-muted { background: var(--neutral-muted); }
.mode-live { border-color: color-mix(in srgb, var(--success) 45%, var(--border)); background: var(--success-muted); color: var(--success); }
.mode-review { border-color: color-mix(in srgb, var(--attention) 45%, var(--border)); background: var(--attention-muted); color: var(--attention); }
.mode-indicator { min-height: 22px; display: inline-flex; flex: none; align-items: center; gap: 5px; padding: 1px 7px; border: 1px solid var(--border); border-radius: 2em; font-size: .6875rem; font-weight: 600; text-transform: none; white-space: nowrap; }
.mode-indicator .octicon { width: 13px; height: 13px; flex-basis: 13px; }
.provenance-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-muted); }
.provenance-list { margin: 8px 0 0; padding-left: 20px; color: var(--muted); font-size: .8125rem; }
.provenance-list li + li { margin-top: 4px; }
code { padding: 2px 4px; border-radius: 4px; background: var(--neutral-muted); font: .75rem ui-monospace, SFMono-Regular, Consolas, monospace; }
footer { padding: 20px 0; border-top: 1px solid var(--border); color: var(--muted); font-size: .75rem; margin-top: 40px; }
.empty, .page-placeholder { margin: 0; padding: 28px 16px; color: var(--muted); text-align: center; }
@media (max-width: 700px) {
  .app-shell { display: block; }
  .org-sidebar { display: block; padding: 14px 12px 10px; border-right: 0; border-bottom: 1px solid var(--border); }
  .sidebar-brand { margin-bottom: 8px; font-size: 1rem; }
  .primary-nav { width: 100%; flex-direction: row; overflow-x: auto; }
  .primary-nav a { min-height: 44px; flex: none; }
  .overview-header { min-height: 0; padding: 24px 0 20px; flex-direction: column; gap: 12px; }
  main.dashboard-prototype { padding: 0 14px 28px; }
  .data-state-summary, .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .custom-view[data-view-layout="half"], .custom-view[data-view-layout="third"] { grid-column: span 12; }
}
@media (max-width: 420px) {
  .data-state-summary, .metrics { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
}
@media (prefers-contrast: more) {
  :root {
    --border: var(--fg);
    --border-muted: var(--muted);
  }
  a:focus-visible, [tabindex]:focus-visible { outline-width: 3px; }
}
@media (forced-colors: active) {
  :root {
    --canvas: Canvas;
    --canvas-subtle: Canvas;
    --canvas-inset: Canvas;
    --header: Canvas;
    --fg: CanvasText;
    --muted: CanvasText;
    --border: ButtonBorder;
    --border-muted: ButtonBorder;
    --accent: LinkText;
    --accent-muted: Canvas;
    --success: CanvasText;
    --success-muted: Canvas;
    --danger: CanvasText;
    --cancelled: CanvasText;
    --attention: CanvasText;
    --attention-muted: Canvas;
    --neutral-muted: Canvas;
    --focus: Highlight;
  }
}
@media print {
  .org-sidebar, .app-main > nav, .skip-link { display: none; }
  .app-shell { display: block; }
  main.dashboard-prototype { width: 100%; padding: 0; }
  a { color: inherit; text-decoration: underline; }
}`;
}

export const getPrimerStyles = primerStylesheet;
