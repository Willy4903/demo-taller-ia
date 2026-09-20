import { useFilterStore } from '../../store/useFilterStore';

interface MultiSelectFilterProps {
  field: string;
  options: string[];
}

export function MultiSelectFilter({ field, options }: MultiSelectFilterProps) {
  const selected = useFilterStore((s) => s.filters.multiSelect[field] ?? []);
  const setMultiSelect = useFilterStore((s) => s.setMultiSelect);

  const toggle = (value: string) => {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
    setMultiSelect(field, next);
  };

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-semibold text-grey-700 dark:text-grey-200">{field}</legend>
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto pr-1">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-xs text-grey-700 dark:text-grey-300">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="h-3.5 w-3.5 rounded-sm border-grey-400 text-navy focus:ring-navy dark:text-gold dark:focus:ring-gold"
            />
            <span className="truncate">{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
