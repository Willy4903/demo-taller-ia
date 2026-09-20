import type { AggregationType, Row } from './types';
import { aggregate } from './aggregation';

export interface KpiResult {
  label: string;
  value: number;
  previousValue: number | null;
  deltaPct: number | null;
  aggType: AggregationType;
}

/**
 * Computes a KPI for a metric field, comparing the current period against the
 * immediately preceding period of equal length using a date field to split rows.
 * If no usable date field is provided, previousValue/deltaPct are null.
 */
export function computeKpi(
  rows: Row[],
  metric: string,
  aggType: AggregationType,
  label: string,
  dateField?: string,
): KpiResult {
  const values = (r: Row[]) =>
    r
      .map((row) => {
        const raw = row[metric];
        return typeof raw === 'number' ? raw : Number(raw);
      })
      .filter((n) => !Number.isNaN(n));

  const value = aggregate(values(rows), aggType);

  if (!dateField) {
    return { label, value, previousValue: null, deltaPct: null, aggType };
  }

  const dated = rows
    .map((row) => ({ row, t: new Date(String(row[dateField])).getTime() }))
    .filter((r) => !Number.isNaN(r.t));

  if (dated.length === 0) {
    return { label, value, previousValue: null, deltaPct: null, aggType };
  }

  const maxT = Math.max(...dated.map((d) => d.t));
  const minT = Math.min(...dated.map((d) => d.t));
  const span = Math.max(maxT - minT, 24 * 60 * 60 * 1000);
  const midpoint = maxT - span / 2;

  const currentRows = dated.filter((d) => d.t >= midpoint).map((d) => d.row);
  const previousRows = dated.filter((d) => d.t < midpoint).map((d) => d.row);

  if (previousRows.length === 0) {
    return { label, value, previousValue: null, deltaPct: null, aggType };
  }

  const currentValue = aggregate(values(currentRows), aggType);
  const previousValue = aggregate(values(previousRows), aggType);
  const deltaPct = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100 : null;

  return { label, value, previousValue, deltaPct, aggType };
}
