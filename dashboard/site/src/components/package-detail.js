/**
 * Route-aware operation package navigation.
 */

import { h } from '../dom.js';
import { titleCase } from './count-formatters.js';
import { createRouteView } from './route-empty-state.js';
import { renderRouteTabSet } from './route-tab-set.js';
import { renderWorkflowValueReport } from './workflow-runtime.js';
import { rowsFor } from './source-rows.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {'insights'|'workflows'|'dispatches'|'reports'} selectedView
 * @returns {HTMLElement}
 */
export function renderPackageNavigation(context, selectedView) {
  const allWorkflows = rowsFor(context.sources, 'workflows');
  const reports = selectedView === 'reports';
  const dispatches = selectedView === 'dispatches';
  const insights = selectedView === 'insights';
  const root = createRouteView({
    rootClassName: reports ? 'package-reports' : dispatches ? 'package-dispatches' : insights ? 'package-insights' : 'package-detail',
    routeParameter: context.routeParameter,
    datasetKey: 'package',
    selectMessage: reports
      ? 'Select a package to view its reports.'
      : dispatches
        ? 'Select a package to view its dispatches.'
      : insights ? 'Select a package to view its operational value.' : 'Select a package to view its workflows.',
    notFoundMessage: 'Package not found.',
    unavailableMessage: 'Package data is unavailable.',
    isUnavailable: () => context.sources.workflows?.metadata?.availability === 'unavailable',
    hasSelection: (routeValue) => normalizePackageRoute(routeValue).length > 0,
    renderMatched: (routeValue) => {
      const packageId = normalizePackageRoute(routeValue);
      const workflows = allWorkflows
        .filter((workflow) => packageId && String(workflow.package).toLowerCase() === packageId.toLowerCase());
      if (workflows.length === 0) {
        return null;
      }
      const packageName = nameForPackage(packageId, workflows);
      root.dispatchEvent(new CustomEvent('dashboard-route-allocation', {
        bubbles: true,
        detail: {
          title: packageName,
          description: reports
            ? `Durable reports produced by the ${packageName} package.`
            : dispatches
              ? `Workflow dispatch runs for the ${packageName} package.`
            : insights
              ? `Operational value attained by workers in the ${packageName} package.`
              : `Orchestrator and worker workflows in the ${packageName} package.`,
          mode: modeForPackage(workflows),
          navigationPage: 'packages'
        }
      }));
      const tabs = renderPackageTabs(packageId, packageName, selectedView);
      if (!insights) return tabs;
      const workers = workflows.filter((workflow) => workflow['workflow-role'] !== 'orchestrator');
      return h(
        'div',
        { className: 'package-insights-content' },
        tabs,
        ...workers.map((workflow) => renderWorkflowValueReport(context, workflow)),
        workers.length === 0 ? h('p', { className: 'value-details-unavailable' }, 'No worker workflows are configured for this package.') : null
      );
    }
  });
  return root;
}

/**
 * @param {string} packageId
 * @param {string} packageName
 * @param {'workflows'|'dispatches'|'reports'|'insights'} selectedView
 */
function renderPackageTabs(packageId, packageName, selectedView) {
  const packageQuery = `?package=${encodeURIComponent(packageId)}`;
  return renderRouteTabSet({
    className: 'package-tabs',
    ariaLabel: `${packageName} views`,
    currentTab: selectedView,
    tabs: [
      { id: 'insights', label: 'Insights', icon: 'graph', href: `#page-package-insights${packageQuery}` },
      { id: 'workflows', label: 'Workflows', icon: 'workflow', href: `#page-package-detail${packageQuery}` },
      { id: 'dispatches', label: 'Dispatches', icon: 'play', href: `#page-package-dispatches${packageQuery}` },
      { id: 'reports', label: 'Reports', icon: 'issue', href: `#page-package-reports${packageQuery}` }
    ]
  });
}

/**
 @param {unknown} value */
function normalizePackageRoute(value) {
  if (typeof value !== 'string') return '';
  const packageId = value.trim();
  return /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/.test(packageId) ? packageId : '';
}

/** @param {string} packageId @param {Array<Record<string, unknown>>} workflows */
function nameForPackage(packageId, workflows) {
  return String(workflows.find((workflow) => typeof workflow['package-name'] === 'string')?.['package-name'] ?? titleCase(packageId));
}

/** @param {Array<Record<string, unknown>>} workflows */
function modeForPackage(workflows) {
  const targetModes = workflows.flatMap((workflow) => {
    const repository = [workflow.organization, workflow.repository].filter(Boolean).join('/').toLowerCase();
    return (Array.isArray(workflow['package-targets']) ? workflow['package-targets'] : [])
      .filter((target) => String(target?.repository ?? '').toLowerCase() === repository)
      .map((target) => String(target?.mode ?? '').toLowerCase());
  });
  if (targetModes.includes('live')) return 'live';
  if (targetModes.includes('review')) return 'review';
  const orchestrator = workflows.find((workflow) => workflow['workflow-role'] === 'orchestrator');
  const mode = String(orchestrator?.['rollout-mode'] ?? workflows[0]?.['rollout-mode'] ?? '');
  return mode === 'review' || mode === 'live' ? mode : '';
}
