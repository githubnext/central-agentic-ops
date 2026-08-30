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
.sidebar-brand { display: flex; align-items: center; gap: 6px; margin: 0 8px 10px; overflow: hidden; color: var(--fg); font-size: 1rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
.sidebar-brand-mark { width: 24px; height: 24px; flex: 0 0 24px; overflow: visible; }
.sidebar-brand > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.primary-nav { display: flex; flex-direction: column; gap: 2px; }
.nav-section-label { margin: 10px 8px 2px; color: var(--muted); font-size: .6875rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.nav-section-label:first-child { margin-top: 0; }
.primary-nav a, .nav-parent { min-height: 32px; display: flex; align-items: center; gap: 10px; position: relative; padding: 6px 8px; border-radius: 6px; color: var(--fg); font-weight: 500; text-decoration: none; transition: background-color 120ms ease, color 120ms ease; }
.primary-nav :is(a, .nav-parent) > .octicon { color: var(--muted); }
.primary-nav a:hover { background: var(--neutral-muted); }
.primary-nav a[aria-current="page"] { background: var(--neutral-muted); font-weight: 600; }
.primary-nav a[aria-current="page"]::before { content: ""; width: 3px; position: absolute; top: 5px; bottom: 5px; left: -16px; border-radius: 0 4px 4px 0; background: var(--accent); }
.app-main { min-width: 0; display: flex; flex-direction: column; }
.app-main > nav { border-bottom: 1px solid var(--border); }
.app-main > nav .shell { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 24px; }
.app-main > nav .shell > a { min-height: 24px; display: inline-flex; align-items: center; }
.app-main > nav .shell > * + *:not(.report-actions)::before { content: "/"; margin-right: 8px; color: var(--muted); }
.report-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.freshness { max-width: none; flex: none; display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: .75rem; white-space: nowrap; }
.refresh-button { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 3px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); color: var(--fg); font: inherit; font-size: .75rem; font-weight: 500; cursor: pointer; transition: background-color 120ms ease; }
.refresh-button:hover { background: var(--neutral-muted); }
.refresh-button .octicon { width: 14px; height: 14px; }
.repository-link { width: 28px; height: 28px; display: grid; flex: 0 0 28px; place-items: center; border-radius: 6px; color: var(--muted); text-decoration: none; transition: background-color 120ms ease, color 120ms ease; }
.repository-link:hover { background: var(--neutral-muted); color: var(--fg); }
.repository-link .octicon { width: 18px; height: 18px; }
main.dashboard-prototype { width: 100%; flex: 1; padding: 0 24px 40px; }
.overview-header { min-height: 88px; display: flex; align-items: flex-start; justify-content: space-between; gap: 32px; padding: 18px 0 14px; }
.overview-header h1 { margin: 0; font-size: 1.5rem; line-height: 1.25; }
.overview-header .lede { margin: 3px 0 0; font-size: .875rem; }
.title-area { display: flex; align-items: center; gap: 8px; }
.dashboard-pages { display: flex; flex-direction: column; gap: 24px; }
.dashboard-page { padding: 0; }
.dashboard-page[hidden] { display: none; }
.dashboard-page > h2 { margin: 0 0 14px; font-size: 1.25rem; font-weight: 600; }
.page-layout-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; align-items: start; }
.layout-section { min-width: 0; grid-column: span 12; padding: 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.layout-section[data-section-layout="wide"] { grid-column: span 7; }
.layout-section[data-section-layout="narrow"] { grid-column: span 5; }
.layout-section-header { margin-bottom: 12px; }
.layout-section-header h3 { margin: 0; font-size: 1rem; }
.layout-section-header p { margin: 3px 0 0; color: var(--muted); font-size: .8125rem; }
.layout-section .page-section { min-width: 0; }
.layout-section .page-section > h4 { margin: 12px 0 8px; font-size: .875rem; font-weight: 600; }
.custom-view-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
.custom-view { min-width: 0; grid-column: span 12; }
.custom-view[data-view-layout="half"] { grid-column: span 6; }
.custom-view[data-view-layout="third"] { grid-column: span 4; }
.view-disclosure { overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.view-disclosure > summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 14px; color: var(--fg); font-weight: 600; cursor: pointer; transition: background-color 120ms ease; }
.view-disclosure > summary:hover { background: var(--neutral-muted); }
.view-disclosure > summary::marker { color: var(--muted); }
.view-disclosure[open] > summary { border-bottom: 1px solid var(--border); }
.view-disclosure-hint { color: var(--muted); font-size: .75rem; font-weight: 400; }
.view-disclosure[open] .view-disclosure-hint { font-size: 0; }
.view-disclosure[open] .view-disclosure-hint::after { content: "Hide details"; font-size: .75rem; }
.view-disclosure > .page-section { padding: 0 14px 14px; }
.chart-widget { min-height: 180px; display: grid; place-items: center; margin: 12px 0; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.chart-widget svg { width: min(100%, 420px); max-height: 220px; overflow: visible; }
.pie-chart-track { stroke: var(--border-muted); }
.pie-chart-segment { transform: rotate(-90deg); transform-origin: center; stroke: var(--accent); }
.pie-chart-total-value { fill: var(--fg); font-size: 6px; font-weight: 700; }
.pie-chart-total-label { fill: var(--muted); font-size: 2.75px; text-transform: uppercase; letter-spacing: .04em; }
.chart-legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 8px 0 12px; padding: 0; list-style: none; color: var(--muted); font-size: .75rem; }
.chart-legend li { display: inline-flex; align-items: center; gap: 6px; }
.chart-legend i { width: 18px; height: 0; border-top-width: 2px; border-top-style: solid; }
.chart-legend-bar i, .chart-legend-pie i { height: 10px; border-top-width: 0; border-radius: 999px; background: currentColor; }
.chart-legend-pie strong { color: var(--fg); font-variant-numeric: tabular-nums; }
.chart-legend-pie small { color: var(--muted); }
.chart-axis { display: flex; justify-content: space-between; margin-top: 4px; color: var(--muted); font-size: .6875rem; }
.chart-series-1 { stroke: var(--success); }
.chart-series-2 { stroke: var(--attention); }
.chart-series-3 { stroke: var(--danger); }
.chart-series-4 { stroke: var(--accent); }
.chart-series-5 { stroke: var(--muted); }
.line-chart-axis { stroke: var(--border); stroke-width: 1; }
.line-chart-grid { stroke: var(--border-muted); stroke-width: .5; stroke-dasharray: 2 2; }
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
.chart-legend i.chart-series-1 { border-color: var(--success); color: var(--success); }
.chart-legend i.chart-series-2 { border-color: var(--attention); color: var(--attention); }
.chart-legend i.chart-series-3 { border-color: var(--danger); color: var(--danger); }
.chart-legend i.chart-series-4 { border-color: var(--accent); color: var(--accent); }
.chart-legend i.chart-series-5 { border-color: var(--muted); color: var(--muted); }
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
.overview-content { display: grid; gap: 24px; }
.scope-kicker { color: var(--muted); font-size: .75rem; font-weight: 600; text-transform: uppercase; }
.control-plane-status { overflow: hidden; border-radius: 6px; }
.control-plane-status > header { min-height: 104px; display: flex; align-items: center; padding: 18px 20px; border: 1px solid var(--border); border-left-width: 4px; border-radius: 6px 6px 0 0; background: var(--canvas-subtle); }
.control-plane-critical > header { border-left-color: var(--danger); background: color-mix(in srgb, var(--danger) 7%, var(--canvas)); }
.control-plane-monitoring > header { border-left-color: var(--attention); background: color-mix(in srgb, var(--attention) 7%, var(--canvas)); }
.control-plane-healthy > header { border-left-color: var(--success); background: color-mix(in srgb, var(--success) 7%, var(--canvas)); }
.control-plane-heading { min-width: 0; display: flex; align-items: center; gap: 16px; }
.control-plane-state-icon { width: 40px; height: 40px; display: grid; flex: 0 0 40px; place-items: center; border-radius: 50%; background: var(--canvas); box-shadow: 0 0 0 1px var(--border); }
.control-plane-state-icon .octicon { width: 20px; height: 20px; }
.control-plane-critical .control-plane-state-icon { color: var(--danger); }
.control-plane-monitoring .control-plane-state-icon { color: var(--attention); }
.control-plane-healthy .control-plane-state-icon { color: var(--success); }
.control-plane-heading h3 { margin: 2px 0; font-size: 1.375rem; }
.control-plane-heading p { max-width: 760px; margin: 0; color: var(--muted); font-size: .875rem; }
.control-plane-vitals { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; margin: 0; padding: 0 1px 1px; border-right: 1px solid var(--border); border-left: 1px solid var(--border); background: var(--border); }
.control-plane-vitals > div { min-width: 0; padding: 14px 16px; background: var(--canvas); }
.control-plane-vitals dt { color: var(--muted); font-size: .75rem; font-weight: 600; text-transform: uppercase; }
.control-plane-vitals dd { margin: 2px 0 0; font-size: 1.625rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.control-plane-vitals p { min-height: 2.6em; margin: 0; color: var(--muted); font-size: .75rem; line-height: 1.3; }
.control-plane-vitals .vital-failures dd { color: var(--danger); }
.execution-health { padding: 10px 16px 12px; border: 1px solid var(--border); border-top: 0; border-radius: 0 0 6px 6px; background: var(--canvas); }
.execution-health-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: .8125rem; }
.execution-health-heading span { overflow: hidden; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; }
.execution-track { height: 8px; display: flex; margin-top: 8px; overflow: hidden; border-radius: 4px; background: var(--neutral-muted); }
.execution-track span { height: 100%; display: block; }
.execution-success { background: var(--success); }
.execution-failed { background: var(--danger); }
.execution-approval { background: var(--attention); }
.execution-other { background: var(--muted); }
.execution-legend { display: flex; flex-wrap: wrap; gap: 5px 18px; margin: 8px 0 0; padding: 0; color: var(--muted); font-size: .75rem; list-style: none; }
.execution-legend li { display: flex; align-items: center; gap: 6px; }
.execution-legend li > span { width: 8px; height: 8px; border-radius: 2px; }
.execution-legend strong { color: var(--fg); font-variant-numeric: tabular-nums; }
.legend-success { background: var(--success); }
.legend-failed { background: var(--danger); }
.legend-approval { background: var(--attention); }
.legend-other { background: var(--muted); }
.package-aic-utilization > header { padding: 4px 0 12px; }
.package-aic-utilization > header h3 { margin: 2px 0 0; font-size: 1.125rem; }
.package-aic-utilization > header p { margin: 2px 0 0; color: var(--muted); font-size: .8125rem; }
.utilization-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.utilization-item { min-width: 0; padding: 14px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.utilization-item > header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.utilization-item > header span { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.utilization-item > header strong { font-size: 1.25rem; font-variant-numeric: tabular-nums; }
.utilization-track { height: 8px; margin: 12px 0 8px; overflow: hidden; border-radius: 4px; background: var(--canvas-subtle); box-shadow: inset 0 0 0 1px var(--border); }
.utilization-track span { display: block; height: 100%; border-radius: inherit; background: var(--success); }
.utilization-medium .utilization-track span { background: var(--attention); }
.utilization-high .utilization-track span { background: var(--danger); }
.utilization-empty .utilization-track span { background: var(--muted); }
.utilization-item p { min-height: 18px; margin: 0; color: var(--muted); font-size: .75rem; }
.packages-page > .page-description { margin: -10px 0 0; color: var(--muted); font-size: .875rem; }
.packages-view { display: grid; gap: 28px; margin-top: 36px; }
.package-mode-tabs { width: min(100%, 264px); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 2px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.package-mode-tabs button { min-height: 34px; padding: 5px 12px; border: 0; border-radius: 5px; background: transparent; color: var(--muted); font: inherit; font-size: .75rem; font-weight: 600; cursor: pointer; }
.package-mode-tabs button:hover { color: var(--fg); background: var(--neutral-muted); }
.package-mode-tabs button[aria-selected="true"] { color: var(--fg); background: var(--canvas); box-shadow: inset 0 0 0 1px var(--border); }
.packages-mode-content { display: grid; gap: 28px; }
.package-utilization-heading { margin-bottom: 10px; }
.package-utilization-heading h3 { margin: 0 0 2px; font-size: 1.25rem; }
.package-utilization-heading p { margin: 0; color: var(--muted); }
.package-utilization-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.package-utilization-card { min-width: 0; padding: 14px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.package-utilization-card > header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.package-utilization-identity { min-width: 0; }
.package-utilization-identity strong { display: block; }
.package-utilization-card > header strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.package-utilization-value { flex: none; font-size: 1.25rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.package-utilization-card p { min-height: 18px; margin: 0; color: var(--muted); font-size: .75rem; }
.package-utilization-card small { display: block; margin-top: 4px; color: var(--muted); font-size: .6875rem; }
.package-trend-panel { overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.package-trend-panel > header { min-height: 72px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.package-trend-panel > header h3 { margin: 0; font-size: 1rem; }
.package-trend-panel > header p { margin: 2px 0 0; color: var(--muted); font-size: .75rem; }
.package-trend-panel > header p strong { margin-right: 8px; color: var(--fg); font-size: 1.375rem; font-variant-numeric: tabular-nums; }
.package-trend-group { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: .75rem; }
.package-trend-legend { display: flex; gap: 20px; padding: 10px 16px 0; color: var(--muted); font-size: .6875rem; }
.package-trend-legend span { display: inline-flex; align-items: center; gap: 6px; }
.package-trend-legend i { width: 18px; height: 0; border-top-width: 2px; border-top-style: solid; }
.package-legend-successful { border-color: var(--success); }
.package-legend-failed { border-color: var(--danger); border-top-style: dashed !important; }
.package-legend-cancelled { border-color: var(--cancelled); border-top-style: dotted !important; }
.package-trend-chart { overflow-x: auto; padding: 6px 18px 0; }
.package-trend-chart svg { width: 100%; min-width: 760px; height: auto; overflow: visible; }
.package-trend-chart line { stroke: var(--border-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
.package-trend-chart .vertical-grid { stroke-dasharray: 2 2; }
.package-trend-chart text { fill: var(--muted); font-size: .6875rem; }
.package-trend-chart polyline { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke; }
.package-chart-successful { stroke: var(--success); }
.package-chart-failed { stroke: var(--danger); stroke-dasharray: 8 5; }
.package-chart-cancelled { stroke: var(--cancelled); stroke-dasharray: 8 4 2 4; }
.package-chart-point { cursor: crosshair; outline: none; }
.package-point-hit { fill: transparent; pointer-events: all; }
.package-point-marker { fill: var(--canvas); stroke-width: 3; opacity: 0; pointer-events: none; vector-effect: non-scaling-stroke; }
.package-point-marker-successful { stroke: var(--success); }
.package-point-marker-failed { stroke: var(--danger); }
.package-point-marker-cancelled { stroke: var(--cancelled); }
.package-point-tooltip { opacity: 0; pointer-events: none; transition: opacity 80ms linear; }
.package-point-tooltip rect { fill: var(--canvas-subtle); stroke: var(--border); vector-effect: non-scaling-stroke; }
.package-trend-chart .package-point-tooltip .tooltip-date { fill: var(--muted); font-weight: 600; }
.package-trend-chart .package-point-tooltip :is(.tooltip-label, .tooltip-value) { fill: var(--fg); font-weight: 600; }
.package-trend-chart .tooltip-swatch-successful { fill: var(--success); }
.package-trend-chart .tooltip-swatch-failed { fill: var(--danger); }
.package-trend-chart .tooltip-swatch-cancelled { fill: var(--cancelled); }
.package-chart-point:hover :is(.package-point-marker, .package-point-tooltip), .package-chart-point:focus-visible :is(.package-point-marker, .package-point-tooltip) { opacity: 1; }
.package-chart-point:focus-visible .package-point-hit { fill: color-mix(in srgb, var(--focus) 18%, transparent); stroke: var(--focus); stroke-width: 2; vector-effect: non-scaling-stroke; }
.package-trend-axis { display: flex; justify-content: space-between; padding: 0 30px 8px; color: var(--muted); font-size: .6875rem; }
.package-trend-coverage { margin: 0; padding: 0 16px 12px; color: var(--muted); font-size: .75rem; }
.attention-panel { overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.attention-panel > header { min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); }
.attention-panel > header h3, .managed-packages > header h3 { margin: 2px 0 0; font-size: 1.125rem; }
.attention-count { min-width: 28px; min-height: 24px; display: inline-grid; place-items: center; padding: 1px 8px; border-radius: 2em; background: var(--neutral-muted); font-weight: 600; font-variant-numeric: tabular-nums; }
.attention-list { margin: 0; padding: 0; list-style: none; }
.attention-item { min-height: 64px; display: grid; grid-template-columns: 28px minmax(0, 1fr); align-items: center; gap: 10px; padding: 10px 16px; }
.attention-item + .attention-item { border-top: 1px solid var(--border-muted); }
.attention-icon { width: 20px; height: 20px; display: grid; place-items: center; color: var(--attention); }
.attention-danger .attention-icon { color: var(--danger); }
.attention-success .attention-icon { color: var(--success); }
.attention-item strong { font-size: .875rem; }
.attention-item p { margin: 2px 0 0; color: var(--muted); font-size: .8125rem; }
.managed-packages > header { min-height: 72px; padding: 10px 0; }
.managed-package-list { display: grid; gap: 10px; }
.managed-package-card { overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.managed-package-card > header { min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; }
.managed-package-card > header > div { min-width: 0; display: flex; align-items: center; gap: 9px; }
.managed-package-card h4 { margin: 0; overflow: hidden; font-size: .9375rem; text-overflow: ellipsis; white-space: nowrap; }
.managed-package-icon { display: grid; color: var(--fg); }
.managed-package-card .mode-badge { gap: 4px; padding-inline: 10px; font-size: .75rem; }
.managed-package-card dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 0; padding: 8px 14px 14px; }
.managed-package-card dt { color: var(--muted); font-size: .75rem; }
.managed-package-card dd { margin: 2px 0 0; overflow: hidden; font-size: .875rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.managed-package-card .inventory-ready { color: var(--success); }
.managed-package-card .inventory-attention { color: var(--attention); }
.overview-content > .layout-section { padding: 0; border: 0; background: transparent; }
.overview-content > .layout-section > .layout-section-header { margin: 0 0 12px; padding-top: 20px; border-top: 1px solid var(--border); }
.table-region { overflow-x: auto; border: 1px solid var(--border); border-radius: 6px; margin: 12px 0 20px; background: var(--canvas); }
.table-scroll { max-height: 60vh; overflow: auto; overscroll-behavior: contain; }
.table-scroll:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
.table-scroll thead th { position: sticky; top: 0; z-index: 1; }
.table-sort { display: inline-flex; align-items: center; gap: 4px; width: 100%; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.table-sort::after { content: "↕"; color: var(--muted); font-size: .6875rem; opacity: .5; }
.table-sort:hover { color: var(--fg); }
th[aria-sort="ascending"] .table-sort::after { content: "↑"; opacity: 1; }
th[aria-sort="descending"] .table-sort::after { content: "↓"; opacity: 1; }
.table-filter { min-width: 600px; display: flex; flex-wrap: wrap; align-items: end; gap: 10px 16px; padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); }
.table-filter label { min-width: 160px; flex: 0 1 220px; }
.table-filter label:first-child { min-width: 240px; flex-grow: 1; }
.table-filter label > span { display: block; margin-bottom: 4px; color: var(--muted); font-size: .6875rem; font-weight: 600; }
.table-filter :is(input, select) { width: 100%; min-height: 34px; padding: 5px 9px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); color: var(--fg); font: inherit; }
.table-filter :is(input, select):focus-visible { outline: 2px solid var(--focus); outline-offset: -1px; }
.table-filter-result { flex: none; padding-bottom: 7px; color: var(--muted); font-size: .75rem; }
.table-filter-more { min-height: 32px; margin: 10px 14px; padding: 5px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); color: var(--fg); font: inherit; font-size: .75rem; font-weight: 600; cursor: pointer; }
.table-filter-more:hover { background: var(--neutral-muted); }
table { width: 100%; min-width: 600px; border-collapse: collapse; font-size: .875rem; }
caption { padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); color: var(--muted); text-align: left; font-weight: 600; font-size: .8125rem; }
th, td { padding: 10px 14px; border-bottom: 1px solid var(--border-muted); text-align: left; font-variant-numeric: tabular-nums; }
thead th { background: var(--canvas-subtle); color: var(--muted); font-size: .75rem; font-weight: 600; border-bottom: 1px solid var(--border); white-space: nowrap; }
.table-summary-row th { min-width: 150px; padding-block: 8px; vertical-align: top; white-space: normal; }
.table-summary-categories { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; font-weight: 400; }
.table-summary-categories li { display: flex; min-width: 0; justify-content: space-between; gap: 8px; }
.table-summary-categories li span { overflow: hidden; color: var(--fg); text-overflow: ellipsis; white-space: nowrap; }
.table-summary-categories strong, .table-summary-boolean strong { color: var(--fg); font-weight: 600; }
.table-summary-quantitative { display: grid; gap: 6px; }
.table-summary-histogram { width: 100%; height: 32px; overflow: visible; }
.table-summary-histogram rect { fill: var(--accent); opacity: .75; }
.table-summary-quantitative dl { display: grid; gap: 2px; margin: 0; }
.table-summary-quantitative dl div { display: flex; justify-content: space-between; gap: 8px; }
.table-summary-quantitative dt { font-weight: 400; }
.table-summary-quantitative dd { margin: 0; color: var(--fg); font-weight: 600; }
.table-summary-empty { font-weight: 400; font-style: italic; }
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
.workflow-topology-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; margin: 14px 0 0; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--border); }
.workflow-topology-summary > div { min-width: 0; padding: 12px 14px; background: var(--canvas-subtle); }
.workflow-topology-summary dt { color: var(--muted); font-size: .6875rem; font-weight: 600; text-transform: uppercase; }
.workflow-topology-summary dd { margin: 2px 0 0; font-size: 1.25rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.workflow-topology { container: workflow-topology / inline-size; margin-top: 16px; }
.topology-plane { padding: 18px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.topology-plane-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.topology-plane-header > div { min-width: 0; }
.topology-plane-header h4 { margin: 1px 0 2px; font-size: 1rem; }
.topology-plane-header p { margin: 0; color: var(--muted); font-size: .8125rem; }
.topology-kicker { font-size: .6875rem !important; font-weight: 600; text-transform: uppercase; }
.topology-step { width: 28px; height: 28px; display: grid; flex: 0 0 28px; place-items: center; border: 1px solid var(--border); border-radius: 50%; color: var(--muted); font-size: .6875rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.package-topology-list { display: grid; gap: 10px; }
.package-topology { min-width: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.package-topology-header { min-height: 56px; display: grid; grid-template-columns: 28px minmax(0, 1fr) auto auto; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--border-muted); }
.package-icon, .repository-icon { width: 28px; height: 28px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 6px; color: var(--accent); background: var(--accent-muted); }
.package-identity { min-width: 0; }
.package-identity h5 { margin: 0; overflow-wrap: anywhere; font-size: .875rem; }
.package-identity p { margin: 1px 0 0; overflow-wrap: anywhere; color: var(--muted); font-size: .75rem; }
.package-flow { display: grid; grid-template-columns: minmax(0, .9fr) 90px minmax(0, 1.2fr); align-items: center; gap: 10px; padding: 12px; }
.workflow-node { min-width: 0; min-height: 58px; display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-left: 3px solid var(--border); background: var(--canvas-subtle); }
.workflow-node-orchestrator { border-left-color: var(--accent); }
.workflow-node-worker { border-left-color: var(--success); }
.workflow-node-missing { border-left-color: var(--attention); color: var(--attention); }
.workflow-node-icon, .standalone-workflow-icon { width: 24px; height: 24px; display: grid; flex: 0 0 24px; place-items: center; color: var(--muted); }
.workflow-node-copy { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 8px; align-items: baseline; }
.workflow-node-copy strong { min-width: 0; overflow-wrap: anywhere; }
.workflow-node-copy code { grid-column: 1 / -1; min-width: 0; overflow: hidden; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; }
.workflow-node-copy small { grid-column: 2; grid-row: 1; color: var(--muted); font-size: .6875rem; text-transform: capitalize; }
.worker-stack { min-width: 0; display: grid; gap: 6px; }
.package-dispatch { min-width: 0; display: grid; place-items: center; color: var(--muted); font-size: .6875rem; font-weight: 600; text-transform: uppercase; }
.package-dispatch i { width: 100%; height: 1px; position: relative; margin-top: 6px; background: var(--border); }
.package-dispatch i::after { content: ""; position: absolute; top: -4px; right: 0; border-width: 4px 0 4px 6px; border-style: solid; border-color: transparent transparent transparent var(--border); }
.topology-boundary { min-height: 58px; display: grid; grid-template-columns: auto minmax(32px, 1fr); align-items: center; gap: 12px; padding: 0 18px; color: var(--muted); font-size: .6875rem; font-weight: 600; text-transform: uppercase; }
.topology-boundary i { height: 1px; position: relative; background: repeating-linear-gradient(90deg, var(--border) 0 6px, transparent 6px 11px); }
.topology-boundary i::after { content: ""; position: absolute; top: -4px; right: 0; border-width: 4px 0 4px 6px; border-style: solid; border-color: transparent transparent transparent var(--border); }
.target-plane { background: var(--canvas); }
.standalone-repository-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; }
.standalone-repository { min-width: 0; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.standalone-repository > header { min-height: 48px; display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-bottom: 1px solid var(--border-muted); }
.standalone-repository > header strong { min-width: 0; overflow-wrap: anywhere; }
.standalone-repository .workflow-count { margin-left: auto; color: var(--muted); font-size: .6875rem; white-space: nowrap; }
.standalone-repository ul { list-style: none; margin: 0; padding: 0; }
.standalone-repository li { min-width: 0; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto auto; align-items: center; gap: 8px; padding: 9px 10px; }
.standalone-repository li + li { border-top: 1px solid var(--border-muted); }
.standalone-repository li > span:nth-child(2) { min-width: 0; display: grid; }
.standalone-repository li strong { overflow-wrap: anywhere; }
.standalone-repository li code { min-width: 0; overflow: hidden; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; }
.provenance-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-muted); }
.provenance-list { margin: 8px 0 0; padding-left: 20px; color: var(--muted); font-size: .8125rem; }
.provenance-list li + li { margin-top: 4px; }
code { padding: 2px 4px; border-radius: 4px; background: var(--neutral-muted); font: .75rem ui-monospace, SFMono-Regular, Consolas, monospace; }
footer { padding: 20px 24px; border-top: 1px solid var(--border); color: var(--muted); font-size: .75rem; }
.empty, .page-placeholder { margin: 0; padding: 28px 16px; color: var(--muted); text-align: center; }
@container workflow-topology (max-width: 700px) {
  .package-flow { grid-template-columns: 1fr; }
  .package-dispatch { min-height: 42px; }
  .package-dispatch i { width: 1px; height: 24px; margin-top: 4px; }
  .package-dispatch i::after { top: auto; right: -4px; bottom: 0; border-width: 6px 4px 0; border-color: var(--border) transparent transparent; }
}
@media (max-width: 700px) {
  .app-shell { display: block; }
  .org-sidebar { display: block; padding: 14px 12px 10px; border-right: 0; border-bottom: 1px solid var(--border); }
  .sidebar-brand { margin-bottom: 8px; font-size: 1rem; }
  .primary-nav { width: 100%; flex-direction: row; overflow-x: auto; }
  .primary-nav a { min-height: 44px; flex: none; }
  .overview-header { min-height: 0; padding: 24px 0 20px; flex-direction: column; gap: 12px; }
  main.dashboard-prototype { padding: 0 14px 28px; }
  .data-state-summary, .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .layout-section[data-section-layout="wide"], .layout-section[data-section-layout="narrow"] { grid-column: span 12; }
  .custom-view[data-view-layout="half"], .custom-view[data-view-layout="third"] { grid-column: span 12; }
  .control-plane-status > header { min-height: 0; padding: 14px; }
  .control-plane-heading { align-items: flex-start; }
  .control-plane-heading .scope-kicker { display: none; }
  .control-plane-heading p { font-size: .75rem; }
  .control-plane-vitals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .control-plane-vitals > div { padding: 10px 12px; }
  .control-plane-vitals p { min-height: 0; }
  .execution-health-heading { align-items: flex-start; flex-direction: column; gap: 2px; }
  .execution-legend { display: none; }
  .managed-package-card dl { gap: 8px; }
  .package-utilization-grid { grid-template-columns: 1fr; }
  .package-trend-panel > header { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 420px) {
  .data-state-summary, .metrics { grid-template-columns: 1fr; }
  .workflow-topology-summary { grid-template-columns: 1fr; }
  .package-topology-header { grid-template-columns: 28px minmax(0, 1fr); }
  .package-topology-header > :is(.mode-indicator, .status) { grid-column: auto; }
  .standalone-repository-list { grid-template-columns: minmax(0, 1fr); }
  .standalone-repository li { grid-template-columns: 24px minmax(0, 1fr); }
  .standalone-repository li > :is(.mode-indicator, .status) { grid-column: 2; justify-self: start; }
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
