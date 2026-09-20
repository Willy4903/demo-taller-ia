import type { ColumnSchema, DatasetSchema, Row } from '../data/types';
import { groupAndAggregate, timeSeries } from '../data/aggregation';

export type InsightKind = 'trend' | 'variation' | 'outlier' | 'pareto' | 'correlation';

export interface Insight {
  kind: InsightKind;
  title: string;
  bullets: string[];
  chartHint: {
    type: 'timeseries' | 'bar' | 'scatter';
    dimension?: string;
    metric: string;
    aggType: 'sum' | 'avg' | 'count' | 'median';
  };
  severity: number; // higher = more important, used for ordering
}

function numericColumns(schema: DatasetSchema): ColumnSchema[] {
  return schema.columns.filter((c) => c.type === 'number');
}

function categoricalColumns(schema: DatasetSchema): ColumnSchema[] {
  return schema.columns.filter(
    (c) => c.type === 'string' && c.distinctCount > 1 && c.distinctCount <= 30,
  );
}

function dateColumns(schema: DatasetSchema): ColumnSchema[] {
  return schema.columns.filter((c) => c.type === 'date');
}

function pickPrimaryMetric(schema: DatasetSchema): ColumnSchema | undefined {
  return numericColumns(schema)[0];
}

/** Rule: overall trend of the primary metric over time (growth/decline). */
function trendRule(rows: Row[], schema: DatasetSchema): Insight[] {
  const dateCol = dateColumns(schema)[0];
  const metric = pickPrimaryMetric(schema);
  if (!dateCol || !metric) return [];
  const series = timeSeries(rows, dateCol.name, metric.name, 'sum', 'month');
  if (series.length < 2) return [];
  const first = series[0].value;
  const last = series[series.length - 1].value;
  if (first === 0) return [];
  const changePct = ((last - first) / Math.abs(first)) * 100;
  const direction = changePct >= 0 ? 'creció' : 'cayó';
  return [
    {
      kind: 'trend',
      title: `${metric.name} ${direction} ${Math.abs(changePct).toFixed(1)}% en el periodo analizado`,
      bullets: [
        `${metric.name} pasó de ${first.toLocaleString('es-ES', { maximumFractionDigits: 0 })} en ${series[0].key} a ${last.toLocaleString('es-ES', { maximumFractionDigits: 0 })} en ${series[series.length - 1].key}.`,
        `La tendencia ${changePct >= 0 ? 'positiva' : 'negativa'} sugiere ${changePct >= 0 ? 'mantener el impulso actual e identificar palancas replicables' : 'una revisión de causas raíz antes del próximo periodo'}.`,
        `Se recomienda monitorear mensualmente para confirmar si el patrón se sostiene.`,
      ],
      chartHint: { type: 'timeseries', metric: metric.name, aggType: 'sum' },
      severity: Math.abs(changePct),
    },
  ];
}

/** Rule: largest variation between top categories of a dimension. */
function variationRule(rows: Row[], schema: DatasetSchema): Insight[] {
  const dim = categoricalColumns(schema)[0];
  const metric = pickPrimaryMetric(schema);
  if (!dim || !metric) return [];
  const grouped = groupAndAggregate(rows, dim.name, metric.name, 'sum');
  if (grouped.length < 2) return [];
  const top = grouped[0];
  const bottom = grouped[grouped.length - 1];
  const total = grouped.reduce((a, b) => a + b.value, 0);
  if (total === 0) return [];
  const topShare = (top.value / total) * 100;
  return [
    {
      kind: 'variation',
      title: `${top.key} lidera ${dim.name} con ${topShare.toFixed(1)}% del total de ${metric.name}`,
      bullets: [
        `${top.key} concentra ${top.value.toLocaleString('es-ES', { maximumFractionDigits: 0 })} frente a ${bottom.value.toLocaleString('es-ES', { maximumFractionDigits: 0 })} de ${bottom.key}, la categoría más baja.`,
        `La brecha entre el mejor y el peor segmento indica oportunidades de estandarizar prácticas del líder hacia el resto.`,
        `Priorizar iniciativas específicas para los segmentos de menor desempeño puede cerrar la brecha de forma medible.`,
      ],
      chartHint: { type: 'bar', dimension: dim.name, metric: metric.name, aggType: 'sum' },
      severity: topShare,
    },
  ];
}

/** Rule: statistical outliers in the primary metric (z-score based). */
function outlierRule(rows: Row[], schema: DatasetSchema): Insight[] {
  const metric = pickPrimaryMetric(schema);
  if (!metric) return [];
  const values = rows
    .map((r) => (typeof r[metric.name] === 'number' ? (r[metric.name] as number) : NaN))
    .filter((n) => !Number.isNaN(n));
  if (values.length < 10) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  if (std === 0) return [];
  const outliers = values.filter((v) => Math.abs((v - mean) / std) > 3);
  if (outliers.length === 0) return [];
  const pct = (outliers.length / values.length) * 100;
  return [
    {
      kind: 'outlier',
      title: `Se detectaron ${outliers.length} valores atípicos en ${metric.name} (${pct.toFixed(1)}% de los registros)`,
      bullets: [
        `Estos registros se alejan más de 3 desviaciones estándar de la media (${mean.toLocaleString('es-ES', { maximumFractionDigits: 1 })}).`,
        `Los outliers pueden distorsionar promedios y proyecciones; se recomienda auditarlos antes de reportarlos a la dirección.`,
        `Si son legítimos, podrían representar eventos excepcionales que merecen un análisis dedicado.`,
      ],
      chartHint: { type: 'scatter', metric: metric.name, aggType: 'avg' },
      severity: pct * 2,
    },
  ];
}

/** Rule: Pareto (80/20) concentration analysis on a categorical dimension. */
function paretoRule(rows: Row[], schema: DatasetSchema): Insight[] {
  const dim = categoricalColumns(schema)[0];
  const metric = pickPrimaryMetric(schema);
  if (!dim || !metric) return [];
  const grouped = groupAndAggregate(rows, dim.name, metric.name, 'sum');
  const total = grouped.reduce((a, b) => a + b.value, 0);
  if (total === 0 || grouped.length < 3) return [];
  let cumulative = 0;
  let count = 0;
  for (const g of grouped) {
    cumulative += g.value;
    count++;
    if (cumulative / total >= 0.8) break;
  }
  const pctOfSegments = (count / grouped.length) * 100;
  if (pctOfSegments > 60) return [];
  return [
    {
      kind: 'pareto',
      title: `El ${pctOfSegments.toFixed(0)}% de los segmentos de ${dim.name} genera el 80% de ${metric.name}`,
      bullets: [
        `Solo ${count} de ${grouped.length} categorías (${grouped
          .slice(0, count)
          .map((g) => g.key)
          .join(', ')}) explican el 80% del total.`,
        `Este patrón de concentración tipo Pareto sugiere enfocar recursos comerciales y operativos en estas categorías clave.`,
        `Vale la pena evaluar si las categorías de baja contribución justifican su costo de mantenimiento.`,
      ],
      chartHint: { type: 'bar', dimension: dim.name, metric: metric.name, aggType: 'sum' },
      severity: 100 - pctOfSegments,
    },
  ];
}

/** Rule: correlation between the two strongest numeric columns (Pearson). */
function correlationRule(rows: Row[], schema: DatasetSchema): Insight[] {
  const nums = numericColumns(schema);
  if (nums.length < 2) return [];
  const [a, b] = nums;
  const pairs = rows
    .map((r) => [r[a.name], r[b.name]])
    .filter((p): p is [number, number] => typeof p[0] === 'number' && typeof p[1] === 'number');
  if (pairs.length < 10) return [];
  const meanA = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
  const meanB = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (const [x, y] of pairs) {
    num += (x - meanA) * (y - meanB);
    denA += (x - meanA) ** 2;
    denB += (y - meanB) ** 2;
  }
  const denom = Math.sqrt(denA * denB);
  if (denom === 0) return [];
  const r = num / denom;
  if (Math.abs(r) < 0.4) return [];
  const strength = Math.abs(r) > 0.7 ? 'fuerte' : 'moderada';
  const direction = r > 0 ? 'positiva' : 'negativa';
  return [
    {
      kind: 'correlation',
      title: `Correlación ${direction} ${strength} entre ${a.name} y ${b.name} (r=${r.toFixed(2)})`,
      bullets: [
        `Cuando ${a.name} aumenta, ${b.name} tiende a ${r > 0 ? 'aumentar' : 'disminuir'} de forma consistente.`,
        `Esta relación puede usarse para pronosticar ${b.name} a partir de ${a.name}, sujeto a validación adicional.`,
        `Se recomienda contrastar con hipótesis de negocio antes de asumir causalidad.`,
      ],
      chartHint: { type: 'scatter', metric: b.name, aggType: 'avg' },
      severity: Math.abs(r) * 100,
    },
  ];
}

/** Runs all statistical rules against the filtered dataset and returns ranked insights. */
export function generateInsights(rows: Row[], schema: DatasetSchema): Insight[] {
  const insights = [
    ...trendRule(rows, schema),
    ...variationRule(rows, schema),
    ...outlierRule(rows, schema),
    ...paretoRule(rows, schema),
    ...correlationRule(rows, schema),
  ];
  return insights.sort((a, b) => b.severity - a.severity);
}
