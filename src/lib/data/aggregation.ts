import type { AggregationType, Row } from './types';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Applies an aggregation function to a list of numeric values. */
export function aggregate(values: number[], type: AggregationType): number {
  if (values.length === 0) return 0;
  switch (type) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count':
      return values.length;
    case 'median':
      return median(values);
    default:
      return 0;
  }
}

export interface GroupedResult {
  key: string;
  value: number;
}

/**
 * Groups rows by a dimension field and aggregates a metric field.
 * Non-numeric or null metric values are excluded from the aggregation
 * (except for 'count', which counts all rows with a non-null dimension).
 */
export function groupAndAggregate(
  rows: Row[],
  dimension: string,
  metric: string,
  aggType: AggregationType,
): GroupedResult[] {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const rawKey = row[dimension];
    if (rawKey === null || rawKey === undefined) continue;
    const key = String(rawKey);
    const rawVal = row[metric];
    const num = typeof rawVal === 'number' ? rawVal : Number(rawVal);
    if (aggType !== 'count' && (rawVal === null || Number.isNaN(num))) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(aggType === 'count' ? 1 : num);
  }
  return Array.from(groups.entries())
    .map(([key, values]) => ({ key, value: aggregate(values, aggType) }))
    .sort((a, b) => b.value - a.value);
}

/** Groups rows by two dimensions producing a nested aggregation, useful for stacked/grouped bars and heatmaps. */
export function groupAndAggregate2D(
  rows: Row[],
  dimension1: string,
  dimension2: string,
  metric: string,
  aggType: AggregationType,
): { key1: string; key2: string; value: number }[] {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const k1 = row[dimension1];
    const k2 = row[dimension2];
    if (k1 === null || k1 === undefined || k2 === null || k2 === undefined) continue;
    const rawVal = row[metric];
    const num = typeof rawVal === 'number' ? rawVal : Number(rawVal);
    if (aggType !== 'count' && (rawVal === null || Number.isNaN(num))) continue;
    const key = `${String(k1)}\u0000${String(k2)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(aggType === 'count' ? 1 : num);
  }
  return Array.from(groups.entries()).map(([key, values]) => {
    const [key1, key2] = key.split('\u0000');
    return { key1, key2, value: aggregate(values, aggType) };
  });
}

/** Buckets numeric time-series data by a date field, aggregating a metric per period (day/month). */
export function timeSeries(
  rows: Row[],
  dateField: string,
  metric: string,
  aggType: AggregationType,
  granularity: 'day' | 'month' = 'month',
): GroupedResult[] {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const raw = row[dateField];
    if (raw === null || raw === undefined) continue;
    const d = new Date(String(raw));
    if (Number.isNaN(d.getTime())) continue;
    const key =
      granularity === 'month'
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const rawVal = row[metric];
    const num = typeof rawVal === 'number' ? rawVal : Number(rawVal);
    if (aggType !== 'count' && (rawVal === null || Number.isNaN(num))) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(aggType === 'count' ? 1 : num);
  }
  return Array.from(groups.entries())
    .map(([key, values]) => ({ key, value: aggregate(values, aggType) }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}
