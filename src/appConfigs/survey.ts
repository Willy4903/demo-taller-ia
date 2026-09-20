import { NpsScoreCard } from '../components/kpi/NpsScoreCard';
import { classifyNps } from '../lib/data/nps';
import type { DashboardConfig } from './types';

/** Configuration for the survey/NPS satisfaction dashboard. */
export const surveyConfig: DashboardConfig = {
  id: 'survey',
  title: 'Dashboard de Encuestas — Satisfacción y NPS',
  subtitle: 'Todo el procesamiento ocurre en tu navegador',
  sampleDataPath: 'encuestas.csv',
  enrichRow: (row) => {
    const score = Number(row.nps_score);
    return {
      ...row,
      nps_categoria: Number.isNaN(score) ? null : classifyNps(score),
    };
  },
  extraKpis: [NpsScoreCard],
  pdfCoverSubtitle:
    'Resultados de la encuesta de satisfacción: NPS, CSAT y hallazgos clave por canal, región y segmento de cliente.',
};
