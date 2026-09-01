/**
 * Route-aware safe-output outcome detail.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderModeBadge, renderStatusBadge } from './badge.js';
import { findLink, renderExternalLink, resolveTitleLink } from './link-content.js';
import { formatUtcDateTime } from './ui-primitives.js';
import { renderMetadataSection } from './view-chrome.js';
import { createRouteView } from './route-empty-state.js';

const ALLOWED_MARKDOWN_TAGS = new Set([
  'A', 'BLOCKQUOTE', 'BR', 'CODE', 'DEL', 'DETAILS', 'DIV', 'EM',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'IMG', 'INPUT', 'LI',
  'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'SUMMARY', 'TABLE', 'TBODY',
  'TD', 'TH', 'THEAD', 'TR', 'UL'
]);
const DROPPED_MARKDOWN_TAGS = new Set([
  'BUTTON', 'EMBED', 'FORM', 'IFRAME', 'MATH', 'OBJECT', 'OPTION',
  'SCRIPT', 'SELECT', 'STYLE', 'SVG', 'TEXTAREA'
]);
const ALLOWED_MARKDOWN_CLASSES = new Set([
  'contains-task-list',
  'markdown-alert',
  'markdown-alert-caution',
  'markdown-alert-important',
  'markdown-alert-note',
  'markdown-alert-tip',
  'markdown-alert-title',
  'markdown-alert-warning',
  'task-list-item'
]);

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderOutcomeDetail(context) {
  const outcomes = rowsFor(context.sources, 'outcomes');
  const root = createRouteView({
    rootClassName: 'outcome-detail',
    routeParameter: context.routeParameter,
    datasetKey: 'outcome',
    selectMessage: 'Select an outcome to view its details.',
    notFoundMessage: 'Outcome not found.',
    renderMatched: (routeValue) => {
      const outcomeId = routeValue.trim();
      const outcome = outcomes.find((row) => String(row['safe-output']) === outcomeId);
      if (!outcome) {
        return null;
      }
      root.dispatchEvent(new CustomEvent('dashboard-route-allocation', {
        bubbles: true,
        detail: {
          title: text(outcome['outcome-title']) || outcomeId,
          description: outcomeDescription(outcome),
          titleLink: resolveTitleLink(outcome, context.titleLink)
        }
      }));
      return renderOutcome(outcome);
    }
  });
  return root;
}

/**
 * @param {Record<string, unknown>} outcome
 * @returns {HTMLElement}
 */
function renderOutcome(outcome) {
  const sourceLink = findLink(outcome, 'external-link')
    ?? findLink(outcome, 'issue-link')
    ?? findLink(outcome, 'pull-request-link');
  const runLink = findLink(outcome, 'run-link');
  const workflowLink = findLink(outcome, 'workflow-link');
  const workflowName = text(outcome['workflow-name']) || text(outcome.workflow) || 'Unknown workflow';
  const body = sanitizedMarkdownNodes(text(outcome['outcome-body-html']));

  return h(
    'div',
    { className: 'outcome-view' },
    h(
      'article',
      { className: 'discussion-post' },
      h(
        'header',
        null,
        h('div', { className: 'post-avatar', 'aria-hidden': 'true' }, octicon('mark-github')),
        h(
          'div',
          null,
          h('strong', null, 'github-actions[bot]'),
          h(
            'p',
            null,
            'published ',
            formatUtcDateTime(outcome['published-at']),
            ' · updated ',
            formatUtcDateTime(outcome['observed-at'])
          )
        )
      ),
      h(
        'div',
        { className: 'markdown-body' },
        ...(body.length > 0 ? body : [h('p', null, text(outcome['outcome-summary']) || 'No report content was provided.')])
      )
    ),
    h(
      'aside',
      { className: 'outcome-meta', 'aria-label': 'Outcome metadata' },
      renderMetadataSection('Status', renderStatusBadge(titleCase(text(outcome['outcome-status']) || text(outcome['outcome-state'])))),
      renderMetadataSection('Mode', renderModeBadge(titleCase(text(outcome['rollout-mode'])))),
      renderMetadataSection('Category', h('p', null, titleCase(text(outcome['outcome-category'])))),
      renderMetadataSection(
        'Workflow',
        h(
          'p',
          null,
          workflowLink
            ? renderExternalLink({ ...workflowLink, label: workflowName })
            : workflowName
        )
      ),
      renderMetadataSection(
        'Provenance',
        h(
          'p',
          null,
          sourceLink ? renderExternalLink({ ...sourceLink, label: 'View source' }) : null,
          sourceLink && runLink ? h('br') : null,
          runLink ? renderExternalLink({ ...runLink, label: 'View workflow run' }) : null,
          !sourceLink && !runLink ? 'Unavailable' : null
        )
      )
    )
  );
}

/**
 * Rebuilds GitHub-rendered Markdown through a strict element and attribute allowlist.
 * @param {string} html
 * @returns {Node[]}
 */
function sanitizedMarkdownNodes(html) {
  if (!html) return [];
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return [...parsed.body.childNodes]
    .map(cloneSafeMarkdownNode)
    .filter((node) => node !== null);
}

/**
 * @param {Node} node
 * @returns {Node | null}
 */
function cloneSafeMarkdownNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent ?? '');
  if (!(node instanceof HTMLElement) || DROPPED_MARKDOWN_TAGS.has(node.tagName)) return null;

  if (!ALLOWED_MARKDOWN_TAGS.has(node.tagName)) {
    const fragment = document.createDocumentFragment();
    for (const child of node.childNodes) {
      const safeChild = cloneSafeMarkdownNode(child);
      if (safeChild) fragment.append(safeChild);
    }
    return fragment;
  }

  const clone = document.createElement(node.tagName.toLowerCase());
  copySafeAttributes(node, clone);
  for (const child of node.childNodes) {
    const safeChild = cloneSafeMarkdownNode(child);
    if (safeChild) clone.append(safeChild);
  }
  return clone;
}

/**
 * @param {HTMLElement} source
 * @param {HTMLElement} target
 */
function copySafeAttributes(source, target) {
  const safeClasses = [...source.classList].filter((name) => ALLOWED_MARKDOWN_CLASSES.has(name));
  if (safeClasses.length > 0) target.className = safeClasses.join(' ');

  if (source.tagName === 'A') {
    const href = safeHttpsUrl(source.getAttribute('href'));
    if (href) {
      target.setAttribute('href', href);
      target.setAttribute('target', '_blank');
      target.setAttribute('rel', 'noopener noreferrer');
    }
  } else if (source.tagName === 'IMG') {
    const src = safeHttpsUrl(source.getAttribute('src'));
    if (src) target.setAttribute('src', src);
    target.setAttribute('alt', source.getAttribute('alt') ?? '');
    target.setAttribute('loading', 'lazy');
  } else if (source.tagName === 'INPUT' && source.getAttribute('type') === 'checkbox') {
    target.setAttribute('type', 'checkbox');
    target.setAttribute('disabled', '');
    if (source.hasAttribute('checked')) target.setAttribute('checked', '');
  } else if (source.tagName === 'DETAILS' && source.hasAttribute('open')) {
    target.setAttribute('open', '');
  } else if (source.tagName === 'TH') {
    const scope = source.getAttribute('scope');
    if (['row', 'col', 'rowgroup', 'colgroup'].includes(scope ?? '')) target.setAttribute('scope', scope ?? '');
  }

  if (source.tagName === 'TD' || source.tagName === 'TH') {
    for (const attribute of ['colspan', 'rowspan']) {
      const value = source.getAttribute(attribute);
      if (value && /^[1-9]\d{0,2}$/.test(value)) target.setAttribute(attribute, value);
    }
  }
}

/** @param {string | null} value */
function safeHttpsUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/** @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources @param {string} source */
function rowsFor(sources, source) {
  return Array.isArray(sources[source]?.rows) ? sources[source].rows : [];
}

/** @param {Record<string, unknown>} outcome */
function outcomeDescription(outcome) {
  return [
    text(outcome['workflow-name']) || text(outcome.workflow),
    titleCase(text(outcome['outcome-category'])),
    titleCase(text(outcome['outcome-status']) || text(outcome['outcome-state']))
  ].filter(Boolean).join(' · ');
}

/** @param {unknown} value */
function text(value) {
  return value == null ? '' : String(value);
}

/** @param {string} value */
function titleCase(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
