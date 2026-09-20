import { parseCsvText } from './csv';
import { parseXlsxBuffer } from './xlsx';
import { parseJsonText } from './json';
import { detectSchema, coerceRows } from './schemaDetection';
import type { ParsedFileResult } from '../data/types';

/** Fallback inline parser used when Web Workers are not available (e.g. tests). */
export async function parseFileInline(
  file: File,
  kind: 'csv' | 'xlsx' | 'json',
): Promise<ParsedFileResult> {
  const start = performance.now();
  const raw =
    kind === 'csv'
      ? parseCsvText(await file.text())
      : kind === 'json'
        ? parseJsonText(await file.text())
        : parseXlsxBuffer(await file.arrayBuffer());
  const schema = detectSchema(raw.rows);
  const rows = coerceRows(raw.rows, schema);
  return { fileName: file.name, rows, schema, errors: raw.errors, parseMs: performance.now() - start };
}
