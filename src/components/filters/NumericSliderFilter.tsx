import { useFilterStore } from '../../store/useFilterStore';

interface NumericSliderFilterProps {
  field: string;
  min: number;
  max: number;
}

export function NumericSliderFilter({ field, min, max }: NumericSliderFilterProps) {
  const range = useFilterStore((s) => s.filters.numericRange[field]) ?? [min, max];
  const setNumericRange = useFilterStore((s) => s.setNumericRange);

  if (min === max) return null;

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-semibold text-grey-700 dark:text-grey-200">{field}</legend>
      <div className="flex items-center justify-between text-[11px] text-grey-400">
        <span>{range[0].toLocaleString('es-ES')}</span>
        <span>{range[1].toLocaleString('es-ES')}</span>
      </div>
      <div className="flex flex-col gap-1">
        <label className="sr-only" htmlFor={`min-${field}`}>
          Mínimo de {field}
        </label>
        <input
          id={`min-${field}`}
          type="range"
          min={min}
          max={max}
          value={range[0]}
          onChange={(e) => setNumericRange(field, [Math.min(Number(e.target.value), range[1]), range[1]])}
          className="w-full accent-navy dark:accent-gold"
        />
        <label className="sr-only" htmlFor={`max-${field}`}>
          Máximo de {field}
        </label>
        <input
          id={`max-${field}`}
          type="range"
          min={min}
          max={max}
          value={range[1]}
          onChange={(e) => setNumericRange(field, [range[0], Math.max(Number(e.target.value), range[0])])}
          className="w-full accent-navy dark:accent-gold"
        />
      </div>
    </fieldset>
  );
}
