import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useCombinedSchema } from '../../store/useDataStore';
import { useFilteredRows } from '../../hooks/useFilteredData';
import { useSchemaFields } from '../../hooks/useSchemaFields';
import { useChartPngExport } from '../../hooks/useChartPngExport';
import { groupAndAggregate } from '../../lib/data/aggregation';
import type { AggregationType } from '../../lib/data/types';
import { ChartCard } from './ChartCard';
import { ChartControls } from './ChartControls';
import { EmptyState } from '../common/EmptyState';

const PALETTE = ['#0b1f3a', '#1c3a63', '#2c5590', '#b08d2c', '#8a6d1f', '#4a5058', '#6b7280'];

export function TreemapChart() {
  const schema = useCombinedSchema();
  const rows = useFilteredRows();
  const { numeric, categorical } = useSchemaFields(schema);
  const { ref, exportPng } = useChartPngExport('treemap');

  const [dimension, setDimension] = useState(categorical[0]?.name ?? '');
  const [metric, setMetric] = useState(numeric[0]?.name ?? '');
  const [agg, setAgg] = useState<AggregationType>('sum');

  const activeDim = categorical.find((c) => c.name === dimension)?.name ?? categorical[0]?.name;
  const activeMetric = numeric.find((c) => c.name === metric)?.name ?? numeric[0]?.name;

  const data = useMemo(() => {
    if (!activeDim || !activeMetric) return [];
    return groupAndAggregate(rows, activeDim, activeMetric, agg).map((g, i) => ({
      name: g.key,
      value: g.value,
      itemStyle: { color: PALETTE[i % PALETTE.length] },
    }));
  }, [rows, activeDim, activeMetric, agg]);

  if (!activeDim || !activeMetric) {
    return (
      <ChartCard title="Treemap">
        <EmptyState title="Datos insuficientes" description="Se requiere una columna categórica y una métrica numérica." />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={`Participación de ${activeDim} en ${activeMetric}`}
      onExportPng={exportPng}
      controls={
        <ChartControls
          dimension={{ value: activeDim, options: categorical.map((c) => ({ value: c.name, label: c.name })), onChange: setDimension }}
          metric={{ value: activeMetric, options: numeric.map((c) => ({ value: c.name, label: c.name })), onChange: setMetric }}
          aggregation={{ value: agg, onChange: setAgg }}
        />
      }
    >
      <ReactECharts
        ref={ref}
        notMerge
        style={{ height: 280 }}
        option={{
          tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value.toLocaleString('es-ES')}` },
          series: [
            {
              type: 'treemap',
              data,
              roam: false,
              breadcrumb: { show: false },
              label: { fontSize: 11, color: '#fff' },
              upperLabel: { show: false },
            },
          ],
        }}
      />
    </ChartCard>
  );
}
