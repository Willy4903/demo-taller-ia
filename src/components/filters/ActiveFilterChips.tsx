import { useFilterStore } from '../../store/useFilterStore';

export function ActiveFilterChips() {
  const filters = useFilterStore((s) => s.filters);
  const setMultiSelect = useFilterStore((s) => s.setMultiSelect);
  const clearNumericRange = useFilterStore((s) => s.clearNumericRange);
  const clearDateRange = useFilterStore((s) => s.clearDateRange);
  const setTextSearch = useFilterStore((s) => s.setTextSearch);
  const clearAll = useFilterStore((s) => s.clearAll);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.dateRange?.field && (filters.dateRange.from || filters.dateRange.to)) {
    chips.push({
      key: 'date',
      label: `${filters.dateRange.field}: ${filters.dateRange.from ?? '…'} → ${filters.dateRange.to ?? '…'}`,
      onRemove: clearDateRange,
    });
  }
  for (const [field, values] of Object.entries(filters.multiSelect)) {
    for (const value of values) {
      chips.push({
        key: `${field}-${value}`,
        label: `${field}: ${value}`,
        onRemove: () => setMultiSelect(field, values.filter((v) => v !== value)),
      });
    }
  }
  for (const [field, [min, max]] of Object.entries(filters.numericRange)) {
    chips.push({
      key: `nr-${field}`,
      label: `${field}: ${min.toLocaleString('es-ES')}–${max.toLocaleString('es-ES')}`,
      onRemove: () => clearNumericRange(field),
    });
  }
  if (filters.textSearch) {
    chips.push({ key: 'text', label: `Texto: "${filters.textSearch}"`, onRemove: () => setTextSearch('') });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 rounded-full border border-navy/20 bg-navy/5 px-2.5 py-1 text-[11px] text-navy transition hover:bg-navy/10 dark:border-gold/30 dark:bg-gold/10 dark:text-gold dark:hover:bg-gold/20"
        >
          {chip.label}
          <span aria-hidden>×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-[11px] font-medium text-grey-400 underline-offset-2 hover:text-grey-700 hover:underline dark:hover:text-grey-200"
      >
        Limpiar todo
      </button>
    </div>
  );
}
