import { describe, expect, it } from 'vitest';
import { generateInsights } from '../lib/insights/rules';
import { buildExecutiveSummary, buildRecommendations } from '../lib/insights/narrative';
import { detectSchema, coerceRows } from '../lib/parsing/schemaDetection';
import type { Row } from '../lib/data/types';

function buildDataset(): Row[] {
  const categories = ['A', 'B', 'C', 'D', 'E'];
  const rows: Row[] = [];
  for (let month = 1; month <= 12; month++) {
    for (let d = 0; d < 20; d++) {
      // category A dominates (Pareto), and revenue trends upward over months
      const category = d < 14 ? 'A' : categories[1 + (d % 4)];
      const base = 100 + month * 15;
      const revenue = category === 'A' ? base * 3 + d : base * 0.3 + d;
      const cost = revenue * 0.6 + d * 0.5; // correlated with revenue
      rows.push({
        fecha: `2024-${String(month).padStart(2, '0')}-${String((d % 27) + 1).padStart(2, '0')}`,
        categoria: category,
        ingresos: Math.round(revenue * 100) / 100,
        costo: Math.round(cost * 100) / 100,
      });
    }
  }
  // a clear outlier in revenue that still roughly follows the cost relationship,
  // so it stands out on its own (z-score) without destroying the correlation signal
  rows.push({ fecha: '2024-06-15', categoria: 'A', ingresos: 100000, costo: 60000 });
  return rows;
}

describe('generateInsights', () => {
  const rawRows = buildDataset();
  const schema = detectSchema(rawRows);
  const rows = coerceRows(rawRows, schema);
  const insights = generateInsights(rows, schema);

  it('produces at least one insight of each expected kind for a rich dataset', () => {
    const kinds = new Set(insights.map((i) => i.kind));
    expect(kinds.has('trend')).toBe(true);
    expect(kinds.has('pareto')).toBe(true);
    expect(kinds.has('outlier')).toBe(true);
    expect(kinds.has('correlation')).toBe(true);
  });

  it('sorts insights by descending severity', () => {
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i - 1].severity).toBeGreaterThanOrEqual(insights[i].severity);
    }
  });

  it('every insight has a non-empty title and up to 3 bullets', () => {
    for (const insight of insights) {
      expect(insight.title.length).toBeGreaterThan(0);
      expect(insight.bullets.length).toBeGreaterThan(0);
      expect(insight.bullets.length).toBeLessThanOrEqual(3);
    }
  });

  it('returns no insights for an empty dataset', () => {
    const emptySchema = detectSchema([]);
    expect(generateInsights([], emptySchema)).toHaveLength(0);
  });
});

describe('narrative builders', () => {
  const rawRows = buildDataset();
  const schema = detectSchema(rawRows);
  const rows = coerceRows(rawRows, schema);
  const insights = generateInsights(rows, schema);

  it('builds an executive summary with at most 5 messages', () => {
    const summary = buildExecutiveSummary(insights, 'ventas.csv');
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(5);
  });

  it('falls back to a message when there are no insights', () => {
    const summary = buildExecutiveSummary([], 'ventas.csv');
    expect(summary).toHaveLength(1);
    expect(summary[0]).toContain('ventas.csv');
  });

  it('builds recommendations derived from insights', () => {
    const recs = buildRecommendations(insights);
    expect(recs.length).toBeGreaterThan(0);
  });
});
