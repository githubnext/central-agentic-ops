/**
 * Registry for JSON-selected dashboard UI elements.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { findLink } from './link-content.js';
import { renderPackagesView } from './packages-view.js';
import { renderPackageNavigation } from './package-detail.js';
import { renderWorkflowDetail } from './workflow-detail.js';
import { renderOutcomeDetail } from './outcome-detail.js';
import { renderSectionHeading } from './ui-primitives.js';
import { renderDefinitionList } from './view-chrome.js';
import { renderWorkflowRuntime } from './workflow-runtime.js';
import { renderAnomalyReadiness } from './anomaly-readiness.js';
import { renderWorkflowRouteView } from './workflow-route-view.js';

/**
 * @typedef {{
 *   pageId: string,
 *   title: string,
 *   description?: string,
 *   sourceNames: string[],
 *   sources: Record<string, import('../presenter.js').LogicalSourceInput>,
 *   contextDetails: string[],
 *   scope?: Record<string, unknown>,
 *   routeParameter?: string,
 *   titleLink?: Record<string, unknown>,
 *   element?: string,
 *   viewId?: string,
 *   headingTag: 'h3'|'h4'
 * }} ElementRenderContext
 */

/** @type {Map<string, (context: ElementRenderContext) => HTMLElement | null>} */
const ELEMENT_RENDERERS = new Map([
  ['domain-attention', renderDomainAttentionElement],
  ['package-status-grid', renderPackageStatusGridElement],
  ['summary-grid', renderSummaryGridElement],
  ['readiness-verdict', renderReadinessVerdictElement],
  ['context-summary', renderContextSummaryElement],
  ['anomaly-readiness', renderAnomalyReadinessElement],
  ['signal-list', renderSignalListElement],
  ['package-activity', ({ sources, pageId }) => renderPackagesView(sources, pageId)],
  ['package-insights', (context) => renderPackageNavigation(context, 'insights')],
  ['package-detail', (context) => renderPackageNavigation(context, 'workflows')],
  ['package-dispatches', (context) => renderPackageNavigation(context, 'dispatches')],
  ['package-reports', (context) => renderPackageNavigation(context, 'reports')],
  ['workflow-route', renderWorkflowRouteView],
  ['workflow-detail', renderWorkflowDetail],
  ['workflow-runs', renderWorkflowDetail],
  ['workflow-runtime', renderWorkflowRuntime],
  ['outcome-detail', renderOutcomeDetail]
]);

const EMPTY_AWARE_ELEMENTS = new Set(['summary-grid', 'readiness-verdict', 'context-summary', 'signal-list', 'package-insights', 'package-detail', 'package-dispatches', 'package-reports', 'workflow-route', 'workflow-detail', 'workflow-runs', 'workflow-runtime', 'outcome-detail']);

/**
 * @param {string} name
 * @param {ElementRenderContext} context
 * @returns {HTMLElement | null}
 */
export function renderUiElement(name, context) {
  return ELEMENT_RENDERERS.get(name)?.({ ...context, element: name }) ?? null;
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function elementHandlesEmptyRows(name) {
  return EMPTY_AWARE_ELEMENTS.has(name);
}

/**
 * @param {ElementRenderContext} context
 */
function renderDomainAttentionElement(context) {
  const rows = rowsFor(context, 'overview-attention-domains');
  const headingId = `${context.pageId}-${slugify(context.title)}-heading`;
  return h(
    'section',
    { className: 'overview-observability', 'aria-labelledby': headingId },
    renderSectionHeading({
      kicker: 'Current decision window',
      id: headingId,
      title: context.title,
      description: context.description,
      headingTag: 'h2'
    }),
    h(
      'div',
      { className: 'attention-domain-grid' },
      ...rows.map((row) => h(
        'a',
        {
          className: `attention-domain-card attention-domain-${stringValue(row.tone)}`,
          href: stringValue(row.href)
        },
        h(
          'header',
          null,
          h('span', { className: 'attention-domain-icon' }, octicon(stringValue(row.icon))),
          h('strong', null, stringValue(row.domain)),
          h('span', { className: 'attention-domain-state' }, stringValue(row.state))
        ),
        h('span', { className: 'attention-domain-value' }, stringValue(row.value)),
        h('p', null, stringValue(row.detail)),
        h('footer', null, 'Open evidence')
      ))
    ),
    h(
      'p',
      { className: 'overview-method-note' },
      h('strong', null, 'State key:'),
      ' Act now is a direct failure; Investigate is a direct control, collection, or attribution signal; Monitor has observations without a direct signal; Unavailable means a required threshold or evidence feed is absent.'
    )
  );
}

/**
 * @param {ElementRenderContext} context
 */
function renderPackageStatusGridElement(context) {
  const rows = rowsFor(context, 'overview-managed-packages');
  const headingId = `${context.pageId}-${slugify(context.title)}-heading`;
  return h(
    'section',
    { className: 'overview-package-status', 'aria-labelledby': headingId },
    renderSectionHeading({
      kicker: 'Managed packages',
      id: headingId,
      title: context.title,
      description: context.description,
      headingTag: 'h2'
    }),
    h(
      'div',
      { className: 'package-status-grid' },
      ...rows.map((row) => {
        const liveCoveragePercent = Number(row['live-coverage-percent']);
        const rolloutLiveRepositories = Number(row['rollout-live-repositories']);
        const rolloutRepositories = Number(row['rollout-repositories']);
        const coverageKnown = Number.isFinite(liveCoveragePercent) && Number.isFinite(rolloutLiveRepositories) && rolloutRepositories > 0;
        const coveragePercent = coverageKnown ? Math.min(100, Math.max(0, liveCoveragePercent)) : null;
        const reviewRepositories = coverageKnown ? rolloutRepositories - rolloutLiveRepositories : null;
        const dispatchCount = row['dispatch-count'] == null ? null : Number(row['dispatch-count']);
        const runTelemetryUnavailable = context.sources.runs?.metadata?.availability === 'unavailable' || !context.sources.runs;
        const outputCollectionUnavailable = context.sources.outcomes?.metadata?.availability === 'unavailable' || !context.sources.outcomes;
        const dispatchStatus = packageDispatchStatus(row, dispatchCount, runTelemetryUnavailable);
        const outputDispatchCount = row['dispatches-with-safe-output'] == null ? null : Number(row['dispatches-with-safe-output']);
        const dispatchText = Number.isFinite(dispatchCount)
          ? `${dispatchCount} dispatch${dispatchCount === 1 ? '' : 'es'}`
          : runTelemetryUnavailable ? 'Run telemetry unavailable' : 'Dispatches unavailable';
        const outputCountsKnown = dispatchCount !== null && outputDispatchCount !== null && Number.isFinite(dispatchCount) && Number.isFinite(outputDispatchCount);
        const outputText = outputCountsKnown
          ? (dispatchCount ?? 0) > 0 ? `${outputDispatchCount}/${dispatchCount} produced output` : 'No output opportunity'
          : outputCollectionUnavailable ? 'Output collection unavailable' : 'Outputs unavailable';
        const noOutputWarning = outputCountsKnown && (dispatchCount ?? 0) > 0 && outputDispatchCount === 0;
        const repoModes = Array.isArray(row['repository-modes']) ? row['repository-modes'].filter(isPlainObject) : [];
        const repoEntries = repoModes.length > 0 ? repoModes.filter((entry) => typeof entry.repository === 'string' && entry.repository) : [];
        const inventoryText = stringValue(row.inventory || 'Needs attention');
        return h(
          'article',
          {
            className: `package-status-card package-status-${stringValue(row['inventory-state']) === 'inventory-ready' ? 'ready' : 'attention'}`
          },
          h(
            'header',
            { className: 'package-status-header' },
            h('strong', null, h('a', { className: 'package-status-identity', href: stringValue(row.href) }, octicon(stringValue(row.icon) || 'package'), h('span', null, stringValue(row.title)))),
            inventoryText === 'Ready' ? null : h('span', { className: 'package-status-state' }, inventoryText)
          ),
          h(
            'div',
            { className: 'package-status-live-coverage' },
            h(
              'div',
              { className: 'package-status-live-coverage-heading' },
              h('div', null, h('span', null, 'Rollout'), h('strong', null, coverageKnown ? `${rolloutLiveRepositories} live · ${reviewRepositories} review` : 'No target data')),
              h('strong', null, coverageKnown ? `${coveragePercent}% live` : 'Unknown')
            ),
            coverageKnown ? h('progress', {
              max: 100,
              value: coveragePercent,
              'aria-label': `${rolloutLiveRepositories} of ${rolloutRepositories} target repositories are live`
            }) : null
          ),
          h(
            'div',
            { className: 'package-status-runtime' },
            h(
              'div',
              { className: 'package-status-repository-heading' },
              h('span', null, 'Target repositories'),
              h('span', null, 'Mode')
            ),
            repoEntries.length > 0
              ? h(
                  'ul',
                  { className: 'package-status-repositories' },
                  ...repoEntries.map((entry) => {
                    const repoMode = stringValue(entry.mode || 'review');
                    return h(
                      'li',
                      null,
                      h('span', { className: 'package-status-repository-name' }, octicon('repo'), h('span', null, stringValue(entry.repository))),
                      h('span', { className: `mode-badge ${repoMode.toLowerCase() === 'live' ? 'mode-live' : 'mode-review'}`.trim() }, octicon('dot-fill'), capitalize(repoMode))
                    );
                  })
                )
              : h('p', { className: 'package-status-repositories-empty' }, 'No repositories reported')
          ),
          h(
            'a',
            {
              className: `package-status-activity${noOutputWarning ? ' package-status-activity-warning' : ''}`,
              href: `#page-package-dispatches?package=${encodeURIComponent(stringValue(row.package))}`,
              title: stringValue(row['activity-window']),
              'aria-label': `Recent activity: ${dispatchStatus.detail}; ${dispatchText}; ${outputText}${noOutputWarning ? '; warning: dispatches produced no output' : ''}`
            },
            h(
              'span',
              { className: 'package-status-activity-heading' },
              h('span', { className: 'package-status-activity-label' }, 'Recent'),
              h(
                'span',
                {
                  className: `package-status-activity-state package-status-activity-state-${dispatchStatus.tone}`,
                  title: dispatchStatus.detail
                },
                octicon(dispatchStatus.icon),
                dispatchStatus.label
              )
            ),
            h('span', null, octicon('paper-airplane'), h('strong', null, dispatchText)),
            h(
              'span',
              noOutputWarning ? { title: 'Dispatched but produced no output' } : null,
              octicon(noOutputWarning ? 'alert' : 'shield-check'),
              h('strong', null, outputText)
            )
          )
        );
      })
    )
  );
}

/**
 * @param {Record<string, unknown>} row
 * @param {number | null} dispatchCount
 * @param {boolean} runTelemetryUnavailable
 */
function packageDispatchStatus(row, dispatchCount, runTelemetryUnavailable = false) {
  const successful = row['dispatch-success-count'] == null ? null : Number(row['dispatch-success-count']);
  const failed = row['dispatch-failure-count'] == null ? null : Number(row['dispatch-failure-count']);
  const approval = row['dispatch-approval-count'] == null ? null : Number(row['dispatch-approval-count']);
  const pending = row['dispatch-pending-count'] == null ? null : Number(row['dispatch-pending-count']);
  if (![dispatchCount, successful, failed, approval, pending].every(Number.isFinite)) {
    return {
      tone: 'unknown',
      icon: 'circle',
      label: 'Unknown',
      detail: runTelemetryUnavailable
        ? 'Recent dispatch status is unavailable because run telemetry was not collected.'
        : 'Recent dispatch status unavailable'
    };
  }

  const other = Math.max(0, Number(dispatchCount) - Number(successful) - Number(failed) - Number(approval) - Number(pending));
  const details = [
    Number(successful) > 0 ? `${successful} succeeded` : '',
    Number(failed) > 0 ? `${failed} failed` : '',
    Number(approval) > 0 ? `${approval} awaiting approval` : '',
    Number(pending) > 0 ? `${pending} in progress` : '',
    other > 0 ? `${other} other` : ''
  ].filter(Boolean);
  const detail = details.join(', ') || 'No recent dispatches';
  if (Number(failed) > 0) return { tone: 'failed', icon: 'x-circle', label: `${failed} failed`, detail };
  if (Number(approval) > 0) return { tone: 'attention', icon: 'clock', label: `${approval} awaiting approval`, detail };
  if (Number(pending) > 0) return { tone: 'attention', icon: 'sync', label: `${pending} in progress`, detail };
  if (other > 0) return { tone: 'unknown', icon: 'alert', label: `${other} other`, detail };
  if (Number(dispatchCount) > 0) return { tone: 'success', icon: 'check-circle', label: `${successful} succeeded`, detail };
  return { tone: 'unknown', icon: 'dash', label: 'None', detail };
}

/** @param {ElementRenderContext} context */
function renderSummaryGridElement(context) {
  const rows = rowsFor(context, context.sourceNames[0]).map((row) => ({
    label: stringValue(row.label),
    value: stringValue(row.value)
  }));
  return renderDefinitionList('summary-grid', rows);
}

/** @param {ElementRenderContext} context */
function renderReadinessVerdictElement(context) {
  const rows = rowsFor(context, context.sourceNames[0]);
  const verdict = stringValue(rows.find((row) => row.label === 'Control plane')?.value) || 'Evidence incomplete';
  const tone = verdict === 'Ready to ship' ? 'ready' : verdict === 'Not ready' ? 'blocked' : 'unknown';
  const icon = tone === 'ready' ? 'check-circle' : tone === 'blocked' ? 'x-circle' : 'alert';
  return h(
    'section',
    { className: `readiness-verdict readiness-verdict-${tone}`, role: 'status' },
    h(
      'div',
      { className: 'readiness-verdict-primary' },
      h('span', { className: 'readiness-verdict-icon', 'aria-hidden': 'true' }, octicon(icon)),
      h('span', { className: 'readiness-verdict-copy' },
        h('small', null, 'Release decision'),
        h('strong', null, verdict))
    ),
    renderDefinitionList('readiness-verdict-details', rows.filter((row) => row.label !== 'Control plane').map((row) => ({
      label: stringValue(row.label),
      value: stringValue(row.value)
    })))
  );
}

/**
 * @param {ElementRenderContext} context
 */
function renderContextSummaryElement(context) {
  const rows = context.sourceNames
    .flatMap((sourceName) => rowsFor(context, sourceName))
    .filter(isContextSummaryRow);
  return h(
    'dl',
    { className: 'context-summary', 'aria-label': context.title },
    ...rows.map((row) => h(
      'div',
      null,
      h('dt', null, stringValue(row.label)),
      h('dd', null, ...renderContextSummaryValue(row))
    ))
  );
}

/** @param {ElementRenderContext} context */
function renderAnomalyReadinessElement(context) {
  const sourceName = context.sourceNames[0];
  const row = sourceName ? rowsFor(context, sourceName)[0] : undefined;
  return row ? renderAnomalyReadiness(row) : null;
}

/** @param {Record<string, unknown>} row */
function isContextSummaryRow(row) {
  return typeof row.label === 'string'
    && (['string', 'number', 'boolean'].includes(typeof row.value) || Array.isArray(row.items));
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Array<string | HTMLElement | null>}
 */
function renderContextSummaryValue(row) {
  if (!Array.isArray(row.items)) return [stringValue(row.value)];
  return row.items.filter(isPlainObject).flatMap((item, index) => {
    const label = stringValue(item.label);
    const href = safeNavigationHref(item['navigation-href']);
    return [
      index > 0 ? ', ' : null,
      href ? h('a', { href }, label) : label
    ];
  });
}

/** @param {ElementRenderContext} context */
function renderSignalListElement(context) {
  const rows = rowsFor(context, context.sourceNames[0]);
  return h(
    'div',
    { className: 'signal-list-region' },
    context.description ? h('p', { className: 'signal-boundary-note' }, context.description) : null,
    h(
      'ol',
      { className: 'signal-list' },
      ...(rows.length > 0
        ? rows.map((row, index) => renderSignal(row, index))
        : [h(
          'li',
          { className: 'signal-clear' },
          h('span', { className: 'signal-icon' }, octicon('check-circle')),
          h('span', { className: 'signal-copy' }, h('strong', null, 'No signals require attention'))
        )])
    )
  );
}

/**
 * @param {Record<string, unknown>} row
 * @param {number} index
 */
function renderSignal(row, index) {
  const link = findLink(row, 'run-link') ?? findLink(row, 'external-link');
  const navigationHref = safeNavigationHref(row['navigation-href']);
  const navigationPage = stringValue(row['navigation-page']);
  const urgency = stringValue(row.urgency);
  const kind = stringValue(row.kind);
  const content = [
    h('span', { className: 'signal-rank', 'aria-hidden': 'true' }, String(index + 1)),
    h('span', { className: 'signal-icon' }, octicon(stringValue(row.icon) || 'issue')),
    h(
      'span',
      { className: 'signal-copy' },
      h('span', null, [urgency, kind].filter(Boolean).join(' · ')),
      h('strong', null, stringValue(row.title)),
      h('small', null, stringValue(row.detail))
    ),
    h(
      'span',
      { className: 'signal-evidence' },
      h('strong', null, stringValue(row.evidence)),
      h('small', null, stringValue(row.action) || 'View details')
    )
  ];
  const className = `signal-item signal-${stringValue(row.tone) || 'informational'}`;
  if (link) {
    return h('li', { className }, h('a', { href: link.href, 'aria-label': link.label }, ...content));
  }
  if (navigationPage) {
    return h('li', { className }, h('a', { href: `#page-${navigationPage}`, dataset: { navPageId: navigationPage } }, ...content));
  }
  if (navigationHref) {
    return h('li', { className }, h('a', { href: navigationHref }, ...content));
  }
  return h('li', { className }, h('div', null, ...content));
}

/** @param {unknown} value */
function safeNavigationHref(value) {
  if (typeof value !== 'string' || !value.startsWith('#')) return null;
  try {
    const url = new URL(value, 'https://dashboard.invalid/');
    return url.origin === 'https://dashboard.invalid' && url.hash === value ? value : null;
  } catch {
    return null;
  }
}

/**
 * @param {ElementRenderContext} context
 * @param {string} sourceName
 */
function rowsFor(context, sourceName) {
  return Array.isArray(context.sources[sourceName]?.rows) ? context.sources[sourceName].rows : [];
}

/**
 * @param {unknown} value
 */
function stringValue(value) {
  return value == null ? '' : String(value);
}

/**
 * @param {string} value
 */
function capitalize(value) {
  return value.length === 0 ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

/**
 * @param {string} value
 */
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'element';
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
