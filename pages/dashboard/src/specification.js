/**
 * Dashboard Language Specification constants used by the validator.
 */

export const LANGUAGE_VERSION = '0.1.0';

export const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export const ROOT_KEYS = ['language-version', 'dashboard'];
export const DASHBOARD_KEYS = ['id', 'title', 'description', 'defaults', 'pages'];
export const DEFAULTS_KEYS = ['scope', 'time', 'filters'];
export const BUILT_IN_PAGE_KEYS = ['id', 'kind', 'page', 'title', 'description'];
export const CUSTOM_PAGE_KEYS = ['id', 'kind', 'title', 'description', 'views'];

export const VIEW_KEYS = ['id', 'title', 'description', 'data', 'mark', 'encoding'];
export const VIEW_DATA_KEYS = ['source', 'scope', 'time', 'filters', 'limit', 'order-by'];
export const VIEW_MARK_VALUES = ['metric', 'table', 'chart'];
export const VIEW_ENCODING_KEYS = ['value', 'columns', 'x', 'y', 'color', 'href'];
export const FIELD_DEFINITION_KEYS = ['field', 'type', 'aggregate', 'time-unit', 'title', 'as'];
export const FIELD_TYPE_VALUES = ['nominal', 'ordinal', 'quantitative', 'temporal'];
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
  'provenance-link'
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
  'experiment',
  'variant',
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

export const BUILT_IN_PAGE_VALUES = [
  'overview',
  'organizations',
  'repositories',
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
  'outcomes',
  'findings',
  'operational-values'
];

export const SOURCE_FIELDS = {
  organizations: ['organization', 'organization-name', 'observed-at'],
  repositories: ['organization', 'repository', 'repository-name', 'rollout-mode', 'observed-at'],
  workflows: ['organization', 'repository', 'workflow', 'workflow-name', 'workflow-active', 'rollout-mode', 'observed-at'],
  runs: ['organization', 'repository', 'workflow', 'run', 'started-at', 'ended-at', 'run-status', 'run-conclusion', 'rollout-mode', 'engine', 'requested-model', 'resolved-model'],
  experiments: ['experiment', 'experiment-name', 'observed-at'],
  'experiment-assignments': ['organization', 'repository', 'workflow', 'run', 'experiment', 'variant', 'observed-at'],
  graders: ['grader', 'grader-name', 'observed-at'],
  'grader-observations': ['organization', 'repository', 'workflow', 'run', 'experiment', 'grader', 'value', 'status', 'rollout-mode', 'observed-at'],
  evals: ['eval', 'eval-name', 'eval-question', 'requested-model', 'observed-at'],
  'eval-observations': ['organization', 'repository', 'workflow', 'run', 'experiment', 'eval', 'eval-result', 'requested-model', 'resolved-model', 'rollout-mode', 'observed-at'],
  usage: ['organization', 'repository', 'workflow', 'run', 'invocation', 'engine', 'requested-model', 'resolved-model', 'rollout-mode', 'input-tokens', 'output-tokens', 'cache-read-tokens', 'cache-write-tokens', 'reasoning-tokens', 'aic', 'observed-at'],
  outcomes: ['organization', 'repository', 'workflow', 'run', 'safe-output', 'outcome-state', 'evidence-strength', 'observed-at', 'issue-link', 'pull-request-link', 'run-link', 'external-link'],
  findings: ['organization', 'repository', 'workflow', 'run', 'finding', 'finding-severity', 'finding-status', 'finding-summary', 'observed-at', 'issue-link', 'pull-request-link', 'run-link', 'external-link'],
  'operational-values': ['organization', 'repository', 'workflow', 'run', 'experiment', 'operational-case', 'evaluator-digest', 'rollout-mode', 'operational-value', 'operational-value-definition', 'requested-evidence-at', 'evidence-cutoff', 'maturity-at', 'maturity-status', 'delta-from-baseline', 'observed-at', 'evidence-link']
};

export const ROLLOUT_MODE_VALUES = ['review', 'live', 'unknown'];
export const WORKFLOW_ACTIVE_VALUES = ['true', 'false', 'unknown'];
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
  outcomes: ['safe-output'],
  findings: ['finding'],
  'operational-values': ['operational-value-definition', 'operational-case', 'run']
};

export const TEMPORAL_FIELD_NAMES = [
  'observed-at',
  'started-at',
  'ended-at',
  'requested-evidence-at',
  'evidence-cutoff',
  'maturity-at'
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
  missingRequiredProvenanceOrDataStateMetadata: 'DLS-E012'
};
