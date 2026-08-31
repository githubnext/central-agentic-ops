/**
 * Workflow topology element composed from the canonical workflows source.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { formatCountNoun } from './count-formatters.js';
import { findLink } from './link-content.js';
import { renderLinkedText } from './linked-text.js';

const MODE_ICONS = { review: 'beaker', live: 'rocket' };

/**
 * @param {string} pageId
 * @param {string} title
 * @param {string | undefined} description
 * @param {Array<Record<string, unknown>>} rows
 * @param {'h3'|'h4'} [headingTag]
 * @returns {HTMLElement}
 */
export function renderWorkflowTopology(pageId, title, description, rows, headingTag = 'h3') {
  const packageRows = rows.filter((row) => row['workflow-role'] !== 'standalone' && typeof row.package === 'string');
  const standaloneRows = rows.filter((row) => row['workflow-role'] === 'standalone');
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const groupedPackages = new Map();
  for (const row of packageRows) {
    const packageId = String(row.package);
    const packageWorkflows = groupedPackages.get(packageId) ?? [];
    packageWorkflows.push(row);
    groupedPackages.set(packageId, packageWorkflows);
  }

  const packages = [...groupedPackages.entries()].sort(([left], [right]) => left.localeCompare(right));
  const headingId = `${pageId}-workflow-topology-heading`;
  return h(
    'section',
    {
      className: 'page-section workflow-topology-overview',
      tabIndex: 0,
      'aria-labelledby': headingId
    },
    h(
      'div',
      { className: 'section-heading' },
      h(
        'div',
        null,
        h('span', { className: 'scope-kicker' }, 'Expected structure'),
        h(headingTag, { id: headingId }, title),
        description ? h('p', null, description) : null
      ),
      h(
        'dl',
        { className: 'workflow-topology-summary', 'aria-label': 'Workflow topology summary' },
        renderTopologyMetric('Packages', packages.length),
        renderTopologyMetric('Package workflows', packageRows.length),
        renderTopologyMetric('Standalone workflows', standaloneRows.length)
      )
    ),
    h(
      'div',
      { className: 'workflow-topology' },
      h(
        'section',
        { className: 'topology-plane', 'aria-labelledby': `${pageId}-control-plane-heading` },
        h(
          'header',
          { className: 'topology-plane-header' },
          h('span', { className: 'topology-step', 'aria-hidden': 'true' }, '01'),
          h(
            'div',
            null,
            h('p', { className: 'topology-kicker' }, 'Central execution'),
            h('h4', { id: `${pageId}-control-plane-heading` }, 'Operation packages'),
            h('p', null, 'Each package runs in the control plane as one orchestrator steering one or more workers.')
          )
        ),
        h(
          'div',
          { className: 'package-topology-list' },
          ...(packages.length > 0
            ? packages.map(([packageId, workflows]) => renderPackageTopology(packageId, workflows))
            : [h('p', { className: 'empty' }, 'No operation packages observed.')])
        )
      ),
      h(
        'div',
        { className: 'topology-boundary', role: 'separator', 'aria-label': 'Control-plane execution boundary' },
        h('span', null, 'safe outputs only'),
        h('i', { 'aria-hidden': 'true' })
      ),
      h(
        'section',
        { className: 'topology-plane target-plane', 'aria-labelledby': `${pageId}-target-plane-heading` },
        h(
          'header',
          { className: 'topology-plane-header' },
          h('span', { className: 'topology-step', 'aria-hidden': 'true' }, '02'),
          h(
            'div',
            null,
            h('p', { className: 'topology-kicker' }, 'Target repositories'),
            h('h4', { id: `${pageId}-target-plane-heading` }, 'Standalone workflows'),
            h('p', null, 'Repository-owned workflows run locally and are not part of a central operation package.')
          )
        ),
        renderStandaloneWorkflows(standaloneRows)
      )
    )
  );
}

/**
 * @param {string} label
 * @param {number} value
 * @returns {HTMLElement}
 */
function renderTopologyMetric(label, value) {
  return h('div', null, h('dt', null, label), h('dd', null, String(value)));
}

/**
 * @param {string} packageId
 * @param {Array<Record<string, unknown>>} workflows
 * @returns {HTMLElement}
 */
function renderPackageTopology(packageId, workflows) {
  const orchestrator = workflows.find((row) => row['workflow-role'] === 'orchestrator');
  const workers = workflows
    .filter((row) => row['workflow-role'] === 'worker')
    .sort(compareWorkflowRows);
  const packageName = workflows.find((row) => typeof row['package-name'] === 'string')?.['package-name'];
  const mode = String(orchestrator?.['rollout-mode'] ?? workflows[0]?.['rollout-mode'] ?? 'unknown');
  const active = workflows.every((row) => String(row['workflow-active']) === 'true');
  const complete = Boolean(orchestrator) && workers.length > 0;
  const repositoryRow = orchestrator ?? workflows[0];
  const repositoryLink = repositoryRow ? findLink(repositoryRow, 'repository-link') : null;

  return h(
    'article',
    { className: 'package-topology', 'data-package-id': packageId },
    h(
      'header',
      { className: 'package-topology-header' },
      h('span', { className: 'package-icon' }, octicon('package')),
      h(
        'div',
        { className: 'package-identity' },
        h('h5', null, typeof packageName === 'string' ? packageName : titleCase(packageId)),
        h('p', null, `${formatCountNoun(workers.length, 'worker', 'workers')} · `, renderLinkedText(toText(repositoryRow?.repository), repositoryLink))
      ),
      renderModeIndicator(mode),
      h('span', { className: `status ${active && complete ? 'status-success' : 'status-attention'}` }, active && complete ? 'Active' : 'Needs attention')
    ),
    h(
      'div',
      { className: 'package-flow' },
      orchestrator
        ? renderWorkflowNode(orchestrator, 'orchestrator')
        : h('div', { className: 'workflow-node workflow-node-missing' }, h('strong', null, 'Orchestrator missing')),
      h(
        'div',
        { className: 'package-dispatch', 'aria-hidden': 'true' },
        h('span', null, 'dispatches'),
        h('i')
      ),
      h(
        'div',
        { className: 'worker-stack', role: 'list', 'aria-label': `${packageName ?? titleCase(packageId)} workers` },
        ...(workers.length > 0
          ? workers.map((worker) => renderWorkflowNode(worker, 'worker'))
          : [h('div', { className: 'workflow-node workflow-node-missing' }, h('strong', null, 'No workers observed'))])
      )
    )
  );
}

/**
 * @param {Record<string, unknown>} row
 * @param {'orchestrator'|'worker'} role
 * @returns {HTMLElement}
 */
function renderWorkflowNode(row, role) {
  const workflowLink = findLink(row, 'workflow-link');
  return h(
    'div',
    { className: `workflow-node workflow-node-${role}`, role: 'listitem', 'data-workflow-role': role },
    h('span', { className: 'workflow-node-icon' }, octicon('workflow')),
    h(
      'div',
      { className: 'workflow-node-copy' },
      h('strong', null, renderLinkedText(toText(row['workflow-name'] ?? row.workflow), workflowLink)),
      h('code', null, toText(row.workflow)),
      h('small', null, role)
    )
  );
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {HTMLElement}
 */
function renderStandaloneWorkflows(rows) {
  if (rows.length === 0) {
    return h('p', { className: 'empty' }, 'No standalone workflows observed.');
  }
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const byRepository = new Map();
  for (const row of [...rows].sort(compareWorkflowRows)) {
    const repository = toText(row.repository);
    const repositoryRows = byRepository.get(repository) ?? [];
    repositoryRows.push(row);
    byRepository.set(repository, repositoryRows);
  }
  return h(
    'div',
    { className: 'standalone-repository-list' },
    ...[...byRepository.entries()].map(([repository, workflows]) => h(
      'article',
      { className: 'standalone-repository', 'data-repository': repository },
      h(
        'header',
        null,
        h('span', { className: 'repository-icon' }, octicon('repo')),
        h('strong', null, renderLinkedText(repository, findLink(workflows[0], 'repository-link'))),
        h('span', { className: 'workflow-count' }, formatCountNoun(workflows.length, 'workflow', 'workflows'))
      ),
      h(
        'ul',
        null,
        ...workflows.map((workflow) => h(
          'li',
          null,
          h('span', { className: 'standalone-workflow-icon' }, octicon('workflow')),
          h('span', null, h('strong', null, renderLinkedText(toText(workflow['workflow-name'] ?? workflow.workflow), findLink(workflow, 'workflow-link'))), h('code', null, toText(workflow.workflow))),
          renderModeIndicator(toText(workflow['rollout-mode'])),
          h('span', { className: `status ${String(workflow['workflow-active']) === 'true' ? 'status-success' : 'status-muted'}` }, String(workflow['workflow-active']) === 'true' ? 'Active' : 'Inactive')
        ))
      )
    ))
  );
}

/**
 * @param {string} mode
 * @returns {HTMLElement}
 */
function renderModeIndicator(mode) {
  const icon = MODE_ICONS[mode];
  return h(
    'span',
    { className: `mode-indicator mode-${mode}` },
    icon ? octicon(icon) : null,
    mode
  );
}

/**
 * @param {Record<string, unknown>} left
 * @param {Record<string, unknown>} right
 * @returns {number}
 */
function compareWorkflowRows(left, right) {
  return toText(left['workflow-name'] ?? left.workflow).localeCompare(toText(right['workflow-name'] ?? right.workflow));
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function toText(value) {
  return value == null || value === '' ? 'unknown' : String(value);
}

/**
 * @param {string} value
 * @returns {string}
 */
function titleCase(value) {
  return value.split(/[-_]/).map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(' ');
}
