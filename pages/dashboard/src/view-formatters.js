/**
 * Shared presentation-only formatting and aggregation helpers for custom dashboard views.
 */

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string | null} fieldName
 * @param {string} aggregate
 * @param {(value: unknown) => string} toText
 * @param {{ name: string, symbol: string, significant: number } | null} [unit]
 * @returns {string}
 */
export function formatAggregateValue(rows, fieldName, aggregate, toText, unit = null) {
  if (!fieldName) {
    return 'Unavailable';
  }

  if (aggregate === 'count') {
    return formatNumber(rows.filter((row) => row[fieldName] != null && row[fieldName] !== '').length, unit);
  }
  if (aggregate === 'distinct-count') {
    return formatNumber(new Set(rows.map((row) => toText(row[fieldName]))).size, unit);
  }
  if (aggregate === 'sum') {
    return formatNumber(rows.reduce((total, row) => total + toNumber(row[fieldName]), 0), unit);
  }
  if (aggregate === 'mean') {
    const numericValues = rows.map((row) => toNumber(row[fieldName])).filter((value) => Number.isFinite(value));
    return numericValues.length > 0
      ? formatNumber(numericValues.reduce((total, value) => total + value, 0) / numericValues.length, unit)
      : 'Unavailable';
  }
  if (aggregate === 'min') {
    const numericValues = rows.map((row) => toNumber(row[fieldName])).filter((value) => Number.isFinite(value));
    return numericValues.length > 0 ? formatNumber(Math.min(...numericValues), unit) : 'Unavailable';
  }
  if (aggregate === 'max') {
    const numericValues = rows.map((row) => toNumber(row[fieldName])).filter((value) => Number.isFinite(value));
    return numericValues.length > 0 ? formatNumber(Math.max(...numericValues), unit) : 'Unavailable';
  }
  const value = rows[0]?.[fieldName];
  return rows.length > 0 && unit && typeof value === 'number' && Number.isFinite(value)
    ? formatNumber(value, unit)
    : rows.length > 0 ? toText(value) : 'Unavailable';
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
 * @param {{ name: string, symbol: string, significant: number } | null} [unit]
 * @param {boolean} [includeUnit]
 * @returns {string}
 */
export function formatNumber(value, unit = null, includeUnit = true) {
  if (unit && Number.isFinite(unit.significant) && unit.significant > 0) {
    const quotient = value / unit.significant;
    const rounded = Math.sign(quotient) * Math.round(Math.abs(quotient)) * unit.significant;
    return `${rounded.toFixed(fractionDigits(unit.significant))}${includeUnit ? ` ${unit.symbol}` : ''}`;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * @param {number} value
 * @returns {number}
 */
function fractionDigits(value) {
  const [mantissa, exponentText = '0'] = value.toString().toLowerCase().split('e');
  const fractionLength = mantissa.split('.')[1]?.length ?? 0;
  return Math.min(100, Math.max(0, fractionLength - Number(exponentText)));
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
    if (typeof threshold.max !== 'number') {
      return threshold.status;
    }
    if (ratio < threshold.max) {
      return threshold.status;
    }
  }
  return 'unknown';
}
