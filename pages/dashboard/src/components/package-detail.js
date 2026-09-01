/**
 * Route-aware operation package workflow hierarchy.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderReportList as renderSharedReportList } from './report-list.js';
import { createModeTabs, renderNavTabs } from './tab-nav.js';
import { findLink } from './link-content.js';
import { renderSectionHeading } from './ui-primitives.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderPackageDetail(context) {
  const allWorkflows = rowsFor(context.sources, 'workflows');
  const root = h('div', {
    className: 'package-detail',
    'data-route-view': '',
    'data-route-parameter': context.routeParameter
  });

  /** @param {unknown} routeValue */
  const render = (routeValue) => {
    const packageId = normalizePackageRoute(routeValue);
    const workflows = allWorkflows
      .filter((workflow) => packageId && String(workflow.package).toLowerCase() === packageId.toLowerCase())
      .sort(comparePackageWorkflows);
    root.dataset.package = packageId;
    root.replaceChildren(packageId && workflows.length > 0
      ? renderPackageContent(context, packageId, workflows)
      : h('p', { className: 'empty' }, packageId ? 'Package not found.' : 'Select a package to view its workflows.'));

    if (workflows.length > 0) {
      const packageName = nameForPackage(packageId, workflows);
      root.dispatchEvent(new CustomEvent('dashboard-route-allocation', {
        bubbles: true,
        detail: {
          title: packageName,
          description: `Orchestrator and worker workflows in the ${packageName} package.`,
          mode: modeForPackage(workflows),
          navigationPage: 'packages'
        }
      }));
    }
  };

  root.addEventListener('dashboard-route-change', (event) => {
    if (!(event instanceof CustomEvent) || event.detail?.parameter !== context.routeParameter) return;
    render(event.detail.value);
  });
  render('');
  return root;
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {string} packageId
 * @param {Array<Record<string, unknown>>} workflows
 */
function renderPackageContent(context, packageId, workflows) {
  const packageName = nameForPackage(packageId, workflows);
  const orchestrator = workflows.find((workflow) => workflow['workflow-role'] === 'orchestrator');
  const workers = workflows.filter((workflow) => workflow['workflow-role'] === 'worker');
  const headingId = `${context.pageId}-package-workflows-heading`;

  return h(
    'div',
    { className: 'package-detail-content' },
    renderPackageTabs(packageId, packageName, 'workflows'),
    h(
      'section',
      { className: 'operation-workflow-map', 'aria-labelledby': headingId },
      renderSectionHeading({
        kicker: 'Workflow topology',
        id: headingId,
        title: context.title,
        headingTag: context.headingTag
      }),
      orchestrator
        ? renderWorkflowNode(orchestrator, 'orchestrator', 'div')
        : h('div', { className: 'operation-orchestrator empty' }, 'No orchestrator workflow configured.'),
      h(
        'ul',
        null,
        ...(workers.length > 0
          ? workers.map((workflow) => renderWorkflowNode(workflow, 'worker', 'li'))
          : [h('li', { className: 'empty' }, 'No worker workflows configured.')])
      )
    )
  );
}

/**
 * @param {string} packageId
 * @param {string} packageName
 * @param {'workflows'|'reports'|'insights'} selectedView
 */
function renderPackageTabs(packageId, packageName, selectedView) {
  const packageQuery = `?package=${encodeURIComponent(packageId)}`;
  const tabs = [
    ['insights', 'Insights', 'graph', `#page-operational-value${packageQuery}`],
    ['workflows', 'Workflows', 'workflow', `#page-package-detail${packageQuery}`],
    ['reports', 'Reports', 'issue', `#page-package-reports${packageQuery}`]
  ];
  return renderNavTabs({
    className: 'package-tabs',
    ariaLabel: `${packageName} views`,
    tabs: tabs.map(([view, label, icon, href]) => ({
      view: String(view),
      label: String(label),
      icon: String(icon),
      href: String(href),
      current: selectedView === view
    }))
  });
}

/**
 * Route-aware durable reports produced by one operation package.
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderPackageReports(context) {
  const allWorkflows = rowsFor(context.sources, 'workflows');
  const allOutcomes = rowsFor(context.sources, 'outcomes');
  const workflowsUnavailable = context.sources.workflows?.metadata?.availability === 'unavailable';
  const root = h('div', {
    className: 'package-reports',
    'data-route-view': '',
    'data-route-parameter': context.routeParameter
  });

  /** @param {unknown} routeValue */
  const render = (routeValue) => {
    const packageId = normalizePackageRoute(routeValue);
    const workflows = allWorkflows
      .filter((workflow) => packageId && String(workflow.package).toLowerCase() === packageId.toLowerCase())
      .sort(comparePackageWorkflows);
    root.dataset.package = packageId;
    root.replaceChildren(workflowsUnavailable
      ? h('p', { className: 'empty' }, 'Package data is unavailable.')
      : packageId && workflows.length > 0
      ? renderPackageReportsContent(context, packageId, workflows, allOutcomes)
      : h('p', { className: 'empty' }, packageId ? 'Package not found.' : 'Select a package to view its reports.'));

    if (workflows.length > 0) {
      const packageName = nameForPackage(packageId, workflows);
      root.dispatchEvent(new CustomEvent('dashboard-route-allocation', {
        bubbles: true,
        detail: {
          title: packageName,
          description: `Durable reports produced by the ${packageName} package.`,
          mode: modeForPackage(workflows),
          navigationPage: 'packages'
        }
      }));
    }
  };

  root.addEventListener('dashboard-route-change', (event) => {
    if (!(event instanceof CustomEvent) || event.detail?.parameter !== context.routeParameter) return;
    render(event.detail.value);
  });
  render('');
  return root;
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @param {string} packageId
 * @param {Array<Record<string, unknown>>} workflows
 * @param {Array<Record<string, unknown>>} outcomes
 */
function renderPackageReportsContent(context, packageId, workflows, outcomes) {
  const packageName = nameForPackage(packageId, workflows);
  const configuredMode = modeForPackage(workflows) || 'review';
  const packageOutcomes = outcomes
    .filter((outcome) => outcomeBelongsToPackage(outcome, packageId, workflows))
    .sort((left, right) => reportTimestamp(right) - reportTimestamp(left));
  const panelId = `${context.pageId}-reports-panel`;
  const panel = h('div', { className: 'package-report-mode-content', id: panelId, role: 'tabpanel' });
  const tabs = createModeTabs({
    className: 'package-report-mode-tabs',
    ariaLabel: 'Filter reports by mode',
    panelId,
    tabs: [
      { value: 'all', label: 'All' },
      { value: 'review', label: 'Review' },
      { value: 'live', label: 'Live' }
    ],
    selectedValue: 'all',
    onSelect: (selectedMode) => {
      panel.setAttribute('aria-labelledby', `${panelId}-${selectedMode}-tab`);
      const visibleOutcomes = selectedMode === 'all'
        ? packageOutcomes
        : packageOutcomes.filter((outcome) => String(outcome['rollout-mode']).toLowerCase() === selectedMode);
      panel.replaceChildren(
        h('p', { className: 'package-report-mode-note' }, reportModeDescription(selectedMode, configuredMode)),
        renderReportList(visibleOutcomes, selectedMode === 'all', context.sources.outcomes?.metadata?.availability)
      );
    }
  });

  tabs.selectValue('all');
  return h(
    'div',
    { className: 'package-reports-content' },
    renderPackageTabs(packageId, packageName, 'reports'),
    tabs.element,
    panel
  );
}

/**
 * @param {Array<Record<string, unknown>>} outcomes
 * @param {boolean} showMode
 * @param {unknown} availability
 */
function renderReportList(outcomes, showMode, availability) {
  return renderSharedReportList(outcomes, {
    rowClassName: 'package-report-row',
    showMode,
    headingId: 'package-reports-heading',
    headingText: 'Reports',
    filterLabel: 'Filter reports',
    emptyMessage: availability === 'unavailable'
      ? 'Package report data is unavailable.'
      : 'No reports have been recorded for this mode.',
    noMatchMessage: 'No reports match this filter.',
    countOpenStatuses: ['open', 'available', 'published', 'pending', 'unknown'],
    countResolvedStatuses: ['closed', 'merged', 'resolved', 'complete', 'completed'],
    renderContainer: ({ search, summary, content }) => h(
      'section',
      { className: `package-report-list${showMode ? ' package-report-list-with-mode' : ''}`, 'aria-labelledby': 'package-reports-heading' },
      h('label', { className: 'package-report-search' }, octicon('issue'), search),
      h(
        'div',
        { className: 'package-report-header' },
        h('h2', { id: 'package-reports-heading' }, 'Reports'),
        summary
      ),
      h(
        'div',
        { className: 'package-report-columns', 'aria-hidden': 'true' },
        h('span', null, 'Report'),
        h('span', null, 'Status'),
        showMode ? h('span', null, 'Mode') : null,
        h('span', null, 'Type'),
        h('span', null, 'Updated')
      ),
      content
    ),
    renderContent: (rows, emptyMessage) => h(
      'div',
      { className: 'package-report-rows' },
      ...(rows.length > 0 ? rows : [h('p', { className: 'empty' }, emptyMessage)])
    )
  });
}

/**
 * @param {Record<string, unknown>} outcome
 * @param {string} packageId
 * @param {Array<Record<string, unknown>>} workflows
 */
function outcomeBelongsToPackage(outcome, packageId, workflows) {
  const attributedPackage = String(outcome.package ?? '').trim();
  if (attributedPackage) return attributedPackage.toLowerCase() === packageId.toLowerCase();
  return workflows.some((workflow) => sameWorkflowScope(outcome, workflow)
    && (
      normalizeWorkflowIdentity(workflow.workflow) === normalizeWorkflowIdentity(outcome.workflow)
      || normalizeWorkflowIdentity(workflow['workflow-name']) === normalizeWorkflowIdentity(outcome['workflow-name'])
    ));
}

/** @param {Record<string, unknown>} outcome @param {Record<string, unknown>} workflow */
function sameWorkflowScope(outcome, workflow) {
  const outcomeRepository = String(outcome.repository ?? '').trim().toLowerCase();
  const workflowRepository = String(workflow.repository ?? '').trim().toLowerCase();
  const outcomeOrganization = String(outcome.organization ?? '').trim().toLowerCase();
  const workflowOrganization = String(workflow.organization ?? '').trim().toLowerCase();
  return (!outcomeRepository || !workflowRepository || outcomeRepository === workflowRepository)
    && (!outcomeOrganization || !workflowOrganization || outcomeOrganization === workflowOrganization);
}

/** @param {unknown} value */
function normalizeWorkflowIdentity(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\.lock\.yml$/, '.md');
}

/** @param {Record<string, unknown>} outcome */
function reportTimestamp(outcome) {
  const timestamp = Date.parse(String(outcome['observed-at'] ?? outcome['published-at'] ?? ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/** @param {string} selectedMode @param {string} configuredMode */
function reportModeDescription(selectedMode, configuredMode) {
  const configuredModeLabel = titleCase(configuredMode);
  if (selectedMode === 'all') {
    return `All durable outputs across review and live modes; the package is currently configured for ${configuredModeLabel}.`;
  }
  const selectedModeLabel = selectedMode === 'review' ? 'Review proposals' : 'Live production outputs';
  return selectedMode === configuredMode
    ? `${selectedModeLabel}; this is the package's configured mode.`
    : `${selectedModeLabel}; the package is currently configured for ${configuredModeLabel}.`;
}

/**
 * @param {Record<string, unknown>} workflow
 * @param {'orchestrator'|'worker'} role
 * @param {'div'|'li'} tag
 */
function renderWorkflowNode(workflow, role, tag) {
  const link = findLink(workflow, 'workflow-link');
  const content = [
    h('strong', null, String(workflow['workflow-name'] ?? workflow.workflow ?? 'Unknown workflow')),
    h('code', null, String(workflow.workflow ?? ''))
  ];
  return h(
    tag,
    { className: role === 'orchestrator' ? 'operation-orchestrator' : undefined, 'data-workflow-role': role },
    h('span', { className: `workflow-badge workflow-badge-${role}` }, titleCase(role)),
    link
      ? h('a', { href: link.href, 'aria-label': link.label }, ...content)
      : h('span', { className: 'operation-workflow-identity' }, ...content)
  );
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {string} source
 * @returns {Array<Record<string, unknown>>}
 */
function rowsFor(sources, source) {
  return Array.isArray(sources[source]?.rows) ? sources[source].rows : [];
}

/** @param {unknown} value */
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
  const orchestrator = workflows.find((workflow) => workflow['workflow-role'] === 'orchestrator');
  const mode = String(orchestrator?.['rollout-mode'] ?? workflows[0]?.['rollout-mode'] ?? '');
  return mode === 'review' || mode === 'live' ? mode : '';
}

/** @param {Record<string, unknown>} left @param {Record<string, unknown>} right */
function comparePackageWorkflows(left, right) {
  /** @type {Record<string, number>} */
  const roleOrder = { orchestrator: 0, worker: 1 };
  const leftOrder = roleOrder[String(left['workflow-role'])] ?? 2;
  const rightOrder = roleOrder[String(right['workflow-role'])] ?? 2;
  return leftOrder - rightOrder
    || String(left['workflow-name'] ?? left.workflow ?? '').localeCompare(String(right['workflow-name'] ?? right.workflow ?? ''));
}

/** @param {string} value */
function titleCase(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
