import { describe, expect, it } from 'vitest';
import { detectSchema, coerceRows } from '../lib/parsing/schemaDetection';
import type { Row } from '../lib/data/types';

describe('detectSchema', () => {
  const rows: Row[] = [
    { nombre: 'Ana', edad: '30', activo: 'true', fecha: '2024-01-01', nota: '' },
    { nombre: 'Luis', edad: '25', activo: 'false', fecha: '2024-02-01', nota: null },
    { nombre: 'Ana', edad: '30', activo: 'true', fecha: '2024-01-01', nota: '' }, // duplicate of row 1
  ];

  it('infers column types correctly', () => {
    const schema = detectSchema(rows);
    const byName = Object.fromEntries(schema.columns.map((c) => [c.name, c]));
    expect(byName.edad.type).toBe('number');
    expect(byName.activo.type).toBe('boolean');
    expect(byName.fecha.type).toBe('date');
    expect(byName.nombre.type).toBe('string');
  });

  it('counts nulls', () => {
    const schema = detectSchema(rows);
    const nota = schema.columns.find((c) => c.name === 'nota');
    expect(nota?.nullCount).toBeGreaterThan(0);
  });

  it('detects duplicate rows', () => {
    const schema = detectSchema(rows);
    expect(schema.duplicateRowCount).toBe(1);
  });

  it('handles an empty dataset', () => {
    const schema = detectSchema([]);
    expect(schema.rowCount).toBe(0);
    expect(schema.columns).toHaveLength(0);
  });
});

describe('coerceRows', () => {
  it('coerces string values into their detected types', () => {
    const raw: Row[] = [{ edad: '30', activo: 'true', nombre: 'Ana' }];
    const schema = detectSchema(raw);
    const [coerced] = coerceRows(raw, schema);
    expect(coerced.edad).toBe(30);
    expect(coerced.activo).toBe(true);
    expect(coerced.nombre).toBe('Ana');
  });

  it('converts empty strings to null', () => {
    const raw: Row[] = [{ nota: '' }];
    const schema = detectSchema(raw);
    const [coerced] = coerceRows(raw, schema);
    expect(coerced.nota).toBeNull();
  });
});
