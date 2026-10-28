import type { Dataset, ScoreInputs, StandingsResult, TableKind, TeamId } from '../domain/types'
import { evaluateInput } from './scores'

export type TitleStatus = 'campeon' | 'en-carrera' | 'eliminado'
export type RelegationStatus = 'descendido' | 'salvado' | 'en-juego'

export interface Ceiling {
  teamId: TeamId
  pts: number
  /** Partidos del fixture sin marcador completo. */
  pending: number
  /** Puntos si gana todos los partidos que le quedan. */
  max: number
  title: TitleStatus
  relegation: RelegationStatus
}

/** Partidos pendientes por equipo, sin contar los ya simulados. */
export function pendingByTeam(dataset: Dataset, inputs: ScoreInputs): Map<TeamId, number> {
  const out = new Map<TeamId, number>(dataset.teams.map((t) => [t.id, 0]))
  for (const fx of dataset.fixtures) {
    if (evaluateInput(inputs[fx.id]).status === 'complete') continue
    out.set(fx.homeId, (out.get(fx.homeId) ?? 0) + 1)
    out.set(fx.awayId, (out.get(fx.awayId) ?? 0) + 1)
  }
  return out
}

/**
 * Techo de puntos y situación matemática. Las condiciones usan desigualdades estrictas:
 * un empate en puntos se decide por diferencia de goles y no se da por seguro.
 */
export function ceilings(dataset: Dataset, result: StandingsResult, inputs: ScoreInputs): Ceiling[] {
  const pending = pendingByTeam(dataset, inputs)
  const rows = result.rows.map((r) => ({ teamId: r.teamId, pts: r.pts, pending: pending.get(r.teamId) ?? 0 }))
  const withMax = rows.map((r) => ({ ...r, max: r.pts + 3 * r.pending }))
  const leaderPts = Math.max(...withMax.map((r) => r.pts))
  const n = withMax.length

  return withMax.map((r) => {
    const others = withMax.filter((o) => o.teamId !== r.teamId)
    const title: TitleStatus =
      r.max < leaderPts ? 'eliminado' : r.pts > Math.max(...others.map((o) => o.max)) ? 'campeon' : 'en-carrera'
    const above = others.filter((o) => o.pts > r.max).length
    const below = others.filter((o) => o.max < r.pts).length
    const relegation: RelegationStatus = above >= n - 2 ? 'descendido' : below >= 2 ? 'salvado' : 'en-juego'
    return { teamId: r.teamId, pts: r.pts, pending: r.pending, max: r.max, title, relegation }
  })
}

export const TABLE_LABEL: Record<TableKind, string> = { clausura: 'Clausura', acumulado: 'Acumulado anual' }
