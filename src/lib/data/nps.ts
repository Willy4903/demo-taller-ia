import type { Row } from './types';

export type NpsCategory = 'Promotor' | 'Pasivo' | 'Detractor';

/** Classifies a 0-10 NPS score into the standard Promoter/Passive/Detractor buckets. */
export function classifyNps(score: number): NpsCategory {
  if (score >= 9) return 'Promotor';
  if (score >= 7) return 'Pasivo';
  return 'Detractor';
}

/** Computes the Net Promoter Score (%Promoters - %Detractors) as a rounded integer, -100..100. */
export function computeNpsScore(rows: Row[], npsField: string): number {
  const scores = rows
    .map((r) => Number(r[npsField]))
    .filter((n) => !Number.isNaN(n));
  if (scores.length === 0) return 0;
  let promoters = 0;
  let detractors = 0;
  for (const s of scores) {
    const cat = classifyNps(s);
    if (cat === 'Promotor') promoters++;
    else if (cat === 'Detractor') detractors++;
  }
  const pct = ((promoters - detractors) / scores.length) * 100;
  return Math.round(pct);
}

/** Computes CSAT (top-box %) for a satisfaction field, e.g. % of rows with satisfaction >= threshold. */
export function computeCsat(rows: Row[], satisfactionField: string, threshold = 4): number {
  const values = rows
    .map((r) => Number(r[satisfactionField]))
    .filter((n) => !Number.isNaN(n));
  if (values.length === 0) return 0;
  const topBox = values.filter((v) => v >= threshold).length;
  return Math.round((topBox / values.length) * 100);
}

/** Breaks down rows into Promoter/Passive/Detractor counts and percentages for a chart. */
export function npsBreakdown(rows: Row[], npsField: string): { category: NpsCategory; count: number; pct: number }[] {
  const scores = rows
    .map((r) => Number(r[npsField]))
    .filter((n) => !Number.isNaN(n));
  const counts: Record<NpsCategory, number> = { Promotor: 0, Pasivo: 0, Detractor: 0 };
  for (const s of scores) counts[classifyNps(s)]++;
  const total = scores.length || 1;
  return (['Promotor', 'Pasivo', 'Detractor'] as NpsCategory[]).map((category) => ({
    category,
    count: counts[category],
    pct: Math.round((counts[category] / total) * 1000) / 10,
  }));
}
