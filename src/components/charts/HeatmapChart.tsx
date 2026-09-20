import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useCombinedSchema } from '../../store/useDataStore';
import { useFilteredRows } from '../../hooks/useFilteredData';
import { useSchemaFields } from '../../hooks/useSchemaFields';
import { useChartPngExport } from '../../hooks/useChartPngExport';
import { groupAndAggregate2D } from '../../lib/data/aggregation';
import type { AggregationType } from '../../lib/data/types';
import { ChartCard } from './ChartCard';
import { ChartControls } from './ChartControls';
import { EmptyState } from '../common/EmptyState';
import { useUiStore } from '../../store/useUiStore';

export function HeatmapChart() {
  const schema = useCombinedSchema();
  const rows = useFilteredRows();
  const { numeric, categorical } = useSchemaFields(schema);
  const { ref, exportPng } = useChartPngExport('heatmap');
  const theme = useUiStore((s) => s.theme);

  const [dim1, setDim1] = useState(categorical[0]?.name ?? '');
  const [dim2, setDim2] = useState(categorical[1]?.name ?? categorical[0]?.name ?? '');
  const [metric, setMetric] = useState(numeric[0]?.name ?? '');
  const [agg, setAgg] = useState<AggregationType>('sum');

  const activeDim1 = categorical.find((c) => c.name === dim1)?.name ?? categorical[0]?.name;
  const activeDim2 = categorical.find((c) => c.name === dim2)?.name ?? categorical[1]?.name ?? categorical[0]?.name;
  const activeMetric = numeric.find((c) => c.name === metric)?.name ?? numeric[0]?.name;

  const { xCats, yCats, cells, maxVal } = useMemo(() => {
    if (!activeDim1 || !activeDim2 || !activeMetric) return { xCats: [], yCats: [], cells: [], maxVal: 0 };
    const raw = groupAndAggregate2D(rows, activeDim1, activeDim2, activeMetric, agg);
    const xSet = Array.from(new Set(raw.map((r) => r.key1))).slice(0, 20);
    const ySet = Array.from(new Set(raw.map((r) => r.key2))).slice(0, 20);
    const cellMap = new Map(raw.map((r) => [`${r.key1}\u0000${r.key2}`, r.value]));
    const cells: [number, number, number][] = [];
    let max = 0;
    xSet.forEach((x, xi) => {
      ySet.forEach((y, yi) => {
        const v = cellMap.get(`${x}\u0000${y}`) ?? 0;
        if (v > max) max = v;
        cells.push([xi, yi, v]);
      });
    });
    return { xCats: xSet, yCats: ySet, cells, maxVal: max };
  }, [rows, activeDim1, activeDim2, activeMetric, agg]);

  if (categorical.length < 2 || !activeMetric) {
    return (
      <ChartCard title="Heatmap">
        <EmptyState title="Datos insuficientes" description="Se requieren dos columnas categóricas y una métrica numérica." />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={`${activeMetric} por ${activeDim1} y ${activeDim2}`}
      onExportPng={exportPng}
      controls={
        <ChartControls
          dimension={{ value: activeDim1 ?? '', options: categorical.map((c) => ({ value: c.name, label: `Fila: ${c.name}` })), onChange: setDim1 }}
          metric={{ value: activeMetric ?? '', options: numeric.map((c) => ({ value: c.name, label: c.name })), onChange: setMetric }}
          aggregation={{ value: agg, onChange: setAgg }}
        />
      }
    >
      <div className="mb-1 flex justify-end">
        <ChartControls
          dimension={{ value: activeDim2 ?? '', options: categorical.map((c) => ({ value: c.name, label: `Columna: ${c.name}` })), onChange: setDim2 }}
        />
      </div>
      <ReactECharts
        ref={ref}
        notMerge
        style={{ height: 360 }}
        option={{
          tooltip: { position: 'top' },
          grid: { left: 90, right: 20, top: 10, bottom: 100 },
          xAxis: { type: 'category', data: xCats, axisLabel: { rotate: 45, fontSize: 10 }, splitArea: { show: true } },
          yAxis: { type: 'category', data: yCats, axisLabel: { fontSize: 10 }, splitArea: { show: true } },
          visualMap: {
            min: 0,
            max: maxVal || 1,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 4,
            itemHeight: 12,
            textStyle: { fontSize: 10 },
            inRange: { color: theme === 'dark' ? ['#141a24', '#b08d2c'] : ['#f4f5f7', '#0b1f3a'] },
          },
          series: [{ type: 'heatmap', data: cells, label: { show: false } }],
        }}
      />
    </ChartCard>
  );
}
