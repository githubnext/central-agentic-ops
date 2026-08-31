/**
 * Derived overview sources for generic JSON-selected dashboard rendering.
 */

import { formatNumber } from './view-formatters.js';
import { classifyUtilizationRatio, isApprovalConclusion, isFailureConclusion } from './components/run-classification.js';
import { buildAttentionItems } from './components/attention-rules.js';

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @returns {Record<string, import('./presenter.js').LogicalSourceInput>}
 */
export function deriveOverviewSources(sources) {
  const workflows = rowsFor(sources, 'workflows');
  const repositories = rowsFor(sources, 'repositories');
  const runs = rowsFor(sources, 'runs');
  const usage = rowsFor(sources, 'usage');
  const outcomes = rowsFor(sources, 'outcomes');
  const findings = rowsFor(sources, 'findings');
  const graderObservations = rowsFor(sources, 'grader-observations');
  const operationalValues = rowsFor(sources, 'operational-values');
  const packages = summarizePackages(workflows);
  const health = summarizeRunHealth(runs);
  const disabledWorkflows = workflows.filter((row) => String(row['workflow-active']) === 'false').length;
  const overviewMetadata = createOverviewMetadata(sources);
  const packageUsage = summarizePackageAicUsage(workflows, usage);
  const securitySignals = buildSecuritySignals({ workflows, runs, findings });
  const valueSignals = buildValueSignals({ sources, graderObservations, operationalValues, outcomes });
  const costSignals = buildCostSignals(sources.usage);

  return {
    ...sources,
    'overview-status': {
      source: 'overview-status',
      rows: [buildOverviewStatusRow({ sources, workflows, repositories, runs, usage, packages, health, disabledWorkflows })],
      metadata: overviewMetadata
    },
    'overview-vitals': {
      source: 'overview-vitals',
      rows: buildOverviewVitals({ sources, packages, health, workflows, repositories, runs }),
      metadata: overviewMetadata
    },
    'overview-execution-health': {
      source: 'overview-execution-health',
      rows: buildExecutionHealthRows(health),
      metadata: overviewMetadata
    },
    'overview-attention': {
      source: 'overview-attention',
      rows: buildAttentionRows({ sources, runs, findings: rowsFor(sources, 'findings'), packages, disabledWorkflows, health }),
      metadata: overviewMetadata
    },
    'overview-attention-domains': {
      source: 'overview-attention-domains',
      rows: buildDomainAttentionRows({
        sources,
        workflows,
        runs,
        usage,
        outcomes,
        findings,
        operationalValues,
        health
      }),
      metadata: overviewMetadata
    },
    'overview-managed-packages': {
      source: 'overview-managed-packages',
      rows: packages.map((entry) => ({
        package: entry.id,
        title: entry.name,
        mode: entry.mode,
        workers: entry.workers,
        'aic-allowance': entry.allowance,
        inventory: entry.ready ? 'Ready' : 'Needs attention',
        'inventory-state': entry.ready ? 'inventory-ready' : 'inventory-attention'
      })),
      metadata: overviewMetadata
    },
    'overview-package-utilization': {
      source: 'overview-package-utilization',
      rows: packages
        .filter((entry) => typeof entry.allowance === 'number' && entry.allowance > 0)
        .map((entry) => buildPackageUtilizationRow(entry, packageUsage, sources.usage)),
      metadata: overviewMetadata
    },
    'security-summary': {
      source: 'security-summary',
      rows: buildSecuritySummary({ runs, workflows, findings }),
      metadata: overviewMetadata
    },
    'security-signals': {
      source: 'security-signals',
      rows: securitySignals,
      metadata: overviewMetadata
    },
    'value-summary': {
      source: 'value-summary',
      rows: buildValueSummary(graderObservations, operationalValues, outcomes),
      metadata: overviewMetadata
    },
    'value-signals': {
      source: 'value-signals',
      rows: valueSignals,
      metadata: overviewMetadata
    },
    'value-workflows': {
      source: 'value-workflows',
      rows: buildValueWorkflowRows(operationalValues),
      metadata: overviewMetadata
    },
    'cost-summary': {
      source: 'cost-summary',
      rows: buildCostSummary(sources.usage),
      metadata: overviewMetadata
    },
    'cost-signals': {
      source: 'cost-signals',
      rows: costSignals,
      metadata: overviewMetadata
    },
    'cost-readiness': {
      source: 'cost-readiness',
      rows: [{
        tone: 'attention',
        icon: 'meter',
        kicker: 'Evaluation boundary',
        title: 'Budget and anomaly verdicts unavailable',
        detail: 'A budget verdict requires an applicable budget, matching time window, and complete measured usage. An anomaly verdict requires a qualified historical baseline and disclosed statistical rule.'
      }],
      metadata: overviewMetadata
    }
  };
}

/**
 * @param {import('./presenter.js').LogicalSourceInput | undefined} usageSource
 */
function buildCostSummary(usageSource) {
  const available = sourceIsAvailable(usageSource);
  const measuredRows = (usageSource?.rows ?? []).filter((row) => Number.isFinite(Number(row.aic)) && Number(row.aic) >= 0);
  const measuredAic = measuredRows.reduce((total, row) => total + Number(row.aic), 0);
  const measuredRuns = new Set(measuredRows.map((row) => usageRunKey(row)).filter(Boolean)).size;
  return [
    {
      label: 'Measured AIC',
      value: available ? formatAic(measuredAic) : '—',
      kicker: 'Resource operations',
      'collection-label': 'boundaries',
      note: 'AI Credit totals are allocation evidence, not monetary cost. Output yield is an investigation aid, not proof of efficiency or waste.'
    },
    { label: 'Measured runs', value: available ? formatNumber(measuredRuns) : '—' },
    { label: 'Measured episode AIC', value: '—' },
    { label: 'Episode output yield', value: '—' }
  ];
}

/**
 * @param {import('./presenter.js').LogicalSourceInput | undefined} usageSource
 */
function buildCostSignals(usageSource) {
  const available = sourceIsAvailable(usageSource);
  const complete = available && usageSource?.metadata?.completeness === 'complete';
  const signals = [];
  if (!available || !complete) {
    signals.push({
      priority: 1,
      count: 1,
      tone: 'informational',
      icon: 'codescan',
      kind: 'Usage coverage',
      title: available ? 'AI Credit telemetry is partial' : 'AI Credit telemetry is unavailable',
      detail: available
        ? 'Measured totals exclude runs whose usage artifacts were not collected.'
        : 'No complete usage feed is available for the configured scope.',
      evidence: available ? 'Partial evidence' : 'Evidence unavailable',
      action: 'View evidence',
      'navigation-page': 'usage'
    });
  }
  return [
    ...signals,
    {
      priority: 2,
      count: 1,
      tone: 'informational',
      icon: 'meter',
      kind: 'Budget boundary',
      title: 'Budget status is unavailable',
      detail: 'Retained usage is not aligned to a complete monthly budget measurement window.',
      evidence: 'Threshold unavailable',
      action: 'View evidence',
      'navigation-page': 'cost'
    },
    {
      priority: 3,
      count: 1,
      tone: 'informational',
      icon: 'graph',
      kind: 'Anomaly boundary',
      title: 'Cost anomalies are not evaluated',
      detail: 'The retained window does not establish a representative historical usage baseline.',
      evidence: 'Baseline unavailable',
      action: 'View evidence',
      'navigation-page': 'cost'
    }
  ];
}

/**
 * @param {Array<Record<string, unknown>>} graderObservations
 * @param {Array<Record<string, unknown>>} operationalValues
 * @param {Array<Record<string, unknown>>} outcomes
 */
function buildValueSummary(graderObservations, operationalValues, outcomes) {
  const selected = Math.max(graderObservations.length, operationalValues.length);
  const values = operationalValues
    .map((row) => row['operational-value'])
    .filter(isFiniteNumber);
  const mean = values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
  return [
    { label: 'Grader coverage', value: `${operationalValues.length} / ${selected}` },
    { label: 'Mature evidence', value: operationalValues.filter((row) => String(row['maturity-status']) === 'matured').length },
    { label: 'Mean operational value', value: mean === null ? '—' : formatPercent(mean) },
    { label: 'Open outputs', value: outcomes.filter((row) => String(row['outcome-state']) === 'pending').length }
  ];
}

/**
 * @param {{
 *   sources: Record<string, import('./presenter.js').LogicalSourceInput>,
 *   graderObservations: Array<Record<string, unknown>>,
 *   operationalValues: Array<Record<string, unknown>>,
 *   outcomes: Array<Record<string, unknown>>
 * }} input
 */
function buildValueSignals(input) {
  const signals = [];
  const valueMetadata = input.sources['operational-values']?.metadata;
  if (valueMetadata?.availability !== 'available') {
    signals.push({
      priority: 0,
      count: 1,
      tone: 'critical',
      icon: 'graph',
      kind: 'Missing grader data',
      title: 'Operational-value telemetry is unavailable',
      detail: 'No available operational-value source was retained.',
      evidence: 'Value unavailable',
      action: 'Review workflows',
      'navigation-page': 'workflows'
    });
  } else if (input.operationalValues.length === 0 && input.graderObservations.length === 0) {
    signals.push({
      priority: 1,
      count: 1,
      tone: 'informational',
      icon: 'graph',
      kind: 'Missing grader data',
      title: 'No operational-value observations retained',
      detail: 'The available source contains no operational-value observations.',
      evidence: 'Value unavailable',
      action: 'Review workflows',
      'navigation-page': 'workflows'
    });
  } else if (valueMetadata.completeness !== 'complete') {
    signals.push({
      priority: 0,
      count: 1,
      tone: 'critical',
      icon: 'issue',
      kind: 'Grader collection gap',
      title: 'Operational-value coverage is incomplete',
      detail: 'The retained operational-value source reports partial or unknown completeness.',
      evidence: 'Artifact gap',
      action: 'Review observations'
    });
  }

  const unavailable = input.graderObservations.filter((row) => (
    String(row.status) !== 'pass'
    || String(row['maturity-status']) === 'unavailable'
    || !isFiniteNumber(row.value)
  ));
  if (unavailable.length > 0) {
    signals.push({
      priority: 0,
      count: unavailable.length,
      tone: 'critical',
      icon: 'issue',
      kind: 'Grader unavailable',
      title: 'Operational-value results could not be used',
      detail: `${formatNumber(unavailable.length)} grader record${unavailable.length === 1 ? ' is' : 's are'} unavailable, invalid, or missing an observation`,
      evidence: 'Grader status',
      action: 'Review observations'
    });
  }

  const interim = input.operationalValues.filter((row) => String(row['maturity-status']) !== 'matured');
  if (interim.length > 0) {
    signals.push({
      priority: 1,
      count: interim.length,
      tone: 'action',
      icon: 'play',
      kind: 'Maturity pending',
      title: 'Outcome evidence is not mature',
      detail: `${formatNumber(interim.length)} observation${interim.length === 1 ? ' has not reached its' : 's have not reached their'} maturity time`,
      evidence: 'Re-evaluation due',
      action: 'Review observations'
    });
  }

  const usageMetadata = input.sources.usage?.metadata;
  if (usageMetadata?.availability !== 'available' || usageMetadata.completeness !== 'complete') {
    const unavailable = usageMetadata?.availability !== 'available';
    signals.push({
      priority: 2,
      count: 1,
      tone: 'informational',
      icon: 'meter',
      kind: 'AIC coverage',
      title: unavailable ? 'AI Credit telemetry is unavailable' : 'AI Credit telemetry is partial',
      detail: unavailable
        ? 'No available usage source was retained.'
        : 'The retained usage source reports partial or unknown completeness.',
      evidence: 'Usage gap',
      action: 'Review usage',
      'navigation-page': 'usage'
    });
  }

  const pendingOutcomes = input.outcomes.filter((row) => String(row['outcome-state']) === 'pending');
  if (pendingOutcomes.length > 0) {
    const latest = latestRow(pendingOutcomes);
    signals.push({
      priority: 3,
      count: pendingOutcomes.length,
      tone: 'warning',
      icon: 'issue',
      kind: 'Open output',
      title: 'Durable outputs still need disposition',
      detail: `${formatNumber(pendingOutcomes.length)} retained output${pendingOutcomes.length === 1 ? ' remains' : 's remain'} pending`,
      evidence: 'Outcome pending',
      action: 'View evidence',
      'run-link': latest?.['run-link'],
      'external-link': latest?.['external-link']
    });
  }

  const experimentsAvailable = input.sources.experiments?.metadata?.availability === 'available'
    && rowsFor(input.sources, 'experiments').length > 0
    && input.sources['experiment-assignments']?.metadata?.availability === 'available'
    && rowsFor(input.sources, 'experiment-assignments').length > 0;
  if (!experimentsAvailable) {
    signals.push({
      priority: 4,
      count: 1,
      tone: 'informational',
      icon: 'graph',
      kind: 'Experiment readiness',
      title: 'Experiment comparisons are unavailable',
      detail: 'No authoritative experiment definitions and assignment-to-run links are available for comparison.',
      evidence: 'Comparison unavailable',
      action: 'Review experiments',
      'navigation-page': 'experiments'
    });
  }

  return signals.sort((left, right) => left.priority - right.priority || right.count - left.count || left.title.localeCompare(right.title));
}

/**
 * @param {Array<Record<string, unknown>>} operationalValues
 */
function buildValueWorkflowRows(operationalValues) {
  return groupRows(operationalValues, (row) => [
    row.organization,
    row.repository,
    row.workflow || row['operational-value-definition']
  ].map(String).join(':')).flatMap(([, rows]) => {
    const valid = rows.filter((row) => (
      typeof row['operational-value'] === 'number'
      && Number.isFinite(row['operational-value'])
      && typeof row['evaluator-digest'] === 'string'
      && row['evaluator-digest'].length > 0
      && typeof row['operational-case'] === 'string'
      && row['operational-case'].length > 0
    ));
    const latestEvaluator = valid
      .toSorted((left, right) => evidenceAssignmentTime(right) - evidenceAssignmentTime(left))[0]?.['evaluator-digest'];
    if (!latestEvaluator) return [];

    const opportunities = new Map();
    for (const row of valid.filter((candidate) => candidate['evaluator-digest'] === latestEvaluator)) {
      const key = `${String(row.organization)}/${String(row.repository)}:${String(row['operational-case'])}`;
      const existing = opportunities.get(key);
      if (!existing || rowTimestamp(row) >= rowTimestamp(existing)) opportunities.set(key, row);
    }
    const comparable = [...opportunities.values()];
    if (comparable.length === 0) return [];

    const latest = /** @type {Record<string, unknown>} */ (latestRow(comparable));
    const values = comparable.map((row) => /** @type {number} */ (row['operational-value']));
    const baselines = comparable.flatMap((row) => (
      typeof row['delta-from-baseline'] === 'number' && Number.isFinite(row['delta-from-baseline'])
        ? [/** @type {number} */ (row['operational-value']) - row['delta-from-baseline']]
        : []
    ));
    return [{
      organization: latest.organization,
      repository: latest.repository,
      workflow: latest.workflow || latest['operational-value-definition'],
      'operational-value-definition': latest['operational-value-definition'],
      opportunities: comparable.length,
      'mature-observations': comparable.filter((row) => String(row['maturity-status']) === 'matured').length,
      'mean-operational-value': roundMetric(values.reduce((total, value) => total + value, 0) / values.length),
      'mean-baseline': baselines.length > 0
        ? roundMetric(baselines.reduce((total, value) => total + value, 0) / baselines.length)
        : null,
      run: latest.run,
      'observed-at': latest['observed-at'],
      'run-link': latest['run-link'] || latest['evidence-link']
    }];
  }).sort((left, right) => Number(right['mean-operational-value']) - Number(left['mean-operational-value']));
}

/**
 * @param {Record<string, unknown>} row
 */
function evidenceAssignmentTime(row) {
  const timestamp = Date.parse(String(row['requested-evidence-at'] ?? row['observed-at'] ?? ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * @param {{ sources: Record<string, import('./presenter.js').LogicalSourceInput>, workflows: Array<Record<string, unknown>>, runs: Array<Record<string, unknown>>, usage: Array<Record<string, unknown>>, outcomes: Array<Record<string, unknown>>, findings: Array<Record<string, unknown>>, operationalValues: Array<Record<string, unknown>>, health: ReturnType<typeof summarizeRunHealth> }} input
 */
function buildDomainAttentionRows(input) {
      const runTelemetryAvailable = input.sources.runs?.metadata?.availability === 'available';
      const warningOutputs = input.findings.filter((row) =>
        String(row['finding-status']) === 'open'
        && !['informational', 'unknown'].includes(String(row['finding-severity']))
      ).length;
      const inventoryGaps = input.workflows.filter((row) => row['inventory-ready'] === false).length;
      const openOutputs = input.outcomes.filter((row) => String(row['outcome-state']) === 'pending').length;
      const orchestratorPaths = new Set(input.workflows
        .filter((row) => String(row['workflow-role']) === 'orchestrator')
        .map((row) => String(row.workflow ?? ''))
        .filter(Boolean));
      const rootRuns = input.runs.filter((row) => orchestratorPaths.has(String(row.workflow ?? '')));
      const rootFailures = rootRuns.filter((row) => isFailureConclusion(row['run-conclusion'])).length;
      const selectedValueRuns = new Set(input.operationalValues
        .map((row) => String(row.run ?? ''))
        .filter(Boolean)).size || input.operationalValues.length;
      const valueAttentionRequired = openOutputs > 0
        || input.operationalValues.some((row) => row['maturity-status'] && row['maturity-status'] !== 'matured')
        || input.sources['operational-values']?.metadata?.completeness === 'partial';
      const measuredUsage = input.usage.filter((row) =>
        row.aic !== null && row.aic !== undefined && row.aic !== '' && Number.isFinite(Number(row.aic))
      );
      const measuredRuns = new Set(measuredUsage.map((row) => usageRunKey(row)).filter(Boolean)).size;
      const usageAvailable = input.sources.usage?.metadata?.availability === 'available';
      const usageComplete = input.sources.usage?.metadata?.completeness === 'complete';
      const usageTotal = measuredUsage.reduce((total, row) => total + Number(row.aic), 0);
      const collectionGaps = ['workflows', 'runs', 'usage'].filter((name) => {
        const metadata = input.sources[name]?.metadata;
        return metadata?.availability !== 'available'
          || metadata.completeness !== 'complete'
          || metadata.freshness !== 'fresh';
      }).length + inventoryGaps;
      const attributionGaps = rootRuns.length;
      const evidenceGaps = collectionGaps + attributionGaps;
      const securitySignals = input.health.approval + warningOutputs + inventoryGaps;

      return [
        domainRow({
          order: 0,
          priority: input.health.failed > 0 ? 0 : input.health.approval > 0 ? 1 : runTelemetryAvailable ? 2 : 3,
          state: input.health.failed > 0 ? 'Act now' : input.health.approval > 0 ? 'Investigate' : runTelemetryAvailable ? 'Monitor' : 'Unavailable',
          icon: input.health.failed > 0 ? 'issue' : 'check-circle',
          domain: 'Runtime health',
          value: runTelemetryAvailable ? `${formatCount(input.health.failed)} failed` : 'Not observed',
          detail: runTelemetryAvailable
            ? `${formatCount(input.health.successful)} of ${formatCount(input.health.total)} runs succeeded · ${formatCount(input.health.approval)} approval gates`
            : 'Actions run telemetry is unavailable.',
          href: '#page-runs'
        }),
        domainRow({
          order: 1,
          priority: input.health.approval > 0 || warningOutputs > 0 || inventoryGaps > 0 ? 1 : 3,
          state: input.health.approval > 0 || warningOutputs > 0 || inventoryGaps > 0 ? 'Investigate' : 'Unavailable',
          icon: 'shield',
          domain: 'Security & controls',
          value: `${formatCount(securitySignals)} signals`,
          detail: `No vulnerability feed · ${formatCount(input.health.approval)} approval gates · ${formatCount(warningOutputs)} explicit warnings · ${formatCount(inventoryGaps)} integrity gaps`,
          href: '#page-findings'
        }),
        domainRow({
          order: 3,
          priority: rootFailures > 0 ? 0 : attributionGaps > 0 ? 1 : 2,
          state: rootFailures > 0 ? 'Act now' : attributionGaps > 0 ? 'Investigate' : 'Monitor',
          icon: 'workflow',
          domain: 'Episodes & autonomy',
          value: `${formatCount(rootRuns.length)} observed`,
          detail: `0 of 0 worker dispatches attributed · ${formatCount(rootFailures)} root failure${rootFailures === 1 ? '' : 's'}`,
          href: '#page-runs'
        }),
        domainRow({
          order: 2,
          priority: valueAttentionRequired ? 1 : 3,
          state: valueAttentionRequired ? 'Investigate' : 'Unavailable',
          icon: 'beaker',
          domain: 'Value & outcomes',
          value: 'Threshold unavailable',
          detail: `${formatCount(input.operationalValues.length)} of ${formatCount(selectedValueRuns)} grader observations · ${formatCount(openOutputs)} open outputs`,
          href: '#page-operational-value'
        }),
        domainRow({
          order: 4,
          priority: usageAvailable && !usageComplete ? 1 : 3,
          state: !usageAvailable ? 'Unavailable' : !usageComplete ? 'Investigate' : 'Monitor',
          icon: 'meter',
          domain: 'Cost & efficiency',
          value: usageAvailable ? `${formatAic(usageTotal)} AIC` : 'Not observed',
          detail: usageAvailable
            ? `${formatCount(measuredRuns)} measured runs · monthly budget verdict unavailable`
            : 'AI Credit usage telemetry is unavailable.',
          href: '#page-cost'
        }),
        domainRow({
          order: 5,
          priority: evidenceGaps > 0 ? 1 : 2,
          state: evidenceGaps > 0 ? 'Investigate' : 'Monitor',
          icon: 'codescan',
          domain: 'Evidence quality',
          value: `${formatCount(evidenceGaps)} gaps`,
          detail: `${formatCount(collectionGaps)} collection or inventory gaps · ${formatCount(attributionGaps)} attribution gaps`,
          href: '#page-findings'
        })
      ].sort((left, right) => Number(left.priority) - Number(right.priority) || Number(left.order) - Number(right.order));
    }

/**
 * @param {{ order: number, priority: number, state: string, icon: string, domain: string, value: string, detail: string, href: string }} row
 */
function domainRow(row) {
      return {
        ...row,
        tone: row.state === 'Act now'
          ? 'critical'
          : row.state === 'Investigate'
            ? 'investigate'
            : row.state === 'Monitor' ? 'monitor' : 'unavailable'
      };
    }

/**
 * @param {number} value
 */
function roundMetric(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * @param {number} value
 */
function formatCount(value) {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
    }

/**
 * @param {number} value
 */
function formatAic(value) {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

/**
 * @param {{ runs: Array<Record<string, unknown>>, workflows: Array<Record<string, unknown>>, findings: Array<Record<string, unknown>> }} input
 */
function buildSecuritySummary(input) {
  return [
    { label: 'Approval gates', value: input.runs.filter((row) => String(row['run-conclusion']) === 'action-required').length },
    { label: 'Explicit warnings', value: input.findings.filter(isAuthoredWarning).length },
    { label: 'Package integrity gaps', value: input.workflows.filter((row) => row['inventory-ready'] === false).length },
    { label: 'Vulnerability findings', value: '—' }
  ];
}

/**
 * @param {{ workflows: Array<Record<string, unknown>>, runs: Array<Record<string, unknown>>, findings: Array<Record<string, unknown>> }} input
 */
function buildSecuritySignals(input) {
  const workflowNames = new Map(input.workflows.map((row) => [String(row.workflow ?? ''), String(row['workflow-name'] ?? row.workflow ?? 'Unknown workflow')]));
  const signals = [
    ...groupRows(input.runs.filter((row) => String(row['run-conclusion']) === 'action-required'), (row) => String(row.workflow ?? ''))
      .map(([workflow, rows]) => ({
        priority: 1,
        count: rows.length,
        tone: 'action',
        icon: 'shield',
        kind: 'Approval gate',
        title: workflowNames.get(workflow) ?? workflow,
        detail: `${formatNumber(rows.length)} run${rows.length === 1 ? ' requires' : 's require'} maintainer approval`,
        evidence: 'Execution control',
        action: 'View evidence',
        'run-link': latestRow(rows)?.['run-link']
      })),
    ...groupRows(input.workflows.filter((row) => row['inventory-ready'] === false), (row) => String(row.package ?? row.workflow ?? ''))
      .map(([key, rows]) => ({
        priority: 2,
        count: rows.length,
        tone: 'informational',
        icon: 'package',
        kind: 'Package integrity',
        title: String(rows[0]?.['package-name'] ?? rows[0]?.['workflow-name'] ?? key),
        detail: `${formatNumber(rows.length)} workflow definition${rows.length === 1 ? '' : 's'} failed inventory readiness checks`,
        evidence: 'Inventory gap',
        action: 'View package',
        'navigation-page': 'packages'
      })),
    ...groupRows(input.findings.filter(isAuthoredWarning), findingWorkflowKey)
      .map(([workflow, rows]) => ({
        priority: 3,
        count: rows.length,
        tone: 'warning',
        icon: 'issue',
        kind: 'Authored warning',
        title: workflowNames.get(workflow) ?? String(rows[0]?.['finding-summary'] ?? workflow),
        detail: `${formatNumber(rows.length)} retained output${rows.length === 1 ? ' contains' : 's contain'} an explicit warning block`,
        evidence: 'Output content',
        action: 'View evidence',
        'external-link': latestRow(rows)?.['external-link']
      }))
  ];
  return signals.sort((left, right) => left.priority - right.priority || right.count - left.count || left.title.localeCompare(right.title));
}

/**
 * @param {Record<string, unknown>} row
 */
function isAuthoredWarning(row) {
  return String(row['finding-kind']) === 'authored-warning';
}

/**
 * @param {Record<string, unknown>} row
 */
function findingWorkflowKey(row) {
  return String(row.workflow ?? '');
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {(row: Record<string, unknown>) => string} keyFor
 */
function groupRows(rows, keyFor) {
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const groups = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.entries()];
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function latestRow(rows) {
  return rows.toSorted((left, right) => rowTimestamp(right) - rowTimestamp(left))[0];
}

/**
 * @param {Record<string, unknown>} row
 */
function rowTimestamp(row) {
  const timestamp = Date.parse(String(row['observed-at'] ?? row['started-at'] ?? ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * @param {{ sources: Record<string, import('./presenter.js').LogicalSourceInput>, workflows: Array<Record<string, unknown>>, repositories: Array<Record<string, unknown>>, runs: Array<Record<string, unknown>>, usage: Array<Record<string, unknown>>, packages: ReturnType<typeof summarizePackages>, health: ReturnType<typeof summarizeRunHealth>, disabledWorkflows: number }} input
 */
function buildOverviewStatusRow(input) {
  const { sources, workflows, repositories, runs, usage, packages, health, disabledWorkflows } = input;
  const hasRunTelemetry = sources.runs?.metadata?.availability !== 'unavailable';
  const repositoryCount = repositories.length > 0
    ? new Set(repositories.map(repositoryKey).filter(Boolean)).size
    : distinctRepositories(workflows, runs);
  const failureRepositories = new Set(health.failedRows.map(repositoryKey).filter(Boolean)).size;
  const scope = [...new Set(workflows
    .map((row) => String(row.organization ?? '').trim())
    .filter(Boolean))]
    .sort()
    .join(' + ') || 'Configured repositories';
  const status = !hasRunTelemetry
    ? { className: 'control-plane-monitoring', icon: 'eye', label: 'Monitoring' }
    : health.failed > 0
      ? { className: 'control-plane-critical', icon: 'issue', label: 'Attention required' }
      : health.approval > 0 || disabledWorkflows > 0
        ? { className: 'control-plane-monitoring', icon: 'issue', label: 'Approval required' }
        : { className: 'control-plane-healthy', icon: 'check-circle', label: 'Healthy' };
  const statusCopy = !hasRunTelemetry
    ? 'Run telemetry is unavailable, so execution health cannot be determined.'
    : health.failed > 0
      ? `${formatNumber(health.failed)} of ${formatNumber(health.total)} runs failed across ${formatNumber(failureRepositories)} of ${formatNumber(repositoryCount)} repositories in the current window.`
      : health.approval > 0
        ? `${formatNumber(health.approval)} run${health.approval === 1 ? ' is' : 's are'} waiting for maintainer approval.`
        : `No failures observed across ${formatNumber(health.total)} runs in the current window.`;
  const usageCoverage = usage.length > 0
    ? `${formatNumber(new Set(usage.map((row) => String(row.run ?? '')).filter(Boolean)).size)} AIC artifacts`
    : 'AIC unavailable';
  const usageCompleteness = sources.usage?.metadata?.completeness === 'partial' ? 'partial' : '';

  return {
    scope,
    'status-class': status.className,
    'status-icon': status.icon,
    'status-label': status.label,
    'status-copy': statusCopy,
    'health-total': health.total,
    'coverage-label': `${usageCoverage}${usageCompleteness ? ` · ${usageCompleteness}` : ''}`,
    packages: packages.length,
    'managed-workers': packages.reduce((total, entry) => total + entry.workers, 0),
    'active-workflows': workflows.filter(isActiveWorkflow).length,
    'disabled-workflows': disabledWorkflows,
    repositories: repositoryCount,
    'has-run-telemetry': hasRunTelemetry
  };
}

/**
 * @param {{ sources: Record<string, import('./presenter.js').LogicalSourceInput>, packages: ReturnType<typeof summarizePackages>, health: ReturnType<typeof summarizeRunHealth>, workflows: Array<Record<string, unknown>>, repositories: Array<Record<string, unknown>>, runs: Array<Record<string, unknown>> }} input
 */
function buildOverviewVitals(input) {
  const { sources, packages, health, workflows, repositories, runs } = input;
  const hasRunTelemetry = sources.runs?.metadata?.availability !== 'unavailable';
  const disabledWorkflows = workflows.filter((row) => String(row['workflow-active']) === 'false').length;
  const managedWorkers = packages.reduce((total, entry) => total + entry.workers, 0);
  const repositoryCount = repositories.length > 0
    ? new Set(repositories.map(repositoryKey).filter(Boolean)).size
    : distinctRepositories(workflows, runs);
  return [
    { label: 'Managed packages', value: packages.length, detail: `${managedWorkers} worker workflow${managedWorkers === 1 ? '' : 's'}` },
    { label: 'Active workflows', value: workflows.filter(isActiveWorkflow).length, detail: `${disabledWorkflows} disabled · ${repositoryCount} repositories` },
    { label: 'Runs · 24h', value: hasRunTelemetry ? health.total : '—', detail: sourceWindowLabel(sources.runs) },
    {
      label: 'Failure rate',
      value: hasRunTelemetry && health.total > 0 ? formatPercent(health.failed / health.total) : '—',
      detail: hasRunTelemetry ? `${health.failed} failed runs` : 'Telemetry unavailable',
      className: 'vital-failures'
    }
  ];
}

/**
 * @param {ReturnType<typeof summarizeRunHealth>} health
 */
function buildExecutionHealthRows(health) {
  return [
    ['successful', health.successful, 'execution-success'],
    ['failed', health.failed, 'execution-failed'],
    ['approval required', health.approval, 'execution-approval'],
    ['other', health.other, 'execution-other']
  ].map(([label, value, className]) => ({ label, value, className, total: health.total }));
}

/**
 * @param {{ sources: Record<string, import('./presenter.js').LogicalSourceInput>, runs: Array<Record<string, unknown>>, findings: Array<Record<string, unknown>>, packages: ReturnType<typeof summarizePackages>, disabledWorkflows: number, health: ReturnType<typeof summarizeRunHealth> }} input
 */
function buildAttentionRows(input) {
  const failedRepositories = new Set(input.health.failedRows.map(repositoryKey).filter(Boolean)).size;
  const packageGaps = input.packages.filter((entry) => !entry.ready).length;
  const openFindings = input.findings.filter((row) => String(row['finding-status']) === 'open').length;
  const coverageGaps = ['workflows', 'runs', 'usage'].filter((name) => {
    const metadata = input.sources[name]?.metadata;
    return metadata?.availability !== 'available' || metadata.completeness !== 'complete' || metadata.freshness !== 'fresh';
  });
  return buildAttentionItems({
    'runs-failed': { count: input.health.failed, repositories: failedRepositories },
    'runs-approval': { count: input.health.approval },
    'disabled-workflows': { count: input.disabledWorkflows },
    'package-gaps': { count: packageGaps },
    'open-findings': { count: openFindings },
    'coverage-gaps': { count: coverageGaps.length, list: coverageGaps.join(', ') }
  });
}

/**
 * @param {ReturnType<typeof summarizePackages>[number]} entry
 * @param {ReturnType<typeof summarizePackageAicUsage>} usageByPackage
 * @param {import('./presenter.js').LogicalSourceInput | undefined} usageSource
 */
function buildPackageUtilizationRow(entry, usageByPackage, usageSource) {
  const available = usageSource?.metadata?.availability !== 'unavailable';
  const used = usageByPackage.used.get(entry.id) ?? 0;
  const reportedRuns = usageByPackage.reportedRuns.get(entry.id) ?? 0;
  const allowance = /** @type {number} */ (entry.allowance);
  const ratio = available && allowance > 0 ? used / allowance : null;
  const meterPercent = ratio === null ? 0 : Math.min(100, ratio * 100);
  const status = !available || ratio === null ? 'empty' : classifyUtilizationRatio(ratio);
  return {
    package: entry.id,
    title: entry.name,
    status,
    value: !available || ratio === null ? '—' : formatPercent(ratio),
    'meter-percent': meterPercent,
    detail: !available
      ? 'AI Credit usage artifacts are unavailable.'
      : reportedRuns === 0
        ? 'No completed runs in the retained window.'
        : `${formatNumber(used)} of ${formatNumber(allowance)} AIC across ${formatNumber(reportedRuns)} reported run${reportedRuns === 1 ? '' : 's'}.`,
    'aria-label': ratio === null
      ? `${entry.name}: no utilization available`
      : `${entry.name}: ${formatNumber(used)} of ${formatNumber(allowance)} AI Credits used, ${formatPercent(ratio)}`
  };
}

/**
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
 * @param {Array<Record<string, unknown>>} rows
 */
function summarizeRunHealth(rows) {
  const failedRows = rows.filter((row) => isFailureConclusion(row['run-conclusion']));
  const approval = rows.filter((row) => isApprovalConclusion(row['run-conclusion'])).length;
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
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
 * @returns {import('./presenter.js').SourceMetadata}
 */
function createOverviewMetadata(sources) {
  const sourceMetadata = Object.values(sources).map((source) => source?.metadata).filter(Boolean);
  const latest = sourceMetadata
    .map((metadata) => metadata['retrieved-at'])
    .filter((value) => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? new Date(0).toISOString();
  return {
    'source-id': 'derived-overview',
    'source-kind': 'derived',
    'as-of': latest,
    'retrieved-at': latest,
    completeness: sourceMetadata.some((metadata) => metadata.completeness === 'partial')
      ? 'partial'
      : sourceMetadata.length > 0 && sourceMetadata.every((metadata) => metadata.completeness === 'complete') ? 'complete' : 'unknown',
    freshness: sourceMetadata.some((metadata) => metadata.freshness === 'stale')
      ? 'stale'
      : sourceMetadata.length > 0 && sourceMetadata.every((metadata) => metadata.freshness === 'fresh') ? 'fresh' : 'unknown',
    availability: 'available'
  };
}

/**
 * @param {Record<string, import('./presenter.js').LogicalSourceInput>} sources
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
 * @param {import('./presenter.js').LogicalSourceInput | undefined} source
 */
function sourceIsAvailable(source) {
  return Boolean(source && Array.isArray(source.rows) && source.metadata?.availability !== 'unavailable');
}

/**
 * @param {Record<string, unknown>} row
 */
function usageRunKey(row) {
  const run = String(row.run ?? '').trim();
  const context = `${repositoryKey(row)}:${String(row.workflow ?? '')}`;
  if (run) return `${context}:${run}`;
  const invocation = String(row.invocation ?? '').trim();
  return invocation ? `${context}:${invocation}` : '';
}

/**
 * @param {...Array<Record<string, unknown>>} collections
 * @returns {number}
 */
function distinctRepositories(...collections) {
  return new Set(collections.flat().map(repositoryKey).filter(Boolean)).size;
}

/**
 * @param {import('./presenter.js').LogicalSourceInput | undefined} source
 * @returns {string}
 */
function sourceWindowLabel(source) {
  if (!source || source.metadata?.availability === 'unavailable') return 'Actions run data unavailable';
  const state = source.metadata?.completeness === 'complete' ? 'Complete' : 'Partial';
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
