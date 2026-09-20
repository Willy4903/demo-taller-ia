import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useCombinedSchema } from '../../store/useDataStore';
import { useFilteredRows } from '../../hooks/useFilteredData';
import { useSchemaFields } from '../../hooks/useSchemaFields';
import { useChartPngExport } from '../../hooks/useChartPngExport';
import { timeSeries } from '../../lib/data/aggregation';
import type { AggregationType } from '../../lib/data/types';
import { ChartCard } from './ChartCard';
import { ChartControls } from './ChartControls';
import { EmptyState } from '../common/EmptyState';
import { useUiStore } from '../../store/useUiStore';

export function TimeSeriesChart() {
  const schema = useCombinedSchema();
  const rows = useFilteredRows();
  const { numeric, date } = useSchemaFields(schema);
  const theme = useUiStore((s) => s.theme);

  const [metric, setMetric] = useState(numeric[0]?.name ?? '');
  const [agg, setAgg] = useState<AggregationType>('sum');
  const { ref, exportPng } = useChartPngExport('serie-de-tiempo');

  const activeMetric = numeric.find((c) => c.name === metric)?.name ?? numeric[0]?.name;
  const dateField = date[0]?.name;

  const series = useMemo(() => {
    if (!dateField || !activeMetric) return [];
    return timeSeries(rows, dateField, activeMetric, agg, 'month');
  }, [rows, dateField, activeMetric, agg]);

  if (!dateField || numeric.length === 0) {
    return (
      <ChartCard title="Serie de tiempo">
        <EmptyState title="Datos insuficientes" description="Se requiere una columna de fecha y una métrica numérica." />
      </ChartCard>
    );
  }

  const axisColor = theme === 'dark' ? '#9aa1ab' : '#4a5058';

  return (
    <ChartCard
      title={`${activeMetric} en el tiempo`}
      onExportPng={exportPng}
      controls={
        <ChartControls
          metric={{ value: activeMetric ?? '', options: numeric.map((c) => ({ value: c.name, label: c.name })), onChange: setMetric }}
          aggregation={{ value: agg, onChange: setAgg }}
        />
      }
    >
      <ReactECharts
        ref={ref}
        notMerge
        style={{ height: 280 }}
        option={{
          grid: { left: 48, right: 16, top: 16, bottom: 32 },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: series.map((s) => s.key), axisLine: { lineStyle: { color: axisColor } }, axisLabel: { color: axisColor } },
          yAxis: { type: 'value', axisLabel: { color: axisColor }, splitLine: { lineStyle: { color: theme === 'dark' ? '#2a2f38' : '#e2e5e9' } } },
          dataZoom: [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 0 }],
          series: [
            {
              type: 'line',
              data: series.map((s) => s.value),
              smooth: true,
              showSymbol: series.length < 40,
              color: '#0b1f3a',
              areaStyle: { color: 'rgba(11,31,58,0.08)' },
            },
          ],
        }}
      />
    </ChartCard>
  );
}
