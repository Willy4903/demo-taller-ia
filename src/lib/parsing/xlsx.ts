import * as XLSX from 'xlsx';
import type { Row } from '../data/types';
import type { RawParseResult } from './csv';

/** Parses an XLSX/XLS array buffer (first sheet) into rows. */
export function parseXlsxBuffer(buffer: ArrayBuffer): RawParseResult {
  const errors: string[] = [];
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { rows: [], errors: ['El archivo no contiene hojas.'] };
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: true });
    const normalized = rows.map((row) => {
      const out: Row = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = v instanceof Date ? v.toISOString().slice(0, 10) : (v as Row[string]);
      }
      return out;
    });
    return { rows: normalized, errors };
  } catch (err) {
    return { rows: [], errors: [`No se pudo leer el archivo XLSX: ${(err as Error).message}`] };
  }
}
