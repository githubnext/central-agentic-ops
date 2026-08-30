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
