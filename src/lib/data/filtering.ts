import type { FilterState, Row } from './types';

/** Applies the global FilterState to a row array, returning only matching rows. */
export function applyFilters(rows: Row[], filters: FilterState): Row[] {
  return rows.filter((row) => rowMatchesFilters(row, filters));
}

function rowMatchesFilters(row: Row, filters: FilterState): boolean {
  if (filters.dateRange && filters.dateRange.field) {
    const { field, from, to } = filters.dateRange;
    const raw = row[field];
    if (raw !== null && raw !== undefined) {
      const t = new Date(String(raw)).getTime();
      if (!Number.isNaN(t)) {
        if (from && t < new Date(from).getTime()) return false;
        if (to && t > new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      }
    }
  }

  for (const [field, values] of Object.entries(filters.multiSelect)) {
    if (!values || values.length === 0) continue;
    const raw = row[field];
    if (raw === null || raw === undefined || !values.includes(String(raw))) return false;
  }

  for (const [field, [min, max]] of Object.entries(filters.numericRange)) {
    const raw = row[field];
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (raw === null || raw === undefined || Number.isNaN(num)) continue;
    if (num < min || num > max) return false;
  }

  if (filters.textSearch && filters.textSearch.trim() !== '') {
    const needle = filters.textSearch.trim().toLowerCase();
    const haystack = Object.values(row)
      .filter((v) => v !== null && v !== undefined)
      .map((v) => String(v).toLowerCase())
      .join(' | ');
    if (!haystack.includes(needle)) return false;
  }

  return true;
}
