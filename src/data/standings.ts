import type { AcumuladoAdjustment, AperturaFinalRow, ClausuraBaseRow } from '../domain/types'

/**
 * Tabla del Clausura 2026 al corte del 1 de noviembre (tras la fecha 13 completa, la fecha 14 salvo
 * Universitario vs Sport Boys, y los cuatro partidos ya jugados de la fecha 15 hasta el 1 de noviembre). Fuentes: Depor (17 equipos),
 * Líbero (UTC) y la web oficial de Universitario. Las correcciones por inconsistencias
 * de una fuente están en discrepancies.ts.
 */
export const CLAUSURA_BASE: ClausuraBaseRow[] = [
  { teamId: 'sport-huancayo', pj: 14, pg: 9, pe: 1, pp: 4, gf: 23, gc: 17, deduction: 0, publishedPts: 28 },
  { teamId: 'universitario', pj: 14, pg: 9, pe: 3, pp: 2, gf: 31, gc: 20, deduction: 0, publishedPts: 30 },
  { teamId: 'garcilaso', pj: 14, pg: 8, pe: 1, pp: 5, gf: 26, gc: 15, deduction: 0, publishedPts: 25 },
  { teamId: 'sporting-cristal', pj: 14, pg: 9, pe: 1, pp: 4, gf: 29, gc: 17, deduction: 0, publishedPts: 28 },
  { teamId: 'melgar', pj: 14, pg: 7, pe: 5, pp: 2, gf: 25, gc: 15, deduction: 0, publishedPts: 26 },
  { teamId: 'juan-pablo-ii', pj: 15, pg: 7, pe: 4, pp: 4, gf: 25, gc: 17, deduction: 0, publishedPts: 25 },
  { teamId: 'alianza-lima', pj: 14, pg: 7, pe: 4, pp: 3, gf: 22, gc: 15, deduction: 0, publishedPts: 25 },
  { teamId: 'alianza-atletico', pj: 15, pg: 9, pe: 1, pp: 5, gf: 29, gc: 28, deduction: 0, publishedPts: 28 },
  { teamId: 'cusco-fc', pj: 15, pg: 8, pe: 0, pp: 7, gf: 25, gc: 20, deduction: 0, publishedPts: 24 },
  { teamId: 'sport-boys', pj: 14, pg: 7, pe: 3, pp: 4, gf: 20, gc: 14, deduction: 0, publishedPts: 24 },
  { teamId: 'atletico-grau', pj: 15, pg: 5, pe: 3, pp: 7, gf: 17, gc: 23, deduction: 0, publishedPts: 18 },
  { teamId: 'cienciano', pj: 14, pg: 5, pe: 2, pp: 7, gf: 19, gc: 21, deduction: 0, publishedPts: 17 },
  { teamId: 'comerciantes-unidos', pj: 14, pg: 3, pe: 5, pp: 6, gf: 24, gc: 25, deduction: 0, publishedPts: 14 },
  { teamId: 'los-chankas', pj: 15, pg: 3, pe: 4, pp: 8, gf: 14, gc: 30, deduction: 0, publishedPts: 13 },
  { teamId: 'fc-cajamarca', pj: 14, pg: 3, pe: 2, pp: 9, gf: 21, gc: 32, deduction: 0, publishedPts: 11 },
  { teamId: 'cd-moquegua', pj: 15, pg: 2, pe: 5, pp: 8, gf: 8, gc: 22, deduction: 0, publishedPts: 11 },
  { teamId: 'adt', pj: 14, pg: 2, pe: 4, pp: 8, gf: 11, gc: 24, deduction: 0, publishedPts: 10 },
  { teamId: 'utc', pj: 14, pg: 1, pe: 2, pp: 11, gf: 15, gc: 29, deduction: 5, publishedPts: 0 },
]

/**
 * Tabla final del Apertura 2026 (17 fechas). Fuente: futbolperuano.com.
 * Alianza Lima fue campeón del Apertura.
 */
export const APERTURA_FINAL: AperturaFinalRow[] = [
  { teamId: 'alianza-lima', pj: 17, pts: 40, gf: 30, gc: 8 },
  { teamId: 'los-chankas', pj: 17, pts: 34, gf: 25, gc: 21 },
  { teamId: 'cienciano', pj: 17, pts: 33, gf: 34, gc: 22 },
  { teamId: 'universitario', pj: 17, pts: 29, gf: 24, gc: 15 },
  { teamId: 'melgar', pj: 17, pts: 28, gf: 29, gc: 20 },
  { teamId: 'cusco-fc', pj: 17, pts: 27, gf: 21, gc: 24 },
  { teamId: 'garcilaso', pj: 17, pts: 26, gf: 21, gc: 18 },
  { teamId: 'alianza-atletico', pj: 17, pts: 21, gf: 20, gc: 18 },
  { teamId: 'comerciantes-unidos', pj: 17, pts: 21, gf: 18, gc: 20 },
  { teamId: 'adt', pj: 17, pts: 20, gf: 22, gc: 21 },
  { teamId: 'sport-boys', pj: 17, pts: 20, gf: 15, gc: 19 },
  { teamId: 'sporting-cristal', pj: 17, pts: 19, gf: 28, gc: 30 },
  { teamId: 'utc', pj: 17, pts: 18, gf: 21, gc: 26 },
  { teamId: 'cd-moquegua', pj: 17, pts: 18, gf: 17, gc: 24 },
  { teamId: 'fc-cajamarca', pj: 17, pts: 17, gf: 23, gc: 28 },
  { teamId: 'atletico-grau', pj: 17, pts: 16, gf: 12, gc: 18 },
  { teamId: 'sport-huancayo', pj: 17, pts: 16, gf: 21, gc: 31 },
  { teamId: 'juan-pablo-ii', pj: 17, pts: 16, gf: 22, gc: 40 },
]

/**
 * Acumulado anual = Apertura + Clausura + ajuste. Los ajustes corresponden a la diferencia
 * entre la suma de las dos tablas de torneo y los puntos de la tabla acumulada publicada por
 * Líbero el 27 de octubre (que marca sanciones en UTC, ADT, FC Cajamarca y Sport Boys).
 * Los ajustes no desglosan el motivo; ver deductions.ts.
 *
 * Cusco FC: Líbero publica 49, la suma de torneos da 48 y otra fuente publica 48. Se usa 48.
 */
export const ACUMULADO_ADJUSTMENTS: AcumuladoAdjustment[] = [
  { teamId: 'adt', points: -1, publishedAcumPts: 26 },
  { teamId: 'sport-boys', points: -4, publishedAcumPts: 37 },
  { teamId: 'utc', points: -5, publishedAcumPts: 10 },
]
