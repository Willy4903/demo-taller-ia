import type { AggregationType } from '../../lib/data/types';

interface SelectOption {
  value: string;
  label: string;
}

interface ChartControlsProps {
  dimension?: { value: string; options: SelectOption[]; onChange: (v: string) => void };
  metric?: { value: string; options: SelectOption[]; onChange: (v: string) => void };
  aggregation?: { value: AggregationType; onChange: (v: AggregationType) => void };
}

const AGG_OPTIONS: { value: AggregationType; label: string }[] = [
  { value: 'sum', label: 'Suma' },
  { value: 'avg', label: 'Promedio' },
  { value: 'count', label: 'Conteo' },
  { value: 'median', label: 'Mediana' },
];

const selectClass =
  'rounded-sm border border-grey-200 bg-white px-1.5 py-1 text-[11px] text-grey-700 dark:border-grey-700 dark:bg-grey-800 dark:text-grey-200';

export function ChartControls({ dimension, metric, aggregation }: ChartControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {dimension && (
        <select
          aria-label="Dimensión"
          value={dimension.value}
          onChange={(e) => dimension.onChange(e.target.value)}
          className={selectClass}
        >
          {dimension.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {metric && (
        <select aria-label="Métrica" value={metric.value} onChange={(e) => metric.onChange(e.target.value)} className={selectClass}>
          {metric.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {aggregation && (
        <select
          aria-label="Agregación"
          value={aggregation.value}
          onChange={(e) => aggregation.onChange(e.target.value as AggregationType)}
          className={selectClass}
        >
          {AGG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
