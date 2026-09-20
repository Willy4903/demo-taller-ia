import type { Row } from '../data/types';
import type { RawParseResult } from './csv';

/** Parses a JSON text file. Accepts an array of objects, or { data: [...] }. */
export function parseJsonText(text: string): RawParseResult {
  try {
    const parsed: unknown = JSON.parse(text);
    let arr: unknown[];
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { data?: unknown }).data)
    ) {
      arr = (parsed as { data: unknown[] }).data;
    } else {
      return { rows: [], errors: ['El JSON debe ser un arreglo de objetos o { "data": [...] }.'] };
    }
    const rows = arr.filter((r) => r && typeof r === 'object') as Row[];
    const errors =
      rows.length !== arr.length
        ? [`Se omitieron ${arr.length - rows.length} elementos que no eran objetos.`]
        : [];
    return { rows, errors };
  } catch (err) {
    return { rows: [], errors: [`JSON inválido: ${(err as Error).message}`] };
  }
}
