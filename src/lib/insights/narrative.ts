import type { Insight } from './rules';

/** Builds the executive summary: up to 5 key messages, in pyramid-principle style (conclusion first). */
export function buildExecutiveSummary(insights: Insight[], datasetLabel: string): string[] {
  const top = insights.slice(0, 5);
  if (top.length === 0) {
    return [`No se identificaron patrones estadísticamente relevantes en ${datasetLabel} con los filtros actuales.`];
  }
  return top.map((i) => i.title);
}

/** Builds executive recommendations derived from the top insights. */
export function buildRecommendations(insights: Insight[]): string[] {
  const recs: string[] = [];
  for (const insight of insights.slice(0, 5)) {
    recs.push(insight.bullets[insight.bullets.length - 1]);
  }
  if (recs.length === 0) {
    recs.push('Ampliar la ventana de datos o revisar la calidad de las fuentes para habilitar un análisis más profundo.');
  }
  recs.push('Establecer una cadencia de revisión periódica de este tablero para detectar cambios de tendencia oportunamente.');
  return recs;
}
