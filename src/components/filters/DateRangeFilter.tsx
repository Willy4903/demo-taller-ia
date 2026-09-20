import { useFilterStore } from '../../store/useFilterStore';

interface DateRangeFilterProps {
  field: string;
}

export function DateRangeFilter({ field }: DateRangeFilterProps) {
  const dateRange = useFilterStore((s) => s.filters.dateRange);
  const setDateRange = useFilterStore((s) => s.setDateRange);

  const active = dateRange?.field === field;
  const from = active ? (dateRange?.from ?? '') : '';
  const to = active ? (dateRange?.to ?? '') : '';

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-semibold text-grey-700 dark:text-grey-200">{field}</legend>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`from-${field}`}>
          Desde
        </label>
        <input
          id={`from-${field}`}
          type="date"
          value={from}
          onChange={(e) => setDateRange(field, e.target.value || null, to || null)}
          className="w-full rounded-sm border border-grey-200 bg-white px-2 py-1 text-xs text-grey-900 dark:border-grey-700 dark:bg-grey-900 dark:text-grey-100"
        />
        <span className="text-grey-400">–</span>
        <label className="sr-only" htmlFor={`to-${field}`}>
          Hasta
        </label>
        <input
          id={`to-${field}`}
          type="date"
          value={to}
          onChange={(e) => setDateRange(field, from || null, e.target.value || null)}
          className="w-full rounded-sm border border-grey-200 bg-white px-2 py-1 text-xs text-grey-900 dark:border-grey-700 dark:bg-grey-900 dark:text-grey-100"
        />
      </div>
    </fieldset>
  );
}
