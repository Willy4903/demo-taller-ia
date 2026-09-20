import type { DashboardConfig } from './types';

/** Configuration for the original sales/executive dashboard. Behavior is unchanged. */
export const salesConfig: DashboardConfig = {
  id: 'sales',
  title: 'Dashboard Analítico Ejecutivo',
  subtitle: 'Todo el procesamiento ocurre en tu navegador',
  sampleDataPath: 'ventas.csv',
  pdfCoverSubtitle:
    'Hallazgos clave, tendencias y recomendaciones basados en los datos cargados y los filtros vigentes al momento de la generación.',
};
