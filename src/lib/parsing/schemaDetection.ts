import type { ColumnSchema, ColumnType, DatasetSchema, Row } from '../data/types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

function inferCellType(value: unknown): ColumnType {
  if (value === null || value === undefined || value === '') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' && !Number.isNaN(value)) return 'number';
  const str = String(value).trim();
  if (str === '') return 'string';
  if (/^(true|false)$/i.test(str)) return 'boolean';
  if (DATE_REGEX.test(str) && !Number.isNaN(Date.parse(str))) return 'date';
  if (str !== '' && !Number.isNaN(Number(str)) && /[0-9]/.test(str)) return 'number';
  return 'string';
}

/** Detects a schema (column types, nulls, duplicates) from a sample of parsed rows. */
export function detectSchema(rows: Row[]): DatasetSchema {
  if (rows.length === 0) {
    return { columns: [], rowCount: 0, duplicateRowCount: 0 };
  }
  const columnNames = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );

  const sampleSize = Math.min(rows.length, 500);
  const step = Math.max(1, Math.floor(rows.length / sampleSize));

  const columns: ColumnSchema[] = columnNames.map((name) => {
    const typeCounts: Record<ColumnType, number> = { string: 0, number: 0, date: 0, boolean: 0 };
    let nullCount = 0;
    const distinct = new Set<string>();
    const samples: string[] = [];
    let min: number | undefined;
    let max: number | undefined;
    let minStr: string | undefined;
    let maxStr: string | undefined;

    for (let i = 0; i < rows.length; i += step) {
      const raw = rows[i][name];
      if (raw === null || raw === undefined || raw === '') {
        nullCount++;
        continue;
      }
      const t = inferCellType(raw);
      typeCounts[t]++;
      const strVal = String(raw);
      if (distinct.size < 5000) distinct.add(strVal);
      if (samples.length < 5) samples.push(strVal);
      if (t === 'number') {
        const n = Number(raw);
        if (min === undefined || n < min) min = n;
        if (max === undefined || n > max) max = n;
      }
      if (minStr === undefined || strVal < minStr) minStr = strVal;
      if (maxStr === undefined || strVal > maxStr) maxStr = strVal;
    }

    let type: ColumnType = 'string';
    let best = -1;
    (Object.keys(typeCounts) as ColumnType[]).forEach((t) => {
      if (typeCounts[t] > best) {
        best = typeCounts[t];
        type = t;
      }
    });
    if (best <= 0) type = 'string';

    return {
      name,
      type,
      nullCount: Math.round((nullCount / Math.ceil(rows.length / step)) * rows.length),
      distinctCount: distinct.size,
      sampleValues: samples,
      min: type === 'number' ? min : minStr,
      max: type === 'number' ? max : maxStr,
    };
  });

  // duplicate detection via stringified row (sampled for very large datasets)
  const seen = new Set<string>();
  let duplicateRowCount = 0;
  const dupSampleLimit = 50000;
  const dupRows = rows.length > dupSampleLimit ? rows.slice(0, dupSampleLimit) : rows;
  for (const row of dupRows) {
    const key = JSON.stringify(row);
    if (seen.has(key)) duplicateRowCount++;
    else seen.add(key);
  }

  return { columns, rowCount: rows.length, duplicateRowCount };
}

/** Coerces raw parsed values into typed Row values based on a detected schema. */
export function coerceRows(rows: Row[], schema: DatasetSchema): Row[] {
  const typeByCol = new Map(schema.columns.map((c) => [c.name, c.type]));
  return rows.map((row) => {
    const out: Row = {};
    for (const [key, value] of Object.entries(row)) {
      const type = typeByCol.get(key);
      if (value === null || value === undefined || value === '') {
        out[key] = null;
        continue;
      }
      if (type === 'number') {
        const n = typeof value === 'number' ? value : Number(value);
        out[key] = Number.isNaN(n) ? null : n;
      } else if (type === 'boolean') {
        out[key] = typeof value === 'boolean' ? value : /^true$/i.test(String(value));
      } else {
        out[key] = value as string | number | boolean;
      }
    }
    return out;
  });
}
