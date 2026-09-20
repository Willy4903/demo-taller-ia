import { describe, expect, it } from 'vitest';
import { classifyNps, computeCsat, computeNpsScore, npsBreakdown } from '../lib/data/nps';
import type { Row } from '../lib/data/types';

describe('classifyNps', () => {
  it('classifies 9 and 10 as Promotor', () => {
    expect(classifyNps(9)).toBe('Promotor');
    expect(classifyNps(10)).toBe('Promotor');
  });

  it('classifies 7 and 8 as Pasivo', () => {
    expect(classifyNps(7)).toBe('Pasivo');
    expect(classifyNps(8)).toBe('Pasivo');
  });

  it('classifies 0-6 as Detractor, including the 6/7 boundary', () => {
    expect(classifyNps(0)).toBe('Detractor');
    expect(classifyNps(6)).toBe('Detractor');
    expect(classifyNps(7)).toBe('Pasivo');
  });

  it('draws the 8/9 boundary correctly', () => {
    expect(classifyNps(8)).toBe('Pasivo');
    expect(classifyNps(9)).toBe('Promotor');
  });
});

function rowsFromScores(scores: number[]): Row[] {
  return scores.map((s, i) => ({ id: i, nps_score: s }));
}

describe('computeNpsScore', () => {
  it('returns 0 for an empty dataset', () => {
    expect(computeNpsScore([], 'nps_score')).toBe(0);
  });

  it('computes %Promoters - %Detractors for a known set', () => {
    // 10 responses: 4 promoters (9,9,10,10), 2 passives (7,8), 4 detractors (0,3,5,6)
    const rows = rowsFromScores([9, 9, 10, 10, 7, 8, 0, 3, 5, 6]);
    // NPS = (4/10 - 4/10) * 100 = 0
    expect(computeNpsScore(rows, 'nps_score')).toBe(0);
  });

  it('computes a positive score when promoters dominate', () => {
    // 5 promoters, 1 passive, 1 detractor => (5-1)/7 * 100 ≈ 57
    const rows = rowsFromScores([9, 9, 10, 10, 10, 8, 2]);
    expect(computeNpsScore(rows, 'nps_score')).toBe(Math.round(((5 - 1) / 7) * 100));
  });

  it('computes a negative score when detractors dominate', () => {
    // 1 promoter, 0 passives, 4 detractors => (1-4)/5 * 100 = -60
    const rows = rowsFromScores([9, 1, 2, 3, 4]);
    expect(computeNpsScore(rows, 'nps_score')).toBe(-60);
  });
});

describe('computeCsat', () => {
  it('returns 0 for an empty dataset', () => {
    expect(computeCsat([], 'satisfaccion')).toBe(0);
  });

  it('computes % of rows at/above the top-box threshold (default 4 of 5)', () => {
    const rows: Row[] = [1, 2, 3, 4, 4, 5, 5, 5].map((s, i) => ({ id: i, satisfaccion: s }));
    // 5 of 8 rows have satisfaccion >= 4 => 62.5% -> rounds to 63
    expect(computeCsat(rows, 'satisfaccion')).toBe(63);
  });

  it('respects a custom threshold', () => {
    const rows: Row[] = [1, 2, 3, 4, 5].map((s, i) => ({ id: i, satisfaccion: s }));
    expect(computeCsat(rows, 'satisfaccion', 5)).toBe(20);
  });
});

describe('npsBreakdown', () => {
  it('returns counts and percentages for each category', () => {
    const rows = rowsFromScores([9, 10, 7, 8, 0, 3]);
    const breakdown = npsBreakdown(rows, 'nps_score');
    const byCategory = Object.fromEntries(breakdown.map((b) => [b.category, b]));
    expect(byCategory.Promotor.count).toBe(2);
    expect(byCategory.Pasivo.count).toBe(2);
    expect(byCategory.Detractor.count).toBe(2);
    expect(byCategory.Promotor.pct).toBeCloseTo(33.3, 1);
  });
});
