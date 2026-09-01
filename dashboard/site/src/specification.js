/**
 * Dashboard Language Specification constants used by the validator.
 */

import octiconNames from './octicon-names.json' with { type: 'json' };

export const LANGUAGE_VERSION = '0.1.0';

export const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export const ROOT_KEYS = ['language-version', 'dashboard'];
export const DASHBOARD_KEYS = ['id', 'title', 'description', 'defaults', 'units', 'pages', 'github-url-base', 'repository', 'navigation'];
export const DEFAULTS_KEYS = ['scope', 'time', 'filters'];
export const UNIT_DEFINITION_KEYS = ['name', 'symbol', 'significant'];
export const NAVIGATION_SECTION_KEYS = ['label', 'pages'];
export const BUILT_IN_PAGE_KEYS = ['id', 'kind', 'page', 'title', 'navigation-label', 'description', 'icon', 'class-name', 'filter-bar', 'definition'];
export const CUSTOM_PAGE_KEYS = ['id', 'kind', 'title', 'navigation-label', 'description', 'icon', 'class-name', 'filter-bar', 'route', 'views', 'sections'];
export const PAGE_ROUTE_KEYS = ['hash-query-parameter', 'navigation-page'];
export const PAGE_FILTER_BAR_KEYS = ['filters', 'time-range', 'export'];

export const VIEW_KEYS = ['id', 'title', 'description', 'data', 'mark', 'element', 'callout', 'chart', 'layout', 'disclosure', 'controls', 'column-summaries', 'empty-message', 'title-link', 'encoding'];
export const VIEW_DATA_KEYS = ['source', 'sources', 'scope', 'time', 'filters', 'route-field', 'limit', 'order-by', 'source-metadata'];
export const VIEW_TITLE_LINK_KEYS = ['href-field', 'identifier-field'];
export const CALLOUT_KEYS = ['label', 'icon'];
export const VIEW_MARK_VALUES = ['metric', 'table', 'chart', 'element', 'callout'];
export const VIEW_ELEMENT_VALUES = [
  'domain-attention',
  'summary-grid',
  'context-summary',
  'anomaly-readiness',
  'signal-list',
  'package-activity',
  'package-detail',
  'package-reports',
  'workflow-detail',
  'workflow-runtime',
  'outcome-detail'
];
export const VIEW_CHART_VALUES = ['bar', 'line', 'pie'];
export const VIEW_LAYOUT_VALUES = ['full', 'half', 'third'];
export const VIEW_DISCLOSURE_VALUES = ['essential', 'supplemental'];
export const VIEW_CONTROL_VALUES = ['interactive', 'static'];
export const MAX_ESSENTIAL_VIEWS_PER_PAGE = 4;
export const VIEW_ENCODING_KEYS = ['value', 'columns', 'x', 'y', 'color', 'href'];
export const FIELD_DEFINITION_KEYS = ['field', 'type', 'aggregate', 'time-unit', 'title', 'as', 'display', 'unit'];
export const FIELD_TYPE_VALUES = ['nominal', 'ordinal', 'quantitative', 'temporal'];
export const FIELD_DISPLAY_VALUES = ['text', 'status', 'grader-status', 'mode', 'active-state', 'label', 'digest', 'outcome-link'];
export const AGGREGATE_VALUES = ['count', 'distinct-count', 'sum', 'mean', 'min', 'max', 'none'];
export const TIME_UNIT_VALUES = ['hour', 'day', 'week', 'month'];
export const LINK_RELATION_VALUES = [
  'organization',
  'repository',
  'workflow',
  'run',
  'issue',
  'pull-request',
  'evidence',
  'external'
];
export const LINK_OBJECT_KEYS = ['relation', 'href', 'label'];
export const RELATION_LINK_FIELD_RELATIONS = {
  'organization-link': 'organization',
  'repository-link': 'repository',
  'workflow-link': 'workflow',
  'issue-link': 'issue',
  'pull-request-link': 'pull-request',
  'run-link': 'run',
  'evidence-link': 'evidence',
  'external-link': 'external'
};
export const LINK_FIELD_NAMES = Object.keys(RELATION_LINK_FIELD_RELATIONS);
export const DATASET_METADATA_KEYS = [
  'source-id',
  'source-kind',
  'as-of',
  'retrieved-at',
  'coverage-start',
  'coverage-end',
  'completeness',
  'freshness',
  'provenance-link',
  'availability'
];
export const DATASET_COMPLETENESS_VALUES = ['complete', 'partial', 'unknown'];
export const DATASET_FRESHNESS_VALUES = ['fresh', 'stale', 'unknown'];
export const DATASET_AVAILABILITY_VALUES = ['available', 'empty', 'unavailable'];
export const SCOPE_KEYS = ['organizations', 'repositories', 'workflows'];
export const TIME_KEYS = ['range', 'start', 'end'];

export const ORDER_BY_KEYS = ['field', 'direction'];
export const ORDER_DIRECTION_VALUES = ['asc', 'desc'];

export const FILTER_DIMENSION_VALUES = [
  'organization',
  'repository',
  'workflow',
  'package',
  'experiment',
  'variant',
  'workflow-role',
  'workflow-active',
  'run-status',
  'run-conclusion',
  'outcome-state',
  'rollout-mode',
  'engine',
  'requested-model',
  'resolved-model',
  'status',
  'eval-result',
  'operational-value-definition',
  'finding-status',
  'finding-severity'
];

export const PAGE_KIND_VALUES = ['built-in', 'custom'];
export const PAGE_ICON_VALUES = octiconNames;

export const BUILT_IN_PAGE_VALUES = [
  'overview',
  'organizations',
  'repositories',
  'packages',
  'workflows',
  'runs',
  'experiments',
  'graders',
  'evals',
  'usage',
  'engines-models',
  'operational-value',
  'findings'
];

export const BUILT_IN_PAGE_DEFINITION_KEYS = ['views', 'sections', 'data-state'];

export const BUILT_IN_PAGE_DATA_STATE_KEYS = ['availability', 'completeness', 'freshness'];
export const PAGE_SECTION_KEYS = ['id', 'title', 'description', 'layout', 'views', 'count-source', 'count-label'];
export const PAGE_SECTION_LAYOUT_VALUES = ['full', 'wide', 'narrow'];

export const BUILT_IN_PAGE_REQUIRED_SOURCES = {
  overview: ['repositories', 'workflows', 'runs', 'usage', 'findings', 'operational-values'],
  organizations: ['organizations', 'repositories', 'workflows', 'runs', 'usage'],
  repositories: ['repositories', 'runs', 'usage', 'operational-values'],
  packages: ['workflows', 'runs', 'outcomes', 'usage'],
  workflows: ['workflows', 'runs', 'outcomes', 'usage', 'findings', 'operational-values'],
  runs: ['runs'],
  experiments: ['experiments', 'experiment-assignments', 'grader-observations', 'eval-observations', 'outcomes', 'usage', 'operational-values'],
  graders: ['graders', 'grader-observations'],
  evals: ['evals', 'eval-observations'],
  usage: ['usage'],
  'engines-models': ['runs', 'outcomes', 'usage'],
  'operational-value': ['operational-values'],
  findings: ['findings']
};

export const BUILT_IN_PAGE_REQUIRED_FIELDS = {
  overview: {
    repositories: ['repository'],
    workflows: ['workflow-active', 'rollout-mode'],
    runs: ['run-status', 'run-conclusion', 'repository', 'workflow'],
    usage: ['aic'],
    findings: ['observed-at', 'issue-link', 'pull-request-link', 'run-link'],
    'operational-values': ['operational-value', 'operational-value-definition', 'observed-at']
  },
  organizations: {
    organizations: ['organization'],
    repositories: ['repository'],
    workflows: ['workflow'],
    runs: ['run'],
    usage: ['aic']
  },
  repositories: {
    repositories: ['repository'],
    runs: ['run'],
    usage: ['aic'],
    'operational-values': ['operational-value', 'operational-value-definition']
  },
  packages: {
    workflows: ['organization', 'repository', 'package', 'package-name', 'workflow', 'workflow-role', 'rollout-mode', 'max-ai-credits', 'package-aic-allowance'],
    runs: ['organization', 'repository', 'workflow', 'run', 'started-at', 'run-conclusion', 'rollout-mode'],
    outcomes: ['package', 'runtime-repository', 'run', 'run-conclusion', 'rollout-mode', 'published-at', 'observed-at', 'run-link'],
    usage: ['organization', 'repository', 'workflow', 'run', 'aic', 'rollout-mode', 'observed-at']
  },
  workflows: {
    workflows: ['workflow', 'workflow-active', 'rollout-mode'],
    runs: ['run', 'run-conclusion'],
    outcomes: ['outcome-state'],
    usage: ['aic'],
    findings: ['finding'],
    'operational-values': ['operational-value']
  },
  runs: {
    runs: ['run', 'run-status', 'run-conclusion', 'organization', 'repository', 'workflow', 'rollout-mode', 'engine', 'requested-model', 'resolved-model', 'started-at']
  },
  experiments: {
    experiments: ['experiment'],
    'experiment-assignments': ['run', 'variant'],
    'grader-observations': ['grader'],
    'eval-observations': ['eval'],
    outcomes: ['outcome-state'],
    usage: ['aic'],
    'operational-values': ['operational-value']
  },
  graders: {
    graders: ['grader'],
    'grader-observations': ['grader', 'run', 'value', 'status', 'observed-at']
  },
  evals: {
    evals: ['eval'],
    'eval-observations': ['eval', 'run', 'eval-result', 'requested-model', 'resolved-model', 'observed-at']
  },
  usage: {
    usage: ['input-tokens', 'output-tokens', 'cache-read-tokens', 'cache-write-tokens', 'reasoning-tokens', 'aic', 'engine', 'requested-model', 'resolved-model', 'organization', 'repository', 'workflow', 'rollout-mode', 'observed-at']
  },
  'engines-models': {
    runs: ['engine', 'requested-model', 'resolved-model', 'run', 'run-conclusion'],
    outcomes: ['outcome-state'],
    usage: ['input-tokens', 'output-tokens', 'cache-read-tokens', 'cache-write-tokens', 'reasoning-tokens', 'aic']
  },
  'operational-value': {
    'operational-values': ['observed-at', 'operational-value', 'operational-value-definition', 'operational-case', 'evaluator-digest', 'requested-evidence-at', 'evidence-cutoff', 'maturity-at', 'maturity-status', 'evidence-link', 'experiment', 'delta-from-baseline']
  },
  findings: {
    findings: ['finding-summary', 'finding-severity', 'finding-status', 'organization', 'repository', 'workflow', 'observed-at', 'issue-link', 'pull-request-link', 'run-link']
  }
};

export const SOURCE_VALUES = [
  'organizations',
  'repositories',
  'workflows',
  'runs',
  'experiments',
  'experiment-assignments',
  'graders',
  'grader-observations',
  'evals',
  'eval-observations',
  'usage',
  'coverage-diagnostics',
  'repository-coverage',
  'runtime-episode-summary',
  'runtime-episodes',
  'runtime-attribution-gaps',
  'workflow-topology-summary',
  'packaged-workflows',
  'standalone-workflows',
  'outcomes',
  'findings',
  'operational-values',
  'overview-status',
  'overview-vitals',
  'overview-execution-health',
  'overview-attention',
  'overview-attention-domains',
  'overview-managed-packages',
  'overview-package-utilization',
  'security-summary',
  'security-signals',
  'value-summary',
  'value-signals',
  'value-workflows',
  'cost-summary',
  'cost-signals',
  'runtime-anomaly-readiness',
  'runtime-signals',
  'dispatches',
  'repository-summary',
  'repository-activity',
  'repository-detail-summary',
  'repository-workflow-status',
  'repository-workflows',
  'workflow-reports',
  'package-reports'
];

export const SOURCE_FIELDS = {
  organizations: ['organization', 'organization-name', 'observed-at', 'organization-link'],
  repositories: ['organization', 'repository', 'repository-name', 'rollout-mode', 'observed-at', 'organization-link', 'repository-link'],
  workflows: ['organization', 'repository', 'package', 'package-name', 'workflow', 'workflow-name', 'workflow-role', 'workflow-active', 'rollout-mode', 'max-ai-credits', 'package-aic-allowance', 'package-worker-count', 'package-inventory-warnings', 'inventory-ready', 'observed-at', 'organization-link', 'repository-link', 'workflow-link'],
  runs: ['organization', 'repository', 'workflow', 'run', 'run-title', 'event', 'started-at', 'ended-at', 'run-status', 'run-conclusion', 'rollout-mode', 'engine', 'requested-model', 'resolved-model', 'organization-link', 'repository-link', 'workflow-link', 'run-link'],
  experiments: ['experiment', 'experiment-name', 'observed-at'],
  'experiment-assignments': ['organization', 'repository', 'workflow', 'run', 'experiment', 'variant', 'observed-at'],
  graders: ['grader', 'grader-name', 'observed-at'],
  'grader-observations': ['organization', 'repository', 'workflow', 'run', 'experiment', 'grader', 'value', 'status', 'rollout-mode', 'maturity-status', 'baseline-value', 'delta-from-baseline', 'evaluator-digest', 'observed-at', 'run-link'],
  evals: ['eval', 'eval-name', 'eval-question', 'requested-model', 'observed-at'],
  'eval-observations': ['organization', 'repository', 'workflow', 'run', 'experiment', 'eval', 'eval-result', 'requested-model', 'resolved-model', 'rollout-mode', 'observed-at'],
  usage: ['organization', 'repository', 'workflow', 'run', 'invocation', 'engine', 'requested-model', 'resolved-model', 'rollout-mode', 'input-tokens', 'output-tokens', 'cache-read-tokens', 'cache-write-tokens', 'reasoning-tokens', 'aic', 'observed-at', 'organization-link', 'repository-link', 'workflow-link', 'run-link'],
  'coverage-diagnostics': ['title', 'effect'],
  'repository-coverage': ['label', 'value'],
  'runtime-episode-summary': ['label', 'value'],
  'runtime-episodes': ['run', 'run-title', 'package', 'workflow', 'started-at', 'duration', 'status', 'control-transition', 'attribution', 'run-link'],
  'runtime-attribution-gaps': ['run', 'run-title', 'workflow', 'status', 'control-transition', 'reason-code', 'evidence', 'run-link'],
  outcomes: ['organization', 'repository', 'package', 'runtime-repository', 'workflow', 'workflow-name', 'run', 'run-conclusion', 'safe-output', 'outcome-number', 'outcome-title', 'outcome-summary', 'outcome-body-html', 'outcome-category', 'outcome-status', 'outcome-state', 'outcome-warning', 'evidence-strength', 'rollout-mode', 'published-at', 'observed-at', 'issue-link', 'pull-request-link', 'run-link', 'external-link', 'organization-link', 'repository-link', 'workflow-link'],
  findings: ['organization', 'repository', 'workflow', 'run', 'safe-output', 'finding', 'finding-kind', 'finding-severity', 'finding-status', 'finding-summary', 'observed-at', 'issue-link', 'pull-request-link', 'run-link', 'external-link', 'organization-link', 'repository-link', 'workflow-link'],
  'operational-values': ['organization', 'repository', 'repository-name', 'workflow', 'run', 'run-attempt', 'observation-id', 'experiment', 'operational-case', 'evaluator-digest', 'rollout-mode', 'operational-value', 'operational-value-definition', 'requested-evidence-at', 'evidence-cutoff', 'maturity-at', 'maturity-status', 'baseline-value', 'delta-from-baseline', 'accepted-evidence-provenance', 'diagnostics', 'diagnostic-definitions', 'observed-at', 'evidence-link', 'organization-link', 'repository-link', 'workflow-link', 'run-link'],
  'overview-attention-domains': ['domain', 'state', 'tone', 'icon', 'value', 'detail', 'href', 'priority', 'order'],
  'security-summary': ['label', 'value'],
  'security-signals': ['priority', 'count', 'tone', 'icon', 'kind', 'title', 'detail', 'evidence', 'action', 'navigation-page', 'navigation-href', 'run-link', 'external-link'],
  'value-summary': ['label', 'value'],
  'value-signals': ['priority', 'count', 'tone', 'icon', 'kind', 'title', 'detail', 'evidence', 'action', 'navigation-page', 'run-link', 'external-link'],
  'value-workflows': ['organization', 'repository', 'workflow', 'run', 'operational-value-definition', 'opportunities', 'mature-observations', 'mean-operational-value', 'mean-baseline', 'observed-at', 'evidence-link', 'run-link', 'organization-link', 'repository-link', 'workflow-link'],
  'cost-summary': ['label', 'value'],
  'cost-signals': ['priority', 'count', 'tone', 'icon', 'kind', 'title', 'detail', 'evidence', 'action', 'navigation-page'],
  'runtime-anomaly-readiness': ['icon', 'title', 'detail'],
  'runtime-signals': ['priority', 'count', 'tone', 'icon', 'kind', 'title', 'detail', 'evidence', 'action', 'navigation-href'],
  dispatches: ['started-at', 'dispatch-type', 'package-name', 'workflow-name', 'run-title', 'runtime-repository', 'status', 'run-link'],
  'repository-summary': ['label', 'value', 'items'],
  'repository-activity': ['repository', 'workflows', 'reports', 'evaluated-workflows', 'runs', 'failure-summary', 'aic', 'status', 'repository-link'],
  'repository-detail-summary': ['repository', 'workflows', 'latest-update', 'external-link'],
  'repository-workflow-status': ['repository', 'status', 'workflows'],
  'repository-workflows': ['repository', 'workflow', 'workflow-name', 'workflow-role', 'package-name', 'rollout-mode', 'workflow-active', 'observed-at', 'workflow-link'],
  'workflow-reports': ['workflow-route', 'safe-output', 'outcome-title', 'outcome-summary', 'outcome-status', 'rollout-mode', 'outcome-category', 'observed-at', 'external-link'],
  'package-reports': ['package', 'safe-output', 'outcome-title', 'outcome-summary', 'outcome-status', 'rollout-mode', 'outcome-category', 'observed-at', 'external-link'],
  'workflow-topology-summary': ['label', 'value'],
  'packaged-workflows': ['package', 'package-name', 'repository', 'workflow', 'workflow-name', 'workflow-role', 'rollout-mode', 'workflow-active', 'package-link', 'repository-link', 'workflow-link'],
  'standalone-workflows': ['repository', 'workflow', 'workflow-name', 'rollout-mode', 'workflow-active', 'repository-link', 'workflow-link']
};

export const ROLLOUT_MODE_VALUES = ['review', 'live', 'unknown'];
export const WORKFLOW_ACTIVE_VALUES = ['true', 'false', 'unknown'];
export const WORKFLOW_ROLE_VALUES = ['orchestrator', 'worker', 'standalone'];
export const RUN_STATUS_VALUES = ['queued', 'in-progress', 'completed', 'unknown'];
export const RUN_CONCLUSION_VALUES = [
  'success',
  'failure',
  'cancelled',
  'timed-out',
  'action-required',
  'neutral',
  'skipped',
  'stale',
  'startup-failure',
  'unknown'
];
export const GRADER_STATUS_VALUES = ['pass', 'fail', 'error', 'unavailable'];
export const EVAL_RESULT_VALUES = ['YES', 'NO', 'UNKNOWN'];
export const OUTCOME_STATE_VALUES = ['accepted', 'rejected', 'ignored', 'pending', 'lifecycle', 'lifecycle-close'];
export const FINDING_STATUS_VALUES = ['open', 'resolved', 'dismissed', 'unknown'];
export const FINDING_SEVERITY_VALUES = ['critical', 'high', 'medium', 'low', 'informational', 'unknown'];

export const SOURCE_ENTITY_IDENTIFIER_FIELDS = {
  organizations: ['organization'],
  repositories: ['repository'],
  workflows: ['workflow'],
  runs: ['run'],
  experiments: ['experiment'],
  'experiment-assignments': ['run', 'experiment', 'variant'],
  graders: ['grader'],
  'grader-observations': ['grader', 'run'],
  evals: ['eval'],
  'eval-observations': ['eval', 'run'],
  usage: ['invocation'],
  'repository-coverage': ['label'],
  'runtime-episode-summary': ['label'],
  'runtime-episodes': ['run'],
  'runtime-attribution-gaps': ['run'],
  outcomes: ['safe-output'],
  findings: ['finding'],
  'operational-values': ['operational-value-definition', 'operational-case', 'run'],
  'repository-summary': ['label'],
  'repository-activity': ['repository'],
  'repository-detail-summary': ['repository'],
  'repository-workflow-status': ['repository', 'status'],
  'repository-workflows': ['repository', 'workflow'],
  'workflow-reports': ['workflow-route', 'safe-output'],
  'package-reports': ['package', 'safe-output']
};

export const TEMPORAL_FIELD_NAMES = [
  'observed-at',
  'started-at',
  'ended-at',
  'requested-evidence-at',
  'evidence-cutoff',
  'maturity-at',
  'published-at'
];

export const ADDITIVE_MEASURE_FIELDS = [
  'input-tokens',
  'output-tokens',
  'cache-read-tokens',
  'cache-write-tokens',
  'reasoning-tokens',
  'aic'
];

export const NON_ADDITIVE_MEASURE_FIELDS = ['value', 'operational-value'];

export const ERROR_CODES = {
  invalidYamlSyntax: 'DLS-E001',
  invalidDocumentShape: 'DLS-E002',
  missingOrInvalidRequiredField: 'DLS-E003',
  unknownOrDuplicateKey: 'DLS-E004',
  nonCanonicalVocabularyOrIdentifier: 'DLS-E005',
  invalidLinkReference: 'DLS-E009',
  invalidScopeFilterTimeAggregationOrOrderReference: 'DLS-E010',
  invalidEntityRelationshipOrSourceGrain: 'DLS-E011',
  missingRequiredProvenanceOrDataStateMetadata: 'DLS-E012',
  invalidProgressiveDisclosureConfiguration: 'DLS-E013'
};
