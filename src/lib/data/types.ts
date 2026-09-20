export type ColumnType = 'string' | 'number' | 'date' | 'boolean';

export interface ColumnSchema {
  name: string;
  type: ColumnType;
  nullCount: number;
  distinctCount: number;
  sampleValues: string[];
  min?: number | string;
  max?: number | string;
}

export interface DatasetSchema {
  columns: ColumnSchema[];
  rowCount: number;
  duplicateRowCount: number;
}

export type Row = Record<string, string | number | boolean | null>;

export interface ParsedFileResult {
  fileName: string;
  rows: Row[];
  schema: DatasetSchema;
  errors: string[];
  parseMs: number;
}

export interface DataFile {
  id: string;
  name: string;
  addedAt: number;
  rowCount: number;
  schema: DatasetSchema;
  errors: string[];
}

export type AggregationType = 'sum' | 'avg' | 'count' | 'median';

export interface FilterState {
  dateRange?: { field: string; from: string | null; to: string | null };
  multiSelect: Record<string, string[]>;
  numericRange: Record<string, [number, number]>;
  textSearch: string;
}

export const emptyFilterState = (): FilterState => ({
  multiSelect: {},
  numericRange: {},
  textSearch: '',
});
