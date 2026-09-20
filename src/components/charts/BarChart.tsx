import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useCombinedSchema } from '../../store/useDataStore';
import { useFilteredRows } from '../../hooks/useFilteredData';
import { useSchemaFields } from '../../hooks/useSchemaFields';
import { useChartPngExport } from '../../hooks/useChartPngExport';
import { groupAndAggregate } from '../../lib/data/aggregation';
import type { AggregationType } from '../../lib/data/types';
import { useFilterStore } from '../../store/useFilterStore';
import { ChartCard } from './ChartCard';
import { ChartControls } from './ChartControls';
import { EmptyState } from '../common/EmptyState';

const PALETTE = ['#0b1f3a', '#b08d2c', '#1c3a63', '#8a6d1f', '#4a5058', '#c9a94a'];

export function BarChart() {
  const schema = useCombinedSchema();
  const rows = useFilteredRows();
  const { numeric, categorical } = useSchemaFields(schema);
  const crossFilterField = useFilterStore((s) => s.crossFilterField);
  const crossFilterValue = useFilterStore((s) => s.crossFilterValue);
  const setCrossFilter = useFilterStore((s) => s.setCrossFilter);

  const [dimension, setDimension] = useState(categorical[0]?.name ?? '');
  const [metric, setMetric] = useState(numeric[0]?.name ?? '');
  const [agg, setAgg] = useState<AggregationType>('sum');
  const { ref, exportPng } = useChartPngExport('grafico-de-barras');

  const activeDim = categorical.find((c) => c.name === dimension)?.name ?? categorical[0]?.name;
  const activeMetric = numeric.find((c) => c.name === metric)?.name ?? numeric[0]?.name;

  const grouped = useMemo(() => {
    if (!activeDim || !activeMetric) return [];
    return groupAndAggregate(rows, activeDim, activeMetric, agg).slice(0, 15);
  }, [rows, activeDim, activeMetric, agg]);

  if (!activeDim || !activeMetric) {
    return (
      <ChartCard title="Comparación por categoría">
        <EmptyState title="Datos insuficientes" description="Se requiere una columna categórica y una métrica numérica." />
      </ChartCard>
    );
  }

  const isActiveDimFiltered = crossFilterField === activeDim;

  return (
    <ChartCard
      title={`${activeMetric} por ${activeDim}`}
      onExportPng={exportPng}
      controls={
        <ChartControls
          dimension={{ value: activeDim, options: categorical.map((c) => ({ value: c.name, label: c.name })), onChange: setDimension }}
          metric={{ value: activeMetric, options: numeric.map((c) => ({ value: c.name, label: c.name })), onChange: setMetric }}
          aggregation={{ value: agg, onChange: setAgg }}
        />
      }
    >
      {isActiveDimFiltered && (
        <button
          type="button"
          onClick={() => setCrossFilter(null, null)}
          className="mb-1 self-start text-[11px] font-medium text-navy underline-offset-2 hover:underline dark:text-gold"
        >
          Quitar filtro por clic ({crossFilterValue})
        </button>
      )}
      <ReactECharts
        ref={ref}
        notMerge
        style={{ height: 280 }}
        onEvents={{
          click: (params: { name: string }) => {
            if (crossFilterField === activeDim && crossFilterValue === params.name) {
              setCrossFilter(null, null);
            } else {
              setCrossFilter(activeDim, params.name);
            }
          },
        }}
        option={{
          grid: { left: 100, right: 24, top: 16, bottom: 16 },
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          xAxis: { type: 'value' },
          yAxis: { type: 'category', data: grouped.map((g) => g.key).reverse(), axisLabel: { fontSize: 11 } },
          series: [
            {
              type: 'bar',
              data: grouped
                .map((g) => g.value)
                .reverse()
                .map((v, i) => {
                  const key = grouped.slice().reverse()[i]?.key;
                  return {
                    value: v,
                    itemStyle: {
                      color: crossFilterField === activeDim && crossFilterValue !== key ? '#c9ccd2' : PALETTE[0],
                    },
                  };
                }),
              barMaxWidth: 24,
            },
          ],
        }}
      />
    </ChartCard>
  );
}
