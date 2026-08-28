import { parseAllDocuments } from 'yaml';
import {
  BUILT_IN_PAGE_KEYS,
  BUILT_IN_PAGE_VALUES,
  CUSTOM_PAGE_KEYS,
  DASHBOARD_KEYS,
  DEFAULTS_KEYS,
  ERROR_CODES,
  EVAL_RESULT_VALUES,
  GRADER_STATUS_VALUES,
  IDENTIFIER_PATTERN,
  LANGUAGE_VERSION,
  OUTCOME_STATE_VALUES,
  PAGE_KIND_VALUES,
  ROOT_KEYS,
  ROLLOUT_MODE_VALUES,
  RUN_CONCLUSION_VALUES,
  RUN_STATUS_VALUES,
  SOURCE_VALUES,
  VIEW_DATA_KEYS,
  VIEW_KEYS,
  WORKFLOW_ACTIVE_VALUES
} from './specification.js';

/**
 * @typedef {{ code: string, message: string, path: string }} ValidationError
 */

/**
 * @typedef {{ ok: true, value: DashboardDocument, errors: [] } | { ok: false, errors: ValidationError[] }} ValidationResult
 */

/**
 * @typedef {{ languageVersion: string, dashboard: DashboardConfig }} DashboardDocument
 */

/**
 * @typedef {{ id: string, title: string, description?: string, defaults?: DashboardDefaults, pages: Array<BuiltInPage | CustomPage> }} DashboardConfig
 */

/**
 * @typedef {{ scope?: Record<string, unknown>, time?: Record<string, unknown>, filters?: Record<string, unknown> }} DashboardDefaults
 */

/**
 * @typedef {{ id: string, kind: 'built-in', page: string, title?: string, description?: string }} BuiltInPage
 */

/**
 * @typedef {{ id: string, kind: 'custom', title?: string, description?: string, views: unknown[] }} CustomPage
 */

/**
 * @param {string} source
 * @returns {ValidationResult}
 */
export function validateDashboardDocument(source) {
  /** @type {ValidationError[]} */
  const errors = [];

  const documents = parseDocuments(source, errors);
  if (!documents) {
    return { ok: false, errors };
  }

  const [document] = documents;
  if (!document) {
    return { ok: false, errors };
  }

  const root = document.toJS({ mapAsMap: false });
  if (!isPlainObject(root)) {
    errors.push(createError(
      ERROR_CODES.invalidDocumentShape,
      'Dashboard document must contain exactly one YAML document whose root is a mapping.',
      '$'
    ));
    return { ok: false, errors };
  }

  validateObjectKeys(document.contents, ROOT_KEYS, '$', errors);

  validateLanguageVersion(root['language-version'], errors);
  const dashboard = root.dashboard;
  if (!isPlainObject(dashboard)) {
    errors.push(createError(
      ERROR_CODES.missingOrInvalidRequiredField,
      'dashboard must be a mapping.',
      '$.dashboard'
    ));
    return { ok: false, errors };
  }

  validateDashboard(dashboard, getValueNodeByKey(document.contents, 'dashboard'), errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      languageVersion: /** @type {string} */ (root['language-version']),
      dashboard: /** @type {DashboardConfig} */ (dashboard)
    },
    errors: []
  };
}

/**
 * @param {string} source
 * @param {ValidationError[]} errors
 * @returns {import('yaml').Document.Parsed[] | null}
 */
function parseDocuments(source, errors) {
  try {
    const documents = parseAllDocuments(source, {
      uniqueKeys: false,
      merge: false
    });

    if (documents.some((document) => document.errors.length > 0)) {
      errors.push(createError(
        ERROR_CODES.invalidYamlSyntax,
        'Dashboard document must be valid YAML 1.2.',
        '$'
      ));
      return null;
    }

    if (documents.length !== 1) {
      errors.push(createError(
        ERROR_CODES.invalidDocumentShape,
        'Dashboard document must contain exactly one YAML document.',
        '$'
      ));
      return null;
    }

    return documents;
  } catch {
    errors.push(createError(
      ERROR_CODES.invalidYamlSyntax,
      'Dashboard document must be valid YAML 1.2.',
      '$'
    ));
    return null;
  }
}

/**
 * @param {unknown} value
 * @param {ValidationError[]} errors
 */
function validateLanguageVersion(value, errors) {
  if (typeof value !== 'string') {
    errors.push(createError(
      ERROR_CODES.missingOrInvalidRequiredField,
      'language-version must be the quoted string "0.1.0".',
      '$.language-version'
    ));
    return;
  }

  if (value !== LANGUAGE_VERSION) {
    errors.push(createError(
      ERROR_CODES.nonCanonicalVocabularyOrIdentifier,
      'language-version must use the exact canonical value "0.1.0".',
      '$.language-version'
    ));
  }
}

/**
 * @param {Record<string, unknown>} dashboard
 * @param {unknown} dashboardNode
 * @param {ValidationError[]} errors
 */
function validateDashboard(dashboard, dashboardNode, errors) {
  validateObjectKeys(dashboardNode, DASHBOARD_KEYS, '$.dashboard', errors);

  validateRequiredIdentifier(dashboard.id, '$.dashboard.id', 'dashboard id', errors);
  validateStringField(dashboard.title, '$.dashboard.title', true, errors);
  validateOptionalStringField(dashboard.description, '$.dashboard.description', errors);

  if (dashboard.defaults !== undefined) {
    if (!isPlainObject(dashboard.defaults)) {
      errors.push(createError(
        ERROR_CODES.missingOrInvalidRequiredField,
        'defaults must be a mapping.',
        '$.dashboard.defaults'
      ));
    } else {
      validateObjectKeys(
        getValueNodeByKey(dashboardNode, 'defaults'),
        DEFAULTS_KEYS,
        '$.dashboard.defaults',
        errors
      );
    }
  }

  if (!Array.isArray(dashboard.pages) || dashboard.pages.length === 0) {
    errors.push(createError(
      ERROR_CODES.missingOrInvalidRequiredField,
      'pages must be a non-empty sequence.',
      '$.dashboard.pages'
    ));
    return;
  }

  /** @type {Set<string>} */
  const pageIds = new Set();
  dashboard.pages.forEach((page, index) => {
    validatePage(page, getSequenceItemNode(getValueNodeByKey(dashboardNode, 'pages'), index), `$.dashboard.pages[${index}]`, pageIds, errors);
  });
}

/**
 * @param {unknown} page
 * @param {unknown} pageNode
 * @param {string} path
 * @param {Set<string>} pageIds
 * @param {ValidationError[]} errors
 */
function validatePage(page, pageNode, path, pageIds, errors) {
  if (!isPlainObject(page)) {
    errors.push(createError(ERROR_CODES.missingOrInvalidRequiredField, 'page must be a mapping.', path));
    return;
  }

  validateStringField(page.kind, `${path}.kind`, true, errors);
  if (typeof page.kind === 'string' && !PAGE_KIND_VALUES.includes(page.kind)) {
    errors.push(createError(
      ERROR_CODES.nonCanonicalVocabularyOrIdentifier,
      'kind must be exactly "built-in" or "custom".',
      `${path}.kind`
    ));
  }

  validateRequiredIdentifier(page.id, `${path}.id`, 'page id', errors);
  if (typeof page.id === 'string') {
    if (pageIds.has(page.id)) {
      errors.push(createError(
        ERROR_CODES.missingOrInvalidRequiredField,
        'page id must be unique within dashboard.pages.',
        `${path}.id`
      ));
    }
    pageIds.add(page.id);
  }

  validateOptionalStringField(page.title, `${path}.title`, errors);
  validateOptionalStringField(page.description, `${path}.description`, errors);

  if (page.kind === 'built-in') {
    validateObjectKeys(pageNode, BUILT_IN_PAGE_KEYS, path, errors);
    validateBuiltInPage(page, path, errors);
    return;
  }

  if (page.kind === 'custom') {
    validateObjectKeys(pageNode, CUSTOM_PAGE_KEYS, path, errors);
    validateCustomPage(page, pageNode, path, errors);
    return;
  }

  validateObjectKeys(pageNode, [...BUILT_IN_PAGE_KEYS, ...CUSTOM_PAGE_KEYS], path, errors);
}

/**
 * @param {Record<string, unknown>} page
 * @param {string} path
 * @param {ValidationError[]} errors
 */
function validateBuiltInPage(page, path, errors) {
  validateStringField(page.page, `${path}.page`, true, errors);
  if (typeof page.page === 'string' && !BUILT_IN_PAGE_VALUES.includes(page.page)) {
    errors.push(createError(
      ERROR_CODES.nonCanonicalVocabularyOrIdentifier,
      'page must use one of the canonical built-in page names.',
      `${path}.page`
    ));
  }
}

/**
 * @param {Record<string, unknown>} page
 * @param {unknown} pageNode
 * @param {string} path
 * @param {ValidationError[]} errors
 */
function validateCustomPage(page, pageNode, path, errors) {
  if (!Array.isArray(page.views) || page.views.length === 0) {
    errors.push(createError(
      ERROR_CODES.missingOrInvalidRequiredField,
      'custom pages must contain a non-empty views sequence.',
      `${path}.views`
    ));
    return;
  }

  /** @type {Set<string>} */
  const viewIds = new Set();
  const viewsNode = getValueNodeByKey(pageNode, 'views');
  page.views.forEach((view, index) => {
    validateView(
      view,
      getSequenceItemNode(viewsNode, index),
      `${path}.views[${index}]`,
      viewIds,
      errors
    );
  });
}

/**
 * @param {unknown} view
 * @param {unknown} viewNode
 * @param {string} path
 * @param {Set<string>} viewIds
 * @param {ValidationError[]} errors
 */
function validateView(view, viewNode, path, viewIds, errors) {
  if (!isPlainObject(view)) {
    errors.push(createError(
      ERROR_CODES.missingOrInvalidRequiredField,
      'view must be a mapping.',
      path
    ));
    return;
  }

  validateObjectKeys(viewNode, VIEW_KEYS, path, errors);
  validateRequiredIdentifier(view.id, `${path}.id`, 'view id', errors);
  if (typeof view.id === 'string') {
    if (viewIds.has(view.id)) {
      errors.push(createError(
        ERROR_CODES.missingOrInvalidRequiredField,
        'view id must be unique within page.views.',
        `${path}.id`
      ));
    }
    viewIds.add(view.id);
  }

  validateOptionalStringField(view.title, `${path}.title`, errors);
  validateOptionalStringField(view.description, `${path}.description`, errors);

  if (!isPlainObject(view.data)) {
    errors.push(createError(
      ERROR_CODES.missingOrInvalidRequiredField,
      'data must be a mapping.',
      `${path}.data`
    ));
  } else {
    validateObjectKeys(getValueNodeByKey(viewNode, 'data'), VIEW_DATA_KEYS, `${path}.data`, errors);
    validateSource(view.data.source, `${path}.data.source`, errors);
  }

  validateSemanticFieldLiterals(view.data, `${path}.data`, errors);
}

/**
 * @param {unknown} source
 * @param {string} path
 * @param {ValidationError[]} errors
 */
function validateSource(source, path, errors) {
  validateStringField(source, path, true, errors);
  if (typeof source === 'string' && !SOURCE_VALUES.includes(source)) {
    errors.push(createError(
      ERROR_CODES.nonCanonicalVocabularyOrIdentifier,
      'source must use one canonical Section 5.1 source name.',
      path
    ));
  }
}

/**
 * @param {unknown} data
 * @param {string} path
 * @param {ValidationError[]} errors
 */
function validateSemanticFieldLiterals(data, path, errors) {
  if (!isPlainObject(data)) {
    return;
  }

  validateFilterLiteralSet(data.filters, `${path}.filters`, errors);
}

/**
 * @param {unknown} filters
 * @param {string} path
 * @param {ValidationError[]} errors
 */
function validateFilterLiteralSet(filters, path, errors) {
  if (!isPlainObject(filters)) {
    return;
  }

  for (const [field, allowedValues] of Object.entries(SEMANTIC_FILTER_VALUE_SETS)) {
    const value = filters[field];
    if (value !== undefined) {
      validateEnumeratedFilterValue(value, allowedValues, `${path}.${field}`, errors);
    }
  }
}

/**
 * @param {unknown} value
 * @param {string[]} allowedValues
 * @param {string} path
 * @param {ValidationError[]} errors
 */
function validateEnumeratedFilterValue(value, allowedValues, path, errors) {
  if (typeof value === 'string') {
    if (!allowedValues.includes(value)) {
      errors.push(createError(
        ERROR_CODES.nonCanonicalVocabularyOrIdentifier,
        `Value at ${path} must use one of the canonical values: ${allowedValues.join(', ')}.`,
        path
      ));
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      if (typeof item !== 'string' || !allowedValues.includes(item)) {
        errors.push(createError(
          ERROR_CODES.nonCanonicalVocabularyOrIdentifier,
          `Value at ${path}[${index}] must use one of the canonical values: ${allowedValues.join(', ')}.`,
          `${path}[${index}]`
        ));
      }
    }
  }
}

/** @type {Record<string, string[]>} */
const SEMANTIC_FILTER_VALUE_SETS = {
  'rollout-mode': ROLLOUT_MODE_VALUES,
  'workflow-active': WORKFLOW_ACTIVE_VALUES,
  'run-status': RUN_STATUS_VALUES,
  'run-conclusion': RUN_CONCLUSION_VALUES,
  status: GRADER_STATUS_VALUES,
  'eval-result': EVAL_RESULT_VALUES,
  'outcome-state': OUTCOME_STATE_VALUES
};

/**
 * @param {unknown} value
 * @param {string} path
 * @param {string} label
 * @param {ValidationError[]} errors
 */
function validateRequiredIdentifier(value, path, label, errors) {
  validateStringField(value, path, true, errors);
  if (typeof value === 'string' && !IDENTIFIER_PATTERN.test(value)) {
    errors.push(createError(
      ERROR_CODES.nonCanonicalVocabularyOrIdentifier,
      `${label} must match ^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$.`,
      path
    ));
  }
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {boolean} required
 * @param {ValidationError[]} errors
 */
function validateStringField(value, path, required, errors) {
  if (value === undefined) {
    if (required) {
      errors.push(createError(
        ERROR_CODES.missingOrInvalidRequiredField,
        `${path.split('.').at(-1)} is required and must be a non-empty string.`,
        path
      ));
    }
    return;
  }

  if (typeof value !== 'string' || value.length === 0) {
    errors.push(createError(
      ERROR_CODES.missingOrInvalidRequiredField,
      `${path.split('.').at(-1)} must be a non-empty string.`,
      path
    ));
  }
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {ValidationError[]} errors
 */
function validateOptionalStringField(value, path, errors) {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string') {
    errors.push(createError(
      ERROR_CODES.missingOrInvalidRequiredField,
      `${path.split('.').at(-1)} must be a string.`,
      path
    ));
  }
}

/**
 * @param {unknown} node
 * @param {string[]} allowedKeys
 * @param {string} path
 * @param {ValidationError[]} errors
 */
function validateObjectKeys(node, allowedKeys, path, errors) {
  const items = getMappingItems(node);
  if (!items) {
    return;
  }

  /** @type {Map<string, number>} */
  const seen = new Map();
  for (const item of items) {
    const key = getPairKey(item);
    if (typeof key !== 'string') {
      continue;
    }

    const keyPath = `${path}.${key}`;
    if (seen.has(key)) {
      errors.push(createError(
        ERROR_CODES.unknownOrDuplicateKey,
        `Duplicate key "${key}" is not allowed.`,
        keyPath
      ));
      continue;
    }
    seen.set(key, 1);

    if (!allowedKeys.includes(key)) {
      errors.push(createError(
        ERROR_CODES.unknownOrDuplicateKey,
        `Unknown key "${key}" is not allowed at ${path}.`,
        keyPath
      ));
    }
  }
}

/**
 * @param {string} code
 * @param {string} message
 * @param {string} path
 * @returns {ValidationError}
 */
function createError(code, message, path) {
  return { code, message, path };
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} node
 * @returns {unknown[] | null}
 */
function getMappingItems(node) {
  if (!node || typeof node !== 'object' || !('items' in node)) {
    return null;
  }

  const items = /** @type {{ items?: unknown[] }} */ (node).items;
  return Array.isArray(items) ? items : null;
}

/**
 * @param {unknown} pair
 * @returns {string | undefined}
 */
function getPairKey(pair) {
  if (!pair || typeof pair !== 'object' || !('key' in pair)) {
    return undefined;
  }

  const keyNode = /** @type {{ key?: { value?: unknown } }} */ (pair).key;
  return typeof keyNode?.value === 'string' ? keyNode.value : undefined;
}

/**
 * @param {unknown} mappingNode
 * @param {string} key
 * @returns {unknown}
 */
function getValueNodeByKey(mappingNode, key) {
  const items = getMappingItems(mappingNode);
  if (!items) {
    return undefined;
  }

  for (const item of items) {
    if (getPairKey(item) === key) {
      return /** @type {{ value?: unknown }} */ (item).value;
    }
  }

  return undefined;
}

/**
 * @param {unknown} sequenceNode
 * @param {number} index
 * @returns {unknown}
 */
function getSequenceItemNode(sequenceNode, index) {
  if (!sequenceNode || typeof sequenceNode !== 'object' || !('items' in sequenceNode)) {
    return undefined;
  }

  const items = /** @type {{ items?: unknown[] }} */ (sequenceNode).items;
  return Array.isArray(items) ? items[index] : undefined;
}
