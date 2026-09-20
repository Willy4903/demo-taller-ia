import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useCombinedSchema } from '../../store/useDataStore';
import { useFilteredRows } from '../../hooks/useFilteredData';
import { useSchemaFields } from '../../hooks/useSchemaFields';
import { useChartPngExport } from '../../hooks/useChartPngExport';
import { ChartCard } from './ChartCard';
import { ChartControls } from './ChartControls';
import { EmptyState } from '../common/EmptyState';

export function ScatterChart() {
  const schema = useCombinedSchema();
  const rows = useFilteredRows();
  const { numeric } = useSchemaFields(schema);
  const { ref, exportPng } = useChartPngExport('dispersion');

  const [xField, setXField] = useState(numeric[0]?.name ?? '');
  const [yField, setYField] = useState(numeric[1]?.name ?? numeric[0]?.name ?? '');

  const activeX = numeric.find((c) => c.name === xField)?.name ?? numeric[0]?.name;
  const activeY = numeric.find((c) => c.name === yField)?.name ?? numeric[1]?.name ?? numeric[0]?.name;

  const points = useMemo(() => {
    if (!activeX || !activeY) return [];
    return rows
      .map((r) => [r[activeX], r[activeY]])
      .filter((p): p is [number, number] => typeof p[0] === 'number' && typeof p[1] === 'number')
      .slice(0, 5000);
  }, [rows, activeX, activeY]);

  if (numeric.length < 2) {
    return (
      <ChartCard title="Dispersión">
        <EmptyState title="Datos insuficientes" description="Se requieren al menos dos columnas numéricas." />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={`${activeY} vs. ${activeX}`}
      onExportPng={exportPng}
      controls={
        <ChartControls
          dimension={{ value: activeX ?? '', options: numeric.map((c) => ({ value: c.name, label: `X: ${c.name}` })), onChange: setXField }}
          metric={{ value: activeY ?? '', options: numeric.map((c) => ({ value: c.name, label: `Y: ${c.name}` })), onChange: setYField }}
        />
      }
    >
      <ReactECharts
        ref={ref}
        notMerge
        style={{ height: 280 }}
        option={{
          grid: { left: 48, right: 16, top: 16, bottom: 32 },
          tooltip: { trigger: 'item' },
          xAxis: { type: 'value', name: activeX, nameLocation: 'middle', nameGap: 28 },
          yAxis: { type: 'value', name: activeY },
          dataZoom: [{ type: 'inside' }],
          series: [{ type: 'scatter', data: points, symbolSize: 6, color: '#1c3a63' }],
        }}
      />
    </ChartCard>
  );
}
