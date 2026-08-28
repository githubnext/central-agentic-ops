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

export const ERROR_CODES = {
  invalidYamlSyntax: 'DLS-E001',
  invalidDocumentShape: 'DLS-E002',
  missingOrInvalidRequiredField: 'DLS-E003',
  unknownOrDuplicateKey: 'DLS-E004',
  nonCanonicalVocabularyOrIdentifier: 'DLS-E005'
};
