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

export const ERROR_CODES = {
  invalidYamlSyntax: 'DLS-E001',
  invalidDocumentShape: 'DLS-E002',
  missingOrInvalidRequiredField: 'DLS-E003',
  unknownOrDuplicateKey: 'DLS-E004',
  nonCanonicalVocabularyOrIdentifier: 'DLS-E005'
};
