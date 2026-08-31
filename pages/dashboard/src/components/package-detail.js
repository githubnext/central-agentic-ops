/**
 * Route-aware operation package workflow hierarchy.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderModeBadge, renderStatusBadge } from './badge.js';
import { findLink } from './link-content.js';
import { formatUtcDateTime } from './ui-primitives.js';

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
      h(
        'div',
        { className: 'section-heading' },
        h(
          'div',
          null,
          h('span', { className: 'scope-kicker' }, 'Workflow topology'),
          h(context.headingTag, { id: headingId }, context.title)
        )
      ),
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
    ['workflows', 'Workflows', 'workflow', `#page-package-detail${packageQuery}`],
    ['reports', 'Reports', 'issue', `#page-package-reports${packageQuery}`],
    ['insights', 'Insights', 'graph', `#page-operational-value${packageQuery}`]
  ];
  return h(
    'nav',
    { className: 'package-tabs', 'aria-label': `${packageName} views` },
    ...tabs.map(([view, label, icon, href]) => h(
      'a',
      { href, 'aria-current': selectedView === view ? 'page' : undefined },
      octicon(String(icon)),
      h('span', null, String(label))
    ))
  );
}

/**
 * Route-aware durable reports produced by one operation package.
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderPackageReports(context) {
  const allWorkflows = rowsFor(context.sources, 'workflows');
  const allOutcomes = rowsFor(context.sources, 'outcomes');
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
    root.replaceChildren(packageId && workflows.length > 0
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
  const modeTabs = [
    ['all', 'All'],
    ['review', 'Review'],
    ['live', 'Live']
  ];
  /** @type {HTMLButtonElement[]} */
  const buttons = [];

  /** @param {string} selectedMode */
  const selectMode = (selectedMode) => {
    for (const button of buttons) {
      const selected = button.dataset.reportMode === selectedMode;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    const visibleOutcomes = selectedMode === 'all'
      ? packageOutcomes
      : packageOutcomes.filter((outcome) => String(outcome['rollout-mode']).toLowerCase() === selectedMode);
    panel.replaceChildren(
      h('p', { className: 'package-report-mode-note' }, reportModeDescription(selectedMode, configuredMode)),
      renderReportList(visibleOutcomes, selectedMode === 'all', context.sources.outcomes?.metadata?.availability)
    );
  };

  const tabs = h(
    'div',
    {
      className: 'package-report-mode-tabs',
      role: 'tablist',
      'aria-label': 'Filter reports by mode'
    },
    ...modeTabs.map(([mode, label], index) => {
      const button = /** @type {HTMLButtonElement} */ (h(
        'button',
        {
          type: 'button',
          role: 'tab',
          'aria-controls': panelId,
          'aria-selected': index === 0 ? 'true' : 'false',
          tabIndex: index === 0 ? 0 : -1,
          dataset: { reportMode: mode },
          onclick: () => selectMode(mode)
        },
        label
      ));
      button.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const currentIndex = buttons.indexOf(button);
        const nextIndex = event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? buttons.length - 1
            : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[nextIndex]?.click();
        buttons[nextIndex]?.focus();
      });
      buttons.push(button);
      return button;
    })
  );

  selectMode('all');
  return h(
    'div',
    { className: 'package-reports-content' },
    renderPackageTabs(packageId, packageName, 'reports'),
    tabs,
    panel
  );
}

/**
 * @param {Array<Record<string, unknown>>} outcomes
 * @param {boolean} showMode
 * @param {unknown} availability
 */
function renderReportList(outcomes, showMode, availability) {
  const openStates = new Set(['open', 'available', 'published']);
  const open = outcomes.filter((outcome) => openStates.has(String(outcome['outcome-status']).toLowerCase())).length;
  const rows = outcomes.map((outcome) => renderReportRow(outcome, showMode));
  const search = /** @type {HTMLInputElement} */ (h('input', {
    type: 'search',
    placeholder: 'Filter reports',
    'aria-label': 'Filter reports',
    disabled: rows.length === 0
  }));
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase('en');
    for (const row of rows) {
      row.hidden = query.length > 0 && !(row.textContent ?? '').toLocaleLowerCase('en').includes(query);
    }
  });
  const emptyMessage = availability === 'unavailable'
    ? 'Package report data is unavailable.'
    : 'No reports have been recorded for this mode.';

  return h(
    'section',
    { className: `package-report-list${showMode ? ' package-report-list-with-mode' : ''}`, 'aria-labelledby': 'package-reports-heading' },
    h('label', { className: 'package-report-search' }, octicon('issue'), search),
    h(
      'div',
      { className: 'package-report-header' },
      h('h2', { id: 'package-reports-heading' }, 'Reports'),
      h(
        'div',
        null,
        h('strong', null, String(open)),
        ' Open',
        h('span', null, h('strong', null, String(outcomes.length - open)), ' Resolved')
      )
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
    h(
      'div',
      { className: 'package-report-rows' },
      ...(rows.length > 0 ? rows : [h('p', { className: 'empty' }, emptyMessage)])
    )
  );
}

/**
 * @param {Record<string, unknown>} outcome
 * @param {boolean} showMode
 */
function renderReportRow(outcome, showMode) {
  const id = String(outcome['safe-output'] ?? '');
  const title = String(outcome['outcome-title'] ?? id ?? 'Untitled report') || 'Untitled report';
  const summary = String(outcome['outcome-summary'] ?? 'No report summary was provided.');
  const status = titleCase(String(outcome['outcome-status'] ?? outcome['outcome-state'] ?? 'unknown'));
  const mode = titleCase(String(outcome['rollout-mode'] ?? 'unknown'));
  const kind = titleCase(String(outcome['outcome-category'] ?? 'unknown'));
  const observedAt = String(outcome['observed-at'] ?? '');
  const sourceLink = findLink(outcome, 'external-link')
    ?? findLink(outcome, 'issue-link')
    ?? findLink(outcome, 'pull-request-link');
  const titleLink = id
    ? h('a', { href: `#page-outcome-detail?outcome=${encodeURIComponent(id)}`, title }, title)
    : sourceLink
      ? h('a', { href: sourceLink.href, title, target: '_blank', rel: 'noopener noreferrer' }, title)
      : h('span', { title }, title);

  return h(
    'article',
    { className: 'package-report-row', dataset: { reportId: id } },
    h('div', { className: 'package-report-icon', 'aria-hidden': 'true' }, octicon(kind === 'Noop' ? 'check-circle' : 'issue')),
    h(
      'div',
      { className: 'package-report-copy' },
      h('h3', null, titleLink),
      h('p', { title: summary }, summary)
    ),
    renderStatusBadge(status),
    showMode ? renderModeBadge(mode) : null,
    h('span', { className: 'kind' }, kind),
    h('time', { dateTime: observedAt }, formatUtcDateTime(observedAt))
  );
}

/**
 * @param {Record<string, unknown>} outcome
 * @param {string} packageId
 * @param {Array<Record<string, unknown>>} workflows
 */
function outcomeBelongsToPackage(outcome, packageId, workflows) {
  if (String(outcome.package ?? '').toLowerCase() === packageId.toLowerCase()) return true;
  const workflowPaths = new Set(workflows.map((workflow) => normalizeWorkflowIdentity(workflow.workflow)).filter(Boolean));
  const workflowNames = new Set(workflows.map((workflow) => normalizeWorkflowIdentity(workflow['workflow-name'])).filter(Boolean));
  return workflowPaths.has(normalizeWorkflowIdentity(outcome.workflow))
    || workflowNames.has(normalizeWorkflowIdentity(outcome['workflow-name']));
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
