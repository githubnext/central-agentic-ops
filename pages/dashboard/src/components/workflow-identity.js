/**
 * Shared workflow identity strip.
 */

import { h } from '../dom.js';
import { findLink, renderExternalLink } from './link-content.js';

/** @param {Record<string, unknown>} workflow */
export function renderWorkflowIdentity(workflow) {
  const link = findLink(workflow, 'workflow-link');
  const role = workflowRole(workflow);
  const memberships = workflowPackageMemberships(workflow);
  const sourceLink = link
    ? { href: link.externalHref ?? link.href, label: 'View authored workflow' }
    : null;
  return h(
    'section',
    { className: 'workflow-identity', 'aria-label': 'Workflow identity' },
    h(
      'div',
      null,
      h(
        'span',
        { className: 'workflow-badges' },
        h('span', { className: `workflow-badge workflow-badge-${role}` }, titleCase(role)),
        ...memberships.map((membership) => h(
          'a',
          {
            className: 'workflow-badge workflow-badge-operation',
            href: `#page-package-detail?package=${encodeURIComponent(membership.id)}`
          },
          `Package · ${membership.name}`
        ))
      ),
      h('p', null, h('code', null, text(workflow.workflow)))
    ),
    sourceLink ? renderExternalLink(sourceLink) : null
  );
}

/** @param {Record<string, unknown>} workflow */
function workflowRole(workflow) {
  const role = text(workflow['workflow-role']).toLowerCase();
  return ['orchestrator', 'worker', 'standalone'].includes(role)
    ? role
    : workflowPackageMemberships(workflow).length > 0 ? 'operation' : 'unknown';
}

/** @param {Record<string, unknown>} workflow */
function workflowPackageMemberships(workflow) {
  const memberships = Array.isArray(workflow['package-memberships'])
    ? workflow['package-memberships']
    : workflow.package
      ? [{ id: workflow.package, name: workflow['package-name'] ?? workflow.package }]
      : [];
  const unique = new Map();
  for (const membership of memberships) {
    if (!membership || typeof membership !== 'object' || Array.isArray(membership)) continue;
    const id = text(membership.id).trim();
    const name = text(membership.name).trim();
    if (id && name) unique.set(id, { id, name });
  }
  return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name));
}

/** @param {unknown} value */
function text(value) {
  return value == null ? '' : String(value);
}

/** @param {string} value */
function titleCase(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
