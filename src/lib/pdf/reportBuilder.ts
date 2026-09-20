import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as echarts from 'echarts';
import { createElement } from 'react';
import type { DatasetSchema, FilterState, Row } from '../data/types';
import type { Insight } from '../insights/rules';
import { generateInsights } from '../insights/rules';
import { buildExecutiveSummary, buildRecommendations } from '../insights/narrative';
import { groupAndAggregate, timeSeries } from '../data/aggregation';
import { Cover } from '../../components/report/Cover';
import { ExecSummary } from '../../components/report/ExecSummary';
import { FindingPage } from '../../components/report/FindingPage';
import { Recommendations } from '../../components/report/Recommendations';
import { Appendix } from '../../components/report/Appendix';
import { PAGE_HEIGHT_PX, PAGE_WIDTH_PX } from './styles';

function renderInsightChartImage(insight: Insight, rows: Row[]): string | null {
  const container = document.createElement('div');
  container.style.width = '680px';
  container.style.height = '320px';
  document.body.appendChild(container);
  const chart = echarts.init(container, undefined, { renderer: 'canvas', width: 680, height: 320 });

  try {
    if (insight.chartHint.type === 'timeseries') {
      const dateField =
        rows.length > 0 ? Object.keys(rows[0]).find((k) => !Number.isNaN(Date.parse(String(rows[0][k])))) : undefined;
      if (!dateField) return null;
      const series = timeSeries(rows, dateField, insight.chartHint.metric, insight.chartHint.aggType, 'month');
      chart.setOption({
        grid: { left: 50, right: 20, top: 20, bottom: 30 },
        xAxis: { type: 'category', data: series.map((s) => s.key) },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: series.map((s) => s.value), smooth: true, color: '#0b1f3a', areaStyle: { color: 'rgba(11,31,58,0.08)' } }],
      });
    } else if (insight.chartHint.type === 'bar' && insight.chartHint.dimension) {
      const grouped = groupAndAggregate(rows, insight.chartHint.dimension, insight.chartHint.metric, insight.chartHint.aggType).slice(0, 10);
      chart.setOption({
        grid: { left: 90, right: 30, top: 20, bottom: 20 },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: grouped.map((g) => g.key).reverse(), axisLabel: { fontSize: 11 } },
        series: [{ type: 'bar', data: grouped.map((g) => g.value).reverse(), color: '#b08d2c' }],
      });
    } else if (insight.chartHint.type === 'scatter') {
      const metric = insight.chartHint.metric;
      const points = rows
        .slice(0, 500)
        .map((r, i) => [i, r[metric]])
        .filter((p): p is [number, number] => typeof p[1] === 'number');
      chart.setOption({
        grid: { left: 50, right: 20, top: 20, bottom: 30 },
        xAxis: { type: 'value', show: false },
        yAxis: { type: 'value' },
        series: [{ type: 'scatter', data: points, symbolSize: 5, color: '#1c3a63' }],
      });
    } else {
      return null;
    }
    const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
    return url;
  } finally {
    chart.dispose();
    document.body.removeChild(container);
  }
}

async function capturePage(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false });
  return canvas.toDataURL('image/png');
}

export interface ReportInput {
  rows: Row[];
  schema: DatasetSchema;
  filters: FilterState;
  fileNames: string[];
  datasetLabel: string;
}

/** Builds and downloads the McKinsey-style executive PDF report from current data + filters. */
export async function buildAndDownloadReport(input: ReportInput): Promise<void> {
  const { rows, schema, filters, fileNames, datasetLabel } = input;
  const insights = generateInsights(rows, schema).slice(0, 5);
  const execMessages = buildExecutiveSummary(insights, datasetLabel);
  const recommendations = buildRecommendations(insights);

  const chartImages = insights.map((insight) => renderInsightChartImage(insight, rows));

  const filtersApplied: string[] = [];
  if (filters.dateRange?.field && (filters.dateRange.from || filters.dateRange.to)) {
    filtersApplied.push(
      `Rango de fecha (${filters.dateRange.field}): ${filters.dateRange.from ?? 'inicio'} a ${filters.dateRange.to ?? 'fin'}`,
    );
  }
  for (const [field, values] of Object.entries(filters.multiSelect)) {
    if (values.length > 0) filtersApplied.push(`${field}: ${values.join(', ')}`);
  }
  for (const [field, [min, max]] of Object.entries(filters.numericRange)) {
    filtersApplied.push(`${field}: entre ${min} y ${max}`);
  }
  if (filters.textSearch) filtersApplied.push(`Búsqueda de texto: "${filters.textSearch}"`);

  const totalNulls = schema.columns.reduce((a, c) => a + c.nullCount, 0);
  const dataQuality = [
    { label: 'Filas analizadas', value: rows.length.toLocaleString('es-ES') },
    { label: 'Columnas', value: String(schema.columns.length) },
    { label: 'Valores nulos detectados', value: totalNulls.toLocaleString('es-ES') },
    { label: 'Filas duplicadas (muestra)', value: schema.duplicateRowCount.toLocaleString('es-ES') },
  ];

  const totalPages = 2 + insights.length + 1 + 1; // cover + summary + findings + recommendations + appendix

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '-99999px';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  const pdf = new jsPDF({ unit: 'px', format: [PAGE_WIDTH_PX, PAGE_HEIGHT_PX], compress: true });

  const pageNodes: HTMLElement[] = [];
  for (let i = 0; i < totalPages; i++) {
    const div = document.createElement('div');
    host.appendChild(div);
    pageNodes.push(div);
  }

  async function renderAndCapture(pageIndex: number, element: ReturnType<typeof createElement>): Promise<string> {
    const container = pageNodes[pageIndex];
    const pageRoot = createRoot(container);
    pageRoot.render(element);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const dataUrl = await capturePage(container.firstElementChild as HTMLElement);
    pageRoot.unmount();
    return dataUrl;
  }

  try {
    let pageNum = 1;
    const dateLabel = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const images: string[] = [];
    images.push(
      await renderAndCapture(
        0,
        createElement(Cover, {
          title: `Análisis ejecutivo: ${datasetLabel}`,
          subtitle:
            'Hallazgos clave, tendencias y recomendaciones basados en los datos cargados y los filtros vigentes al momento de la generación.',
          dateLabel,
          totalPages,
        }),
      ),
    );
    pageNum++;

    images.push(
      await renderAndCapture(1, createElement(ExecSummary, { messages: execMessages, pageNumber: pageNum, totalPages })),
    );
    pageNum++;

    for (let i = 0; i < insights.length; i++) {
      images.push(
        await renderAndCapture(
          2 + i,
          createElement(FindingPage, {
            index: i + 1,
            total: insights.length,
            title: insights[i].title,
            bullets: insights[i].bullets,
            chartImage: chartImages[i],
            pageNumber: pageNum,
            totalPages,
          }),
        ),
      );
      pageNum++;
    }

    images.push(
      await renderAndCapture(
        2 + insights.length,
        createElement(Recommendations, { recommendations, pageNumber: pageNum, totalPages }),
      ),
    );
    pageNum++;

    images.push(
      await renderAndCapture(
        3 + insights.length,
        createElement(Appendix, {
          sources: fileNames,
          filtersApplied,
          dataQuality,
          pageNumber: pageNum,
          totalPages,
        }),
      ),
    );

    images.forEach((img, i) => {
      if (i > 0) pdf.addPage([PAGE_WIDTH_PX, PAGE_HEIGHT_PX]);
      pdf.addImage(img, 'PNG', 0, 0, PAGE_WIDTH_PX, PAGE_HEIGHT_PX);
    });

    pdf.save(`informe-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
