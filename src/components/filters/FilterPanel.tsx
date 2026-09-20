import { useMemo } from 'react';
import { useDataStore, useCombinedSchema } from '../../store/useDataStore';
import { DateRangeFilter } from './DateRangeFilter';
import { MultiSelectFilter } from './MultiSelectFilter';
import { NumericSliderFilter } from './NumericSliderFilter';
import { TextSearchFilter } from './TextSearchFilter';
import { ActiveFilterChips } from './ActiveFilterChips';
import { EmptyState } from '../common/EmptyState';

/** Dynamically builds filter controls from the detected dataset schema. */
export function FilterPanel() {
  const schema = useCombinedSchema();
  const activeRows = useDataStore((s) => s.activeRows);

  const dateFields = useMemo(() => schema.columns.filter((c) => c.type === 'date'), [schema]);
  const categoricalFields = useMemo(
    () => schema.columns.filter((c) => c.type === 'string' && c.distinctCount > 1 && c.distinctCount <= 30),
    [schema],
  );
  const numericFields = useMemo(() => schema.columns.filter((c) => c.type === 'number'), [schema]);

  const optionsByField = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const col of categoricalFields) {
      const values = new Set<string>();
      for (const row of activeRows) {
        const v = row[col.name];
        if (v !== null && v !== undefined) values.add(String(v));
        if (values.size > 200) break;
      }
      map.set(col.name, Array.from(values).sort());
    }
    return map;
  }, [categoricalFields, activeRows]);

  if (schema.columns.length === 0) {
    return (
      <EmptyState
        title="Sin filtros disponibles"
        description="Carga un archivo para generar filtros automáticamente a partir de su esquema."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-grey-400">Filtros activos</h3>
        <ActiveFilterChips />
      </div>

      <TextSearchFilter />

      {dateFields.map((col) => (
        <DateRangeFilter key={col.name} field={col.name} />
      ))}

      {categoricalFields.map((col) => (
        <MultiSelectFilter key={col.name} field={col.name} options={optionsByField.get(col.name) ?? []} />
      ))}

      {numericFields.map((col) => (
        <NumericSliderFilter
          key={col.name}
          field={col.name}
          min={typeof col.min === 'number' ? col.min : 0}
          max={typeof col.max === 'number' ? col.max : 0}
        />
      ))}
    </div>
  );
}
