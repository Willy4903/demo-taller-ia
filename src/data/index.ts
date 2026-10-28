import type { Dataset } from '../domain/types'
import { FECHA_WINDOWS, FIXTURES, PLAYED } from './fixtures'
import { DEDUCTIONS, DISCREPANCIES } from './records'
import { SOURCES } from './sources'
import { ACUMULADO_ADJUSTMENTS, APERTURA_FINAL, CLAUSURA_BASE } from './standings'
import { TEAMS } from './teams'

/**
 * Conjunto de datos oficial al corte. Para actualizarlo durante el torneo, editar los archivos
 * de esta carpeta, subir `version` y ejecutar `npm run test` (ver README).
 */
export const DATASET: Dataset = {
  season: 2026,
  cutoff: '2026-10-28',
  updatedAt: '2026-10-28',
  version: '2026-10-28.1',
  teams: TEAMS,
  aperturaChampionId: 'alianza-lima',
  apertura: APERTURA_FINAL,
  clausuraBase: CLAUSURA_BASE,
  acumuladoAdjustments: ACUMULADO_ADJUSTMENTS,
  fixtures: FIXTURES,
  played: PLAYED,
  deductions: DEDUCTIONS,
  discrepancies: DISCREPANCIES,
  fechaWindows: FECHA_WINDOWS,
  sources: SOURCES,
  headToHead: [],
  fairPlay: {},
}

export { UNIVERSITARIO_ID } from './teams'
