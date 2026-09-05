// @ts-nocheck
import { h } from '../dom.js';
import { octicon } from '../octicons.js';
import { rowsFor } from './source-rows.js';

const UNKNOWN = '—';

/**
 * Renders the experiment decision surface from experiment, assignment, grader,
 * eval, and run grains without treating workflow completion as experiment success.
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderExperimentsEvaluation(context) {
  const model = buildModel(context.sources);
  if (model.experiments.length === 0) {
    return renderEmptyState(context.sources);
  }

  const root = h('div', { className: 'experiments-evaluation' });
  const filters = initialFilters(model);
  let selectedExperiment = filters.experiment || model.experiments[0].id;

  const render = () => {
    const visible = filterExperiments(model.experiments, filters);
    if (!visible.some((experiment) => experiment.id === selectedExperiment)) {
      selectedExperiment = visible[0]?.id ?? '';
    }
    root.replaceChildren(
      renderFilterBar(model, filters, () => {
        syncDeepLink(filters, selectedExperiment);
        render();
      }),
      renderDecisionOverview(visible),
      renderDecisionTable(visible, selectedExperiment, (experimentId) => {
        selectedExperiment = experimentId;
        filters.experiment = experimentId;
        syncDeepLink(filters, selectedExperiment);
        render();
      }),
      visible.length === 0
        ? h('div', { className: 'experiment-empty', role: 'status' }, h('strong', null, 'No experiments match the selected filters.'), h('p', null, 'Clear one or more filters to restore the decision view.'))
        : renderExperimentDetails(model, selectedExperiment)
    );
  };

  render();
  return root;
}

function buildModel(sources) {
  const experimentRows = rowsFor(sources, 'experiments');
  const assignments = rowsFor(sources, 'experiment-assignments');
  const graderDefinitions = rowsFor(sources, 'graders');
  const evalDefinitions = rowsFor(sources, 'evals');
  const runs = rowsFor(sources, 'runs');
  const assignmentByRun = new Map(assignments.map((row) => [text(row.run), row]));
  const runById = new Map(runs.map((row) => [text(row.run), row]));
  const graderById = new Map(graderDefinitions.map((row) => [text(row.grader), row]));
  const evalById = new Map(evalDefinitions.map((row) => [text(row.eval), row]));
  const graders = rowsFor(sources, 'grader-observations').map((row) => normalizeObservation(row, assignmentByRun, graderById.get(text(row.grader)), 'grader'));
  const evals = rowsFor(sources, 'eval-observations').map((row) => normalizeObservation(row, assignmentByRun, evalById.get(text(row.eval)), 'eval'));
  const experimentIds = new Set([
    ...experimentRows.map((row) => text(row.experiment)),
    ...assignments.map((row) => text(row.experiment)),
    ...graders.map((row) => row.experiment),
    ...evals.map((row) => row.experiment)
  ].filter(Boolean));
  const definitionById = new Map(experimentRows.map((row) => [text(row.experiment), row]));
  const experiments = [...experimentIds].map((id) => summarizeExperiment({
    id,
    definition: definitionById.get(id) ?? {},
    assignments: assignments.filter((row) => text(row.experiment) === id),
    graders: graders.filter((row) => row.experiment === id),
    evals: evals.filter((row) => row.experiment === id)
  })).sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name));

  return { experiments, assignments, graders, evals, runById, graderById, evalById };
}

function normalizeObservation(row, assignmentByRun, definition, sourceType) {
  const assignment = assignmentByRun.get(text(row.run)) ?? {};
  const identifier = text(sourceType === 'grader' ? row.grader : row.eval);
  const result = sourceType === 'grader' ? finite(row.value) : normalizeEvalResult(row['eval-result'] ?? row.result);
  return {
    ...row,
    experiment: text(row.experiment || assignment.experiment),
    variant: text(row.variant || assignment.variant || 'unknown'),
    identifier,
    sourceType,
    result,
    role: upper(row.role || definition?.role || 'SECONDARY'),
    direction: text(row.direction || definition?.direction || 'higher_is_better'),
    unit: text(row.unit || definition?.unit || (sourceType === 'eval' ? 'answer' : 'raw')),
    threshold: finite(row.threshold ?? definition?.threshold),
    included: includedObservation(row),
    exclusionReason: text(row['exclusion-reason'] || row.reason),
    observedAt: text(row['observed-at']),
    evidenceLink: safeLink(row['evidence-link']) || safeLink(row['grader-link']) || safeLink(row['eval-link'])
  };
}

function summarizeExperiment({ id, definition, assignments, graders, evals }) {
  const observations = [...graders, ...evals];
  const variants = [...new Set(assignments.map((row) => text(row.variant)).filter(Boolean))];
  const control = text(definition['control-variant'] || variants.find((variant) => /control|baseline/i.test(variant)) || variants[0] || 'control');
  const candidate = text(definition['candidate-variant'] || variants.find((variant) => variant !== control) || variants[1] || 'candidate');
  const primaryId = text(definition['primary-metric'] || observations.find((observation) => observation.role === 'PRIMARY')?.identifier);
  const primary = observations.filter((observation) => observation.identifier === primaryId && observation.included);
  const controlValues = primary.filter((observation) => observation.variant === control).map(numericObservation).filter(Number.isFinite);
  const candidateValues = primary.filter((observation) => observation.variant === candidate).map(numericObservation).filter(Number.isFinite);
  const rawEffect = finite(definition.effect) ?? difference(mean(candidateValues), mean(controlValues));
  const direction = primary[0]?.direction || text(definition.direction || 'higher_is_better');
  const normalizedEffect = finite(definition['normalized-effect']) ?? normalizeEffect(rawEffect, direction);
  const guardrails = metricSummaries(observations, control, candidate).filter((metric) => metric.role === 'GUARDRAIL');
  const regressingGuardrails = guardrails.filter((metric) => metric.regression);
  const usable = observations.filter((observation) => observation.included).length;
  const excluded = observations.length - usable;
  const readiness = upper(definition.readiness || definition.state || 'COLLECTING');
  const decision = upper(definition.decision || (readiness === 'READY' ? 'INCONCLUSIVE' : readiness));
  const lastObservation = observations.map((observation) => observation.observedAt).filter(Boolean).sort().at(-1) || text(definition['last-observation']);
  return {
    id,
    name: text(definition['experiment-name'] || id),
    organization: text(definition.organization || assignments[0]?.organization),
    repository: text(definition.repository || assignments[0]?.repository),
    package: text(definition.package || assignments[0]?.package),
    workflow: text(definition.workflow || assignments[0]?.workflow),
    control,
    candidate,
    primaryId: primaryId || UNKNOWN,
    primarySource: primary[0]?.sourceType || text(definition['primary-source']) || UNKNOWN,
    controlN: primary.filter((observation) => observation.variant === control).length,
    candidateN: primary.filter((observation) => observation.variant === candidate).length,
    usable,
    excluded,
    readiness,
    decision,
    normalizedEffect,
    evidenceStrength: text(definition['evidence-strength'] || readinessLabel(readiness)),
    guardrailCount: guardrails.length,
    regressingGuardrails,
    lastObservation,
    observations,
    assignments,
    priority: regressingGuardrails.length > 0 ? 0 : readiness === 'READY' ? 1 : readiness === 'COLLECTING' ? 2 : 3
  };
}

function renderFilterBar(model, filters, onChange) {
  const controls = [
    ['organization', 'Organization', distinct(model.experiments, 'organization')],
    ['repository', 'Repository', distinct(model.experiments, 'repository')],
    ['package', 'Package', distinct(model.experiments, 'package')],
    ['workflow', 'Workflow / agent', distinct(model.experiments, 'workflow')],
    ['experiment', 'Experiment', model.experiments.map((item) => item.id)],
    ['state', 'State', distinct(model.experiments, 'readiness')],
    ['variant', 'Variant', [...new Set(model.experiments.flatMap((item) => [item.control, item.candidate]))]],
    ['source', 'Metric source', ['grader', 'eval']],
    ['metric', 'Grader / eval', [...new Set([...model.graders, ...model.evals].map((row) => row.identifier).filter(Boolean))]]
  ];
  return h(
    'form',
    { className: 'experiment-filters', 'aria-label': 'Experiments and evaluation filters', onsubmit: (event) => event.preventDefault() },
    ...controls.map(([key, label, values]) => {
      const select = h(
        'select',
        {
          name: key,
          'aria-label': label,
          onchange: (event) => {
            filters[key] = event.currentTarget.value;
            onChange();
          }
        },
        h('option', { value: '' }, `All ${label.toLowerCase()}`),
        ...values.map((value) => h('option', { value, selected: filters[key] === value }, value))
      );
      return h('label', null, h('span', null, label), select);
    }),
    h(
      'label',
      null,
      h('span', null, 'Date range'),
      h(
        'select',
        {
          name: 'range',
          'aria-label': 'Date range',
          onchange: (event) => {
            filters.range = event.currentTarget.value;
            onChange();
          }
        },
        ...[['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['90d', 'Last 90 days'], ['all', 'All recorded']].map(([value, label]) => h('option', { value, selected: filters.range === value }, label))
      )
    )
  );
}

function renderDecisionOverview(experiments) {
  const active = experiments.filter((experiment) => !['PROMOTE', 'REJECT'].includes(experiment.decision)).length;
  const ready = experiments.filter((experiment) => experiment.readiness === 'READY').length;
  const regressions = experiments.filter((experiment) => experiment.regressingGuardrails.length > 0).length;
  const usable = experiments.reduce((total, experiment) => total + experiment.usable, 0);
  const excluded = experiments.reduce((total, experiment) => total + experiment.excluded, 0);
  const coverage = usable + excluded > 0 ? usable / (usable + excluded) : null;
  const pending = experiments.filter((experiment) => ['READY', 'INCONCLUSIVE', 'EXTEND'].includes(experiment.decision)).length;
  const stateCounts = countBy(experiments, (experiment) => experiment.readiness);
  return h(
    'section',
    { className: 'experiment-overview', 'aria-labelledby': 'experiment-overview-title' },
    h(
      'div',
      { className: 'experiment-readiness-chart', 'data-chart-widget': 'pie' },
      h('div', {
        className: 'experiment-readiness-donut',
        role: 'img',
        'aria-label': [...stateCounts].map(([state, count]) => `${count} ${state.toLowerCase()}`).join(', '),
        style: `--ready:${percentage(stateCounts.get('READY') ?? 0, experiments.length)}deg;--collecting:${percentage((stateCounts.get('READY') ?? 0) + (stateCounts.get('COLLECTING') ?? 0), experiments.length)}deg`
      }, h('span', null, String(experiments.length))),
      h('div', null, h('h2', { id: 'experiment-overview-title' }, 'Decision readiness'), h('p', null, 'Experiment state, never workflow-run success.'), renderLegend(stateCounts))
    ),
    h(
      'dl',
      { className: 'experiment-summary' },
      summaryItem('Active experiments', active),
      summaryItem('Ready for decision', ready),
      summaryItem('Guardrail regressions', regressions),
      summaryItem('Usable observations', coverage === null ? UNKNOWN : `${(coverage * 100).toFixed(1)}%`),
      summaryItem('Decisions pending', pending)
    )
  );
}

function renderDecisionTable(experiments, selectedId, onSelect) {
  return h(
    'section',
    { className: 'experiment-section', 'aria-labelledby': 'experiment-decisions-title' },
    sectionHeading('experiment-decisions-title', 'Experiment decisions', 'Guardrail failures and decision-ready experiments are shown first.'),
    h(
      'div',
      { className: 'table-region experiment-table-region' },
      h(
        'table',
        { className: 'experiment-decision-table' },
        h('thead', null, h('tr', null, ...['Experiment', 'Workflow / agent', 'Variants', 'Primary metric', 'Usable samples', 'Effect', 'Evidence', 'Guardrails', 'Readiness', 'Decision', 'Last observation'].map((label) => h('th', { scope: 'col' }, label)))),
        h(
          'tbody',
          null,
          ...experiments.map((experiment) => h(
            'tr',
            { className: experiment.id === selectedId ? 'selected' : '', 'aria-selected': String(experiment.id === selectedId) },
            h('th', { scope: 'row' }, h('button', { type: 'button', onclick: () => onSelect(experiment.id) }, experiment.name)),
            h('td', null, experiment.workflow || UNKNOWN),
            h('td', null, `${experiment.control} → ${experiment.candidate}`),
            h('td', null, sourceLabel(experiment.primarySource, experiment.primaryId)),
            h('td', null, `${experiment.controlN} / ${experiment.candidateN}`, experiment.excluded ? h('small', null, `${experiment.excluded} excluded`) : null),
            h('td', null, renderEffect(experiment.normalizedEffect)),
            h('td', null, experiment.evidenceStrength),
            h('td', null, statusBadge(experiment.regressingGuardrails.length ? `${experiment.regressingGuardrails.length} regressing` : `${experiment.guardrailCount}/${experiment.guardrailCount} passing`, experiment.regressingGuardrails.length ? 'danger' : 'success')),
            h('td', null, statusBadge(experiment.readiness, experiment.readiness === 'READY' ? 'success' : 'attention')),
            h('td', null, statusBadge(experiment.decision, decisionTone(experiment.decision))),
            h('td', null, formatDate(experiment.lastObservation))
          ))
        )
      )
    )
  );
}

function renderExperimentDetails(model, experimentId) {
  const experiment = model.experiments.find((candidate) => candidate.id === experimentId);
  if (!experiment) return h('div');
  const metrics = metricSummaries(experiment.observations, experiment.control, experiment.candidate);
  const evalMetrics = metrics.filter((metric) => metric.sourceType === 'eval');
  const graderRegressions = metrics.filter((metric) => metric.sourceType === 'grader').sort((left, right) => left.normalizedEffect - right.normalizedEffect);
  return h(
    'div',
    { className: 'experiment-detail', 'data-selected-experiment': experiment.id },
    h('div', { className: 'experiment-selection-heading' }, h('div', null, h('span', null, 'Selected experiment'), h('h2', null, experiment.name)), statusBadge(experiment.decision, decisionTone(experiment.decision))),
    renderMetricComparison(metrics, experiment),
    renderEvalOutcomes(evalMetrics, experiment),
    renderGraderDiagnostics(graderRegressions),
    renderObservationQuality(experiment),
    renderRunEvidence(model, experiment)
  );
}

function metricSummaries(observations, control, candidate) {
  const groups = new Map();
  for (const observation of observations) {
    const key = `${observation.sourceType}:${observation.identifier}`;
    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const first = group[0];
    const controlRows = group.filter((row) => row.variant === control && row.included);
    const candidateRows = group.filter((row) => row.variant === candidate && row.included);
    const controlValue = aggregateObservations(controlRows, first.sourceType);
    const candidateValue = aggregateObservations(candidateRows, first.sourceType);
    const rawEffect = difference(candidateValue, controlValue);
    const normalizedEffect = normalizeEffect(rawEffect, first.direction);
    const thresholdRegression = first.role === 'GUARDRAIL' && first.threshold !== null
      ? (first.direction === 'lower_is_better' ? candidateValue > first.threshold : candidateValue < first.threshold)
      : false;
    return {
      identifier: first.identifier,
      sourceType: first.sourceType,
      role: first.role,
      direction: first.direction,
      unit: first.unit,
      threshold: first.threshold,
      controlValue,
      candidateValue,
      rawEffect,
      normalizedEffect,
      controlN: controlRows.length,
      candidateN: candidateRows.length,
      excluded: group.length - controlRows.length - candidateRows.length,
      regression: thresholdRegression || (Number.isFinite(normalizedEffect) && normalizedEffect < 0)
    };
  }).sort((left, right) => roleOrder(left.role) - roleOrder(right.role) || left.identifier.localeCompare(right.identifier));
}

function renderMetricComparison(metrics, experiment) {
  return h(
    'section',
    { className: 'experiment-section', 'aria-labelledby': 'metric-comparison-title' },
    sectionHeading('metric-comparison-title', 'Variant × metric comparison', `${experiment.control} compared with ${experiment.candidate}; arrows account for metric direction.`),
    metrics.length === 0
      ? partialState('Assignments exist, but no grader or eval observations are available.')
      : h(
        'div',
        { className: 'table-region experiment-metric-region' },
        h(
          'table',
          { className: 'experiment-metric-table' },
          h('thead', null, h('tr', null, ...['Role', 'Metric', 'Source', 'Direction', experiment.control, experiment.candidate, 'Δ normalized', 'Usable / excluded', 'Threshold'].map((label) => h('th', { scope: 'col' }, label)))),
          h('tbody', null, ...metrics.map((metric) => h(
            'tr',
            null,
            h('td', null, statusBadge(metric.role, metric.role === 'GUARDRAIL' ? 'attention' : 'neutral')),
            h('th', { scope: 'row' }, metric.identifier),
            h('td', null, metric.sourceType),
            h('td', null, metric.direction.replaceAll('_', ' ')),
            h('td', null, formatMetric(metric.controlValue, metric.unit)),
            h('td', null, formatMetric(metric.candidateValue, metric.unit)),
            h('td', null, renderEffect(metric.normalizedEffect)),
            h('td', null, `${metric.controlN + metric.candidateN} / ${metric.excluded}`),
            h('td', null, metric.threshold === null ? UNKNOWN : formatMetric(metric.threshold, metric.unit))
          )))
        )
      )
  );
}

function renderEvalOutcomes(metrics, experiment) {
  return h(
    'section',
    { className: 'experiment-section', 'aria-labelledby': 'eval-outcomes-title' },
    sectionHeading('eval-outcomes-title', 'Eval outcomes', 'Unknown and missing answers remain separate from NO.'),
    metrics.length === 0
      ? partialState('No eval observations are available for this experiment.')
      : h('div', { className: 'eval-outcome-list' }, ...metrics.map((metric) => {
        const matching = experiment.observations.filter((row) => row.sourceType === 'eval' && row.identifier === metric.identifier);
        return h(
          'article',
          { className: 'eval-outcome' },
          h('header', null, h('div', null, h('strong', null, metric.identifier), h('span', null, `${metric.candidateN + metric.controlN} usable · ${metric.excluded} excluded`)), renderEffect(metric.normalizedEffect)),
          renderEvalBar(experiment.control, matching.filter((row) => row.variant === experiment.control)),
          renderEvalBar(experiment.candidate, matching.filter((row) => row.variant === experiment.candidate))
        );
      }))
  );
}

function renderEvalBar(label, rows) {
  const yes = rows.filter((row) => row.included && row.result === 'YES').length;
  const no = rows.filter((row) => row.included && row.result === 'NO').length;
  const unknown = rows.length - yes - no;
  const total = rows.length || 1;
  return h(
    'div',
    { className: 'eval-bar-row' },
    h('span', null, label),
    h(
      'div',
      { className: 'eval-stacked-bar', role: 'img', 'aria-label': `${label}: ${yes} yes, ${no} no, ${unknown} unknown or missing` },
      h('span', { className: 'yes', style: `width:${yes / total * 100}%` }, yes ? `YES ${yes}` : ''),
      h('span', { className: 'no', style: `width:${no / total * 100}%` }, no ? `NO ${no}` : ''),
      h('span', { className: 'unknown', style: `width:${unknown / total * 100}%` }, unknown ? `? ${unknown}` : '')
    )
  );
}

function renderGraderDiagnostics(metrics) {
  return h(
    'section',
    { className: 'experiment-section', 'aria-labelledby': 'grader-diagnostics-title' },
    sectionHeading('grader-diagnostics-title', 'Grader regressions', 'Largest direction-aware regressions are ranked first.'),
    metrics.length === 0
      ? partialState('No grader observations are available for this experiment.')
      : h(
        'ol',
        { className: 'grader-ranking' },
        ...metrics.map((metric) => h(
          'li',
          null,
          h('span', { className: 'grader-rank-icon', 'aria-hidden': 'true' }, metric.regression ? octicon('arrow-down') : octicon('arrow-up')),
          h('strong', null, metric.identifier),
          h('span', null, renderEffect(metric.normalizedEffect)),
          h('span', null, `N ${metric.controlN + metric.candidateN}`),
          statusBadge(metric.role, metric.regression ? 'danger' : 'neutral')
        ))
      )
  );
}

function renderObservationQuality(experiment) {
  const reasons = countBy(
    experiment.observations.filter((observation) => !observation.included),
    (observation) => observation.exclusionReason || `${observation.sourceType} missing`
  );
  const assignedRuns = new Set(experiment.assignments.map((row) => text(row.run)).filter(Boolean)).size;
  const coverage = experiment.usable + experiment.excluded > 0 ? experiment.usable / (experiment.usable + experiment.excluded) : null;
  return h(
    'section',
    { className: 'experiment-section observation-quality', 'aria-labelledby': 'observation-quality-title' },
    sectionHeading('observation-quality-title', 'Observation quality and exclusions', 'Coverage is calculated from observations, not successful workflow executions.'),
    coverage !== null && coverage < .9 ? h('div', { className: 'experiment-warning', role: 'note' }, octicon('alert'), h('span', null, 'Large effects require caution because usable observation coverage is below 90%.')) : null,
    h(
      'div',
      { className: 'exclusion-flow' },
      h('div', null, h('span', null, 'Assigned runs'), h('strong', null, String(assignedRuns))),
      h('div', null, h('span', null, 'Usable observations'), h('strong', null, String(experiment.usable)), h('small', null, coverage === null ? UNKNOWN : `${(coverage * 100).toFixed(1)}%`)),
      h('div', null, h('span', null, 'Excluded'), h('strong', null, String(experiment.excluded))),
      h('ul', null, ...[...reasons].map(([reason, count]) => h('li', null, h('span', null, reason), h('strong', null, String(count)))))
    )
  );
}

function renderRunEvidence(model, experiment) {
  const rows = experiment.assignments.map((assignment) => {
    const run = model.runById.get(text(assignment.run)) ?? {};
    const observations = experiment.observations.filter((observation) => text(observation.run) === text(assignment.run));
    const primary = observations.find((observation) => observation.identifier === experiment.primaryId);
    const guardrails = observations.filter((observation) => observation.role === 'GUARDRAIL');
    const evals = observations.filter((observation) => observation.sourceType === 'eval');
    const included = observations.some((observation) => observation.included);
    const reason = [...new Set([
      text(assignment['exclusion-reason']),
      ...observations.filter((observation) => !observation.included).map((observation) => observation.exclusionReason)
    ].filter(Boolean))].join(', ');
    return { assignment, run, observations, primary, guardrails, evals, included, reason };
  });
  return h(
    'section',
    { className: 'experiment-section', 'aria-labelledby': 'run-evidence-title' },
    sectionHeading('run-evidence-title', 'Run evidence', 'Inspect assignments, observations, exclusions, and retained supporting evidence.'),
    rows.length === 0
      ? partialState('Experiment configured, but no assignments are available.')
      : h(
        'div',
        { className: 'table-region run-evidence-region' },
        h(
          'table',
          { className: 'run-evidence-table' },
          h('thead', null, h('tr', null, ...['Run', 'Variant', 'Primary', 'Guardrails', 'Evals', 'Included', 'Reason', 'Evidence'].map((label) => h('th', { scope: 'col' }, label)))),
          h('tbody', null, ...rows.map((row) => h(
            'tr',
            null,
            h('th', { scope: 'row' }, renderEvidenceLink(row.run['run-link'], text(row.assignment.run))),
            h('td', null, text(row.assignment.variant) || UNKNOWN),
            h('td', null, row.primary ? formatMetric(numericObservation(row.primary), row.primary.unit) : UNKNOWN),
            h('td', null, row.guardrails.length ? statusBadge(row.guardrails.some((observation) => !observation.included) ? 'Review' : `${row.guardrails.length}/${row.guardrails.length}`, row.guardrails.some((observation) => !observation.included) ? 'danger' : 'success') : UNKNOWN),
            h('td', null, row.evals.length ? `${row.evals.filter((observation) => observation.included).length}/${row.evals.length}` : UNKNOWN),
            h('td', null, row.included ? 'Yes' : 'No'),
            h('td', null, row.reason || UNKNOWN),
            h('td', null, renderEvidenceActions(row))
          )))
        )
      )
  );
}

function renderEvidenceActions(row) {
  const links = [
    ['Assignment', row.assignment['assignment-link']],
    ['Workflow execution', row.run['run-link']],
    ['Artifacts', row.assignment['artifact-link']],
    ['Trace', row.assignment['trace-link']],
    ...row.observations.map((observation) => [observation.sourceType === 'eval' ? 'Eval' : 'Grader', observation.evidenceLink])
  ].filter(([, value]) => safeLink(value));
  return links.length
    ? h('details', { className: 'evidence-menu' }, h('summary', null, 'Open evidence'), h('ul', null, ...links.map(([label, value]) => h('li', null, renderEvidenceLink(value, label)))))
    : h('span', { className: 'muted' }, 'Unavailable');
}

function renderEmptyState(sources) {
  const experimentSource = sources.experiments;
  const unavailable = experimentSource?.metadata?.availability === 'unavailable';
  return h(
    'div',
    { className: 'experiment-empty', role: 'status' },
    octicon(unavailable ? 'alert' : 'beaker'),
    h('strong', null, unavailable ? 'Experiment source unavailable' : 'No experiments configured'),
    h('p', null, unavailable
      ? 'Experiment definitions could not be accessed. No decision can be calculated.'
      : 'Configure an experiment and retain assignments before evaluating candidate outcomes.')
  );
}

function initialFilters(model) {
  const hash = globalThis.window?.location?.hash ?? '';
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const parameters = new URLSearchParams(query);
  const requestedExperiment = parameters.get('experiment') ?? '';
  return {
    organization: parameters.get('organization') ?? '',
    repository: parameters.get('repository') ?? '',
    package: parameters.get('package') ?? '',
    workflow: parameters.get('workflow') ?? '',
    experiment: model.experiments.some((item) => item.id === requestedExperiment) ? requestedExperiment : '',
    state: parameters.get('state') ?? '',
    variant: parameters.get('variant') ?? '',
    source: parameters.get('source') ?? '',
    metric: parameters.get('metric') ?? '',
    range: parameters.get('range') ?? '30d'
  };
}

function filterExperiments(experiments, filters) {
  const cutoff = filters.range === 'all' ? null : Date.now() - Number.parseInt(filters.range, 10) * 86_400_000;
  return experiments.filter((experiment) => {
    if (filters.organization && experiment.organization !== filters.organization) return false;
    if (filters.repository && experiment.repository !== filters.repository) return false;
    if (filters.package && experiment.package !== filters.package) return false;
    if (filters.workflow && experiment.workflow !== filters.workflow) return false;
    if (filters.experiment && experiment.id !== filters.experiment) return false;
    if (filters.state && experiment.readiness !== filters.state) return false;
    if (filters.variant && ![experiment.control, experiment.candidate].includes(filters.variant)) return false;
    if (filters.source && !experiment.observations.some((row) => row.sourceType === filters.source)) return false;
    if (filters.metric && !experiment.observations.some((row) => row.identifier === filters.metric)) return false;
    if (cutoff && experiment.lastObservation && Date.parse(experiment.lastObservation) < cutoff) return false;
    return true;
  });
}

function syncDeepLink(filters, experimentId) {
  const window = globalThis.window;
  if (!window || !['http:', 'https:'].includes(window.location.protocol)) return;
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, experiment: experimentId })) {
    if (value && !(key === 'range' && value === '30d')) parameters.set(key, value);
  }
  const query = parameters.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#page-experiments${query ? `?${query}` : ''}`);
}

function renderLegend(counts) {
  return h('ul', { className: 'experiment-state-legend' }, ...[...counts].map(([state, count]) => h('li', null, h('span', { className: `state-dot state-${state.toLowerCase()}` }), `${state} ${count}`)));
}

function summaryItem(label, value) {
  return h('div', null, h('dt', null, label), h('dd', null, String(value)));
}

function sectionHeading(id, title, description) {
  return h('header', { className: 'experiment-section-heading' }, h('div', null, h('h2', { id }, title), h('p', null, description)));
}

function partialState(message) {
  return h('div', { className: 'experiment-partial', role: 'status' }, octicon('info'), h('span', null, message));
}

function statusBadge(label, tone) {
  return h('span', { className: `experiment-badge experiment-badge-${tone}` }, tone === 'danger' ? octicon('alert-fill') : tone === 'success' ? octicon('check-circle-fill') : null, label);
}

function renderEffect(value) {
  if (!Number.isFinite(value)) return h('span', { className: 'effect effect-unknown' }, UNKNOWN, h('span', { className: 'sr-only' }, ' insufficient evidence'));
  const positive = value > 0;
  const negative = value < 0;
  return h(
    'span',
    { className: `effect ${positive ? 'effect-positive' : negative ? 'effect-negative' : 'effect-neutral'}` },
    `${positive ? '+' : ''}${value.toFixed(3)}`,
    positive ? ' ▲' : negative ? ' ▼' : ' ·',
    h('span', { className: 'sr-only' }, positive ? ' improvement' : negative ? ' regression' : ' no change')
  );
}

function renderEvidenceLink(value, label) {
  const link = safeLink(value);
  return link ? h('a', { href: link.href, title: link.label || label }, label, octicon('link-external')) : h('span', null, label || UNKNOWN);
}

function safeLink(value) {
  if (!value || typeof value !== 'object' || typeof value.href !== 'string') return null;
  try {
    const url = new URL(value.href);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
  } catch {
    return null;
  }
  return { href: value.href, label: text(value.label) };
}

function sourceLabel(source, identifier) {
  return source === UNKNOWN ? identifier : `${source}:${identifier}`;
}

function aggregateObservations(rows, sourceType) {
  if (sourceType === 'eval') {
    const known = rows.filter((row) => row.result === 'YES' || row.result === 'NO');
    return known.length ? known.filter((row) => row.result === 'YES').length / known.length : NaN;
  }
  return mean(rows.map(numericObservation).filter(Number.isFinite));
}

function numericObservation(observation) {
  if (observation.sourceType === 'eval') return observation.result === 'YES' ? 1 : observation.result === 'NO' ? 0 : NaN;
  return finite(observation.result);
}

function includedObservation(row) {
  if (row.included === false || text(row.included).toLowerCase() === 'no') return false;
  if (row['exclusion-reason']) return false;
  return !['missing', 'failed', 'error', 'unavailable'].includes(text(row.status).toLowerCase());
}

function normalizeEvalResult(value) {
  const normalized = upper(value);
  return normalized === 'YES' || normalized === 'NO' ? normalized : 'UNKNOWN';
}

function normalizeEffect(value, direction) {
  if (!Number.isFinite(value)) return NaN;
  return direction === 'lower_is_better' ? -value : value;
}

function difference(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) ? left - right : NaN;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function text(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
}

function upper(value) {
  return text(value).replaceAll('-', '_').replaceAll(' ', '_').toUpperCase();
}

function formatMetric(value, unit) {
  if (!Number.isFinite(value)) return UNKNOWN;
  if (unit === 'percent') return `${(value * 100).toFixed(1)}%`;
  if (unit === 'seconds' || unit === 's') return `${value.toFixed(1)}s`;
  return Number(value.toFixed(3)).toString();
}

function formatDate(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : UNKNOWN;
}

function percentage(value, total) {
  return total > 0 ? value / total * 360 : 0;
}

function countBy(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = key(row);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function distinct(rows, field) {
  return [...new Set(rows.map((row) => text(row[field])).filter(Boolean))].sort();
}

function roleOrder(role) {
  return role === 'PRIMARY' ? 0 : role === 'GUARDRAIL' ? 1 : 2;
}

function readinessLabel(readiness) {
  return readiness === 'READY' ? 'Sufficient' : readiness === 'COLLECTING' ? 'Collecting' : 'Insufficient';
}

function decisionTone(decision) {
  if (decision === 'PROMOTE') return 'success';
  if (decision === 'REJECT') return 'danger';
  if (decision === 'READY' || decision === 'EXTEND') return 'attention';
  return 'neutral';
}
