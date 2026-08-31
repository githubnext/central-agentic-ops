/**
 * Shared presentation-only formatting and aggregation helpers for custom dashboard views.
 */

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string | null} fieldName
 * @param {string} aggregate
 * @param {(value: unknown) => string} toText
 * @returns {string}
 */
export function formatAggregateValue(rows, fieldName, aggregate, toText) {
  if (!fieldName) {
    return 'Unavailable';
  }

  if (aggregate === 'count') {
    return String(rows.filter((row) => row[fieldName] != null && row[fieldName] !== '').length);
  }
  if (aggregate === 'distinct-count') {
    return String(new Set(rows.map((row) => toText(row[fieldName]))).size);
  }
  if (aggregate === 'sum') {
    return formatNumber(rows.reduce((total, row) => total + toNumber(row[fieldName]), 0));
  }
  if (aggregate === 'mean') {
    const numericValues = rows.map((row) => toNumber(row[fieldName])).filter((value) => Number.isFinite(value));
    return numericValues.length > 0
      ? formatNumber(numericValues.reduce((total, value) => total + value, 0) / numericValues.length)
      : 'Unavailable';
  }
  if (aggregate === 'min') {
    const numericValues = rows.map((row) => toNumber(row[fieldName])).filter((value) => Number.isFinite(value));
    return numericValues.length > 0 ? formatNumber(Math.min(...numericValues)) : 'Unavailable';
  }
  if (aggregate === 'max') {
    const numericValues = rows.map((row) => toNumber(row[fieldName])).filter((value) => Number.isFinite(value));
    return numericValues.length > 0 ? formatNumber(Math.max(...numericValues)) : 'Unavailable';
  }
  return rows.length > 0 ? toText(rows[0][fieldName]) : 'Unavailable';
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function toNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

const TEMPLATE_TOKEN_PATTERN = /\{\{([a-zA-Z0-9_-]+)(?::(suffix|word):([^:}]*):([^:}]*))?\}\}/g;

/**
 * Renders a JSON-configurable copy template against a set of named values, so that
 * pluralization and count-driven UI copy can be expressed as data instead of code.
 * Supported tokens: `{{name}}` (raw value), `{{name:suffix:singular:plural}}` (appends a
 * pluralization suffix based on whether `name` equals 1), and `{{name:word:singular:plural}}`
 * (substitutes a whole word based on the same rule).
 * @param {string} template
 * @param {Record<string, unknown>} values
 * @returns {string}
 */
export function renderTemplate(template, values) {
  return template.replace(TEMPLATE_TOKEN_PATTERN, (match, name, mode, singular, plural) => {
    const value = values[name];
    if (mode === undefined) {
      return value === undefined ? '' : String(value);
    }
    const isSingular = Number(value) === 1;
    return isSingular ? singular : plural;
  });
}

/**
 * Resolves a status label for a ratio against an ordered list of JSON-configured
 * thresholds. Each threshold declares an optional `max` (exclusive upper bound) and a
 * `status`; the last entry without a `max` acts as the fallback for higher ratios.
 * @param {number} ratio
 * @param {Array<{ max?: number, status: string }>} thresholds
 * @returns {string}
 */
export function resolveThresholdStatus(ratio, thresholds) {
  for (const threshold of thresholds) {
    if (typeof threshold.max !== 'number' || ratio < threshold.max) {
      return threshold.status;
    }
  }
  return thresholds[thresholds.length - 1]?.status ?? 'unknown';
}
