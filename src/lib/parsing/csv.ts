import Papa from 'papaparse';
import type { Row } from '../data/types';

export interface RawParseResult {
  rows: Row[];
  errors: string[];
}

/** Parses CSV text into rows. Runs synchronously; intended for use inside the worker. */
export function parseCsvText(text: string): RawParseResult {
  const result = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });
  const errors = result.errors.slice(0, 50).map((e) => `Fila ${e.row ?? '?'}: ${e.message}`);
  return { rows: result.data, errors };
}
