import { describe, expect, it } from 'vitest';
import { applyFilters } from '../lib/data/filtering';
import type { FilterState, Row } from '../lib/data/types';
import { emptyFilterState } from '../lib/data/types';

const rows: Row[] = [
  { categoria: 'Electrónica', region: 'Norte', fecha: '2024-01-05', ingresos: 100, nombre: 'Laptop Pro' },
  { categoria: 'Hogar', region: 'Sur', fecha: '2024-02-15', ingresos: 250, nombre: 'Sofá' },
  { categoria: 'Electrónica', region: 'Sur', fecha: '2024-03-20', ingresos: 400, nombre: 'Teléfono' },
];

describe('applyFilters', () => {
  it('returns all rows when filters are empty', () => {
    expect(applyFilters(rows, emptyFilterState())).toHaveLength(3);
  });

  it('filters by date range', () => {
    const filters: FilterState = { ...emptyFilterState(), dateRange: { field: 'fecha', from: '2024-02-01', to: '2024-03-01' } };
    const result = applyFilters(rows, filters);
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Sofá');
  });

  it('filters by multi-select', () => {
    const filters: FilterState = { ...emptyFilterState(), multiSelect: { categoria: ['Electrónica'] } };
    const result = applyFilters(rows, filters);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.categoria === 'Electrónica')).toBe(true);
  });

  it('filters by numeric range', () => {
    const filters: FilterState = { ...emptyFilterState(), numericRange: { ingresos: [200, 300] } };
    const result = applyFilters(rows, filters);
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Sofá');
  });

  it('filters by text search across all fields, case-insensitive', () => {
    const filters: FilterState = { ...emptyFilterState(), textSearch: 'telé' };
    const result = applyFilters(rows, filters);
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Teléfono');
  });

  it('combines multiple filters with AND semantics', () => {
    const filters: FilterState = {
      ...emptyFilterState(),
      multiSelect: { categoria: ['Electrónica'] },
      numericRange: { ingresos: [0, 200] },
    };
    const result = applyFilters(rows, filters);
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Laptop Pro');
  });
});
