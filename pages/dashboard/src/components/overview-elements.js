/**
 * Report-style overview elements composed from canonical dashboard sources.
 */

import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { renderModeBadge } from './badge.js';
import { formatNumber, renderTemplate, resolveThresholdStatus } from '../view-formatters.js';
import runConclusionClassification from './run-conclusion-classification.json' with { type: 'json' };
import packageAicUtilizationThresholds from './package-aic-utilization-thresholds.json' with { type: 'json' };
import attentionRules from './attention-rules.json' with { type: 'json' };

const FAILURE_CONCLUSIONS = new Set(runConclusionClassification.failure);
const APPROVAL_CONCLUSIONS = new Set(runConclusionClassification.approval);

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @returns {HTMLElement}
 */
export function renderControlPlaneStatusElement(sources) {
  const workflows = rowsFor(sources, 'workflows');
  const repositories = rowsFor(sources, 'repositories');
  const runs = rowsFor(sources, 'runs');
  const usage = rowsFor(sources, 'usage');
  const packages = summarizePackages(workflows);
  const health = summarizeRunHealth(runs);
  const repositoryCount = repositories.length > 0
    ? new Set(repositories.map(repositoryKey).filter(Boolean)).size
    : distinctRepositories(workflows, runs);
  const activeWorkflows = workflows.filter(isActiveWorkflow).length;
  const disabledWorkflows = workflows.filter((row) => String(row['workflow-active']) === 'false').length;
  const scope = [...new Set(workflows
    .map((row) => String(row.organization ?? '').trim())
    .filter(Boolean))]
    .sort()
    .join(' + ') || 'Configured repositories';
  const managedWorkers = packages.reduce((total, entry) => total + entry.workers, 0);

  return renderControlPlaneStatus({
    scope,
    packages: packages.length,
    managedWorkers,
    activeWorkflows,
    disabledWorkflows,
    repositoryCount,
    health,
    runsSource: sources.runs,
    usageSource: sources.usage,
    usage
  });
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @returns {HTMLElement}
 */
export function renderPackageAicUtilizationElement(sources) {
  const workflows = rowsFor(sources, 'workflows');
  const packages = summarizePackages(workflows);
  return renderPackageAicUtilization(
    packages,
    summarizePackageAicUsage(workflows, rowsFor(sources, 'usage')),
    sources.usage
  );
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @returns {HTMLElement}
 */
export function renderAttentionPanelElement(sources) {
  const workflows = rowsFor(sources, 'workflows');
  const runs = rowsFor(sources, 'runs');
  const health = summarizeRunHealth(runs);
  return renderAttentionPanel(buildAttentionItems({
    sources,
    runs,
    findings: rowsFor(sources, 'findings'),
    packages: summarizePackages(workflows),
    disabledWorkflows: workflows.filter((row) => String(row['workflow-active']) === 'false').length,
    health
  }));
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @returns {HTMLElement}
 */
export function renderManagedPackagesElement(sources) {
  return renderManagedPackages(summarizePackages(rowsFor(sources, 'workflows')));
}

/**
 * @param {{
 *   scope: string,
 *   packages: number,
 *   managedWorkers: number,
 *   activeWorkflows: number,
 *   disabledWorkflows: number,
 *   repositoryCount: number,
 *   health: ReturnType<typeof summarizeRunHealth>,
 *   runsSource?: import('../presenter.js').LogicalSourceInput,
 *   usageSource?: import('../presenter.js').LogicalSourceInput,
 *   usage: Array<Record<string, unknown>>
 * }} summary
 * @returns {HTMLElement}
 */
function renderControlPlaneStatus(summary) {
  const hasRunTelemetry = summary.runsSource?.metadata?.availability !== 'unavailable';
  const status = !hasRunTelemetry
    ? { className: 'control-plane-monitoring', icon: 'eye', label: 'Monitoring' }
    : summary.health.failed > 0
      ? { className: 'control-plane-critical', icon: 'issue', label: 'Attention required' }
      : summary.health.approval > 0 || summary.disabledWorkflows > 0
        ? { className: 'control-plane-monitoring', icon: 'issue', label: 'Approval required' }
        : { className: 'control-plane-healthy', icon: 'check-circle', label: 'Healthy' };
  const failureRepositories = new Set(summary.health.failedRows.map(repositoryKey).filter(Boolean)).size;
  const healthWindow = sourceWindowLabel(summary.runsSource);
  const usageCoverage = summary.usage.length > 0
    ? `${formatNumber(new Set(summary.usage.map((row) => String(row.run ?? '')).filter(Boolean)).size)} AIC artifacts`
    : 'AIC unavailable';
  const usageCompleteness = summary.usageSource?.metadata?.completeness === 'partial' ? 'partial' : '';
  const statusCopy = !hasRunTelemetry
    ? 'Run telemetry is unavailable, so execution health cannot be determined.'
    : summary.health.failed > 0
      ? `${formatNumber(summary.health.failed)} of ${formatNumber(summary.health.total)} runs failed across ${formatNumber(failureRepositories)} of ${formatNumber(summary.repositoryCount)} repositories in the current window.`
      : summary.health.approval > 0
        ? `${formatNumber(summary.health.approval)} run${summary.health.approval === 1 ? ' is' : 's are'} waiting for maintainer approval.`
        : `No failures observed across ${formatNumber(summary.health.total)} runs in the current window.`;

  return h(
    'section',
    {
      className: `control-plane-status ${status.className}`,
      'aria-labelledby': 'control-plane-heading'
    },
    h(
      'header',
      null,
      h(
        'div',
        { className: 'control-plane-heading' },
        h('span', { className: 'control-plane-state-icon' }, octicon(status.icon)),
        h(
          'div',
          null,
          h('span', { className: 'scope-kicker' }, `Control plane · ${summary.scope}`),
          h('h3', { id: 'control-plane-heading' }, status.label),
          h('p', null, statusCopy)
        )
      )
    ),
    h(
      'dl',
      { className: 'control-plane-vitals' },
      renderVital('Managed packages', summary.packages, `${summary.managedWorkers} worker workflow${summary.managedWorkers === 1 ? '' : 's'}`),
      renderVital('Active workflows', summary.activeWorkflows, `${summary.disabledWorkflows} disabled · ${summary.repositoryCount} repositories`),
      renderVital('Runs · 24h', hasRunTelemetry ? summary.health.total : '—', healthWindow),
      renderVital(
        'Failure rate',
        hasRunTelemetry && summary.health.total > 0 ? formatPercent(summary.health.failed / summary.health.total) : '—',
        hasRunTelemetry ? `${summary.health.failed} failed runs` : 'Telemetry unavailable',
        'vital-failures'
      )
    ),
    renderExecutionHealth(summary.health, `${usageCoverage}${usageCompleteness ? ` · ${usageCompleteness}` : ''}`)
  );
}

/**
 * @param {string} label
 * @param {string | number} value
 * @param {string} detail
 * @param {string} [className]
 * @returns {HTMLElement}
 */
function renderVital(label, value, detail, className = '') {
  return h(
    'div',
    { className },
    h('dt', null, label),
    h('dd', null, String(value)),
    h('p', null, detail)
  );
}

/**
 * @param {ReturnType<typeof summarizeRunHealth>} health
 * @param {string} coverage
 * @returns {HTMLElement}
 */
function renderExecutionHealth(health, coverage) {
  const segments = [
    ['successful', health.successful, 'execution-success'],
    ['failed', health.failed, 'execution-failed'],
    ['approval required', health.approval, 'execution-approval'],
    ['other', health.other, 'execution-other']
  ];
  const ariaLabel = segments.map(([label, value]) => `${value} ${label}`).join(', ');
  return h(
    'div',
    { className: 'execution-health' },
    h(
      'div',
      { className: 'execution-health-heading' },
      h('strong', null, '24-hour execution health'),
      h(
        'span',
        null,
        coverage,
        ' · ',
        h('a', { href: '#page-runs', dataset: { navPageId: 'runs' } }, 'View all runs')
      )
    ),
    h(
      'div',
      { className: 'execution-track', role: 'img', 'aria-label': ariaLabel },
      ...segments.map(([, value, className]) => h('span', {
        className: String(className),
        style: `width: ${health.total > 0 ? (Number(value) / health.total * 100).toFixed(3) : '0'}%`
      }))
    ),
    h(
      'ul',
      { className: 'execution-legend' },
      ...segments.map(([label, value, className]) => h(
        'li',
        null,
        h('span', { className: String(className).replace('execution-', 'legend-') }),
        titleCase(String(label)),
        h('strong', null, String(value))
      ))
    )
  );
}

/**
 * @param {Array<{ icon: string, tone: string, title: string, detail: string }>} items
 * @returns {HTMLElement}
 */
function renderAttentionPanel(items) {
  return h(
    'section',
    { className: 'attention-panel', 'aria-labelledby': 'attention-panel-heading' },
    h(
      'header',
      null,
      h('div', null, h('span', { className: 'scope-kicker' }, 'Act now'), h('h3', { id: 'attention-panel-heading' }, 'Needs attention')),
      h('span', { className: 'attention-count', 'aria-label': `${items.length} attention items` }, String(items.length))
    ),
    h(
      'ul',
      { className: 'attention-list' },
      ...(items.length > 0
        ? items.map((item) => h(
          'li',
          { className: `attention-item attention-${item.tone}` },
          h('span', { className: 'attention-icon' }, octicon(item.icon)),
          h('div', null, h('strong', null, item.title), h('p', null, item.detail))
        ))
        : [h(
          'li',
          { className: 'attention-item attention-success' },
          h('span', { className: 'attention-icon' }, octicon('check-circle')),
          h('div', null, h('strong', null, 'No immediate action required'), h('p', null, 'No failures, approval gates, disabled workflows, or coverage gaps were observed.'))
        )])
    )
  );
}

/**
 * @param {ReturnType<typeof summarizePackages>} packages
 * @returns {HTMLElement}
 */
function renderManagedPackages(packages) {
  return h(
    'section',
    { className: 'managed-packages', 'aria-labelledby': 'managed-packages-heading' },
    h(
      'header',
      null,
      h('span', { className: 'scope-kicker' }, 'Control plane'),
      h('h3', { id: 'managed-packages-heading' }, 'Managed packages')
    ),
    h(
      'div',
      { className: 'managed-package-list' },
      ...(packages.length > 0
        ? packages.map((entry) => h(
          'article',
          { className: 'managed-package-card', dataset: { packageId: entry.id } },
          h(
            'header',
            null,
            h('div', null, h('span', { className: 'managed-package-icon' }, octicon('package')), h('h4', null, entry.name)),
            renderModeBadge(entry.mode)
          ),
          h(
            'dl',
            null,
            renderPackageDetail('Workers', entry.workers),
            renderPackageDetail('AIC allowance', entry.allowance === null ? '—' : formatNumber(entry.allowance)),
            renderPackageDetail('Inventory', entry.ready ? 'Ready' : 'Needs attention', entry.ready ? 'inventory-ready' : 'inventory-attention')
          )
        ))
        : [h('p', { className: 'empty' }, 'No managed packages observed.')])
    )
  );
}

/**
 * Renders the report's package-level AI Credit utilization panel: actual AIC
 * spend against each package's summed per-run allowance, with a threshold-
 * colored meter bar per package (Section: Parity, "Package AI Credit
 * utilization bars and threshold treatments").
 * @param {ReturnType<typeof summarizePackages>} packages
 * @param {ReturnType<typeof summarizePackageAicUsage>} usageByPackage
 * @param {import('../presenter.js').LogicalSourceInput | undefined} usageSource
 * @returns {HTMLElement}
 */
function renderPackageAicUtilization(packages, usageByPackage, usageSource) {
  const available = usageSource?.metadata?.availability !== 'unavailable';
  const complete = usageSource?.metadata?.completeness !== 'partial';
  const eligiblePackages = packages.filter((entry) => typeof entry.allowance === 'number' && entry.allowance > 0);
  const summary = available
    ? `Actual AI Credits against summed per-run limits for retained package runs.${complete ? '' : ' Partial usage coverage.'}`
    : 'AI Credit usage artifacts are unavailable.';

  return h(
    'section',
    { className: 'package-aic-utilization', 'aria-labelledby': 'package-aic-utilization-heading' },
    h(
      'header',
      null,
      h('span', { className: 'scope-kicker' }, 'Control plane'),
      h('h3', { id: 'package-aic-utilization-heading' }, 'Package AIC utilization'),
      h('p', null, summary)
    ),
    h(
      'div',
      { className: 'utilization-grid' },
      ...(eligiblePackages.length > 0
        ? eligiblePackages.map((entry) => renderPackageUtilizationCard(entry, usageByPackage, available))
        : [h('p', { className: 'empty' }, 'No packages with a configured AIC allowance were observed.')])
    )
  );
}

/**
 * @param {ReturnType<typeof summarizePackages>[number]} entry
 * @param {ReturnType<typeof summarizePackageAicUsage>} usageByPackage
 * @param {boolean} available
 * @returns {HTMLElement}
 */
function renderPackageUtilizationCard(entry, usageByPackage, available) {
  const used = usageByPackage.used.get(entry.id) ?? 0;
  const reportedRuns = usageByPackage.reportedRuns.get(entry.id) ?? 0;
  const allowance = /** @type {number} */ (entry.allowance);
  const ratio = available && allowance > 0 ? used / allowance : null;
  const meterPercent = ratio === null ? 0 : Math.min(100, ratio * 100);
  const status = !available || ratio === null ? 'empty' : resolveThresholdStatus(ratio, packageAicUtilizationThresholds);
  const valueText = !available || ratio === null ? '—' : formatPercent(ratio);
  const detail = !available
    ? 'AI Credit usage artifacts are unavailable.'
    : reportedRuns === 0
      ? 'No completed runs in the retained window.'
      : `${formatNumber(used)} of ${formatNumber(allowance)} AIC across ${formatNumber(reportedRuns)} reported run${reportedRuns === 1 ? '' : 's'}.`;
  const ariaLabel = ratio === null
    ? `${entry.name}: no utilization available`
    : `${entry.name}: ${formatNumber(used)} of ${formatNumber(allowance)} AI Credits used, ${formatPercent(ratio)}`;

  return h(
    'article',
    { className: `utilization-item utilization-${status}`, dataset: { packageId: entry.id } },
    h('header', null, h('span', null, entry.name), h('strong', null, valueText)),
    h(
      'div',
      { className: 'utilization-track', role: 'img', 'aria-label': ariaLabel },
      h('span', { style: `width: ${meterPercent.toFixed(2)}%` })
    ),
    h('p', null, detail)
  );
}

/**
 * Aggregates reported AI Credit usage per package by joining usage rows to
 * their owning package through the workflow path recorded on each workflow
 * inventory row.
 * @param {Array<Record<string, unknown>>} workflows
 * @param {Array<Record<string, unknown>>} usage
 * @returns {{ used: Map<string, number>, reportedRuns: Map<string, number> }}
 */
function summarizePackageAicUsage(workflows, usage) {
  /** @type {Map<string, string>} */
  const workflowToPackage = new Map();
  for (const row of workflows) {
    const packageId = row.package;
    const workflowPath = row.workflow;
    if (typeof packageId === 'string' && packageId.length > 0 && typeof workflowPath === 'string' && workflowPath.length > 0) {
      workflowToPackage.set(workflowPath, packageId);
    }
  }
  /** @type {Map<string, number>} */
  const used = new Map();
  /** @type {Map<string, number>} */
  const reportedRuns = new Map();
  for (const row of usage) {
    const workflowPath = typeof row.workflow === 'string' ? row.workflow : '';
    const packageId = workflowToPackage.get(workflowPath);
    if (!packageId) continue;
    const aic = Number(row.aic);
    if (!Number.isFinite(aic)) continue;
    used.set(packageId, (used.get(packageId) ?? 0) + aic);
    reportedRuns.set(packageId, (reportedRuns.get(packageId) ?? 0) + 1);
  }
  return { used, reportedRuns };
}

/**
 * @param {string} label
 * @param {string | number} value
 * @param {string} [className]
 * @returns {HTMLElement}
 */
function renderPackageDetail(label, value, className = '') {
  return h('div', null, h('dt', null, label), h('dd', { className }, String(value)));
}

/**
 * Named providers resolving the JSON-configured attention rules' `metric` reference to a
 * `{ count, ...templateValues }` object. Each provider derives its values from already
 * summarized dashboard data, keeping the attention panel's copy, ordering, icons, and tones
 * fully data-driven via `attention-rules.json`.
 * @type {Record<string, (input: {
 *   sources: Record<string, import('../presenter.js').LogicalSourceInput>,
 *   runs: Array<Record<string, unknown>>,
 *   findings: Array<Record<string, unknown>>,
 *   packages: ReturnType<typeof summarizePackages>,
 *   disabledWorkflows: number,
 *   health: ReturnType<typeof summarizeRunHealth>
 * }) => { count: number } & Record<string, unknown>>}
 */
const ATTENTION_METRIC_PROVIDERS = {
  'runs-failed': (input) => ({
    count: input.health.failed,
    repositories: new Set(input.health.failedRows.map(repositoryKey).filter(Boolean)).size
  }),
  'runs-approval': (input) => ({ count: input.health.approval }),
  'disabled-workflows': (input) => ({ count: input.disabledWorkflows }),
  'package-gaps': (input) => ({ count: input.packages.filter((entry) => !entry.ready).length }),
  'open-findings': (input) => ({ count: input.findings.filter((row) => String(row['finding-status']) === 'open').length }),
  'coverage-gaps': (input) => {
    const coverageGaps = ['workflows', 'runs', 'usage'].filter((name) => {
      const metadata = input.sources[name]?.metadata;
      return metadata?.availability !== 'available' || metadata.completeness !== 'complete' || metadata.freshness !== 'fresh';
    });
    return { count: coverageGaps.length, list: coverageGaps.join(', ') };
  }
};

/**
 * @param {{
 *   sources: Record<string, import('../presenter.js').LogicalSourceInput>,
 *   runs: Array<Record<string, unknown>>,
 *   findings: Array<Record<string, unknown>>,
 *   packages: ReturnType<typeof summarizePackages>,
 *   disabledWorkflows: number,
 *   health: ReturnType<typeof summarizeRunHealth>
 * }} input
 */
function buildAttentionItems(input) {
  return attentionRules
    .map((rule) => {
      const values = ATTENTION_METRIC_PROVIDERS[rule.metric]?.(input);
      if (!values || !(Number(values.count) > 0)) {
        return null;
      }
      return {
        icon: rule.icon,
        tone: rule.tone,
        title: renderTemplate(rule.title, values),
        detail: renderTemplate(rule.detail, values)
      };
    })
    .filter((item) => item !== null);
}


/**
 * @param {Array<Record<string, unknown>>} rows
 */
function summarizeRunHealth(rows) {
  const failedRows = rows.filter((row) => FAILURE_CONCLUSIONS.has(String(row['run-conclusion'])));
  const approval = rows.filter((row) => APPROVAL_CONCLUSIONS.has(String(row['run-conclusion']))).length;
  const successful = rows.filter((row) => String(row['run-conclusion']) === 'success').length;
  return {
    total: rows.length,
    successful,
    failed: failedRows.length,
    failedRows,
    approval,
    other: Math.max(0, rows.length - successful - failedRows.length - approval)
  };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function summarizePackages(rows) {
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const grouped = new Map();
  for (const row of rows) {
    if (typeof row.package !== 'string' || row.package.length === 0) continue;
    const packageRows = grouped.get(row.package) ?? [];
    packageRows.push(row);
    grouped.set(row.package, packageRows);
  }
  return [...grouped.entries()]
    .map(([id, packageRows]) => {
      const workers = packageRows.filter((row) => String(row['workflow-role']) === 'worker');
      const orchestrators = packageRows.filter((row) => String(row['workflow-role']) === 'orchestrator');
      const allowances = packageRows
        .map((row) => Number(row['max-ai-credits']))
        .filter((value) => Number.isFinite(value) && value > 0);
      const packageAllowance = Number(packageRows.find((row) => Number.isFinite(Number(row['package-aic-allowance'])))?.['package-aic-allowance']);
      const packageWorkerCount = Number(packageRows.find((row) => Number.isFinite(Number(row['package-worker-count'])))?.['package-worker-count']);
      const explicitReady = packageRows.map((row) => row['inventory-ready']).filter((value) => typeof value === 'boolean');
      return {
        id,
        name: String(packageRows.find((row) => typeof row['package-name'] === 'string')?.['package-name'] ?? titleCase(id)),
        workers: Number.isFinite(packageWorkerCount) ? packageWorkerCount : workers.length,
        mode: String(orchestrators[0]?.['rollout-mode'] ?? packageRows[0]?.['rollout-mode'] ?? 'unknown'),
        allowance: Number.isFinite(packageAllowance)
          ? packageAllowance
          : allowances.length > 0 ? allowances.reduce((total, value) => total + value, 0) : null,
        ready: explicitReady.includes(false)
          ? false
          : explicitReady.length > 0
            ? true
            : orchestrators.length === 1 && workers.length > 0 && packageRows.every(isActiveWorkflow)
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {string} name
 * @returns {Array<Record<string, unknown>>}
 */
function rowsFor(sources, name) {
  return Array.isArray(sources[name]?.rows) ? sources[name].rows : [];
}

/**
 * @param {Record<string, unknown>} row
 * @returns {boolean}
 */
function isActiveWorkflow(row) {
  return String(row['workflow-active']) === 'true';
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
function repositoryKey(row) {
  const repository = String(row.repository ?? '').trim();
  if (!repository) return '';
  const organization = String(row.organization ?? '').trim();
  return organization ? `${organization}/${repository}` : repository;
}

/**
 * @param {...Array<Record<string, unknown>>} collections
 * @returns {number}
 */
function distinctRepositories(...collections) {
  return new Set(collections.flat().map(repositoryKey).filter(Boolean)).size;
}

/**
 * @param {import('../presenter.js').LogicalSourceInput | undefined} source
 * @returns {string}
 */
function sourceWindowLabel(source) {
  if (!source || source.metadata.availability === 'unavailable') return 'Actions run data unavailable';
  const state = source.metadata.completeness === 'complete' ? 'Complete' : 'Partial';
  return `${state} 24-hour Actions run window`;
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatPercent(value) {
  return new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

/**
 * @param {string} value
 * @returns {string}
 */
function titleCase(value) {
  return value
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
