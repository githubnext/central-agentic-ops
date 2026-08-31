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
  --purple: #a371f7;
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
    --purple: #8250df;
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
a[href^="https://"]:not(:has(.octicon))::after, .octicon-external-link { content: ""; width: 12px; height: 12px; display: inline-block; flex: 0 0 12px; margin-left: 4px; background: currentColor; vertical-align: -1px; -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z'/%3E%3C/svg%3E") no-repeat center / contain; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z'/%3E%3C/svg%3E") no-repeat center / contain; }
.octicon-external-link { margin-left: 4px; }
.octicon-external-link > use { display: none; }
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
.refresh-button { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 3px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); color: var(--fg); font: inherit; font-size: .75rem; font-weight: 500; text-decoration: none; cursor: pointer; transition: background-color 120ms ease; }
.refresh-button:hover { background: var(--neutral-muted); }
.refresh-button .octicon { width: 14px; height: 14px; }
.repository-link { width: 28px; height: 28px; display: grid; flex: 0 0 28px; place-items: center; border-radius: 6px; color: var(--muted); text-decoration: none; transition: background-color 120ms ease, color 120ms ease; }
.repository-link:hover { background: var(--neutral-muted); color: var(--fg); }
.repository-link .octicon { width: 18px; height: 18px; }
main.dashboard-prototype { width: 100%; flex: 1; padding: 0 24px 40px; }
.lede { color: var(--muted); }
.overview-header { min-height: 88px; display: flex; align-items: flex-start; justify-content: space-between; gap: 32px; padding: 18px 0 14px; }
.overview-header h1 { margin: 0; font-size: 1.5rem; line-height: 1.25; }
.overview-header .lede { margin: 3px 0 0; font-size: .875rem; }
.title-area { display: flex; align-items: center; gap: 8px; }
.toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.filter-control { min-width: 240px; min-height: 30px; display: flex; flex: 1; align-items: stretch; position: relative; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); font-size: .75rem; }
.scope-label, .scope-period, .export-control, .search-control { display: inline-flex; align-items: center; gap: 7px; padding: 4px 12px; }
.scope-label { border-right: 1px solid var(--border); }
.count-badge { min-width: 20px; padding: 0 6px; border-radius: 2em; background: var(--neutral-muted); font-size: .6875rem; text-align: center; }
.filter-control code { min-width: 0; flex: 1; padding: 5px 12px; overflow: hidden; background: transparent; color: var(--accent); text-overflow: ellipsis; white-space: nowrap; }
.search-control { padding-inline: 9px; border-left: 1px solid var(--border); color: var(--muted); }
.scope-period, .export-control { min-height: 30px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); color: var(--fg); font-size: .75rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
.export-control:hover { background: var(--neutral-muted); text-decoration: none; }
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
.pie-chart-total-value { fill: var(--fg); font-size: 5px; font-weight: 700; }
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
.chart-series-6 { stroke: var(--purple); }
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
.chart-widget .chart-series-6 { stroke: var(--purple); }
.bar-chart-bar.chart-series-1 { fill: var(--success); }
.bar-chart-bar.chart-series-2 { fill: var(--attention); }
.bar-chart-bar.chart-series-3 { fill: var(--danger); }
.bar-chart-bar.chart-series-4 { fill: var(--accent); }
.bar-chart-bar.chart-series-5 { fill: var(--muted); }
.bar-chart-bar.chart-series-6 { fill: var(--purple); }
.chart-legend i.chart-series-1 { border-color: var(--success); color: var(--success); }
.chart-legend i.chart-series-2 { border-color: var(--attention); color: var(--attention); }
.chart-legend i.chart-series-3 { border-color: var(--danger); color: var(--danger); }
.chart-legend i.chart-series-4 { border-color: var(--accent); color: var(--accent); }
.chart-legend i.chart-series-5 { border-color: var(--muted); color: var(--muted); }
.chart-legend i.chart-series-6 { border-color: var(--purple); color: var(--purple); }
.view-description { margin: 3px 0 0; color: var(--muted); }
.chart-view-pie { display: grid; grid-template-columns: minmax(190px, .65fr) minmax(0, 1.35fr); align-items: center; gap: 4px 24px; padding: 20px 24px; border: 1px solid var(--border); border-radius: 6px; }
.chart-view-pie > h3, .chart-view-pie > h4 { align-self: end; margin: 0; font-size: 1.25rem; }
.chart-view-pie > .view-description { align-self: start; }
.chart-view-pie > .view-source, .chart-view-pie > .view-metadata, .chart-view-pie > .view-context { grid-column: 1; margin: 0; font-size: .6875rem; }
.pie-chart-layout { min-width: 0; display: grid; grid-column: 2; grid-row: 1 / span 6; grid-template-columns: 180px minmax(0, 1fr); align-items: center; gap: 20px; }
.pie-chart-layout .chart-widget { min-height: 180px; margin: 0; border: 0; background: transparent; }
.pie-chart-layout .chart-widget svg { width: 180px; height: 180px; max-height: none; }
.pie-chart-layout .chart-legend-pie { display: block; margin: 0; }
.pie-chart-layout .chart-legend-pie li { min-height: 30px; display: grid; grid-template-columns: 10px minmax(0, 1fr) auto 54px; gap: 9px; border-bottom: 1px solid var(--border-muted); }
.pie-chart-layout .chart-legend-pie li:last-child { border-bottom: 0; }
.pie-chart-layout .chart-legend-pie i { width: 9px; height: 9px; border-radius: 2px; }
.pie-chart-layout .chart-legend-pie strong, .pie-chart-layout .chart-legend-pie small { font-variant-numeric: tabular-nums; text-align: right; }
.chart-view-pie > .table-region { grid-column: 1 / -1; margin-top: 12px; }
.chart-view-pie .pie-chart-widget .chart-series-1 { stroke: var(--accent); }
.chart-view-pie .pie-chart-widget .chart-series-2 { stroke: var(--success); }
.chart-view-pie .pie-chart-widget .chart-series-3 { stroke: var(--attention); }
.chart-view-pie .pie-chart-widget .chart-series-4 { stroke: var(--danger); }
.chart-view-pie .pie-chart-widget .chart-series-5 { stroke: var(--purple); }
.chart-view-pie .pie-chart-widget .chart-series-6 { stroke: var(--muted); }
.chart-view-pie .chart-legend i.chart-series-1 { background: var(--accent); }
.chart-view-pie .chart-legend i.chart-series-2 { background: var(--success); }
.chart-view-pie .chart-legend i.chart-series-3 { background: var(--attention); }
.chart-view-pie .chart-legend i.chart-series-4 { background: var(--danger); }
.chart-view-pie .chart-legend i.chart-series-5 { background: var(--purple); }
.chart-view-pie .chart-legend i.chart-series-6 { background: var(--muted); }
.metric-link a, .custom-table a { display: inline-flex; align-items: center; gap: 4px; border-radius: 4px; transition: background-color 120ms ease, color 120ms ease; }
.metric-link a:hover, .custom-table a:hover { background: var(--neutral-muted); }
.metric-link .octicon, .custom-table a .octicon { width: 12px; height: 12px; }
h3 { margin: 16px 0 8px; font-size: 1rem; font-weight: 600; }
.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 0 0 20px; overflow: visible; }
.metrics div, .data-state-summary > div { min-width: 0; min-height: 90px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.data-state-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 0 0 20px; }
.data-state-summary[hidden] { display: none; }
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
.repository-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--border); }
.repository-tabs a { display: inline-flex; align-items: center; gap: 8px; position: relative; padding: 10px 14px 12px; color: var(--fg); font-weight: 600; text-decoration: none; }
.repository-tabs a > .octicon { color: var(--muted); }
.repository-tabs a:hover { background: var(--canvas-subtle); }
.repository-tabs a[aria-current="page"]::after { content: ""; height: 2px; position: absolute; right: 8px; bottom: -1px; left: 8px; background: var(--danger); }
.repository-workflow-summary { margin-bottom: 28px; }
.repository-metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin: 0; }
.repository-metrics > div { min-width: 0; min-height: 168px; padding: 20px 24px; border: 1px solid var(--border); border-radius: 6px; }
.repository-metrics dt { font-size: 1rem; font-weight: 600; }
.repository-metrics dd { margin: 8px 0 0; font-size: 1.75rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.repository-metrics p { margin: 4px 0 0; color: var(--muted); }
.repository-workflow-status { grid-column: span 2; }
.repository-workflow-status dd { display: flex; align-items: center; gap: 14px; }
.repository-status-pie { width: 76px; height: 76px; flex: 0 0 76px; border-radius: 50%; }
.repository-status-total { display: flex; flex-direction: column; line-height: 1.15; text-transform: uppercase; }
.repository-status-total strong { font-size: 1.75rem; }
.repository-status-total small { color: var(--muted); font-size: .6875rem; font-weight: 600; letter-spacing: .04em; }
.repository-workflow-status ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 18px; margin: 10px 0 0; padding: 0; list-style: none; color: var(--muted); }
.repository-workflow-status li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; align-items: center; gap: 7px; }
.repository-workflow-status li i { width: 9px; height: 9px; border-radius: 50%; }
.repository-workflow-status li strong { color: var(--fg); font-variant-numeric: tabular-nums; }
.repository-section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 12px; }
.repository-section-heading h3, .repository-section-heading h4 { margin: 0 0 3px; font-size: 1.25rem; }
.repository-section-heading p { margin: 0; color: var(--muted); }
.repository-section-heading > a { display: inline-flex; align-items: center; gap: 5px; flex: none; }
.repository-workflow-table tbody th > a, .repository-workflow-table tbody th code { display: block; width: fit-content; }
.repository-workflow-source { margin-top: 3px; color: var(--muted); text-decoration: none; }
.repository-workflow-badges { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
.repository-workflow-badges .workflow-badge { text-decoration: none; }
.workflow-badge-operation, .workflow-badge-orchestrator { border-color: var(--accent); color: var(--accent); }
.repository-workflow-table td { white-space: nowrap; }
.workflow-identity { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
.workflow-identity p { margin: 7px 0 0; }
.workflow-identity > a { display: inline-flex; align-items: center; gap: 5px; flex: none; }
.workflow-badges { display: flex; flex-wrap: wrap; gap: 5px; }
.workflow-badge-package { border-color: var(--accent); background: var(--accent-muted); color: var(--accent); text-decoration: none; }
.workflow-reports { overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.workflow-reports-search { min-height: 56px; display: flex; align-items: center; gap: 8px; margin: 12px 20px; padding: 6px 14px; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); }
.workflow-reports-search:focus-within { outline: 2px solid var(--focus); outline-offset: -2px; }
.workflow-reports-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--fg); font: inherit; }
.workflow-reports-search input::placeholder { color: var(--muted); opacity: 1; }
.workflow-reports-header { min-height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 10px 22px; border-top: 1px solid var(--border); background: var(--canvas-subtle); }
.workflow-reports-header h2 { margin: 0; font-size: 1.25rem; }
.workflow-reports-header > div { color: var(--muted); }
.workflow-reports-header > div span { margin-left: 20px; }
.workflow-filter-announcement { width: 1px; height: 1px; position: absolute; overflow: hidden; margin: -1px; padding: 0; border: 0; clip: rect(0 0 0 0); white-space: nowrap; }
.workflow-report-table-region { overflow-x: auto; border-top: 1px solid var(--border); }
.workflow-report-table { min-width: 760px; }
.workflow-report-table thead th { background: var(--canvas); }
.workflow-report-table :is(th, td) { padding: 10px 14px; }
.workflow-report-table th:first-child { width: 100%; }
.workflow-report-table tbody th { min-width: 280px; font-weight: 400; }
.workflow-report-table tbody td { white-space: nowrap; }
.workflow-report-primary { min-width: 0; display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: center; gap: 12px; }
.workflow-report-icon { width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); }
.workflow-report-icon .octicon { width: 18px; height: 18px; }
.workflow-report-copy { min-width: 0; display: grid; }
.workflow-report-title { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.workflow-report-title a { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workflow-report-summary { margin-top: 3px; overflow: hidden; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; }
.workflow-report-table time, .workflow-report-time { color: var(--muted); }
.workflow-runtime-content { max-width: 100%; }
.workflow-runtime-summary { max-width: 920px; }
.workflow-runtime-metrics { display: grid; grid-template-columns: minmax(360px, 1.7fr) repeat(2, minmax(180px, 1fr)); gap: 14px; margin: 0; }
.workflow-runtime-metrics > div { min-width: 0; min-height: 184px; padding: 20px 22px; border: 1px solid var(--border); border-radius: 6px; }
.workflow-runtime-metrics dt { font-size: 1rem; font-weight: 600; }
.workflow-runtime-metrics dd { margin: 8px 0 0; font-size: 1.75rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.workflow-runtime-metrics p { margin: 5px 0 0; color: var(--muted); }
.workflow-run-health > dd { display: flex; align-items: center; gap: 14px; }
.workflow-health-chart > .chart-widget { width: 84px; min-height: 84px; margin: 0; border: 0; background: transparent; }
.workflow-health-chart > .chart-widget svg { width: 84px; height: 84px; }
.workflow-health-chart .pie-chart-total-value, .workflow-health-chart .pie-chart-total-label { opacity: 0; }
.workflow-health-chart .chart-widget .chart-series-1 { stroke: var(--success); }
.workflow-health-chart .chart-widget .chart-series-2 { stroke: var(--danger); }
.workflow-health-chart .chart-widget .chart-series-3 { stroke: var(--attention); }
.workflow-health-chart .chart-widget .chart-series-4 { stroke: var(--accent); }
.workflow-health-chart .chart-widget .chart-series-5 { stroke: var(--muted); }
.workflow-health-total { display: flex; flex-direction: column; line-height: 1.1; text-transform: uppercase; }
.workflow-health-total strong { font-size: 1.75rem; }
.workflow-health-total small { color: var(--muted); font-size: .6875rem; letter-spacing: .04em; }
.workflow-run-health > .chart-legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px 16px; margin: 10px 0 0; }
.workflow-run-health > .chart-legend li { display: grid; grid-template-columns: 9px minmax(0, 1fr) auto auto; }
.workflow-run-health > .chart-legend i { width: 9px; height: 9px; border: 0; border-radius: 50%; }
.workflow-run-health > .chart-legend li:nth-child(1) i { background: var(--success); }
.workflow-run-health > .chart-legend li:nth-child(2) i { background: var(--danger); }
.workflow-run-health > .chart-legend li:nth-child(3) i { background: var(--attention); }
.workflow-run-health > .chart-legend li:nth-child(4) i { background: var(--accent); }
.workflow-run-health > .chart-legend li:nth-child(5) i { background: var(--muted); }
.workflow-run-health > .chart-legend small { display: none; }
.value-report { overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.value-report > header { min-height: 76px; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 16px; border-bottom: 1px solid var(--border); }
.value-report > header h2 { margin: 0; font-size: 1.125rem; }
.value-report > header p { max-width: 760px; margin: 3px 0 0; color: var(--muted); font-size: .75rem; }
.value-score { flex: none; text-align: right; }
.value-score strong, .value-score span { display: block; }
.value-score strong { font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.value-score span { color: var(--muted); font-size: .6875rem; }
.value-chart { min-height: 180px; padding: 18px 16px 24px; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); }
.value-chart > .chart-widget { min-height: 240px; margin-top: 0; background: var(--canvas); }
.value-chart > dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; margin: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--border); }
.value-chart > dl > div { min-width: 0; padding: 18px; background: var(--canvas); }
.value-chart dt { color: var(--muted); font-size: .75rem; font-weight: 600; text-transform: uppercase; }
.value-chart dd { margin: 4px 0 0; overflow: hidden; font-size: 1.375rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.value-chart dd code { font-size: .875rem; }
.value-details-disclosure > summary, .value-details-unavailable { min-height: 44px; display: flex; align-items: center; padding: 10px 16px; color: var(--fg); font-size: .75rem; font-weight: 600; }
.value-details-disclosure > summary { cursor: pointer; }
.value-details-disclosure > summary:hover { background: var(--canvas-subtle); }
.value-details-disclosure[open] > summary { border-bottom: 1px solid var(--border); }
.value-details-unavailable { color: var(--muted); }
.value-details { padding: 16px; }
.value-details h3 { margin: 0 0 4px; }
.value-details h3 + p { margin: 0 0 12px; color: var(--muted); font-size: .75rem; }
.value-details .table-region { margin-bottom: 0; }
.value-report-empty > header { align-items: center; }
.value-empty { min-height: 360px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 36px 24px; border-bottom: 1px solid var(--border); text-align: center; }
.value-empty > .octicon { width: 30px; height: 30px; color: var(--muted); }
.value-empty h3 { margin: 16px 0 5px; font-size: 1.125rem; }
.value-empty p { max-width: 620px; margin: 0; color: var(--muted); }
.repositories-page .custom-view-grid { display: block; }
.context-summary { display: grid; grid-template-columns: minmax(0, 2.5fr) minmax(220px, 1.3fr) minmax(180px, 1fr); margin: 0 0 24px; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.context-summary > div { min-width: 0; padding: 10px 14px; border-left: 1px solid var(--border); }
.context-summary > div:first-child { border-left: 0; }
.context-summary dt { overflow: hidden; color: var(--muted); font-size: .75rem; font-weight: 600; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.context-summary dd { margin: 2px 0 0; overflow: hidden; font-size: .8125rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.repository-health { margin-bottom: 24px; }
.repository-health .section-heading { align-items: end; }
.repository-health .section-heading > span { flex: none; color: var(--muted); font-size: .75rem; }
.repository-health-table { min-width: 850px; }
.repository-health-table th:first-child { font-weight: 600; }
.repository-health-table td { white-space: nowrap; }
.failure-rate { display: flex; flex-direction: column; }
.failure-rate span { color: var(--muted); font-size: .6875rem; }
.overview-content { display: grid; gap: 24px; }
.scope-kicker { color: var(--muted); font-size: .75rem; font-weight: 600; text-transform: uppercase; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 12px; }
.section-heading h2 { margin: 0 0 3px; font-size: 1.25rem; }
.section-heading p { margin: 0; color: var(--muted); }
.overview-observability { margin-bottom: 24px; }
.overview-observability > .section-heading { align-items: end; }
.attention-domain-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--border); gap: 1px; }
.attention-domain-card { min-width: 0; min-height: 184px; display: grid; grid-template-rows: auto auto 1fr auto; gap: 12px; padding: 16px; border-top: 3px solid var(--muted); background: var(--canvas); color: var(--fg); text-decoration: none; }
.attention-domain-card:hover { background: var(--canvas-subtle); text-decoration: none; }
.attention-domain-card:focus-visible { z-index: 1; outline: 2px solid var(--focus); outline-offset: -2px; }
.attention-domain-card > header { min-width: 0; display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: 8px; }
.attention-domain-icon { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 4px; background: var(--neutral-muted); color: var(--muted); }
.attention-domain-icon .octicon { width: 14px; height: 14px; }
.attention-domain-card > header > strong { overflow: hidden; font-size: .8125rem; text-overflow: ellipsis; white-space: nowrap; }
.attention-domain-state { padding: 2px 6px; border: 1px solid currentColor; border-radius: 999px; color: var(--muted); font-size: .625rem; font-weight: 600; white-space: nowrap; }
.attention-domain-value { font-size: 1.375rem; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.2; }
.attention-domain-card > p { margin: 0; color: var(--muted); font-size: .75rem; line-height: 1.45; }
.attention-domain-card > footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 0 0; border-top: 1px solid var(--border); color: var(--accent); font-size: .6875rem; font-weight: 600; }
.attention-domain-critical { border-top-color: var(--danger); }
.attention-domain-critical .attention-domain-icon, .attention-domain-critical .attention-domain-state { color: var(--danger); }
.attention-domain-investigate { border-top-color: var(--attention); }
.attention-domain-investigate .attention-domain-icon, .attention-domain-investigate .attention-domain-state { color: var(--attention); }
.attention-domain-monitor { border-top-color: var(--success); }
.attention-domain-monitor .attention-domain-icon, .attention-domain-monitor .attention-domain-state { color: var(--success); }
.attention-domain-unavailable { border-top-color: var(--muted); }
.overview-method-note { margin: 10px 0 0; color: var(--muted); font-size: .6875rem; }
.overview-method-note strong { color: var(--fg); }
.section-heading h3 { margin: 1px 0 3px; font-size: 1.25rem; }
.workflow-attention { margin-bottom: 32px; }
.workflow-attention > .section-heading, .episode-observatory > .section-heading { align-items: end; }
.workflow-attention > .section-heading > strong, .episode-observatory > .section-heading > strong { flex: none; font-variant-numeric: tabular-nums; }
.anomaly-readiness { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 6px 6px 0 0; background: var(--canvas-subtle); }
.anomaly-readiness > span { display: inline-flex; flex: none; align-items: center; gap: 7px; font-size: .75rem; }
.anomaly-readiness .octicon { color: var(--muted); }
.anomaly-readiness p { margin: 0; color: var(--muted); font-size: .75rem; text-align: right; }
.workflow-attention-list { margin: 0; padding: 0; border: 1px solid var(--border); border-top: 0; border-radius: 0 0 6px 6px; list-style: none; }
.workflow-attention-list li { min-width: 0; border-top: 1px solid var(--border-muted); }
.workflow-attention-list li:first-child { border-top: 0; }
.workflow-attention-list a, .workflow-attention-static { min-height: 68px; display: grid; grid-template-columns: 24px 20px minmax(0, 1fr) minmax(150px, auto); align-items: center; gap: 10px; padding: 9px 14px; color: var(--fg); text-decoration: none; }
.workflow-attention-list a:hover { background: var(--canvas-subtle); }
.workflow-attention-note { margin: 7px 0 0; color: var(--muted); font-size: .6875rem; }
.episode-observatory { margin-bottom: 32px; }
.episode-vitals { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; border: 1px solid var(--border); border-radius: 6px 6px 0 0; background: var(--canvas-subtle); }
.episode-vitals > div { min-width: 0; padding: 14px 16px; border-right: 1px solid var(--border); }
.episode-vitals > div:last-child { border-right: 0; }
.episode-vitals dt, .episode-measures dt { color: var(--muted); font-size: .6875rem; font-weight: 600; text-transform: uppercase; }
.episode-vitals dd { margin: 2px 0; font-size: 1.25rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.episode-vitals p { margin: 0; color: var(--muted); font-size: .6875rem; }
.episode-method-note { margin: 0 0 12px; padding: 9px 16px; border: 1px solid var(--border); border-top: 0; border-radius: 0 0 6px 6px; color: var(--muted); font-size: .75rem; }
.episode-list { display: grid; gap: 10px; }
.episode-record { overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.episode-record > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 13px 15px; border-bottom: 1px solid var(--border-muted); }
.episode-record > header > div { min-width: 0; }
.episode-record h3 { margin: 1px 0 2px; font-size: .9375rem; }
.episode-record h3 a { display: inline-flex; align-items: center; gap: 5px; }
.episode-record header p { margin: 0; color: var(--muted); font-size: .75rem; }
.episode-measures { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 0; border-bottom: 1px solid var(--border-muted); }
.episode-measures > div { min-width: 0; padding: 10px 15px; border-right: 1px solid var(--border-muted); }
.episode-measures > div:last-child { border-right: 0; }
.episode-measures dd { margin: 2px 0 0; font-size: .875rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.episode-waterfall { padding: 11px 15px 9px; border-bottom: 1px solid var(--border-muted); background: var(--canvas-subtle); }
.episode-waterfall > header, .episode-waterfall > footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.episode-waterfall > header { margin-bottom: 7px; font-size: .75rem; }
.episode-waterfall > header span, .episode-waterfall > footer { color: var(--muted); font-size: .625rem; }
.episode-waterfall ol { display: grid; gap: 5px; margin: 0; padding: 0; list-style: none; }
.episode-waterfall li { min-width: 0; display: grid; grid-template-columns: minmax(110px, .65fr) minmax(180px, 1.35fr) minmax(76px, auto); align-items: center; gap: 10px; }
.episode-lane-label, .episode-lane-result { min-width: 0; display: grid; }
.episode-lane-label strong { color: var(--muted); font-size: .625rem; font-weight: 600; text-transform: uppercase; }
.episode-lane-label small { overflow: hidden; font-size: .6875rem; text-overflow: ellipsis; white-space: nowrap; }
.episode-lane-track { height: 12px; position: relative; overflow: hidden; border: 1px solid var(--border-muted); border-radius: 2px; background: var(--canvas); }
.episode-lane-track i { width: max(var(--lane-size), 4px); max-width: calc(100% - var(--lane-start)); height: 100%; position: absolute; left: var(--lane-start); background: var(--muted); }
.episode-lane-track i.status-success { background: var(--success); }
.episode-lane-track i.status-danger { background: var(--danger); }
.episode-lane-track i.status-attention { background: var(--attention); }
.episode-lane-result { justify-items: end; font-variant-numeric: tabular-nums; }
.episode-lane-result strong { font-size: .6875rem; }
.episode-lane-result small { color: var(--muted); font-size: .625rem; }
.episode-waterfall > footer { display: grid; grid-template-columns: 1fr 1fr 1fr; margin: 6px 86px 0 120px; }
.episode-waterfall > footer span:nth-child(2) { text-align: center; }
.episode-waterfall > footer span:last-child { text-align: right; }
.episode-waterfall-unavailable { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: .75rem; }
.episode-execution { padding: 11px 15px; }
.episode-execution > strong { font-size: .75rem; }
.episode-execution ul { margin: 7px 0 0; padding: 0; list-style: none; }
.episode-execution li { padding: 5px 0; border-top: 1px solid var(--border-muted); font-size: .75rem; }
.episode-execution .episode-empty { color: var(--muted); }
.episode-record > footer { display: flex; justify-content: space-between; gap: 12px; padding: 8px 15px; border-top: 1px solid var(--border-muted); background: var(--canvas-subtle); color: var(--muted); font-size: .6875rem; }
.episode-attribution-gap { margin-top: 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.episode-attribution-gap summary { padding: 10px 13px; font-size: .75rem; font-weight: 600; cursor: pointer; }
.episode-attribution-gap > p { margin: 0; padding: 0 13px 10px; color: var(--muted); font-size: .75rem; }
.episode-attribution-gap ul { margin: 0; padding: 0 13px 10px; list-style: none; }
.episode-attribution-gap li { display: flex; justify-content: space-between; gap: 14px; padding: 6px 0; border-top: 1px solid var(--border-muted); font-size: .75rem; }
.episode-attribution-gap li a { display: inline-flex; align-items: center; gap: 4px; }
.episode-attribution-gap li span { color: var(--muted); text-align: right; }
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
.package-summary-heading { margin-bottom: 10px; }
.package-summary-heading h3 { margin: 0 0 2px; font-size: 1.25rem; }
.package-summary-heading p { margin: 0; color: var(--muted); }
.package-summary .table-region { margin-bottom: 0; }
.package-summary-table { min-width: 920px; }
.package-summary-table tbody th { font-weight: 600; white-space: nowrap; }
.package-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
.package-tabs a { display: inline-flex; align-items: center; gap: 8px; position: relative; padding: 10px 14px 12px; color: var(--fg); font-weight: 600; text-decoration: none; }
.package-tabs a > .octicon { color: var(--muted); }
.package-tabs a:hover { background: var(--canvas-subtle); }
.package-tabs a[aria-current="page"]::after { content: ""; height: 2px; position: absolute; right: 8px; bottom: -1px; left: 8px; background: var(--danger); }
.operation-workflow-map { margin-bottom: 20px; }
.operation-workflow-map .section-heading { margin-bottom: 10px; }
.operation-orchestrator, .operation-workflow-map li { min-width: 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); background: var(--canvas-subtle); }
.operation-orchestrator { border-radius: 6px 6px 0 0; }
.operation-workflow-map ul { margin: 0 0 0 28px; padding: 0; list-style: none; }
.operation-workflow-map li { border-top: 0; }
.operation-workflow-map li:last-child { border-radius: 0 0 6px 6px; }
.operation-workflow-map :is(a, .operation-workflow-identity) { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, .8fr); gap: 12px; align-items: center; text-decoration: none; }
.operation-workflow-map a:hover strong { text-decoration: underline; }
.operation-workflow-map code { overflow: hidden; color: var(--muted); font-size: .75rem; text-overflow: ellipsis; white-space: nowrap; }
.workflow-badge-orchestrator { border-color: var(--accent); color: var(--accent); }
.workflow-badge-worker { border-color: var(--success); color: var(--success); }
.package-report-mode-tabs { width: max-content; display: inline-flex; margin: 14px 0 0; padding: 2px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas-subtle); }
.package-report-mode-tabs button { min-width: 72px; min-height: 30px; display: grid; place-items: center; padding: 5px 12px; border: 0; border-radius: 4px; background: transparent; color: var(--muted); font: inherit; font-size: .75rem; font-weight: 600; cursor: pointer; }
.package-report-mode-tabs button:hover { color: var(--fg); }
.package-report-mode-tabs button[aria-selected="true"] { background: var(--canvas); box-shadow: 0 0 0 1px var(--border), 0 1px 2px color-mix(in srgb, var(--fg) 10%, transparent); color: var(--fg); }
.package-report-mode-note { margin: 12px 0 14px; color: var(--muted); }
.package-report-list { overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); }
.package-report-search { min-height: 34px; display: flex; align-items: center; gap: 8px; margin: 12px; padding: 0 10px; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); }
.package-report-search input { width: 100%; min-height: 32px; padding: 0; border: 0; outline: 0; background: transparent; color: var(--fg); font: inherit; font-size: .75rem; }
.package-report-search:focus-within { outline: 2px solid var(--focus); outline-offset: -1px; }
.package-report-header { min-height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-top: 1px solid var(--border); background: var(--canvas-subtle); }
.package-report-header h2 { margin: 0; font-size: 1rem; }
.package-report-header > div { color: var(--muted); font-size: .75rem; }
.package-report-header > div span { margin-left: 14px; }
.package-report-columns { display: grid; grid-template-columns: minmax(198px, 1fr) 82px 112px 150px; gap: 12px; padding: 7px 14px 7px 64px; border-top: 1px solid var(--border); color: var(--muted); font-size: .6875rem; font-weight: 600; }
.package-report-row { min-height: 58px; display: grid; grid-template-columns: 38px minmax(198px, 1fr) 82px 112px 150px; align-items: center; gap: 12px; padding: 8px 14px; border-top: 1px solid var(--border-muted); }
.package-report-list-with-mode .package-report-columns { grid-template-columns: minmax(150px, 1fr) 82px 68px 112px 150px; }
.package-report-list-with-mode .package-report-row { grid-template-columns: 38px minmax(150px, 1fr) 82px 68px 112px 150px; }
.package-report-row:hover { background: var(--canvas-subtle); }
.package-report-icon { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); }
.package-report-copy { min-width: 0; }
.package-report-copy h3 { margin: 0; overflow: hidden; font-size: .875rem; }
.package-report-copy h3 :is(a, span) { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.package-report-copy p { margin: 3px 0 0; overflow: hidden; color: var(--muted); font-size: .75rem; text-overflow: ellipsis; white-space: nowrap; }
.package-report-row > :is(.status, .mode-badge, .kind) { justify-self: start; }
.package-report-row time { overflow: hidden; color: var(--muted); font-size: .75rem; text-overflow: ellipsis; white-space: nowrap; }
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
:is(.security-page, .value-page) .layout-section { padding: 0; border: 0; background: transparent; }
:is(.security-page, .value-page) .layout-section-header { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
:is(.security-page, .value-page) .layout-section-header h3 { margin: 2px 0 0; font-size: 1.25rem; }
:is(.security-page, .value-page) .layout-section-header > strong { flex: none; color: var(--muted); font-size: .75rem; }
:is(.security-page, .value-page) .layout-section .page-section > h4,
:is(.security-page, .value-page) .layout-section .view-source,
:is(.security-page, .value-page) .layout-section .view-metadata { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
:is(.security-page, .value-page) .layout-section .table-region { margin-top: 0; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; margin: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 6px 6px 0 0; background: var(--border); }
.summary-grid > div { min-width: 0; padding: 13px 15px; background: var(--canvas-subtle); }
.summary-grid dt { color: var(--muted); font-size: .6875rem; font-weight: 600; text-transform: uppercase; }
.summary-grid dd { margin: 2px 0 0; font-size: 1.25rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.signal-list-region { position: relative; }
.signal-count { position: absolute; right: 0; bottom: calc(100% + 34px); margin: 0; color: var(--muted); font-size: .75rem; font-weight: 600; }
.signal-boundary-note { margin: 0; padding: 8px 15px; border: 1px solid var(--border); border-top: 0; color: var(--muted); font-size: .6875rem; }
.signal-list { margin: 0; padding: 0; overflow: hidden; border: 1px solid var(--border); border-top: 0; border-radius: 0 0 6px 6px; list-style: none; }
.signal-list > li + li { border-top: 1px solid var(--border-muted); }
.signal-item > :is(a, div) { min-height: 68px; display: grid; grid-template-columns: 24px 20px minmax(0, 1fr) minmax(150px, auto); align-items: center; gap: 10px; padding: 9px 14px; color: var(--fg); text-decoration: none; }
.signal-item > a:hover { background: var(--canvas-subtle); }
.signal-item > a:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
.signal-rank { color: var(--muted); font-size: .6875rem; font-variant-numeric: tabular-nums; text-align: center; }
.signal-icon { width: 20px; display: grid; place-items: center; color: var(--attention); }
.signal-critical .signal-icon { color: var(--danger); }
.signal-informational .signal-icon { color: var(--accent); }
.signal-copy { min-width: 0; display: grid; }
.signal-copy > span { color: var(--muted); font-size: .625rem; font-weight: 600; text-transform: uppercase; }
.signal-copy > strong, .signal-copy > small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.signal-copy > strong { font-size: .8125rem; }
.signal-copy > small { color: var(--muted); font-size: .75rem; }
.signal-evidence { min-width: 0; display: grid; justify-items: end; text-align: right; }
.signal-evidence strong { font-size: .75rem; }
.signal-evidence small { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); font-size: .6875rem; }
.signal-evidence .octicon { width: 12px; height: 12px; }
.signal-clear { min-height: 68px; display: grid; grid-template-columns: 20px minmax(0, 1fr); align-items: center; gap: 10px; padding: 9px 14px; }
.signal-clear .signal-icon { color: var(--success); }
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
.table-region-static .table-scroll { max-height: none; }
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
.table-summary-categories strong, .table-summary-boolean strong, .table-summary-count strong { color: var(--fg); font-weight: 600; }
.table-summary-count { font-weight: 400; }
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
.outcome-view { display: grid; grid-template-columns: minmax(0, 1fr) 250px; align-items: start; gap: 24px; }
.discussion-post { min-width: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; }
.discussion-post > header { min-height: 56px; display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--canvas-subtle); }
.discussion-post > header p { margin: 1px 0 0; color: var(--muted); font-size: .75rem; }
.post-avatar { width: 32px; height: 32px; display: grid; flex: 0 0 32px; place-items: center; border-radius: 50%; background: var(--fg); color: var(--canvas); }
.markdown-body { padding: 24px 28px 32px; overflow-wrap: anywhere; font-size: .9375rem; }
.markdown-body > :first-child { margin-top: 0; }
.markdown-body > :last-child { margin-bottom: 0; }
.markdown-body h1, .markdown-body h2 { margin: 24px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border-muted); line-height: 1.25; }
.markdown-body h1 { font-size: 1.5rem; }
.markdown-body h2 { font-size: 1.25rem; }
.markdown-body h3 { margin: 20px 0 10px; font-size: 1.0625rem; }
.markdown-body p, .markdown-body ul, .markdown-body ol, .markdown-body blockquote, .markdown-body pre, .markdown-body table { margin-block: 0 16px; }
.markdown-body li + li { margin-top: 4px; }
.markdown-body blockquote { margin-inline: 0; padding: 0 16px; border-left: 4px solid var(--border); color: var(--muted); }
.markdown-body pre { max-width: 100%; overflow: auto; padding: 14px 16px; border-radius: 6px; background: var(--canvas-inset); }
.markdown-body pre code { padding: 0; background: transparent; }
.markdown-body img { max-width: 100%; height: auto; }
.markdown-body table { display: block; max-width: 100%; overflow-x: auto; border-spacing: 0; }
.markdown-body table th, .markdown-body table td { padding: 6px 12px; border: 1px solid var(--border); }
.markdown-body .task-list-item { list-style: none; }
.markdown-body input[type="checkbox"] { margin-right: 6px; }
.outcome-meta section { padding: 14px 0; border-bottom: 1px solid var(--border); }
.outcome-meta section:first-child { padding-top: 0; }
.outcome-meta h2 { margin: 0 0 8px; color: var(--muted); font-size: .75rem; }
.outcome-meta p { margin: 0; overflow-wrap: anywhere; }
.outcome-meta a { display: inline-flex; align-items: center; gap: 5px; }
.mode-indicator { min-height: 22px; display: inline-flex; flex: none; align-items: center; gap: 5px; padding: 1px 7px; border: 1px solid var(--border); border-radius: 2em; font-size: .6875rem; font-weight: 600; text-transform: none; white-space: nowrap; }
.mode-indicator .octicon { width: 13px; height: 13px; flex-basis: 13px; }
.workflow-topology-overview { container: workflow-topology / inline-size; margin-bottom: 24px; }
.workflow-topology-overview > .section-heading { align-items: end; }
.workflow-topology-summary { display: flex; flex: none; margin: 0; }
.workflow-topology-summary > div { min-width: 94px; padding: 0 12px; border-left: 1px solid var(--border); }
.workflow-topology-summary dt { color: var(--muted); font-size: .6875rem; font-weight: 600; text-transform: uppercase; }
.workflow-topology-summary dd { margin: 1px 0 0; font-size: 1.125rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.workflow-topology { margin-top: 0; }
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
@container workflow-topology (max-width: 560px) {
  .workflow-topology-overview > .section-heading { align-items: flex-start; flex-direction: column; }
  .workflow-topology-summary { width: 100%; }
  .workflow-topology-summary > div { min-width: 0; flex: 1; padding-inline: 8px; }
  .workflow-topology-summary > div:first-child { padding-left: 0; border-left: 0; }
}
@media (min-width: 701px) and (max-width: 900px) {
  .repository-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 700px) {
  .app-shell { display: block; }
  .org-sidebar { display: block; padding: 14px 12px 10px; border-right: 0; border-bottom: 1px solid var(--border); }
  .sidebar-brand { margin-bottom: 8px; font-size: 1rem; }
  .primary-nav { width: 100%; flex-direction: row; overflow-x: auto; }
  .nav-section-label { display: none; }
  .primary-nav a { min-height: 44px; flex: none; }
  .overview-header { min-height: 0; padding: 24px 0 20px; flex-direction: column; gap: 12px; }
  .toolbar { align-items: stretch; flex-wrap: wrap; }
  .filter-control { flex-basis: 100%; }
  .scope-period, .export-control { min-height: 44px; }
  .scope-period { flex: 1; justify-content: center; }
  main.dashboard-prototype { padding: 0 14px 28px; }
  .data-state-summary, .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .layout-section[data-section-layout="wide"], .layout-section[data-section-layout="narrow"] { grid-column: span 12; }
  .custom-view[data-view-layout="half"], .custom-view[data-view-layout="third"] { grid-column: span 12; }
  .repository-metrics { grid-template-columns: 1fr; }
  .repository-workflow-status { grid-column: auto; }
  .workflow-runtime-metrics { grid-template-columns: 1fr; }
  .workflow-identity { align-items: flex-start; flex-direction: column; gap: 10px; }
  .value-chart > dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .repository-section-heading { display: block; }
  .repository-section-heading > a { margin-top: 10px; }
  .context-summary { grid-template-columns: 1fr; }
  .context-summary > div { border-top: 1px solid var(--border); border-left: 0; }
  .context-summary > div:first-child { border-top: 0; }
  .repository-health .section-heading { align-items: flex-start; flex-direction: column; }
  .outcome-view { grid-template-columns: 1fr; }
  .outcome-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
  .chart-view-pie { grid-template-columns: 1fr; }
  .pie-chart-layout { grid-column: 1; grid-row: auto; }
  .chart-view-pie > .view-source, .chart-view-pie > .view-metadata, .chart-view-pie > .view-context { grid-column: 1; }
  .control-plane-status > header { min-height: 0; padding: 14px; }
  .control-plane-heading { align-items: flex-start; }
  .control-plane-heading .scope-kicker { display: none; }
  .control-plane-heading p { font-size: .75rem; }
  .control-plane-vitals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .signal-item > :is(a, div) { grid-template-columns: 20px minmax(0, 1fr); }
  .signal-rank { display: none; }
  .signal-copy { grid-column: 2; }
  .signal-copy > strong, .signal-copy > small { overflow: visible; white-space: normal; }
  .signal-evidence { grid-column: 2; justify-items: start; text-align: left; }
  .control-plane-vitals > div { padding: 10px 12px; }
  .control-plane-vitals p { min-height: 0; }
  .execution-health-heading { align-items: flex-start; flex-direction: column; gap: 2px; }
  .execution-legend { display: none; }
  .managed-package-card dl { gap: 8px; }
  .package-utilization-grid { grid-template-columns: 1fr; }
  .operation-workflow-map ul { margin-left: 12px; }
  .operation-workflow-map :is(a, .operation-workflow-identity) { grid-template-columns: 1fr; gap: 2px; }
  .package-report-mode-tabs { width: 100%; overflow: hidden; }
  .package-report-mode-tabs button { min-width: 0; flex: 1 1 0; padding-inline: 10px; }
  .package-report-columns { display: none; }
  .package-report-row, .package-report-list-with-mode .package-report-row { grid-template-columns: 38px minmax(0, 1fr) auto; gap: 10px; }
  .package-report-row > .status { grid-column: 3; grid-row: 1; }
  .package-report-row > :is(.mode-badge, .kind, time) { display: none; }
  .package-trend-panel > header { align-items: flex-start; flex-direction: column; }
  .overview-observability > .section-heading { align-items: flex-start; flex-direction: column; }
  .attention-domain-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .workflow-attention > .section-heading, .episode-observatory > .section-heading, .anomaly-readiness { align-items: flex-start; flex-direction: column; }
  .anomaly-readiness { gap: 4px; }
  .anomaly-readiness p { text-align: left; }
  .workflow-attention-list a, .workflow-attention-static { grid-template-columns: 20px minmax(0, 1fr); }
  .signal-rank, .signal-evidence { display: none; }
  .workflow-identity { align-items: flex-start; flex-direction: column; }
  .episode-vitals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .episode-measures { grid-template-columns: 1fr 1fr; }
  .episode-waterfall li { grid-template-columns: minmax(0, 1fr) minmax(72px, auto); }
  .episode-lane-track { grid-column: 1 / -1; grid-row: 2; }
  .episode-waterfall > footer { margin: 6px 0 0; }
}
@media (max-width: 420px) {
  .data-state-summary, .metrics { grid-template-columns: 1fr; }
  .workflow-run-health > .chart-legend, .value-chart > dl { grid-template-columns: 1fr; }
  .summary-grid { grid-template-columns: 1fr; }
  .pie-chart-layout { grid-template-columns: 1fr; }
  .package-topology-header { grid-template-columns: 28px minmax(0, 1fr); }
  .package-topology-header > :is(.mode-indicator, .status) { grid-column: auto; }
  .standalone-repository-list { grid-template-columns: minmax(0, 1fr); }
  .standalone-repository li { grid-template-columns: 24px minmax(0, 1fr); }
  .standalone-repository li > :is(.mode-indicator, .status) { grid-column: 2; justify-self: start; }
  .attention-domain-grid { grid-template-columns: minmax(0, 1fr); }
  .attention-domain-card { min-height: 164px; }
  .outcome-meta { grid-template-columns: 1fr; }
  .markdown-body { padding: 20px 16px 24px; }
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
