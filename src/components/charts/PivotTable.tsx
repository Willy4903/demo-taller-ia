import { useMemo, useState } from 'react';
import { useCombinedSchema } from '../../store/useDataStore';
import { useFilteredRows } from '../../hooks/useFilteredData';
import { useSchemaFields } from '../../hooks/useSchemaFields';
import { groupAndAggregate } from '../../lib/data/aggregation';
import type { AggregationType } from '../../lib/data/types';
import { ChartCard } from './ChartCard';
import { ChartControls } from './ChartControls';
import { EmptyState } from '../common/EmptyState';

type SortDir = 'asc' | 'desc';

export function PivotTable() {
  const schema = useCombinedSchema();
  const rows = useFilteredRows();
  const { numeric, categorical } = useSchemaFields(schema);

  const [dimension, setDimension] = useState(categorical[0]?.name ?? '');
  const [metric, setMetric] = useState(numeric[0]?.name ?? '');
  const [agg, setAgg] = useState<AggregationType>('sum');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const activeDim = categorical.find((c) => c.name === dimension)?.name ?? categorical[0]?.name;
  const activeMetric = numeric.find((c) => c.name === metric)?.name ?? numeric[0]?.name;

  const data = useMemo(() => {
    if (!activeDim || !activeMetric) return [];
    const grouped = groupAndAggregate(rows, activeDim, activeMetric, agg);
    return sortDir === 'desc' ? grouped : [...grouped].reverse();
  }, [rows, activeDim, activeMetric, agg, sortDir]);

  if (!activeDim || !activeMetric) {
    return (
      <ChartCard title="Tabla dinámica">
        <EmptyState title="Datos insuficientes" description="Se requiere una columna categórica y una métrica numérica." />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Tabla dinámica"
      controls={
        <ChartControls
          dimension={{ value: activeDim, options: categorical.map((c) => ({ value: c.name, label: c.name })), onChange: setDimension }}
          metric={{ value: activeMetric, options: numeric.map((c) => ({ value: c.name, label: c.name })), onChange: setMetric }}
          aggregation={{ value: agg, onChange: setAgg }}
        />
      }
    >
      <div className="max-h-72 overflow-y-auto rounded-sm border border-grey-200 dark:border-grey-700">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-grey-100 text-grey-700 dark:bg-grey-800 dark:text-grey-200">
            <tr>
              <th className="px-3 py-2 font-medium">{activeDim}</th>
              <th className="px-3 py-2 font-medium">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                >
                  {activeMetric} {sortDir === 'desc' ? '▼' : '▲'}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.key} className="border-t border-grey-200 dark:border-grey-700">
                <td className="px-3 py-1.5 text-grey-900 dark:text-grey-100">{row.key}</td>
                <td className="px-3 py-1.5 text-grey-700 dark:text-grey-300">{row.value.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
