import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useCombinedSchema } from '../../store/useDataStore';
import { useFilteredRows } from '../../hooks/useFilteredData';
import { useChartPngExport } from '../../hooks/useChartPngExport';
import { npsBreakdown } from '../../lib/data/nps';
import { ChartCard } from './ChartCard';
import { EmptyState } from '../common/EmptyState';

const CATEGORY_COLORS: Record<string, string> = {
  Promotor: '#b08d2c', // gold
  Pasivo: '#9aa1ab', // grey
  Detractor: '#0b1f3a', // navy
};

/** Horizontal stacked bar showing % Promoters / Passives / Detractors. */
export function NpsBreakdownChart() {
  const schema = useCombinedSchema();
  const rows = useFilteredRows();
  const { ref, exportPng } = useChartPngExport('desglose-nps');

  const npsField = schema.columns.find((c) => c.name === 'nps_score')?.name;
  const breakdown = useMemo(() => (npsField ? npsBreakdown(rows, npsField) : []), [rows, npsField]);

  if (!npsField || breakdown.length === 0) {
    return (
      <ChartCard title="Desglose de NPS">
        <EmptyState title="Datos insuficientes" description="Se requiere una columna nps_score." />
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Desglose de NPS (Promotores / Pasivos / Detractores)" onExportPng={exportPng}>
      <ReactECharts
        ref={ref}
        notMerge
        style={{ height: 160 }}
        option={{
          grid: { left: 16, right: 16, top: 16, bottom: 16 },
          tooltip: { trigger: 'item', formatter: (p: { seriesName: string; value: number }) => `${p.seriesName}: ${p.value}%` },
          legend: { bottom: 0 },
          xAxis: { type: 'value', max: 100, show: false },
          yAxis: { type: 'category', data: ['Encuestados'], show: false },
          series: breakdown.map((b) => ({
            name: b.category,
            type: 'bar',
            stack: 'total',
            data: [b.pct],
            barWidth: 40,
            itemStyle: { color: CATEGORY_COLORS[b.category] },
            label: { show: true, formatter: `${b.category}: {c}%`, color: '#fff', position: 'inside' },
          })),
        }}
      />
    </ChartCard>
  );
}
