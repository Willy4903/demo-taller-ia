import { useMemo } from 'react';
import { useCombinedSchema } from '../../store/useDataStore';
import { useFilteredRows } from '../../hooks/useFilteredData';
import { computeKpi } from '../../lib/data/kpi';
import { KpiCard } from './KpiCard';
import { EmptyState } from '../common/EmptyState';

export function KpiRow() {
  const schema = useCombinedSchema();
  const rows = useFilteredRows();

  const numericFields = useMemo(() => schema.columns.filter((c) => c.type === 'number').slice(0, 4), [schema]);
  const dateField = useMemo(() => schema.columns.find((c) => c.type === 'date')?.name, [schema]);

  const kpis = useMemo(
    () => numericFields.map((col) => computeKpi(rows, col.name, 'sum', col.name, dateField)),
    [numericFields, rows, dateField],
  );

  if (numericFields.length === 0) {
    return (
      <EmptyState title="Sin métricas numéricas" description="Carga datos con al menos una columna numérica para ver KPIs." />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}
