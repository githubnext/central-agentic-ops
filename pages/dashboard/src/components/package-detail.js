/**
 * Route-aware operation package workflow hierarchy.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { findLink } from './link-content.js';

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
    renderPackageTabs(context.pageId, packageId, packageName),
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
 * @param {string} pageId
 * @param {string} packageId
 * @param {string} packageName
 */
function renderPackageTabs(pageId, packageId, packageName) {
  const packageQuery = `?package=${encodeURIComponent(packageId)}`;
  const tabs = [
    ['Workflows', 'workflow', `#page-${pageId}${packageQuery}`, true],
    ['Reports', 'issue', `#page-findings${packageQuery}`, false],
    ['Insights', 'graph', `#page-operational-value${packageQuery}`, false]
  ];
  return h(
    'nav',
    { className: 'package-tabs', 'aria-label': `${packageName} views` },
    ...tabs.map(([label, icon, href, current]) => h(
      'a',
      { href, 'aria-current': current ? 'page' : undefined },
      octicon(String(icon)),
      h('span', null, String(label))
    ))
  );
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
