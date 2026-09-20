import { describe, expect, it } from 'vitest';
import { aggregate, groupAndAggregate, groupAndAggregate2D, timeSeries } from '../lib/data/aggregation';
import type { Row } from '../lib/data/types';

const rows: Row[] = [
  { categoria: 'A', region: 'Norte', fecha: '2024-01-05', ingresos: 100 },
  { categoria: 'A', region: 'Sur', fecha: '2024-01-20', ingresos: 200 },
  { categoria: 'B', region: 'Norte', fecha: '2024-02-10', ingresos: 50 },
  { categoria: 'B', region: 'Norte', fecha: '2024-02-15', ingresos: 150 },
  { categoria: 'C', region: 'Sur', fecha: '2024-03-01', ingresos: null },
];

describe('aggregate', () => {
  it('computes sum', () => {
    expect(aggregate([1, 2, 3], 'sum')).toBe(6);
  });
  it('computes avg', () => {
    expect(aggregate([2, 4, 6], 'avg')).toBe(4);
  });
  it('computes count', () => {
    expect(aggregate([2, 4, 6], 'count')).toBe(3);
  });
  it('computes median for even-length arrays', () => {
    expect(aggregate([1, 2, 3, 4], 'median')).toBe(2.5);
  });
  it('computes median for odd-length arrays', () => {
    expect(aggregate([5, 1, 3], 'median')).toBe(3);
  });
  it('returns 0 for empty input', () => {
    expect(aggregate([], 'sum')).toBe(0);
  });
});

describe('groupAndAggregate', () => {
  it('groups and sums by dimension, sorted descending', () => {
    const result = groupAndAggregate(rows, 'categoria', 'ingresos', 'sum');
    expect(result[0]).toEqual({ key: 'A', value: 300 });
    expect(result.find((r) => r.key === 'B')).toEqual({ key: 'B', value: 200 });
  });

  it('excludes null metric values except for count', () => {
    const sum = groupAndAggregate(rows, 'categoria', 'ingresos', 'sum');
    expect(sum.find((r) => r.key === 'C')).toBeUndefined();

    const count = groupAndAggregate(rows, 'categoria', 'ingresos', 'count');
    expect(count.find((r) => r.key === 'C')?.value).toBe(1);
  });
});

describe('groupAndAggregate2D', () => {
  it('groups by two dimensions', () => {
    const result = groupAndAggregate2D(rows, 'categoria', 'region', 'ingresos', 'sum');
    const bNorte = result.find((r) => r.key1 === 'B' && r.key2 === 'Norte');
    expect(bNorte?.value).toBe(200);
  });
});

describe('timeSeries', () => {
  it('buckets by month and sums, skipping months where the metric is entirely null', () => {
    const series = timeSeries(rows, 'fecha', 'ingresos', 'sum', 'month');
    expect(series.find((s) => s.key === '2024-01')?.value).toBe(300);
    expect(series.find((s) => s.key === '2024-02')?.value).toBe(200);
    // 2024-03 only has a null 'ingresos' value, so it is excluded from a sum aggregation.
    expect(series.map((s) => s.key)).toEqual(['2024-01', '2024-02']);
  });

  it('still counts rows in months where the metric is null when using count', () => {
    const series = timeSeries(rows, 'fecha', 'ingresos', 'count', 'month');
    expect(series.find((s) => s.key === '2024-03')?.value).toBe(1);
  });
});
