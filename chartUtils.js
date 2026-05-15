/**
 * Chart analysis utilities for SQheLp
 * Analyzes query result columns/data to recommend the best chart type.
 */

/* ── colour palette for chart series ──────────────────── */
export const CHART_COLORS = [
  '#667eea', '#764ba2', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

/* ── column type detection ────────────────────────────── */

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}/,            // 2026-05-15 …
  /^\d{2}\/\d{2}\/\d{4}/,          // 15/05/2026
  /^[A-Z][a-z]{2}\s\d{1,2},?\s\d{4}/, // May 15, 2026
];

function isDateValue(val) {
  if (val === null || val === undefined) return false;
  const s = String(val);
  return DATE_PATTERNS.some(p => p.test(s));
}

function isNumericValue(val) {
  if (val === null || val === undefined) return false;
  const n = Number(val);
  return !isNaN(n) && isFinite(n);
}

/**
 * Classify each column as 'date', 'number', or 'category'
 * by sampling the first N non-null values.
 */
function classifyColumn(data, colName, sampleSize = 20) {
  let dateCt = 0, numCt = 0, catCt = 0, total = 0;

  for (let i = 0; i < Math.min(data.length, sampleSize); i++) {
    const v = data[i][colName];
    if (v === null || v === undefined || v === '') continue;
    total++;
    if (isDateValue(v))      dateCt++;
    else if (isNumericValue(v)) numCt++;
    else                        catCt++;
  }

  if (total === 0) return 'empty';
  if (dateCt / total > 0.6)  return 'date';
  if (numCt / total > 0.6)   return 'number';
  return 'category';
}

/* ── main recommendation engine ───────────────────────── */

/**
 * Analyze result data and return a chart recommendation.
 *
 * @param {string[]} columns  - column names
 * @param {Object[]} data     - array of row objects
 * @returns {{ chartType, labelKey, valueKeys, title, viable }} | null
 */
export function recommendChart(columns, data) {
  if (!columns || !data || data.length === 0 || columns.length < 2) {
    return null;
  }

  const types = {};
  columns.forEach(col => { types[col] = classifyColumn(data, col); });

  const dateCols   = columns.filter(c => types[c] === 'date');
  const numCols    = columns.filter(c => types[c] === 'number');
  const catCols    = columns.filter(c => types[c] === 'category');

  // Need at least 1 numeric column for any chart
  if (numCols.length === 0) return null;

  let chartType = 'bar';
  let labelKey  = null;
  let valueKeys = [];
  let title     = '';

  // ── Strategy 1: time-series (date + numbers → line chart) ──
  if (dateCols.length > 0) {
    chartType = 'line';
    labelKey  = dateCols[0];
    valueKeys = numCols.slice(0, 4);
    title     = `${valueKeys.join(', ')} over ${labelKey}`;
  }
  // ── Strategy 2: category breakdown (cat + numbers → bar) ──
  else if (catCols.length > 0) {
    labelKey  = catCols[0];
    valueKeys = numCols.slice(0, 4);

    // Unique category count drives chart choice
    const unique = new Set(data.map(r => r[labelKey])).size;

    if (unique <= 8 && valueKeys.length === 1) {
      chartType = 'pie';
      title     = `${valueKeys[0]} by ${labelKey}`;
    } else {
      chartType = 'bar';
      title     = `${valueKeys.join(', ')} by ${labelKey}`;
    }
  }
  // ── Strategy 3: pure numbers (first col as label → bar) ──
  else if (numCols.length >= 2) {
    labelKey  = numCols[0];
    valueKeys = numCols.slice(1, 5);
    chartType = 'bar';
    title     = `${valueKeys.join(', ')} by ${labelKey}`;
  }

  if (!labelKey || valueKeys.length === 0) return null;

  return { chartType, labelKey, valueKeys, title, viable: true };
}

/**
 * Convert raw string data to proper numbers for Recharts
 */
export function prepareChartData(data, labelKey, valueKeys) {
  return data.map(row => {
    const entry = { [labelKey]: row[labelKey] };
    valueKeys.forEach(k => {
      const v = Number(row[k]);
      entry[k] = isNaN(v) ? 0 : v;
    });
    return entry;
  });
}
