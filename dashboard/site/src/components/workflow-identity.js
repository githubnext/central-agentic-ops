/**
 * Shared workflow identity strip.
 */

import { h } from '../dom.js';
import { findLink, renderExternalLink } from './link-content.js';
import { renderWorkflowBadges } from './workflow-badges.js';

/** @param {Record<string, unknown>} workflow */
export function renderWorkflowIdentity(workflow) {
  const link = findLink(workflow, 'workflow-link');
  const sourceLink = link
    ? { href: link.externalHref ?? link.href, label: 'View authored workflow' }
    : null;
  return h(
    'section',
    { className: 'workflow-identity', 'aria-label': 'Workflow identity' },
    h(
      'div',
      null,
      renderWorkflowBadges(workflow),
      h('p', null, h('code', null, text(workflow.workflow)))
    ),
    sourceLink ? renderExternalLink(sourceLink) : null
  );
}

/** @param {unknown} value */
function text(value) {
  return value == null ? '' : String(value);
}
